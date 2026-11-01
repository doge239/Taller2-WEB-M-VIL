// Tipos que reflejan los esquemas Pydantic del backend (FastAPI).

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
}

export interface RegistroPayload {
  nombre: string;
  correo: string;
  password: string;
}

export interface LoginPayload {
  correo: string;
  password: string;
}

export interface TokenRespuesta {
  access_token: string;
  token_type: string;
  expires_in: number;
  usuario: Usuario;
}

export interface Asignatura {
  id: number;
  nombre: string;
  codigo: string | null;
  semestre: string;
}

export type AsignaturaPayload = Omit<Asignatura, 'id'>;

export interface Evaluacion {
  id: number;
  nombre: string;
  nota: number | null;
  ponderacion: number;
}

export type EvaluacionPayload = Omit<Evaluacion, 'id'>;

export interface ResumenAsignatura {
  asignatura_id: number;
  evaluaciones_totales: number;
  evaluaciones_calificadas: number;
  evaluaciones_pendientes: number;
  meta: number;
  aporte_acumulado: number;
  promedio_parcial: number | null;
  promedio_final: number | null;
  ponderacion_calificada: number;
  ponderacion_pendiente: number;
  porcentaje_restante: number;
  promedio_necesario: number | null;
  meta_asegurada: boolean;
  meta_inalcanzable: boolean;
  sin_porcentaje_restante: boolean;
}
