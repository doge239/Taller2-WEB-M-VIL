import { Component, Injector, afterNextRender, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from './services/auth.service';
import { AndroidNavigationService } from './services/android-navigation.service';
import { EstudioService } from './services/estudio.service';
import { PreferenciasService } from './services/preferencias.service';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly androidNavigation = inject(AndroidNavigationService);
  protected readonly auth = inject(AuthService);
  protected readonly estudio = inject(EstudioService);
  private readonly preferencias = inject(PreferenciasService);
  private readonly injector = inject(Injector);
  private arranqueListo = false;
  private readonly dialog = inject(MatDialog);

  protected pantallaLista(): void {
    if (this.arranqueListo) return;
    this.arranqueListo = true;
    afterNextRender(
      () => {
        if (Capacitor.getPlatform() !== 'android') return;
        const lanzamiento = registerPlugin<{
          ready(options: { reducedMotion: boolean }): Promise<void>;
        }>('AppLaunch');
        void lanzamiento
          .ready({
            reducedMotion: document.documentElement.classList.contains('movimiento-reducido'),
          })
          .catch(() => undefined); // Android retira igualmente el splash si se alcanza el límite de seguridad.
      },
      { injector: this.injector },
    );
  }

  protected cerrarSesion(): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          titulo: 'Cerrar sesión',
          mensaje: this.estudio.actual()
            ? 'Tienes una sesión de estudio sin guardar. Se descartará al cerrar sesión.'
            : 'Podrás volver a ingresar con tu correo y contraseña.',
          textoConfirmar: 'Cerrar sesión',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.auth.logout();
      });
  }
}
