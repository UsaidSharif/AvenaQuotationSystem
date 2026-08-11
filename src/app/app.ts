import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStoreService } from './core/services/app-store.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly store = inject(AppStoreService);
  readonly pwaUpdate = inject(PwaUpdateService);
  readonly menuOpen = signal(false);
  readonly online = signal(navigator.onLine);
  readonly fileBusy = signal(false);
  readonly fileMessage = signal('');
  readonly fileError = signal('');

  toggleMenu(): void { this.menuOpen.update(value => !value); }
  closeMenu(): void { this.menuOpen.set(false); }

  async openDataFile(): Promise<void> {
    await this.runFileAction(() => this.store.openDataFile(), 'Data file opened successfully.');
  }

  async createDataFile(): Promise<void> {
    await this.runFileAction(() => this.store.createNewDataFile(), 'New Avena data file created.');
  }

  @HostListener('window:online') setOnline(): void { this.online.set(true); }
  @HostListener('window:offline') setOffline(): void { this.online.set(false); }

  private async runFileAction(action: () => Promise<void>, successMessage: string): Promise<void> {
    this.fileError.set('');
    this.fileMessage.set('');
    this.fileBusy.set(true);
    try {
      await action();
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
