from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models


def obtener_asignatura_propia(
    db: Session,
    asignatura_id: int,
    usuario_id: int,
    bloquear: bool = False,
) -> models.Asignatura:
    consulta = select(models.Asignatura).where(
        models.Asignatura.id == asignatura_id,
        models.Asignatura.usuario_id == usuario_id,
    )
    if bloquear:
        consulta = consulta.with_for_update()
    asignatura = db.scalar(consulta)
    if asignatura is None:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")
    return asignatura
