import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStoreService } from './core/services/app-store.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly store = inject(AppStoreService);
  readonly pwaUpdate = inject(PwaUpdateService);
  readonly menuOpen = signal(false);
  readonly online = signal(navigator.onLine);
  readonly fileBusy = signal(false);
  readonly fileMessage = signal('');
  readonly fileError = signal('');

  constructor() {
    void this.store.initialize();
  }

  toggleMenu(): void { this.menuOpen.update(value => !value); }
  closeMenu(): void { this.menuOpen.set(false); }

  async openDataFile(): Promise<void> {
    await this.runFileAction(
      () => this.store.openDataFile(),
      'Data file opened. Work is saved in this browser; use Download backup for a JSON copy.',
    );
  }

  async createDataFile(): Promise<void> {
    await this.runFileAction(
      () => this.store.createNewDataFile(),
      'New data session created. Use Download backup to keep a JSON copy on disk.',
    );
  }

  @HostListener('window:online') setOnline(): void { this.online.set(true); }
  @HostListener('window:offline') setOffline(): void { this.online.set(false); }

  private async runFileAction(action: () => Promise<void>, successMessage: string): Promise<void> {
    this.fileError.set('');
    this.fileMessage.set('');
    try {
      const pending = action();
      this.fileBusy.set(true);
      await pending;
      this.fileMessage.set(successMessage);
    } catch (error: unknown) {
      if (!this.store.isFilePickerCancellation(error)) {
        this.fileError.set(error instanceof Error ? error.message : 'Unable to access the selected data file.');
      }
    } finally {
      this.fileBusy.set(false);
    }
  }
}
