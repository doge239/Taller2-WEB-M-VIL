from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..schemas.auth import (
    CredencialesUsuario,
    RegistroUsuario,
    TokenUsuario,
    UsuarioPublico,
)
from ..security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UsuarioPublico, status_code=201)
def registrar_usuario(
    datos: RegistroUsuario,
    db: Session = Depends(get_db),
):
    correo = datos.correo
    usuario_existente = (
        db.query(models.Usuario)
        .filter(func.lower(models.Usuario.correo) == correo)
        .first()
    )
    if usuario_existente is not None:
        raise HTTPException(
            status_code=409,
            detail="Ya existe una cuenta con ese correo",
        )

    usuario = models.Usuario(
        nombre=datos.nombre,
        correo=correo,
        password_hash=hash_password(datos.password),
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ya existe una cuenta con ese correo",
        ) from None

    db.refresh(usuario)
    return usuario


@router.post("/login", response_model=TokenUsuario)
def iniciar_sesion(
    datos: CredencialesUsuario,
    db: Session = Depends(get_db),
):
    usuario = (
        db.query(models.Usuario)
        .filter(func.lower(models.Usuario.correo) == datos.correo)
        .first()
    )
    if usuario is None or not verify_password(datos.password, usuario.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token, expires_in = create_access_token(usuario.id)
    return TokenUsuario(
        access_token=token,
        expires_in=expires_in,
        usuario=usuario,
    )


@router.get("/me", response_model=UsuarioPublico)
def usuario_autenticado(
    usuario: models.Usuario = Depends(get_current_user),
):
    return usuario
