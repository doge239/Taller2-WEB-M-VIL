import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { crearQrAsignatura, leerQrAsignatura } from '../../config/asignatura-qr';
import { AsignaturaPayload } from '../../models/api.models';
import { MovilService } from '../../services/movil.service';

@Component({
  selector: 'app-asignatura-qr',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ datos ? 'Compartir asignatura' : 'Importar desde un QR' }}</h2>
    <mat-dialog-content>
      @if (datos) {
        <p>
          Comparte <strong>{{ datos.nombre }}</strong> con tus compañeros.
        </p>
        <p>Solo incluye nombre, código y semestre. Tus notas y sesiones siguen siendo privadas.</p>
        @if (imagen()) {
          <img
            [src]="imagen()"
            alt="Código QR para importar esta asignatura"
            width="280"
            height="280"
          />
        }
        <details>
          <summary>Ver contenido del QR</summary>
          <pre>{{ contenido }}</pre>
        </details>
      } @else {
        <p>
          Escanea el QR que otro compañero comparte desde una asignatura. Podrás revisar los datos
          antes de guardarlos en tu cuenta.
        </p>
        <button mat-flat-button (click)="escanear()" [disabled]="ocupado()">
          <mat-icon>qr_code_scanner</mat-icon>Abrir cámara
        </button>
        <details>
          <summary>Introducir contenido manualmente</summary>
          <p>Si no tienes cámara, pega el contenido de un QR del gestor.</p>
          <mat-form-field appearance="outline"
            ><mat-label>Contenido del QR</mat-label>
            <textarea
              matInput
              rows="4"
              maxlength="2000"
              [value]="texto()"
              (input)="texto.set($any($event.target).value)"
            ></textarea>
          </mat-form-field>
          <button
            mat-stroked-button
            (click)="validar(texto())"
            [disabled]="!texto().trim() || ocupado()"
          >
            Revisar asignatura
          </button>
        </details>
      }
      @if (ocupado()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close [disabled]="ocupado()">
        Cerrar
      </button></mat-dialog-actions
    >
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 480px;
      }
      p {
        line-height: 1.7;
        color: var(--app-muted);
      }
      img {
        display: block;
        margin: 24px auto;
        max-width: 100%;
        height: auto;
        border: 1px solid var(--app-line);
        border-radius: 18px;
      }
      details {
        margin: 24px 0 8px;
      }
      summary {
        cursor: pointer;
        color: var(--app-accent);
        font-size: 13px;
      }
      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font-size: 12px;
        padding: 14px;
        background: var(--app-tint);
        border-radius: 12px;
        color: var(--app-text);
      }
      mat-form-field {
        width: 100%;
      }
      .error {
        color: #856324;
        background: #faf4e7;
        padding: 12px;
        border-radius: 12px;
      }
    `,
  ],
})
export class AsignaturaQr {
  protected readonly datos = inject<AsignaturaPayload | null>(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialogRef<AsignaturaQr, AsignaturaPayload>);
  private readonly movil = inject(MovilService);
  protected readonly imagen = signal('');
  protected readonly texto = signal('');
  protected readonly error = signal('');
  protected readonly ocupado = signal(false);
  protected readonly contenido = this.datos ? crearQrAsignatura(this.datos) : '';

  constructor() {
    if (this.datos) void this.generar();
  }

  private async generar() {
    this.ocupado.set(true);
    try {
      const { default: QRCode } = await import('qrcode');
      this.imagen.set(
        await QRCode.toDataURL(this.contenido, {
          width: 560,
          margin: 3,
          errorCorrectionLevel: 'M',
        }),
      );
    } catch {
      this.error.set('No se pudo generar el QR. Cierra esta ventana y vuelve a intentarlo.');
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async escanear() {
    this.ocupado.set(true);
    this.error.set('');
    try {
      this.validar(await this.movil.escanearQr());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo abrir la cámara.');
    } finally {
      this.ocupado.set(false);
    }
  }

  protected validar(contenido: string) {
    try {
      this.dialog.close(leerQrAsignatura(contenido));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'QR inválido.');
    }
  }
}
