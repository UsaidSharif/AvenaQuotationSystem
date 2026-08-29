import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AppStoreService } from '../../core/services/app-store.service';
import { ExportService } from '../../core/services/export.service';

@Component({
  templateUrl: './backup.page.html',
  styleUrl: './backup.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  async changeFile(): Promise<void> {
    await this.run(() => this.store.openDataFile(), 'Data file changed successfully.');
  }

  async exportCsv(): Promise<void> {
    const csv = this.exporter.quotationCsv(this.store.quotations());
    await this.run(() => this.store.saveQuotationCsv(csv), 'Quotation register CSV saved.');
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
