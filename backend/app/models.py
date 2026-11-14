from decimal import Decimal
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    Boolean,
    ForeignKey,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    correo: Mapped[str] = mapped_column(
        String(254),
        unique=True,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(String(255))

    asignaturas: Mapped[list["Asignatura"]] = relationship(
        back_populates="usuario",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Asignatura(Base):
    __tablename__ = "asignaturas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    codigo: Mapped[str | None] = mapped_column(String(30))
    semestre: Mapped[str] = mapped_column(String(30))

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        index=True,
    )

    usuario: Mapped["Usuario"] = relationship(
        back_populates="asignaturas",
    )

    evaluaciones: Mapped[list["Evaluacion"]] = relationship(
        back_populates="asignatura",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    sesiones: Mapped[list["SesionEstudio"]] = relationship(
        back_populates="asignatura", cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Evaluacion(Base):
    __tablename__ = "evaluaciones"

    __table_args__ = (
        CheckConstraint(
            "nota IS NULL OR (nota >= 1 AND nota <= 7)",
            name="ck_evaluaciones_nota",
        ),
        CheckConstraint(
            "ponderacion > 0 AND ponderacion <= 100",
            name="ck_evaluaciones_ponderacion",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))

    # NULL representa una evaluación todavía sin calificar.
    nota: Mapped[Decimal | None] = mapped_column(Numeric())
    ponderacion: Mapped[Decimal] = mapped_column(Numeric())

    asignatura_id: Mapped[int] = mapped_column(
        ForeignKey("asignaturas.id", ondelete="CASCADE"),
        index=True,
    )

    asignatura: Mapped["Asignatura"] = relationship(
        back_populates="evaluaciones",
    )


class SesionEstudio(Base):
    __tablename__ = "sesiones_estudio"
    __table_args__ = (
        CheckConstraint("duracion_segundos > 0 AND duracion_segundos <= 28800", name="ck_sesion_duracion"),
        CheckConstraint("movimientos >= 0", name="ck_sesion_movimientos"),
        CheckConstraint("latitud IS NULL OR (latitud >= -90 AND latitud <= 90)", name="ck_sesion_latitud"),
        CheckConstraint("longitud IS NULL OR (longitud >= -180 AND longitud <= 180)", name="ck_sesion_longitud"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # Una clave de cliente evita duplicar la sesión al reintentar tras un fallo de red.
    clave: Mapped[str] = mapped_column(String(36), unique=True)
    asignatura_id: Mapped[int] = mapped_column(ForeignKey("asignaturas.id", ondelete="CASCADE"), index=True)
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duracion_segundos: Mapped[int]
    movimientos: Mapped[int]
    sensor_disponible: Mapped[bool] = mapped_column(Boolean)
    latitud: Mapped[float | None] = mapped_column(Float)
    longitud: Mapped[float | None] = mapped_column(Float)
    precision_metros: Mapped[float | None] = mapped_column(Float)
    objetivo: Mapped[str] = mapped_column(String(160))
    asignatura: Mapped["Asignatura"] = relationship(back_populates="sesiones")
