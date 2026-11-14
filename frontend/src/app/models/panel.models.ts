import { Asignatura, ResumenAsignatura } from './api.models';
import { SesionEstudio } from './estudio.models';

export interface AsignaturaPanel extends Asignatura {
  resumen: ResumenAsignatura;
  segundos_estudio: number;
  sesiones_estudio: number;
}
export interface ActividadEstudio extends SesionEstudio {
  asignatura_nombre: string;
}
export interface PanelAcademico {
  evaluaciones_pendientes: number;
  evaluaciones_calificadas: number;
  segundos_estudio: number;
  sesiones_estudio: number;
  asignaturas: AsignaturaPanel[];
  actividad: ActividadEstudio[];
}
