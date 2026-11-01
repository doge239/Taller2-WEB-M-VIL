import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Asignatura, AsignaturaPayload } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AsignaturasService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/asignaturas';

  /** Listado reactivo (GET). Debe llamarse en un contexto de inyección. */
  listarResource() {
    return httpResource<Asignatura[]>(() => this.base);
  }

  /** Detalle reactivo: se vuelve a pedir cuando cambia el id (Signal). */
  detalleResource(id: () => number | undefined) {
    return httpResource<Asignatura>(() => {
      const valor = id();
      return valor ? `${this.base}/${valor}` : undefined;
    });
  }

  crear(datos: AsignaturaPayload): Observable<Asignatura> {
    return this.http.post<Asignatura>(this.base, datos);
  }

  editar(id: number, datos: AsignaturaPayload): Observable<Asignatura> {
    return this.http.put<Asignatura>(`${this.base}/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
