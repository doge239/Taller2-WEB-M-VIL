from pydantic import BaseModel

from .asignaturas import AsignaturaPublica, ResumenAsignatura
from .sesiones import SesionPublica


class AsignaturaPanel(AsignaturaPublica):
    resumen: ResumenAsignatura
    segundos_estudio: int
    sesiones_estudio: int


class ActividadPublica(SesionPublica):
    asignatura_nombre: str


class PanelPublico(BaseModel):
    evaluaciones_pendientes: int
    evaluaciones_calificadas: int
    segundos_estudio: int
    sesiones_estudio: int
    asignaturas: list[AsignaturaPanel]
    actividad: list[ActividadPublica]
