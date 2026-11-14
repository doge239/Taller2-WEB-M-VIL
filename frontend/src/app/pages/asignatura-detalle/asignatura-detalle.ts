import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsignaturaFormDialog } from '../../components/asignatura-form-dialog/asignatura-form-dialog';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import { EstadoVacio } from '../../components/estado-vacio/estado-vacio';
import {
  EvaluacionDialogData,
  EvaluacionFormDialog,
} from '../../components/evaluacion-form-dialog/evaluacion-form-dialog';
import { ResumenAsignaturaCmp } from '../../components/resumen-asignatura/resumen-asignatura';
import { Evaluacion } from '../../models/api.models';
import { AsignaturasService } from '../../services/asignaturas.service';
import { EvaluacionesService } from '../../services/evaluaciones.service';
import { NotificacionService } from '../../services/notificacion.service';
import { SesionesEstudio } from '../../components/sesiones-estudio/sesiones-estudio';
import { AsignaturaQr } from '../../components/asignatura-qr/asignatura-qr';
import { EstudioService } from '../../services/estudio.service';

@Component({
  selector: 'app-asignatura-detalle',
  imports: [
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    EstadoVacio,
    ResumenAsignaturaCmp,
    SesionesEstudio,
  ],
  templateUrl: './asignatura-detalle.html',
  styleUrl: './asignatura-detalle.scss',
})
export class AsignaturaDetalle {
  private readonly asignaturasService = inject(AsignaturasService);
  private readonly estudio = inject(EstudioService);
  private readonly evaluacionesService = inject(EvaluacionesService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly notificaciones = inject(NotificacionService);

  /** Parámetro :id de la ruta (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly asignaturaId = computed(() => {
    const n = Number(this.id());
    return Number.isInteger(n) && n > 0 ? n : undefined;
  });

  /** Meta de nota (Signal): al cambiar, el resumen se vuelve a pedir solo. */
  protected readonly meta = signal(4.0);
  protected readonly vista = signal<'notas' | 'estudio'>('notas');

  protected readonly asignatura = this.asignaturasService.detalleResource(() =>
    this.asignaturaId(),
  );
  protected readonly evaluaciones = this.evaluacionesService.listarResource(() =>
    this.asignaturaId(),
  );
  protected readonly resumen = this.evaluacionesService.resumenResource(
    () => this.asignaturaId(),
    () => this.meta(),
  );

  protected readonly columnas = ['nombre', 'ponderacion', 'nota', 'acciones'];

  protected readonly noEncontrada = computed(() => {
    const err = this.asignatura.error();
    return !this.asignaturaId() || (err instanceof HttpErrorResponse && err.status === 404);
  });

  protected readonly ponderacionUsada = computed(() =>
    (this.evaluaciones.value() ?? []).reduce((s, e) => s + e.ponderacion, 0),
  );

  protected readonly mensajeError = computed(() =>
    this.notificaciones.mensajeDeError(
      this.evaluaciones.error() ?? this.asignatura.error(),
      'No se pudo cargar la información',
    ),
  );

  protected cambiarMeta(valor: string): void {
    const n = Number(valor);
    if (!Number.isNaN(n) && valor !== '') {
      this.meta.set(Math.min(7, Math.max(1, n)));
    }
  }

  private recargarNotas(): void {
    this.evaluaciones.reload();
    this.resumen.reload();
  }

  protected editarAsignatura(): void {
    const actual = this.asignatura.value();
    if (!actual) return;
    this.dialog
      .open(AsignaturaFormDialog, { data: actual })
      .afterClosed()
      .subscribe((editada) => {
        if (editada) this.asignatura.reload();
      });
  }

  protected compartirQr(): void {
    const actual = this.asignatura.value();
    if (actual) this.dialog.open(AsignaturaQr, { data: actual });
  }

  protected irAEstudio(): void {
    this.vista.set('estudio');
    requestAnimationFrame(() =>
      document.querySelector('.selector-vista')?.scrollIntoView({
        behavior:
          document.documentElement.classList.contains('movimiento-reducido') ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        block: 'start',
      }),
    );
  }

  protected eliminarAsignatura(): void {
    const actual = this.asignatura.value();
    if (!actual) return;
    if (this.estudio.actual()?.asignaturaId === actual.id) {
      this.notificaciones.error(
        'Guarda o descarta la sesión de estudio antes de eliminar la asignatura.',
      );
      return;
    }
    this.dialog
      .open(ConfirmDialog, {
        data: {
          titulo: 'Eliminar asignatura',
          mensaje: `¿Eliminar "${actual.nombre}", sus evaluaciones y sus sesiones de estudio?`,
          textoConfirmar: 'Eliminar',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.asignaturasService.eliminar(actual.id).subscribe({
          next: () => {
            this.notificaciones.exito('Asignatura eliminada');
            this.router.navigate(['/asignaturas']);
          },
          error: (err) => this.notificaciones.errorDesde(err, 'No se pudo eliminar'),
        });
      });
  }

  protected abrirEvaluacion(evaluacion: Evaluacion | null): void {
    const id = this.asignaturaId();
    if (!id) return;
    const usada = this.ponderacionUsada() - (evaluacion?.ponderacion ?? 0);
    const data: EvaluacionDialogData = {
      asignaturaId: id,
      evaluacion,
      ponderacionUsada: usada,
    };
    this.dialog
      .open(EvaluacionFormDialog, { data })
      .afterClosed()
      .subscribe((guardada) => {
        if (guardada) this.recargarNotas();
      });
  }

  protected eliminarEvaluacion(evaluacion: Evaluacion): void {
    const id = this.asignaturaId();
    if (!id) return;
    this.dialog
      .open(ConfirmDialog, {
        data: {
          titulo: 'Eliminar evaluación',
          mensaje: `¿Eliminar "${evaluacion.nombre}"?`,
          textoConfirmar: 'Eliminar',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.evaluacionesService.eliminar(id, evaluacion.id).subscribe({
          next: () => {
            this.notificaciones.exito('Evaluación eliminada');
            this.recargarNotas();
          },
          error: (err) => this.notificaciones.errorDesde(err, 'No se pudo eliminar'),
        });
      });
  }
}
