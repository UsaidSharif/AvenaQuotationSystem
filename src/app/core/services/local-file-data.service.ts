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
};

type NativeDirectoryHandle = {
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<NativeFileHandle>;
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
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<NativeDirectoryHandle>;
};

@Injectable({ providedIn: 'root' })
export class LocalFileDataService {
  private readonly handle = signal<NativeFileHandle | null>(null);
  private readonly backupDirectory = signal<NativeDirectoryHandle | null>(null);

  readonly fileName = signal('');
  readonly lastSavedAt = signal('');
  readonly connected = computed(() => this.handle() !== null);
  readonly supported = signal(this.detectSupport());
  readonly automaticBackupConfigured = computed(() => this.backupDirectory() !== null);
  readonly automaticBackupFolderName = computed(() => this.backupDirectory()?.name ?? '');
  readonly lastAutomaticBackupAt = signal('');

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
    this.lastSavedAt.set(bundle.exportedAt || '');
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
  }

  async writeCurrent(bundle: BackupBundle): Promise<void> {
    const handle = this.handle();
    if (!handle) throw new Error('Open or create an Avena data file first.');
    await this.writeToHandle(handle, bundle);
  }

  async configureAutomaticBackupFolder(): Promise<void> {
    this.requireDirectorySupport();
    const directory = await this.fileApi().showDirectoryPicker({ mode: 'readwrite' });
    if (!directory) throw new Error('No backup folder selected.');
    this.backupDirectory.set(directory);
  }

  clearAutomaticBackupFolder(): void {
    this.backupDirectory.set(null);
    this.lastAutomaticBackupAt.set('');
  }

  async automaticBackupCurrent(reason = 'change'): Promise<boolean> {
    const directory = this.backupDirectory();
    const current = this.handle();
    if (!directory || !current) return false;

    const sourceFile = await current.getFile();
    const contents = await sourceFile.text();
    if (!contents.trim()) return false;

    const stamp = this.fileSafeTimestamp(new Date());
    const cleanReason = reason.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'change';
    const backupName = `avena-auto-backup-${stamp}-${cleanReason}.json`;
    const backupHandle = await directory.getFileHandle(backupName, { create: true });
    const writable = await backupHandle.createWritable();
    await writable.write(new Blob([contents], { type: 'application/json' }));
    await writable.close();
    this.lastAutomaticBackupAt.set(new Date().toISOString());
    return true;
  }

  async saveBundleCopy(bundle: BackupBundle, suggestedName: string): Promise<void> {
    this.requireSupport();
    const handle = await this.fileApi().showSaveFilePicker({
      suggestedName,
      excludeAcceptAllOption: false,
      types: [this.jsonFileType()],
    });
    await this.writeToHandle(handle, bundle, false);
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

  readBundleFromFile(file: File): Promise<BackupBundle> {
    return file.text().then(text => this.parseBundle(text));
  }

  disconnect(): void {
    this.handle.set(null);
    this.fileName.set('');
    this.lastSavedAt.set('');
    this.clearAutomaticBackupFolder();
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

  private requireDirectorySupport(): void {
    this.requireSupport();
    const candidate = window as Partial<FileSystemWindow>;
    if (typeof candidate.showDirectoryPicker !== 'function') {
      throw new Error('Automatic folder backups require a current version of Chrome or Edge.');
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

  private fileSafeTimestamp(value: Date): string {
    const pad = (n: number, length = 2) => String(n).padStart(length, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}_${pad(value.getHours())}-${pad(value.getMinutes())}-${pad(value.getSeconds())}-${pad(value.getMilliseconds(), 3)}`;
  }
}
