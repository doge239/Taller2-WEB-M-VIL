import { Location } from '@angular/common';
import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class AndroidNavigationService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialogs = inject(MatDialog);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (Capacitor.getPlatform() !== 'android') return;

    const listener = App.addListener('backButton', ({ canGoBack }) => {
      this.zone.run(() => {
        if (this.dialogs.openDialogs.length) {
          this.dialogs.openDialogs.at(-1)?.close();
        } else if (/^\/asignaturas\/[^/?]+/.test(this.router.url)) {
          void this.router.navigateByUrl('/asignaturas');
        } else if (['/login', '/asignaturas'].includes(this.router.url.split('?')[0])) {
          void App.minimizeApp();
        } else if (canGoBack) {
          this.location.back();
        } else {
          void this.router.navigateByUrl('/asignaturas');
        }
      });
    });

    this.destroyRef.onDestroy(() => { void listener.then((handle) => handle.remove()); });
  }
}
