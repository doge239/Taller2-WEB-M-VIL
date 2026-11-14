from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..schemas.sesiones import SesionEntrada, SesionPublica
from ..security import get_current_user
from .dependencies import obtener_asignatura_propia

router = APIRouter(prefix="/api/asignaturas/{asignatura_id}/sesiones", tags=["sesiones de estudio"])


@router.get("", response_model=list[SesionPublica])
def listar_sesiones(asignatura_id: int = Path(gt=0), db: Session = Depends(get_db),
                    usuario: models.Usuario = Depends(get_current_user)):
    obtener_asignatura_propia(db, asignatura_id, usuario.id)
    return db.scalars(select(models.SesionEstudio).where(
        models.SesionEstudio.asignatura_id == asignatura_id
    ).order_by(models.SesionEstudio.inicio.desc()).limit(100)).all()


@router.post("", response_model=SesionPublica, status_code=201)
def guardar_sesion(datos: SesionEntrada, asignatura_id: int = Path(gt=0),
                   db: Session = Depends(get_db), usuario: models.Usuario = Depends(get_current_user)):
    obtener_asignatura_propia(db, asignatura_id, usuario.id)
    existente = db.scalar(select(models.SesionEstudio).where(models.SesionEstudio.clave == str(datos.clave)))
    if existente:
        if existente.asignatura_id != asignatura_id:
            raise HTTPException(409, "La clave de sesión ya está en uso")
        return existente
    valores = datos.model_dump()
    valores["clave"] = str(datos.clave)
    sesion = models.SesionEstudio(**valores, asignatura_id=asignatura_id)
    db.add(sesion)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existente = db.scalar(select(models.SesionEstudio).where(models.SesionEstudio.clave == str(datos.clave)))
        if existente and existente.asignatura_id == asignatura_id:
            return existente
        raise HTTPException(409, "No se pudo guardar la sesión con esa clave") from None
    db.refresh(sesion)
    return sesion


@router.delete("/{sesion_id}", status_code=204)
def eliminar_sesion(asignatura_id: int = Path(gt=0), sesion_id: int = Path(gt=0),
                     db: Session = Depends(get_db), usuario: models.Usuario = Depends(get_current_user)):
    obtener_asignatura_propia(db, asignatura_id, usuario.id)
    sesion = db.scalar(select(models.SesionEstudio).where(
        models.SesionEstudio.id == sesion_id, models.SesionEstudio.asignatura_id == asignatura_id))
    if not sesion:
        raise HTTPException(404, "Sesión no encontrada")
    db.delete(sesion)
    db.commit()
