import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Evaluacion,
  EvaluacionPayload,
  ResumenAsignatura,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class EvaluacionesService {
  private readonly http = inject(HttpClient);

  private url(asignaturaId: number): string {
    return `/api/asignaturas/${asignaturaId}/evaluaciones`;
  }

  listarResource(asignaturaId: () => number | undefined) {
    return httpResource<Evaluacion[]>(() => {
      const id = asignaturaId();
      return id ? this.url(id) : undefined;
    });
  }

  /** Resumen de cálculos (backend). Se recalcula al cambiar la meta (Signal). */
  resumenResource(asignaturaId: () => number | undefined, meta: () => number) {
    return httpResource<ResumenAsignatura>(() => {
      const id = asignaturaId();
      if (!id) return undefined;
      return {
        url: `/api/asignaturas/${id}/resumen`,
        params: { meta: meta() },
      };
    });
  }

  crear(asignaturaId: number, datos: EvaluacionPayload): Observable<Evaluacion> {
    return this.http.post<Evaluacion>(this.url(asignaturaId), datos);
  }

  editar(
    asignaturaId: number,
    id: number,
    datos: EvaluacionPayload,
  ): Observable<Evaluacion> {
    return this.http.put<Evaluacion>(`${this.url(asignaturaId)}/${id}`, datos);
  }

  eliminar(asignaturaId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.url(asignaturaId)}/${id}`);
  }
}
