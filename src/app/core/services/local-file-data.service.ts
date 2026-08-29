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
  showOpenFilePicker(options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: FilePickerType[];
  }): Promise<NativeFileHandle[]>;
  showSaveFilePicker(options?: {
    suggestedName?: string;
    excludeAcceptAllOption?: boolean;
    types?: FilePickerType[];
  }): Promise<NativeFileHandle>;
};

@Injectable({ providedIn: 'root' })
export class LocalFileDataService {
  private readonly handleDatabaseName = 'avena-file-access';
  private readonly handleStoreName = 'handles';
  private readonly handleKey = 'current-data-file';
  private readonly handle = signal<NativeFileHandle | null>(null);

  readonly fileName = signal('');
  readonly rememberedFileName = signal('');
  readonly lastSavedAt = signal('');
  readonly connected = computed(() => this.handle() !== null);
  readonly supported = signal(this.detectSupport());

  async restoreDataFile(requestPermission = false): Promise<BackupBundle | null> {
    if (!this.supported()) return null;
    const handle = await this.readStoredHandle();
    if (!handle) return null;
    this.rememberedFileName.set(handle.name);
    try {
      const permission = await handle.queryPermission?.({ mode: 'readwrite' });
      if (permission !== 'granted' && requestPermission && handle.requestPermission) {
        const requested = await handle.requestPermission({ mode: 'readwrite' });
        if (requested !== 'granted') return null;
      } else if (permission !== 'granted') {
        return null;
      }
      const file = await handle.getFile();
      const bundle = this.parseBundle(await file.text());
      this.handle.set(handle);
      this.fileName.set(handle.name);
      this.rememberedFileName.set(handle.name);
      this.lastSavedAt.set(bundle.exportedAt || '');
      return bundle;
    } catch {
      return null;
    }
  }

  async openDataFile(): Promise<BackupBundle> {
    this.requireSupport();
    const [handle] = await this.fileApi().showOpenFilePicker({
      multiple: false,
      excludeAcceptAllOption: false,
      types: [this.jsonFileType()],
    });
    if (!handle) throw new Error('No data file selected.');

    const file = await handle.getFile();
    const bundle = this.parseBundle(await file.text());
    this.handle.set(handle);
    this.fileName.set(handle.name);
    this.rememberedFileName.set(handle.name);
    this.lastSavedAt.set(bundle.exportedAt || '');
    await this.storeHandle(handle);
    return bundle;
  }

  async createDataFile(bundle: BackupBundle): Promise<void> {
    this.requireSupport();
    const handle = await this.fileApi().showSaveFilePicker({
      suggestedName: 'avena-data.json',
      excludeAcceptAllOption: false,
      types: [this.jsonFileType()],
    });
    await this.writeToHandle(handle, bundle);
    this.handle.set(handle);
    this.fileName.set(handle.name);
    this.rememberedFileName.set(handle.name);
    await this.storeHandle(handle);
  }

  async writeCurrent(bundle: BackupBundle): Promise<void> {
    const handle = this.handle();
    if (!handle) throw new Error('Open or create an Avena data file first.');
    await this.writeToHandle(handle, bundle);
  }

  async saveTextFile(contents: string, suggestedName: string, mimeType: string, extension: string): Promise<void> {
    this.requireSupport();
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
  }

  disconnect(): void {
    this.handle.set(null);
    this.fileName.set('');
    this.rememberedFileName.set('');
    this.lastSavedAt.set('');
    void this.deleteStoredHandle();
  }

  isUserCancellation(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
  }

  private async writeToHandle(handle: NativeFileHandle, bundle: BackupBundle, updateTimestamp = true): Promise<void> {
    const writable = await handle.createWritable();
    const payload: BackupBundle = { ...bundle, exportedAt: new Date().toISOString() };
    await writable.write(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    await writable.close();
    if (updateTimestamp) this.lastSavedAt.set(payload.exportedAt);
  }

  private readStoredHandle(): Promise<NativeFileHandle | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.handleDatabaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.handleStoreName);
      request.onsuccess = () => {
        const transaction = request.result.transaction(this.handleStoreName, 'readonly');
        const getRequest = transaction.objectStore(this.handleStoreName).get(this.handleKey);
        getRequest.onsuccess = () => resolve((getRequest.result as NativeFileHandle | undefined) ?? null);
        getRequest.onerror = () => reject(getRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private storeHandle(handle: NativeFileHandle): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.handleDatabaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.handleStoreName);
      request.onsuccess = () => {
        const transaction = request.result.transaction(this.handleStoreName, 'readwrite');
        transaction.objectStore(this.handleStoreName).put(handle, this.handleKey);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private deleteStoredHandle(): Promise<void> {
    return new Promise(resolve => {
      const request = indexedDB.open(this.handleDatabaseName, 1);
      request.onsuccess = () => {
        const transaction = request.result.transaction(this.handleStoreName, 'readwrite');
        transaction.objectStore(this.handleStoreName).delete(this.handleKey);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      };
      request.onerror = () => resolve();
    });
  }

  private parseBundle(text: string): BackupBundle {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error('This is not a valid JSON data file.');
    }
    if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) {
      throw new Error('This file is not a supported Avena data file.');
    }
    return value as BackupBundle;
  }

  private detectSupport(): boolean {
    if (typeof window === 'undefined') return false;
    const candidate = window as Partial<FileSystemWindow>;
    return window.isSecureContext
      && typeof candidate.showOpenFilePicker === 'function'
      && typeof candidate.showSaveFilePicker === 'function';
  }

  private requireSupport(): void {
    if (!this.supported()) {
      throw new Error('Direct local-file access requires Chrome or Edge on HTTPS (or localhost).');
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
