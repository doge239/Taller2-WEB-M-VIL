from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import models
from .database import Base, engine, get_db
from .routers import asignaturas_router, auth_router, evaluaciones_router
from .security import jwt_settings


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
    version="0.2.0",
    lifespan=lifespan,
)
app.include_router(auth_router)
app.include_router(asignaturas_router)
app.include_router(evaluaciones_router)


@app.get("/")
def inicio():
    return {
        "proyecto": "Gestor de notas universitarias",
        "etapa": 1,
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
