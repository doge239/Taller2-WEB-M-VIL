from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SesionEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    clave: UUID
    inicio: datetime
    duracion_segundos: int = Field(gt=0, le=28800, strict=True)
    movimientos: int = Field(ge=0, le=100000, strict=True)
    sensor_disponible: bool
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)
    precision_metros: float | None = Field(default=None, ge=0)
    objetivo: str = Field(min_length=1, max_length=160)

    @field_validator("objetivo")
    @classmethod
    def objetivo_no_vacio(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("Describe qué estudiaste")
        return valor

    @model_validator(mode="after")
    def validar_sesion(self):
        if self.inicio.tzinfo is None:
            raise ValueError("El inicio debe incluir zona horaria")
        transcurrido = (datetime.now(timezone.utc) - self.inicio).total_seconds()
        if transcurrido < -5 or self.duracion_segundos > transcurrido + 5:
            raise ValueError("La duración no puede superar el tiempo transcurrido")
        if (self.latitud is None) != (self.longitud is None):
            raise ValueError("Latitud y longitud deben enviarse juntas")
        if self.latitud is None and self.precision_metros is not None:
            raise ValueError("La precisión requiere coordenadas")
        if not self.sensor_disponible and self.movimientos:
            raise ValueError("No se pueden registrar movimientos sin sensor")
        return self


class SesionPublica(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    clave: str
    asignatura_id: int
    inicio: datetime
    duracion_segundos: int
    movimientos: int
    sensor_disponible: bool
    latitud: float | None
    longitud: float | None
    precision_metros: float | None
    objetivo: str

    @field_validator("inicio")
    @classmethod
    def utc_en_sqlite(cls, valor: datetime) -> datetime:
        return valor.replace(tzinfo=timezone.utc) if valor.tzinfo is None else valor
