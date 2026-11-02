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

TEST_ACADEMIC_DATA = (
    (
        "Programación Web",
        "INF-210",
        "2026-1",
        (
            ("Control de HTML y CSS", 5.8, 30),
            ("Proyecto Angular", 6.4, 40),
            ("Examen final", 5.5, 30),
        ),
    ),
    (
        "Bases de Datos",
        "INF-220",
        "2026-1",
        (
            ("Modelo relacional", 6.1, 25),
            ("Consultas SQL", 5.7, 35),
            ("Proyecto de base de datos", 6.3, 40),
        ),
    ),
    (
        "Ingeniería de Software",
        "INF-230",
        "2026-1",
        (
            ("Requisitos del sistema", 6.0, 30),
            ("Prueba de usabilidad", 6.5, 30),
            ("Entrega final", 6.2, 40),
        ),
    ),
    (
        "Matemática Discreta",
        "MAT-120",
        "2026-1",
        (
            ("Control de lógica", 5.2, 30),
            ("Tarea de grafos", 5.9, 30),
            ("Examen final", 4.8, 40),
        ),
    ),
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

    users = session.scalars(
        select(models.Usuario).where(
            models.Usuario.correo.in_(email for _, email, _ in TEST_USERS)
        )
    ).all()
    subjects_created = 0
    evaluations_created = 0

    for user in users:
        for subject_name, code, semester, evaluations in TEST_ACADEMIC_DATA:
            subject = session.scalar(
                select(models.Asignatura).where(
                    models.Asignatura.usuario_id == user.id,
                    models.Asignatura.codigo == code,
                )
            )
            if subject is None:
                subject = models.Asignatura(
                    nombre=subject_name,
                    codigo=code,
                    semestre=semester,
                    usuario_id=user.id,
                )
                session.add(subject)
                session.flush()
                subjects_created += 1

            existing_evaluations = set(
                session.scalars(
                    select(models.Evaluacion.nombre).where(
                        models.Evaluacion.asignatura_id == subject.id
                    )
                )
            )
            for evaluation_name, grade, weighting in evaluations:
                if evaluation_name in existing_evaluations:
                    continue
                session.add(
                    models.Evaluacion(
                        nombre=evaluation_name,
                        nota=grade,
                        ponderacion=weighting,
                        asignatura_id=subject.id,
                    )
                )
                evaluations_created += 1

    if subjects_created or evaluations_created:
        session.commit()
        logger.info(
            "Datos académicos de prueba creados: %s asignaturas y %s evaluaciones",
            subjects_created,
            evaluations_created,
        )
    return created
