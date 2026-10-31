from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import models
from .database import Base, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Los modelos deben estar importados antes de crear las tablas.
    Base.metadata.create_all(bind=engine)

    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(
    title="Gestor de notas universitarias",
    description="Etapa 1: base de datos y backend inicial.",
    version="0.1.0",
    lifespan=lifespan,
)


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