import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EstudioActivo, SesionEstudio, SesionPayload } from '../models/estudio.models';
import { AuthService } from './auth.service';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LugarEstudio, MovilService } from './movil.service';

@Injectable({ providedIn: 'root' })
export class EstudioService {
  private readonly http = inject(HttpClient);
  private readonly movil = inject(MovilService);
  private readonly auth = inject(AuthService);
  readonly actual = signal<EstudioActivo | null>(null);
  readonly segundos = signal(0);
  readonly movimientos = signal(0);
  readonly aviso = signal('');
  readonly ocupado = signal(false);
  readonly preparando = signal(false);
  readonly reloj = computed(() => {
    const n = this.segundos();
    return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
  });
  private detenerSensor?: () => Promise<void>;
  private intervalo?: ReturnType<typeof setInterval>;
  private acumulado = 0;
  private tramo = 0;
  private ultimoMovimiento = 0;

  constructor() {
    effect(() => { if (!this.auth.autenticado()) void this.descartar(); });
    if (Capacitor.isNativePlatform()) void App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && this.actual()?.estado === 'en_curso') {
        void this.pausar();
        this.aviso.set('Sesión pausada al salir de la app. Pulsa Continuar para reactivar el sensor.');
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.actual()?.estado === 'en_curso') {
        void this.pausar();
        this.aviso.set('Sesión pausada al salir de la app. Pulsa Continuar cuando estés listo.');
      }
    });
    window.addEventListener('beforeunload', event => {
      if (this.actual()) { event.preventDefault(); event.returnValue = ''; }
    });
  }

  historial(id: () => number) {
    return httpResource<SesionEstudio[]>(() => `/api/asignaturas/${id()}/sesiones`);
  }

  async iniciar(asignaturaId: number, nombre: string, objetivo: string, lugar: LugarEstudio | null) {
    if (this.actual() || this.ocupado()) return;
    this.ocupado.set(true);
    this.segundos.set(0); this.movimientos.set(0); this.acumulado = 0;
    this.aviso.set('');
    this.actual.set({ asignaturaId, nombre, objetivo, lugar, clave: crypto.randomUUID(),
      inicio: new Date().toISOString(), sensor: false, estado: 'pausada' });
    try { await this.reanudar(); } finally { this.ocupado.set(false); }
  }

  async reanudar() {
    const a = this.actual();
    if (!a || a.estado !== 'pausada' || this.preparando()) return;
    this.preparando.set(true);
    // Se admite estudiar sin sensor, indicando explícitamente la ausencia de datos.
    try {
      this.detenerSensor = await this.movil.observarMovimiento(magnitud => {
        if (this.actual()?.estado !== 'en_curso') return;
        const ahora = performance.now();
        if (magnitud > 3 && ahora - this.ultimoMovimiento > 3000) {
          this.movimientos.update(n => n + 1); this.ultimoMovimiento = ahora;
        }
      });
      this.actual.update(v => v ? { ...v, sensor: true } : null);
      this.aviso.set('');
    } catch {
      this.aviso.set('Acelerómetro no disponible. La sesión se guardará sin registro de movimientos.');
    }
    if (!this.actual()) { await this.liberar(); this.preparando.set(false); return; }
    this.ultimoMovimiento = performance.now();
    this.tramo = performance.now();
    this.actual.update(v => v ? { ...v, estado: 'en_curso' } : null);
    this.intervalo = setInterval(() => {
      this.segundos.set(Math.min(28800, Math.floor((this.acumulado + performance.now() - this.tramo) / 1000)));
      if (this.segundos() >= 28800) void this.terminar();
    }, 250);
    if (document.hidden) await this.pausar();
    this.preparando.set(false);
  }

  async pausar() {
    if (this.actual()?.estado !== 'en_curso') return;
    this.preparando.set(true);
    this.acumulado += performance.now() - this.tramo;
    this.segundos.set(Math.min(28800, Math.floor(this.acumulado / 1000)));
    this.actual.update(v => v ? { ...v, estado: 'pausada' } : null);
    await this.liberar();
    this.preparando.set(false);
  }

  async terminar() {
    await this.pausar();
    this.actual.update(v => v ? { ...v, estado: 'terminada' } : null);
  }

  async guardar() {
    const a = this.actual();
    if (!a || a.estado !== 'terminada' || this.ocupado() || this.segundos() < 1) return;
    this.ocupado.set(true);
    const payload: SesionPayload = {
      clave: a.clave, inicio: a.inicio, objetivo: a.objetivo,
      duracion_segundos: this.segundos(), movimientos: this.movimientos(), sensor_disponible: a.sensor,
      latitud: a.lugar?.latitud ?? null, longitud: a.lugar?.longitud ?? null,
      precision_metros: a.lugar?.precision_metros ?? null,
    };
    try {
      await firstValueFrom(this.http.post<SesionEstudio>(`/api/asignaturas/${a.asignaturaId}/sesiones`, payload));
      await this.descartar();
    } finally { this.ocupado.set(false); }
  }

  async descartar() {
    this.actual.set(null);
    await this.liberar();
    this.segundos.set(0); this.movimientos.set(0); this.aviso.set(''); this.acumulado = 0;
  }

  eliminar(asignaturaId: number, sesionId: number) {
    return this.http.delete<void>(`/api/asignaturas/${asignaturaId}/sesiones/${sesionId}`);
  }

  private async liberar() {
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = undefined;
    const detener = this.detenerSensor; this.detenerSensor = undefined;
    if (detener) await detener().catch(() => undefined);
  }
}
