from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
)


class EvaluacionEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=120)
    nota: Decimal | None = Field(default=None, ge=1, le=7)
    ponderacion: Decimal = Field(gt=0, le=100)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, value: str) -> str:
        nombre = value.strip()
        if not nombre:
            raise ValueError("El nombre no puede estar vacío")
        return nombre

    @field_validator("nota", "ponderacion")
    @classmethod
    def validar_decimal_finito(cls, value: Decimal | None) -> Decimal | None:
        if value is not None and not value.is_finite():
            raise ValueError("El valor debe ser un número decimal finito")
        return value


class EvaluacionPublica(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    nota: Decimal | None
    ponderacion: Decimal

    @field_serializer("nota", "ponderacion", when_used="json")
    def serializar_decimal(self, value: Decimal | None) -> float | None:
        return float(value) if value is not None else None
