import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ResumenAsignatura } from '../../models/api.models';

/** Muestra los cálculos de notas que entrega el backend (`/resumen`). */
@Component({
  selector: 'app-resumen-asignatura',
  imports: [DecimalPipe, MatIconModule, MatProgressBarModule],
  templateUrl: './resumen-asignatura.html',
  styleUrl: './resumen-asignatura.scss',
})
export class ResumenAsignaturaCmp {
  readonly resumen = input.required<ResumenAsignatura>();

  protected readonly progreso = computed(() =>
    Math.min(100, Math.max(0, this.resumen().ponderacion_calificada)),
  );

  /** Mensaje principal según el estado de la meta. */
  protected readonly estado = computed(() => {
    const r = this.resumen();
    if (r.evaluaciones_totales === 0) {
      return { tipo: 'neutro', icono: 'info', texto: 'Agrega evaluaciones para ver tus cálculos.' };
    }
    if (r.sin_porcentaje_restante) {
      return r.meta_asegurada
        ? { tipo: 'ok', icono: 'check_circle', texto: `Cerraste con promedio final ${r.promedio_final?.toFixed(2)}: ¡meta alcanzada!` }
        : { tipo: 'mal', icono: 'cancel', texto: `Cerraste con promedio final ${r.promedio_final?.toFixed(2)}: no alcanzaste la meta.` };
    }
    if (r.meta_asegurada) {
      return { tipo: 'ok', icono: 'check_circle', texto: 'Meta asegurada: ya alcanzaste lo necesario con las notas actuales.' };
    }
    if (r.meta_inalcanzable) {
      return { tipo: 'mal', icono: 'warning', texto: 'Con el porcentaje restante ya no es posible alcanzar la meta.' };
    }
    return {
      tipo: 'info',
      icono: 'flag',
      texto: `Necesitas promedio ${r.promedio_necesario?.toFixed(2)} en el ${r.porcentaje_restante}% restante.`,
    };
  });
}
