import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  private readonly clave = 'gestor-notas-movimiento-reducido';
  private readonly sistema = window.matchMedia('(prefers-reduced-motion: reduce)');
  readonly reducirMovimiento = signal(false);

  constructor() {
    try {
      this.reducirMovimiento.set(localStorage.getItem(this.clave) === 'true');
    } catch {
      /* Preferencia solo en memoria. */
    }
    const aplicar = () => {
      document.documentElement.classList.toggle(
        'movimiento-reducido',
        this.reducirMovimiento() || this.sistema.matches,
      );
    };
    this.sistema.addEventListener('change', aplicar);
    inject(DestroyRef).onDestroy(() => this.sistema.removeEventListener('change', aplicar));
    effect(aplicar);
  }

  cambiarMovimiento(reducir: boolean) {
    this.reducirMovimiento.set(reducir);
    try {
      localStorage.setItem(this.clave, String(reducir));
    } catch {
      /* No impide usar la app. */
    }
  }
}
