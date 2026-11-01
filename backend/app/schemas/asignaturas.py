from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
)


class AsignaturaEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=120)
    codigo: str | None = Field(default=None, max_length=30)
    semestre: str = Field(min_length=1, max_length=30)

    @field_validator("nombre", "semestre")
    @classmethod
    def validar_texto_requerido(cls, value: str) -> str:
        texto = value.strip()
        if not texto:
            raise ValueError("El campo no puede estar vacío")
        return texto

    @field_validator("codigo")
    @classmethod
    def normalizar_codigo(cls, value: str | None) -> str | None:
        if value is None:
            return None
        codigo = value.strip()
        return codigo or None


class AsignaturaPublica(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    codigo: str | None
    semestre: str


class ResumenAsignatura(BaseModel):
    asignatura_id: int
    evaluaciones_totales: int
    evaluaciones_calificadas: int
    evaluaciones_pendientes: int
    meta: Decimal
    aporte_acumulado: Decimal
    promedio_parcial: Decimal | None
    promedio_final: Decimal | None
    ponderacion_calificada: Decimal
    ponderacion_pendiente: Decimal
    porcentaje_restante: Decimal
    promedio_necesario: Decimal | None
    meta_asegurada: bool
    meta_inalcanzable: bool
    sin_porcentaje_restante: bool

    @field_serializer(
        "meta",
        "aporte_acumulado",
        "promedio_parcial",
        "promedio_final",
        "ponderacion_calificada",
        "ponderacion_pendiente",
        "porcentaje_restante",
        "promedio_necesario",
        when_used="json",
    )
    def serializar_decimal(self, value: Decimal | None) -> float | None:
        return float(value) if value is not None else None
