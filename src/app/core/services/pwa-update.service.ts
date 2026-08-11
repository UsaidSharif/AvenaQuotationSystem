import { Injectable, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  readonly updateAvailable = signal(false);

  constructor(private readonly updates: SwUpdate) {
    if (updates.isEnabled) {
      updates.versionUpdates.pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
      ).subscribe(() => this.updateAvailable.set(true));
    }
  }

  async activate(): Promise<void> {
    if (!this.updates.isEnabled) return;
    await this.updates.activateUpdate();
    location.reload();
  }
}
