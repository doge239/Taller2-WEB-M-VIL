import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from . import models
from .database import get_db

ALGORITHM = "HS256"
ISSUER = "gestor-notas-api"
password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def jwt_settings() -> tuple[str, int]:
    secret = os.getenv("JWT_SECRET")
    if not secret or len(secret.encode("utf-8")) < 32:
        raise RuntimeError(
            "JWT_SECRET debe configurarse con al menos 32 bytes en el archivo .env"
        )

    try:
        expires_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    except ValueError as exc:
        raise RuntimeError(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES debe ser un entero positivo"
        ) from exc

    if expires_minutes <= 0:
        raise RuntimeError(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES debe ser un entero positivo"
        )

    return secret, expires_minutes


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int) -> tuple[str, int]:
    secret, expires_minutes = jwt_settings()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expires_minutes)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "iss": ISSUER,
            "iat": now,
            "exp": expires_at,
        },
        secret,
        algorithm=ALGORITHM,
    )
    return token, expires_minutes * 60


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.Usuario:
    unauthorized = HTTPException(
        status_code=401,
        detail="Token ausente, inválido o vencido",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    secret, _ = jwt_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            secret,
            algorithms=[ALGORITHM],
            issuer=ISSUER,
            options={"require": ["exp", "iss", "sub"]},
        )
    except jwt.InvalidTokenError:
        raise unauthorized from None

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.isdecimal():
        raise unauthorized

    user = db.get(models.Usuario, int(subject))
    if user is None:
        raise unauthorized

    return user
