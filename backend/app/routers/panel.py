from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .. import models
from ..calculos import calcular_resumen
from ..database import get_db
from ..schemas.asignaturas import AsignaturaPublica
from ..schemas.panel import PanelPublico
from ..schemas.sesiones import SesionPublica
from ..security import get_current_user

router = APIRouter(prefix="/api/panel", tags=["panel académico"])


@router.get("", response_model=PanelPublico)
def consultar_panel(db: Session = Depends(get_db), usuario: models.Usuario = Depends(get_current_user)):
    # Carga evaluaciones en bloque; evita una petición o consulta por asignatura.
    asignaturas = db.scalars(
        select(models.Asignatura)
        .where(models.Asignatura.usuario_id == usuario.id)
        .options(selectinload(models.Asignatura.evaluaciones))
        .order_by(models.Asignatura.id)
    ).all()
    acumulados = db.execute(
        select(models.SesionEstudio.asignatura_id,
               func.sum(models.SesionEstudio.duracion_segundos), func.count(models.SesionEstudio.id))
        .join(models.Asignatura)
        .where(models.Asignatura.usuario_id == usuario.id)
        .group_by(models.SesionEstudio.asignatura_id)
    ).all()
    estudio = {asignatura_id: (int(segundos), int(cantidad)) for asignatura_id, segundos, cantidad in acumulados}
    fichas = []
    for asignatura in asignaturas:
        segundos, cantidad = estudio.get(asignatura.id, (0, 0))
        fichas.append({**AsignaturaPublica.model_validate(asignatura).model_dump(),
                       "resumen": calcular_resumen(asignatura.id, asignatura.evaluaciones),
                       "segundos_estudio": segundos, "sesiones_estudio": cantidad})
    recientes = db.execute(
        select(models.SesionEstudio, models.Asignatura.nombre)
        .join(models.Asignatura)
        .where(models.Asignatura.usuario_id == usuario.id)
        .order_by(models.SesionEstudio.inicio.desc(), models.SesionEstudio.id.desc()).limit(100)
    ).all()
    return {
        "evaluaciones_pendientes": sum(f["resumen"]["evaluaciones_pendientes"] for f in fichas),
        "evaluaciones_calificadas": sum(f["resumen"]["evaluaciones_calificadas"] for f in fichas),
        "segundos_estudio": sum(f["segundos_estudio"] for f in fichas),
        "sesiones_estudio": sum(f["sesiones_estudio"] for f in fichas),
        "asignaturas": fichas,
        "actividad": [{**SesionPublica.model_validate(s).model_dump(), "asignatura_nombre": nombre}
                      for s, nombre in recientes],
    }
