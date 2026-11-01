from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models
from ..calculos import (
    META_PREDETERMINADA,
    NOTA_MAXIMA,
    NOTA_MINIMA,
    PONDERACION_MAXIMA,
    calcular_resumen,
)
from ..database import get_db
from ..schemas.asignaturas import ResumenAsignatura
from ..schemas.evaluaciones import EvaluacionEntrada, EvaluacionPublica
from ..security import get_current_user
from .dependencies import obtener_asignatura_propia

router = APIRouter(prefix="/api/asignaturas", tags=["evaluaciones"])


def obtener_evaluacion_de_asignatura(
    db: Session,
    asignatura_id: int,
    evaluacion_id: int,
) -> models.Evaluacion:
    evaluacion = db.scalar(
        select(models.Evaluacion).where(
            models.Evaluacion.id == evaluacion_id,
            models.Evaluacion.asignatura_id == asignatura_id,
        )
    )
    if evaluacion is None:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return evaluacion


def obtener_ponderacion_evaluaciones(
    db: Session,
    asignatura_id: int,
    excluir_evaluacion_id: int | None = None,
) -> Decimal:
    consulta = select(func.coalesce(func.sum(models.Evaluacion.ponderacion), 0)).where(
        models.Evaluacion.asignatura_id == asignatura_id
    )
    if excluir_evaluacion_id is not None:
        consulta = consulta.where(models.Evaluacion.id != excluir_evaluacion_id)
    ponderacion = db.scalar(consulta)
    return Decimal(str(ponderacion))


def validar_ponderacion_total(
    ponderacion_existente: Decimal,
    ponderacion_nueva: Decimal,
) -> None:
    if ponderacion_existente + ponderacion_nueva > PONDERACION_MAXIMA:
        raise HTTPException(
            status_code=422,
            detail="La suma de ponderaciones de la asignatura no puede superar 100 %",
        )


@router.get(
    "/{asignatura_id}/evaluaciones",
    response_model=list[EvaluacionPublica],
)
def listar_evaluaciones(
    asignatura_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    obtener_asignatura_propia(db, asignatura_id, usuario.id)
    return db.scalars(
        select(models.Evaluacion)
        .where(models.Evaluacion.asignatura_id == asignatura_id)
        .order_by(models.Evaluacion.id)
    ).all()


@router.post(
    "/{asignatura_id}/evaluaciones",
    response_model=EvaluacionPublica,
    status_code=201,
)
def crear_evaluacion(
    datos: EvaluacionEntrada,
    asignatura_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    obtener_asignatura_propia(db, asignatura_id, usuario.id, bloquear=True)
    ponderacion_actual = obtener_ponderacion_evaluaciones(db, asignatura_id)
    validar_ponderacion_total(ponderacion_actual, datos.ponderacion)

    evaluacion = models.Evaluacion(
        **datos.model_dump(),
        asignatura_id=asignatura_id,
    )
    db.add(evaluacion)
    db.commit()
    db.refresh(evaluacion)
    return evaluacion


@router.get(
    "/{asignatura_id}/evaluaciones/{evaluacion_id}",
    response_model=EvaluacionPublica,
)
def consultar_evaluacion(
    asignatura_id: int = Path(gt=0),
    evaluacion_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    obtener_asignatura_propia(db, asignatura_id, usuario.id)
    return obtener_evaluacion_de_asignatura(db, asignatura_id, evaluacion_id)


@router.put(
    "/{asignatura_id}/evaluaciones/{evaluacion_id}",
    response_model=EvaluacionPublica,
)
def editar_evaluacion(
    datos: EvaluacionEntrada,
    asignatura_id: int = Path(gt=0),
    evaluacion_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    obtener_asignatura_propia(db, asignatura_id, usuario.id, bloquear=True)
    evaluacion = obtener_evaluacion_de_asignatura(
        db,
        asignatura_id,
        evaluacion_id,
    )
    ponderacion_actual = obtener_ponderacion_evaluaciones(
        db,
        asignatura_id,
        excluir_evaluacion_id=evaluacion_id,
    )
    validar_ponderacion_total(ponderacion_actual, datos.ponderacion)

    for campo, valor in datos.model_dump().items():
        setattr(evaluacion, campo, valor)
    db.commit()
    db.refresh(evaluacion)
    return evaluacion


@router.delete(
    "/{asignatura_id}/evaluaciones/{evaluacion_id}",
    status_code=204,
)
def eliminar_evaluacion(
    asignatura_id: int = Path(gt=0),
    evaluacion_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    obtener_asignatura_propia(db, asignatura_id, usuario.id, bloquear=True)
    evaluacion = obtener_evaluacion_de_asignatura(
        db,
        asignatura_id,
        evaluacion_id,
    )
    db.delete(evaluacion)
    db.commit()


@router.get(
    "/{asignatura_id}/resumen",
    response_model=ResumenAsignatura,
)
def resumen_asignatura(
    asignatura_id: int = Path(gt=0),
    meta: Decimal = Query(
        default=META_PREDETERMINADA,
        ge=NOTA_MINIMA,
        le=NOTA_MAXIMA,
    ),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    obtener_asignatura_propia(db, asignatura_id, usuario.id)
    evaluaciones = db.scalars(
        select(models.Evaluacion).where(
            models.Evaluacion.asignatura_id == asignatura_id
        )
    ).all()
    return calcular_resumen(asignatura_id, evaluaciones, meta)
