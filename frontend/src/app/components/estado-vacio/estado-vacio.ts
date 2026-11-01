import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Bloque reutilizable para "sin resultados" y para errores de carga. */
@Component({
  selector: 'app-estado-vacio',
  imports: [MatIconModule],
  template: `
    <div class="estado">
      <mat-icon>{{ icono() }}</mat-icon>
      <h3>{{ titulo() }}</h3>
      @if (descripcion()) {
        <p>{{ descripcion() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .estado {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 32px 16px;
      color: var(--mat-sys-on-surface-variant);
      gap: 4px;
    }
    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.7;
    }
    h3 { margin: 8px 0 0; color: var(--mat-sys-on-surface); }
    p { margin: 0 0 12px; }
  `,
})
export class EstadoVacio {
  readonly icono = input('inbox');
  readonly titulo = input.required<string>();
  readonly descripcion = input<string>('');
}
