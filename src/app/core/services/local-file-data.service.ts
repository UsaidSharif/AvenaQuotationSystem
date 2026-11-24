import { Injectable, computed, signal } from '@angular/core';
import { BackupBundle } from '../models/domain.models';

type WritableFileStream = {
  write(data: Blob | string): Promise<void>;
  close(): Promise<void>;
};

type NativeFileHandle = {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableFileStream>;
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
};

type FilePickerType = {
  description: string;
  accept: Record<string, string[]>;
};

type FileSystemWindow = Window & {
  showSaveFilePicker(options?: {
    suggestedName?: string;
    excludeAcceptAllOption?: boolean;
    types?: FilePickerType[];
  }): Promise<NativeFileHandle>;
};

type SessionRecord = {
  fileName: string;
  lastSavedAt: string;
  bundle: BackupBundle;
};

/**
 * Persistence strategy:
 * 1. Always store the working bundle in IndexedDB (reliable in Chrome).
 * 2. Import/export JSON via normal file input / download (no special permission).
 * 3. Optionally mirror to a File System Access handle when Chrome allows it.
 */
@Injectable({ providedIn: 'root' })
export class LocalFileDataService {
  private readonly dbName = 'avena-quotation';
  private readonly storeName = 'session';
  private readonly sessionKey = 'current';
  private readonly handleDbName = 'avena-file-access';
  private readonly handleStoreName = 'handles';
  private readonly handleKey = 'current-data-file';

  private readonly active = signal(false);
  private fileHandle: NativeFileHandle | null = null;

  readonly fileName = signal('');
  readonly rememberedFileName = signal('');
  readonly lastSavedAt = signal('');
  readonly pendingOpenFileName = signal('');
  readonly connected = computed(() => this.active());
  readonly supported = signal(true);
  readonly fileApiSupported = signal(this.detectFileApiSupport());

  async restoreDataFile(_requestPermission = false): Promise<BackupBundle | null> {
    const session = await this.readSession();
    if (!session?.bundle) {
      // Keep remembered name from an old FS handle if present (for UI hints only).
      const handle = await this.readStoredHandle();
      if (handle) this.rememberedFileName.set(handle.name);
      return null;
    }

    this.active.set(true);
    this.fileName.set(session.fileName || 'avena-data.json');
    this.rememberedFileName.set(session.fileName || 'avena-data.json');
    this.lastSavedAt.set(session.lastSavedAt || session.bundle.exportedAt || '');

    // Best-effort restore of a linked disk handle (not required to use the app).
    const handle = await this.readStoredHandle();
    if (handle) {
      this.fileHandle = handle;
      this.rememberedFileName.set(handle.name);
    }

    return session.bundle;
  }

  /** One-click open: pick JSON → load into IndexedDB session → app is connected. */
  async openDataFile(): Promise<BackupBundle> {
    const file = await this.pickJsonFileWithInput();
    const bundle = this.parseBundle(await file.text());
    const name = file.name || 'avena-data.json';
    await this.activateSession(bundle, name);
    return bundle;
  }

  /** Create a new working session in IndexedDB; optionally offer a disk save. */
  async createDataFile(bundle: BackupBundle): Promise<void> {
    await this.activateSession(bundle, 'avena-data.json');

    if (!this.fileApiSupported()) return;

    try {
      const handle = await this.fileApi().showSaveFilePicker({
        suggestedName: 'avena-data.json',
        excludeAcceptAllOption: false,
        types: [this.jsonFileType()],
      });
      await this.writeToHandle(handle, bundle);
      this.fileHandle = handle;
      this.fileName.set(handle.name);
      this.rememberedFileName.set(handle.name);
      await this.storeHandle(handle);
    } catch (error: unknown) {
      // Session is already active in IndexedDB; ignoring save-picker cancel/block is OK.
      if (!this.isUserCancellation(error) && !this.isNotAllowed(error)) {
        throw this.toFriendlyFileError(error, 'create');
      }
    }
  }

  async writeCurrent(bundle: BackupBundle): Promise<void> {
    if (!this.active()) throw new Error('Open or create an Avena data file first.');

    const payload: BackupBundle = { ...bundle, exportedAt: new Date().toISOString() };
    await this.writeSession({
      fileName: this.fileName() || 'avena-data.json',
      lastSavedAt: payload.exportedAt,
      bundle: payload,
    });
    this.lastSavedAt.set(payload.exportedAt);

    // Best-effort mirror to a linked disk file.
    const handle = this.fileHandle;
    if (!handle) return;
    try {
      const allowed = await this.ensureReadWrite(handle);
      if (!allowed) return;
      await this.writeToHandle(handle, payload, false);
    } catch {
      // Keep IndexedDB as source of truth if the disk mirror fails.
    }
  }

  /** Download the current (or provided) bundle as a JSON file. Always works. */
  async downloadBackup(bundle: BackupBundle, suggestedName = 'avena-data.json'): Promise<void> {
    const payload: BackupBundle = { ...bundle, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = suggestedName;
    anchor.click();
    URL.revokeObjectURL(url);
    this.lastSavedAt.set(payload.exportedAt);
  }

  /** Optional: link a disk file for mirroring (fresh user click required). */
  async linkDiskFile(bundle: BackupBundle): Promise<void> {
    this.requireFileApi();
    try {
      const handle = await this.fileApi().showSaveFilePicker({
        suggestedName: this.fileName() || 'avena-data.json',
        excludeAcceptAllOption: false,
        types: [this.jsonFileType()],
      });
      await this.writeToHandle(handle, bundle);
      this.fileHandle = handle;
      this.fileName.set(handle.name);
      this.rememberedFileName.set(handle.name);
      await this.storeHandle(handle);
      await this.writeSession({
        fileName: handle.name,
        lastSavedAt: this.lastSavedAt(),
        bundle: { ...bundle, exportedAt: this.lastSavedAt() || new Date().toISOString() },
      });
    } catch (error: unknown) {
      if (this.isUserCancellation(error)) throw error;
      throw this.toFriendlyFileError(error, 'open');
    }
  }

  async saveTextFile(contents: string, suggestedName: string, mimeType: string, extension: string): Promise<void> {
    if (this.fileApiSupported()) {
      try {
        const handle = await this.fileApi().showSaveFilePicker({
          suggestedName,
          excludeAcceptAllOption: false,
          types: [{
            description: extension.toUpperCase().replace('.', '') + ' file',
            accept: { [mimeType]: [extension] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(new Blob([contents], { type: `${mimeType};charset=utf-8` }));
        await writable.close();
        return;
      } catch (error: unknown) {
        if (this.isUserCancellation(error)) throw error;
        // Fall through to download.
      }
    }

    const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = suggestedName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  disconnect(): void {
    this.active.set(false);
    this.fileHandle = null;
    this.fileName.set('');
    this.rememberedFileName.set('');
    this.lastSavedAt.set('');
    this.pendingOpenFileName.set('');
    void this.deleteSession();
    void this.deleteStoredHandle();
  }

  // Compatibility shims used by older UI wiring.
  clearPendingOpen(): void {
    this.pendingOpenFileName.set('');
  }

  isUserCancellation(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
  }

  private async activateSession(bundle: BackupBundle, fileName: string): Promise<void> {
    const exportedAt = bundle.exportedAt || new Date().toISOString();
    await this.writeSession({ fileName, lastSavedAt: exportedAt, bundle });
    this.active.set(true);
    this.fileName.set(fileName);
    this.rememberedFileName.set(fileName);
    this.lastSavedAt.set(exportedAt);
    this.pendingOpenFileName.set('');
  }

  private pickJsonFileWithInput(): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';

      const cleanup = () => {
        input.removeEventListener('change', onChange);
        input.removeEventListener('cancel', onCancel);
        input.remove();
      };

      const onChange = () => {
        const selected = input.files?.[0];
        cleanup();
        if (!selected) {
          reject(new DOMException('The user aborted a request.', 'AbortError'));
          return;
        }
        resolve(selected);
      };

      const onCancel = () => {
        cleanup();
        reject(new DOMException('The user aborted a request.', 'AbortError'));
      };

      input.addEventListener('change', onChange);
      input.addEventListener('cancel', onCancel);
      document.body.appendChild(input);
      input.click();
    });
  }

  private async ensureReadWrite(handle: NativeFileHandle): Promise<boolean> {
    if (!handle.queryPermission || !handle.requestPermission) return true;
    const mode = { mode: 'readwrite' as const };
    if ((await handle.queryPermission(mode)) === 'granted') return true;
    try {
      return (await handle.requestPermission(mode)) === 'granted';
    } catch {
      return false;
    }
  }

  private async writeToHandle(handle: NativeFileHandle, bundle: BackupBundle, updateTimestamp = true): Promise<void> {
    const writable = await handle.createWritable();
    const payload: BackupBundle = { ...bundle, exportedAt: new Date().toISOString() };
    await writable.write(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    await writable.close();
    if (updateTimestamp) this.lastSavedAt.set(payload.exportedAt);
  }

  private parseBundle(text: string): BackupBundle {
    const normalized = text.replace(/^\uFEFF/, '').trim();
    if (!normalized) {
      throw new Error(
        'That file is empty. Use Documents\\avena-data.json (restored copy), or Documents\\Avena Quotation System\\avena-data.json after refresh.',
      );
    }

    let value: unknown;
    try {
      value = JSON.parse(normalized);
    } catch {
      const preview = normalized.slice(0, 40).replace(/\s+/g, ' ');
      throw new Error(
        `Not valid JSON (“${preview}${normalized.length > 40 ? '…' : ''}”). Choose avena-data.json — the file that starts with { "version": 1 }.`,
      );
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('This file is not a supported Avena data file (expected a JSON object).');
    }

    const version = (value as { version?: unknown }).version;
    if (version !== 1) {
      throw new Error(
        `This file is not a supported Avena data file (version ${String(version ?? 'missing')}). Expected version 1.`,
      );
    }

    return value as BackupBundle;
  }

  private toFriendlyFileError(error: unknown, action: 'open' | 'create' | 'save' | 'reconnect'): Error {
    if (error instanceof Error && !(error instanceof DOMException) && !this.isNotAllowed(error)) {
      return error;
    }
    if (this.isNotAllowed(error)) {
      return new Error(
        action === 'create'
          ? 'Chrome blocked the save dialog. Your new data is still saved in this browser — use Download backup anytime.'
          : 'Chrome blocked disk file access. Your data is saved in this browser — use Download backup for a JSON copy.',
      );
    }
    return error instanceof Error ? error : new Error('Unable to access the Avena data file.');
  }

  private isNotAllowed(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'NotAllowedError';
  }

  private openDb(name: string, store: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async readSession(): Promise<SessionRecord | null> {
    const db = await this.openDb(this.dbName, this.storeName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).get(this.sessionKey);
      req.onsuccess = () => resolve((req.result as SessionRecord | undefined) ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  private async writeSession(record: SessionRecord): Promise<void> {
    const db = await this.openDb(this.dbName, this.storeName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(record, this.sessionKey);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  private async deleteSession(): Promise<void> {
    try {
      const db = await this.openDb(this.dbName, this.storeName);
      await new Promise<void>(resolve => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).delete(this.sessionKey);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }

  private readStoredHandle(): Promise<NativeFileHandle | null> {
    return new Promise(resolve => {
      const request = indexedDB.open(this.handleDbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.handleStoreName);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(this.handleStoreName, 'readonly');
        const getRequest = tx.objectStore(this.handleStoreName).get(this.handleKey);
        getRequest.onsuccess = () => {
          resolve((getRequest.result as NativeFileHandle | undefined) ?? null);
          db.close();
        };
        getRequest.onerror = () => { resolve(null); db.close(); };
      };
      request.onerror = () => resolve(null);
    });
  }

  private storeHandle(handle: NativeFileHandle): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.handleDbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.handleStoreName);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(this.handleStoreName, 'readwrite');
        tx.objectStore(this.handleStoreName).put(handle, this.handleKey);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private deleteStoredHandle(): Promise<void> {
    return new Promise(resolve => {
      const request = indexedDB.open(this.handleDbName, 1);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.handleStoreName)) {
          db.close();
          resolve();
          return;
        }
        const tx = db.transaction(this.handleStoreName, 'readwrite');
        tx.objectStore(this.handleStoreName).delete(this.handleKey);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => resolve();
      };
      request.onerror = () => resolve();
    });
  }

  private detectFileApiSupport(): boolean {
    if (typeof window === 'undefined') return false;
    const candidate = window as Partial<FileSystemWindow>;
    return window.isSecureContext && typeof candidate.showSaveFilePicker === 'function';
  }

  private requireFileApi(): void {
    if (!this.fileApiSupported()) {
      throw new Error('Disk file linking requires Chrome or Edge on HTTPS (or localhost).');
    }
  }

  private fileApi(): FileSystemWindow {
    return window as unknown as FileSystemWindow;
  }

  private jsonFileType(): FilePickerType {
    return {
      description: 'Avena JSON data file',
      accept: { 'application/json': ['.json'] },
    };
  }
}
