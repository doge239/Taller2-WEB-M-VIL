import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Mensajes al usuario (MatSnackBar) y traducción de errores de la API. */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly snackBar = inject(MatSnackBar);

  exito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3500 });
  }

  error(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 6000,
      panelClass: 'snack-error',
    });
  }

  /** Extrae un texto legible de un error de FastAPI (string o lista de 422). */
  mensajeDeError(err: unknown, porDefecto = 'Ocurrió un error inesperado'): string {
    if (!(err instanceof HttpErrorResponse)) return porDefecto;
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. ¿Está encendido el backend?';
    }
    const detalle = err.error?.detail;
    if (typeof detalle === 'string') return detalle;
    if (Array.isArray(detalle) && detalle.length > 0) {
      return detalle
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const campo = d.loc?.[d.loc.length - 1];
          return campo ? `${String(campo)}: ${d.msg}` : (d.msg ?? '');
        })
        .join(' · ');
    }
    return porDefecto;
  }

  errorDesde(err: unknown, porDefecto?: string): void {
    this.error(this.mensajeDeError(err, porDefecto));
  }
}
