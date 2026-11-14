import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { SesionEstudio } from '../../models/estudio.models';
import { EstudioService } from '../../services/estudio.service';
import { LugarEstudio, MovilService } from '../../services/movil.service';
import { NotificacionService } from '../../services/notificacion.service';
import { RelojEstudio } from '../reloj-estudio/reloj-estudio';

@Component({
  selector: 'app-sesiones-estudio',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    RelojEstudio,
  ],
  templateUrl: './sesiones-estudio.html',
  styleUrl: './sesiones-estudio.scss',
})
export class SesionesEstudio {
  readonly asignaturaId = input.required<number>();
  readonly nombre = input.required<string>();
  protected readonly estudio = inject(EstudioService);
  private readonly movil = inject(MovilService);
  private readonly notificaciones = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly objetivo = signal('');
  protected readonly metaMinutos = signal(25);
  protected readonly progresoBloque = computed(() =>
    Math.min(1, this.estudio.segundos() / ((this.estudio.actual()?.metaMinutos ?? 25) * 60)),
  );
  protected readonly lugar = signal<LugarEstudio | null>(null);
  protected readonly buscandoLugar = signal(false);
  protected readonly errorLugar = signal('');
  protected readonly historial = this.estudio.historial(() => this.asignaturaId());
  protected readonly propia = computed(
    () => this.estudio.actual()?.asignaturaId === this.asignaturaId(),
  );
  protected readonly tiempoTotal = computed(() =>
    this.duracion((this.historial.value() ?? []).reduce((s, v) => s + v.duracion_segundos, 0)),
  );
  protected readonly totalMovimientos = computed(() =>
    (this.historial.value() ?? []).reduce((s, v) => s + v.movimientos, 0),
  );

  protected async ubicar() {
    this.buscandoLugar.set(true);
    this.errorLugar.set('');
    try {
      this.lugar.set(await this.movil.ubicacion());
    } catch (e) {
      this.errorLugar.set(e instanceof Error ? e.message : 'No se pudo obtener la ubicación.');
    } finally {
      this.buscandoLugar.set(false);
    }
  }

  protected async iniciar() {
    if (!this.objetivo().trim() || this.buscandoLugar()) return;
    await this.estudio.iniciar(
      this.asignaturaId(),
      this.nombre(),
      this.objetivo().trim(),
      this.lugar(),
      this.metaMinutos(),
    );
    requestAnimationFrame(() =>
      this.host.nativeElement
        .querySelector('.panel')
        ?.scrollIntoView({ behavior: 'instant', block: 'start' }),
    );
  }

  protected async guardar() {
    try {
      await this.estudio.guardar();
      this.historial.reload();
      this.objetivo.set('');
      this.lugar.set(null);
      this.notificaciones.exito('Sesión guardada en tu historial');
    } catch (e) {
      this.notificaciones.errorDesde(
        e,
        'No se pudo guardar. La sesión sigue aquí para reintentar.',
      );
    }
  }

  protected descartar() {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          titulo: 'Descartar sesión',
          mensaje: 'Se perderán el tiempo y los movimientos de esta sesión sin guardar.',
          textoConfirmar: 'Descartar',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) void this.estudio.descartar();
      });
  }

  protected eliminar(sesion: SesionEstudio) {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          titulo: 'Eliminar sesión',
          mensaje: 'Se eliminarán esta sesión y sus coordenadas del historial.',
          textoConfirmar: 'Eliminar',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok)
          this.estudio.eliminar(this.asignaturaId(), sesion.id).subscribe({
            next: () => this.historial.reload(),
            error: (e) => this.notificaciones.errorDesde(e, 'No se pudo eliminar la sesión'),
          });
      });
  }

  protected mapa(sesion: SesionEstudio) {
    return `https://www.openstreetmap.org/?mlat=${sesion.latitud}&mlon=${sesion.longitud}#map=17/${sesion.latitud}/${sesion.longitud}`;
  }

  protected duracion(segundos: number) {
    return `${Math.floor(segundos / 60)}:${(segundos % 60).toString().padStart(2, '0')}`;
  }
}
