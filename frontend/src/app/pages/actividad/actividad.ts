import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { PanelService } from '../../services/panel.service';
import { formatearDuracion } from '../../config/duracion';
import { EstadoVacio } from '../../components/estado-vacio/estado-vacio';

@Component({
  selector: 'app-actividad',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule,
    EstadoVacio,
  ],
  templateUrl: './actividad.html',
  styleUrl: './actividad.scss',
})
export class Actividad {
  protected readonly panel = inject(PanelService).recurso();
  protected readonly duracion = formatearDuracion;
  protected readonly asignatura = signal<number | null>(null);
  protected readonly distribucion = computed(() =>
    [...(this.panel.value()?.asignaturas ?? [])]
      .filter((a) => a.segundos_estudio > 0)
      .sort((a, b) => b.segundos_estudio - a.segundos_estudio),
  );
  protected readonly registros = computed(() =>
    (this.panel.value()?.actividad ?? []).filter(
      (s) => this.asignatura() === null || s.asignatura_id === this.asignatura(),
    ),
  );
}
