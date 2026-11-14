import { LugarEstudio } from '../services/movil.service';

export interface SesionPayload {
  clave: string;
  inicio: string;
  duracion_segundos: number;
  movimientos: number;
  sensor_disponible: boolean;
  latitud: number | null;
  longitud: number | null;
  precision_metros: number | null;
  objetivo: string;
}
export interface SesionEstudio extends SesionPayload { id: number; asignatura_id: number; }
export interface EstudioActivo {
  asignaturaId: number;
  nombre: string;
  objetivo: string;
  clave: string;
  inicio: string;
  lugar: LugarEstudio | null;
  sensor: boolean;
  estado: 'en_curso' | 'pausada' | 'terminada';
}
