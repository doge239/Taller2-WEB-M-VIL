from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable

from .models import Evaluacion

PONDERACION_MAXIMA = Decimal("100")
NOTA_MINIMA = Decimal("1")
NOTA_MAXIMA = Decimal("7")
META_PREDETERMINADA = Decimal("4.0")
REDONDEO_PRESENTACION = Decimal("0.01")


def redondear_para_mostrar(valor: Decimal | None) -> Decimal | None:
    if valor is None:
        return None
    return valor.quantize(REDONDEO_PRESENTACION, rounding=ROUND_HALF_UP)


def calcular_resumen(
    asignatura_id: int,
    evaluaciones: Iterable[Evaluacion],
    meta: Decimal = META_PREDETERMINADA,
) -> dict[str, int | Decimal | bool | None]:
    evaluaciones = list(evaluaciones)
    calificadas = [
        evaluacion for evaluacion in evaluaciones if evaluacion.nota is not None
    ]
    pendientes = [
        evaluacion for evaluacion in evaluaciones if evaluacion.nota is None
    ]
    ponderacion_calificada = sum(
        (evaluacion.ponderacion for evaluacion in calificadas),
        start=Decimal("0"),
    )
    ponderacion_pendiente = sum(
        (evaluacion.ponderacion for evaluacion in pendientes),
        start=Decimal("0"),
    )
    suma_notas_ponderadas = sum(
        (
            evaluacion.nota * evaluacion.ponderacion
            for evaluacion in calificadas
        ),
        start=Decimal("0"),
    )
    aporte_acumulado = suma_notas_ponderadas / PONDERACION_MAXIMA
    promedio_parcial = (
        suma_notas_ponderadas / ponderacion_calificada
        if ponderacion_calificada
        else None
    )
    promedio_final = (
        aporte_acumulado
        if ponderacion_calificada == PONDERACION_MAXIMA
        else None
    )
    porcentaje_restante = PONDERACION_MAXIMA - ponderacion_calificada
    promedio_necesario = (
        (meta - aporte_acumulado) * PONDERACION_MAXIMA / porcentaje_restante
        if porcentaje_restante > 0
        else None
    )
    sin_porcentaje_restante = porcentaje_restante == 0
    meta_asegurada = (
        promedio_necesario <= NOTA_MINIMA
        if promedio_necesario is not None
        else promedio_final is not None and promedio_final >= meta
    )
    meta_inalcanzable = (
        promedio_necesario > NOTA_MAXIMA
        if promedio_necesario is not None
        else promedio_final is not None and promedio_final < meta
    )

    return {
        "asignatura_id": asignatura_id,
        "evaluaciones_totales": len(evaluaciones),
        "evaluaciones_calificadas": len(calificadas),
        "evaluaciones_pendientes": len(pendientes),
        "meta": redondear_para_mostrar(meta),
        "aporte_acumulado": redondear_para_mostrar(aporte_acumulado),
        "promedio_parcial": redondear_para_mostrar(promedio_parcial),
        "promedio_final": redondear_para_mostrar(promedio_final),
        "ponderacion_calificada": redondear_para_mostrar(ponderacion_calificada),
        "ponderacion_pendiente": redondear_para_mostrar(ponderacion_pendiente),
        "porcentaje_restante": redondear_para_mostrar(porcentaje_restante),
        "promedio_necesario": redondear_para_mostrar(promedio_necesario),
        "meta_asegurada": meta_asegurada,
        "meta_inalcanzable": meta_inalcanzable,
        "sin_porcentaje_restante": sin_porcentaje_restante,
    }
