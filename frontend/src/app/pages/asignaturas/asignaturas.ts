import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsignaturaFormDialog } from '../../components/asignatura-form-dialog/asignatura-form-dialog';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import { EstadoVacio } from '../../components/estado-vacio/estado-vacio';
import { Asignatura } from '../../models/api.models';
import { AsignaturasService } from '../../services/asignaturas.service';
import { AuthService } from '../../services/auth.service';
import { NotificacionService } from '../../services/notificacion.service';
import { AsignaturaQr } from '../../components/asignatura-qr/asignatura-qr';
import { EstudioService } from '../../services/estudio.service';
import { PanelService } from '../../services/panel.service';
import { ResumenPanel } from '../../components/resumen-panel/resumen-panel';

@Component({
  selector: 'app-asignaturas',
  imports: [
    DecimalPipe,
    ResumenPanel,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    EstadoVacio,
  ],
  templateUrl: './asignaturas.html',
  styleUrl: './asignaturas.scss',
})
export class Asignaturas {
  private readonly service = inject(AsignaturasService);
  private readonly estudio = inject(EstudioService);
  private readonly dialog = inject(MatDialog);
  private readonly notificaciones = inject(NotificacionService);
  protected readonly auth = inject(AuthService);

  /** Recurso reactivo: carga el listado desde la API (GET /api/asignaturas). */
  protected readonly lista = this.service.listarResource();
  protected readonly panel = inject(PanelService).recurso();
  protected readonly fecha = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  protected readonly categoria = signal<'todas' | 'pendientes'>('todas');
  protected readonly resumenes = computed(
    () => new Map((this.panel.value()?.asignaturas ?? []).map((a) => [a.id, a.resumen])),
  );
  protected readonly asignaturasPendientes = computed(
    () =>
      (this.panel.value()?.asignaturas ?? []).filter((a) => a.resumen.evaluaciones_pendientes > 0)
        .length,
  );

  // Signals de filtros de búsqueda.
  protected readonly texto = signal('');
  protected readonly semestre = signal('');

  protected readonly semestres = computed(() => {
    const todas = this.lista.value() ?? [];
    return [...new Set(todas.map((a) => a.semestre))].sort().reverse();
  });

  protected readonly filtradas = computed(() => {
    const t = this.texto().trim().toLowerCase();
    const s = this.semestre();
    return (this.lista.value() ?? []).filter(
      (a) =>
        (this.categoria() === 'todas' ||
          (this.resumenes().get(a.id)?.evaluaciones_pendientes ?? 0) > 0) &&
        (!s || a.semestre === s) &&
        (!t || a.nombre.toLowerCase().includes(t) || (a.codigo ?? '').toLowerCase().includes(t)),
    );
  });

  protected readonly hayFiltros = computed(
    () => !!this.texto().trim() || !!this.semestre() || this.categoria() !== 'todas',
  );

  protected readonly mensajeError = computed(() =>
    this.notificaciones.mensajeDeError(this.lista.error(), 'No se pudieron cargar las asignaturas'),
  );

  protected limpiarFiltros(): void {
    this.texto.set('');
    this.semestre.set('');
    this.categoria.set('todas');
  }

  protected recargar(): void {
    this.lista.reload();
    this.panel.reload();
  }

  protected nueva(): void {
    this.dialog
      .open(AsignaturaFormDialog, { data: null, autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((creada) => {
        if (creada) this.recargar();
      });
  }

  protected importarQr(): void {
    this.dialog
      .open(AsignaturaQr, { data: null })
      .afterClosed()
      .subscribe((datos) => {
        if (!datos) return;
        this.dialog
          .open(AsignaturaFormDialog, { data: datos })
          .afterClosed()
          .subscribe((creada) => {
            if (creada) this.recargar();
          });
      });
  }

  protected editar(asignatura: Asignatura): void {
    this.dialog
      .open(AsignaturaFormDialog, { data: asignatura })
      .afterClosed()
      .subscribe((editada) => {
        if (editada) this.recargar();
      });
  }

  protected eliminar(asignatura: Asignatura): void {
    if (this.estudio.actual()?.asignaturaId === asignatura.id) {
      this.notificaciones.error(
        'Guarda o descarta la sesión de estudio antes de eliminar la asignatura.',
      );
      return;
    }
    this.dialog
      .open(ConfirmDialog, {
        data: {
          titulo: 'Eliminar asignatura',
          mensaje: `¿Eliminar "${asignatura.nombre}"? También se eliminarán sus evaluaciones y sesiones de estudio.`,
          textoConfirmar: 'Eliminar',
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.service.eliminar(asignatura.id).subscribe({
          next: () => {
            this.notificaciones.exito('Asignatura eliminada');
            this.recargar();
          },
          error: (err) => this.notificaciones.errorDesde(err, 'No se pudo eliminar la asignatura'),
        });
      });
  }
}
