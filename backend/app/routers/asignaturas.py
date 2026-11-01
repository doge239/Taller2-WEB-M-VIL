from fastapi import APIRouter, Depends, Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..schemas.asignaturas import AsignaturaEntrada, AsignaturaPublica
from ..security import get_current_user
from .dependencies import obtener_asignatura_propia

router = APIRouter(prefix="/api/asignaturas", tags=["asignaturas"])

@router.get("", response_model=list[AsignaturaPublica])
def listar_asignaturas(
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    return db.scalars(
        select(models.Asignatura)
        .where(models.Asignatura.usuario_id == usuario.id)
        .order_by(models.Asignatura.id)
    ).all()


@router.post("", response_model=AsignaturaPublica, status_code=201)
def crear_asignatura(
    datos: AsignaturaEntrada,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    asignatura = models.Asignatura(
        **datos.model_dump(),
        usuario_id=usuario.id,
    )
    db.add(asignatura)
    db.commit()
    db.refresh(asignatura)
    return asignatura


@router.get("/{asignatura_id}", response_model=AsignaturaPublica)
def consultar_asignatura(
    asignatura_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    return obtener_asignatura_propia(db, asignatura_id, usuario.id)


@router.put("/{asignatura_id}", response_model=AsignaturaPublica)
def editar_asignatura(
    datos: AsignaturaEntrada,
    asignatura_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    asignatura = obtener_asignatura_propia(db, asignatura_id, usuario.id)
    for campo, valor in datos.model_dump().items():
        setattr(asignatura, campo, valor)
    db.commit()
    db.refresh(asignatura)
    return asignatura


@router.delete("/{asignatura_id}", status_code=204)
def eliminar_asignatura(
    asignatura_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    asignatura = obtener_asignatura_propia(db, asignatura_id, usuario.id)
    db.delete(asignatura)
    db.commit()
