import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { formatearDuracion } from '../../config/duracion';

@Component({
  selector: 'app-resumen-panel',
  imports: [RouterLink, MatIconModule],
  template: `<section class="panel-metricas" aria-label="Resumen académico">
    <div class="dato">
      <span class="dato-icono"><mat-icon aria-hidden="true">menu_book</mat-icon></span>
      <div>
        <strong>{{ asignaturas() ?? '—' }}</strong
        ><span>Asignaturas</span>
      </div>
    </div>
    <div class="dato">
      <span class="dato-icono arena"><mat-icon aria-hidden="true">edit_note</mat-icon></span>
      <div>
        <strong>{{ pendientes() ?? '—' }}</strong
        ><span>Notas por registrar</span>
      </div>
    </div>
    <a class="dato dato-enlace" routerLink="/actividad"
      ><span class="dato-icono verde"><mat-icon aria-hidden="true">timer</mat-icon></span>
      <div>
        <strong>{{ segundos() !== undefined ? duracion(segundos()!) : '—' }}</strong
        ><span>Estudio registrado <span aria-hidden="true">↗</span></span>
      </div></a
    >
  </section>`,
  styleUrl: './resumen-panel.scss',
})
export class ResumenPanel {
  readonly asignaturas = input<number>();
  readonly pendientes = input<number>();
  readonly segundos = input<number>();
  protected readonly duracion = formatearDuracion;
}
