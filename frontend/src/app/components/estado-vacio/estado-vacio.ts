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
      max-width: 520px;
      margin: 0 auto;
      padding: 48px 20px;
      color: var(--mat-sys-on-surface-variant);
      gap: 4px;
    }
    mat-icon {
      color: #f5c451;
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.7;
    }
    h3 { margin: 8px 0 0; color: #f3f6fa; font-size: 1.25rem; }
    p { margin: 0 0 12px; color: #aab7c8; line-height: 1.5; }
  `,
})
export class EstadoVacio {
  readonly icono = input('inbox');
  readonly titulo = input.required<string>();
  readonly descripcion = input<string>('');
}
