import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { EstudioService } from '../../services/estudio.service';
import { PreferenciasService } from '../../services/preferencias.service';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-cuenta',
  imports: [MatButtonModule, MatIconModule, MatSlideToggleModule],
  template: `<div class="pagina cuenta">
    <p class="contexto">Preferencias personales</p>
    <h1>Mi cuenta</h1>
    <section class="perfil glass" aria-label="Datos de tu cuenta">
      <div class="avatar" aria-hidden="true">{{ iniciales() }}</div>
      <h2>{{ auth.usuario()?.nombre }}</h2>
      <p>{{ auth.usuario()?.correo }}</p>
      <span class="cuenta-tipo">Cuenta de estudiante</span>
    </section>
    <section class="preferencias glass" aria-labelledby="titulo-preferencias">
      <h2 id="titulo-preferencias">Preferencias de la app</h2>
      <div class="preferencia">
        <div>
          <h3>Reducir animaciones</h3>
          <p>
            Simplifica las transiciones de pantalla. También se respeta la preferencia de movimiento
            del dispositivo.
          </p>
        </div>
        <mat-slide-toggle
          aria-label="Reducir animaciones"
          [checked]="preferencias.reducirMovimiento()"
          (change)="preferencias.cambiarMovimiento($event.checked)"
        />
      </div>
      <div class="informacion">
        <mat-icon aria-hidden="true">info_outline</mat-icon>
        <p>
          Los cálculos usan la escala de notas de 1,0 a 7,0. Puedes ajustar la meta en cada
          asignatura.
        </p>
      </div>
    </section>
    <section class="datos glass">
      <mat-icon aria-hidden="true">lock_outline</mat-icon>
      <div>
        <h2>Tus datos académicos</h2>
        <p>
          Las notas y sesiones están asociadas a tu cuenta. Necesitas conexión para consultar y
          guardar cambios. Guarda las sesiones en curso antes de cerrar la app.
        </p>
      </div>
    </section>
    <button mat-stroked-button class="salir" (click)="salir()">
      <mat-icon>logout</mat-icon>Cerrar sesión
    </button>
  </div>`,
  styles: [
    `
      .cuenta {
        max-width: 760px;
      }
      .contexto {
        color: var(--app-muted);
        font-size: 12px;
        margin: 0 0 10px;
      }
      h1 {
        font-size: 32px;
        font-weight: 650;
        letter-spacing: -0.04em;
        margin: 0 0 28px;
      }
      .perfil {
        text-align: center;
        padding: 32px;
        margin-bottom: 24px;
      }
      .avatar {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
        margin: 0 auto 18px;
        border-radius: 22px;
        background: #e5ecf4;
        color: #466482;
        font-size: 23px;
        font-weight: 600;
      }
      .perfil h2 {
        font-size: 21px;
        font-weight: 600;
        margin: 0 0 8px;
        overflow-wrap: anywhere;
      }
      .perfil p {
        font-size: 13px;
        color: var(--app-muted);
        margin: 0 0 18px;
        overflow-wrap: anywhere;
      }
      .cuenta-tipo {
        font-size: 11px;
        background: #e9eee9;
        color: #4e6954;
        padding: 6px 10px;
        border-radius: 7px;
      }
      .preferencias {
        padding: 26px;
        margin-bottom: 24px;
      }
      .preferencias > h2 {
        font-size: 17px;
        margin: 0 0 24px;
        font-weight: 600;
      }
      .preferencia {
        display: flex;
        gap: 20px;
        align-items: center;
      }
      .preferencia > div {
        flex: 1;
        min-width: 0;
      }
      .preferencia h3 {
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 8px;
      }
      .preferencia p,
      .informacion p,
      .datos p {
        font-size: 12px;
        line-height: 1.8;
        color: var(--app-muted);
        margin: 0;
      }
      .informacion {
        display: flex;
        gap: 12px;
        border-top: 1px solid var(--app-line);
        padding-top: 20px;
        margin-top: 24px;
      }
      .informacion mat-icon,
      .datos > mat-icon {
        color: #6c8096;
        flex-shrink: 0;
      }
      .datos {
        display: flex;
        gap: 16px;
        padding: 26px;
        margin-bottom: 28px;
      }
      .datos h2 {
        font-size: 15px;
        font-weight: 600;
        margin: 0 0 10px;
      }
      .salir {
        width: 100%;
        color: var(--app-red);
      }
      @media (max-width: 400px) {
        .preferencias,
        .datos {
          padding: 20px;
        }
      }
    `,
  ],
})
export class Cuenta {
  protected readonly auth = inject(AuthService);
  protected readonly preferencias = inject(PreferenciasService);
  private readonly estudio = inject(EstudioService);
  private readonly dialog = inject(MatDialog);
  protected readonly iniciales = computed(() =>
    (this.auth.usuario()?.nombre ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase(),
  );
  protected salir() {
    const mensaje = this.estudio.actual()
      ? 'Tienes una sesión de estudio sin guardar. Se descartará al cerrar sesión.'
      : 'Podrás volver a ingresar con tu correo y contraseña.';
    this.dialog
      .open(ConfirmDialog, {
        data: { titulo: 'Cerrar sesión', mensaje, textoConfirmar: 'Cerrar sesión' },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.auth.logout();
      });
  }
}
