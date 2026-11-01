from .asignaturas import router as asignaturas_router
from .auth import router as auth_router
from .evaluaciones import router as evaluaciones_router

__all__ = ["asignaturas_router", "auth_router", "evaluaciones_router"]
