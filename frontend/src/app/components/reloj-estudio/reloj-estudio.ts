import { Component, input } from '@angular/core';

@Component({
  selector: 'app-reloj-estudio',
  template: `<div class="dial-estudio" [class.dial-pausado]="pausado()">
    <svg viewBox="0 0 220 220" aria-hidden="true">
      <circle class="dial-fondo" cx="110" cy="110" r="97" />
      <circle
        class="dial-progreso"
        cx="110"
        cy="110"
        r="97"
        stroke-dasharray="609.47"
        [style.stroke-dashoffset]="609.47 * (1 - progreso())"
      />
    </svg>
    <div class="dial-centro">
      <div class="reloj" role="timer" aria-label="Tiempo de estudio">{{ tiempo() }}</div>
      <span>Objetivo: {{ metaMinutos() }} min</span>
    </div>
  </div>`,
  styleUrl: './reloj-estudio.scss',
})
export class RelojEstudio {
  readonly tiempo = input.required<string>();
  readonly metaMinutos = input.required<number>();
  readonly progreso = input.required<number>();
  readonly pausado = input(false);
}
