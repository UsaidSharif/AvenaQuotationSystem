import { Component, inject, signal } from '@angular/core';
import { AppStoreService } from '../../core/services/app-store.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  templateUrl: './backup.page.html',
  styleUrl: './backup.page.scss',
})
export class BackupPage {
  readonly store = inject(AppStoreService);
  private readonly exporter = inject(ExportService);
  readonly message = signal('');
  readonly error = signal('');
  readonly busy = signal(false);

  async saveNow(): Promise<void> {
    await this.run(() => this.store.saveCurrentFile(), 'Current data file saved successfully.');
  }

  async configureAutomaticBackups(): Promise<void> {
    await this.run(() => this.store.configureAutomaticBackupFolder(), 'Automatic backups are enabled for this session.');
  }

  disableAutomaticBackups(): void {
    this.store.clearAutomaticBackupFolder();
    this.message.set('Automatic backups are disabled for this session.');
    this.error.set('');
  }

  async saveBackupCopy(): Promise<void> {
    await this.run(() => this.store.saveBackupCopy(), 'Backup copy saved to the selected location.');
  }

  async exportCsv(): Promise<void> {
    const csv = this.exporter.quotationCsv(this.store.quotations());
    await this.run(() => this.store.saveQuotationCsv(csv), 'Quotation register CSV saved.');
  }

  async restoreBackup(event: Event): Promise<void> {
    this.message.set('');
    this.error.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy.set(true);
    try {
      const bundle = await this.store.readBackupFile(file);
      if (!confirm(`Replace all data in ${this.store.dataFileName()} with this backup?`)) return;
      await this.store.replaceCurrentWithBundle(bundle);
      this.message.set('Backup restored into the current data file.');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Unable to restore this backup.');
    } finally {
      input.value = '';
      this.busy.set(false);
    }
  }

  async reset(): Promise<void> {
    if (!confirm(`Reset ${this.store.dataFileName()} to the original demonstration data?`)) return;
    if (!confirm('This will replace all current records. Save a backup first if needed. Continue?')) return;
    await this.run(() => this.store.resetDemoData(), 'Current data file reset to demo data.');
  }

  closeFile(): void {
    if (!confirm('Close the current data file? Unsaved form changes will be lost.')) return;
    this.store.closeDataFile();
  }

  private async run(action: () => Promise<void>, success: string): Promise<void> {
    this.message.set('');
    this.error.set('');
    this.busy.set(true);
    try {
      await action();
      this.message.set(success);
    } catch (error: unknown) {
      if (!this.store.isFilePickerCancellation(error)) {
        this.error.set(error instanceof Error ? error.message : 'The file operation could not be completed.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
