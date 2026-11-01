import logging
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .security import hash_password

logger = logging.getLogger(__name__)

TEST_USERS = (
    ("Ana Torres", "ana.prueba@example.com", "Notas2026!01"),
    ("Bruno Soto", "bruno.prueba@example.com", "Notas2026!02"),
    ("Camila Rojas", "camila.prueba@example.com", "Notas2026!03"),
    ("Diego Pérez", "diego.prueba@example.com", "Notas2026!04"),
    ("Elena Muñoz", "elena.prueba@example.com", "Notas2026!05"),
    ("Felipe Castro", "felipe.prueba@example.com", "Notas2026!06"),
    ("Gabriela Silva", "gabriela.prueba@example.com", "Notas2026!07"),
    ("Hugo Vargas", "hugo.prueba@example.com", "Notas2026!08"),
    ("Isidora Pérez", "isidora.prueba@example.com", "Notas2026!09"),
    ("Javier Morales", "javier.prueba@example.com", "Notas2026!10"),
)


def seed_test_users(session: Session) -> int:
    if os.getenv("SEED_TEST_USERS", "false").strip().lower() not in {"1", "true", "yes"}:
        return 0

    existing_emails = set(
        session.scalars(
            select(models.Usuario.correo).where(
                models.Usuario.correo.in_(email for _, email, _ in TEST_USERS)
            )
        )
    )
    created = 0
    for name, email, password in TEST_USERS:
        if email in existing_emails:
            continue
        session.add(
            models.Usuario(
                nombre=name,
                correo=email,
                password_hash=hash_password(password),
            )
        )
        created += 1

    if created:
        session.commit()
        logger.info("Cuentas de prueba creadas: %s", created)
    return created
