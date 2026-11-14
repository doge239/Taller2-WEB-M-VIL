import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import models
from .database import Base, engine, get_db
from .routers import asignaturas_router, auth_router, evaluaciones_router
from .security import jwt_settings
from .routers.sesiones import router as sesiones_router


def _allowed_origins() -> list[str]:
    """Lee ALLOWED_ORIGINS del entorno (CSV). Por defecto: localhost Angular."""
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    jwt_settings()
    # Los modelos deben estar importados antes de crear las tablas.
    Base.metadata.create_all(bind=engine)

    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(
    title="Gestor de notas universitarias",
    description="API para gestionar notas con autenticación JWT.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: permite que el frontend Angular consuma la API aunque estén en
# orígenes distintos (necesario en producción o sin proxy de desarrollo).
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(asignaturas_router)
app.include_router(evaluaciones_router)
app.include_router(sesiones_router)


@app.get("/")
def inicio():
    return {
        "proyecto": "Gestor de notas universitarias",
        "version": "1.0.0",
        "documentacion": "/docs",
    }


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Base de datos no disponible",
        ) from None

    return {
        "estado": "ok",
        "base_de_datos": "conectada",
    }
