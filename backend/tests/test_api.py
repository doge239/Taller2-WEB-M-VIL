import secrets
import unittest
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.database import Base, get_db
from app.main import app
from app.security import ISSUER, hash_password, jwt_settings


class APIIntegrationTests(unittest.TestCase):
    def test_academic_panel_aggregates_only_own_grades_and_study(self):
        import uuid
        self.assertEqual(self.client.get('/api/panel').status_code, 401)
        self.register()
        headers = self.auth_headers()
        empty = self.client.get('/api/panel', headers=headers).json()
        self.assertEqual(empty['asignaturas'], [])
        self.assertEqual(empty['segundos_estudio'], 0)
        subject = self.create_subject(headers)
        self.create_evaluation(headers, subject['id'], 'Certamen', 5, 40)
        self.create_evaluation(headers, subject['id'], 'Examen', None, 60)
        self.client.post(f"/api/asignaturas/{subject['id']}/sesiones", headers=headers, json={
            'clave': str(uuid.uuid4()), 'inicio': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            'duracion_segundos': 1500, 'movimientos': 0, 'sensor_disponible': False, 'objetivo': 'Repasar funciones',
        })
        data = self.client.get('/api/panel', headers=headers)
        self.assertEqual(data.status_code, 200, data.text)
        panel = data.json()
        self.assertEqual(panel['evaluaciones_pendientes'], 1)
        self.assertEqual(panel['evaluaciones_calificadas'], 1)
        self.assertEqual(panel['segundos_estudio'], 1500)
        self.assertEqual(panel['sesiones_estudio'], 1)
        self.assertEqual(panel['asignaturas'][0]['resumen']['promedio_parcial'], 5)
        self.assertEqual(panel['asignaturas'][0]['resumen']['ponderacion_calificada'], 40)
        self.assertEqual(panel['actividad'][0]['asignatura_nombre'], subject['nombre'])
        self.assertEqual(panel['actividad'][0]['objetivo'], 'Repasar funciones')
        self.assert_response_has_no_secrets(data)
        self.register(email='panel@example.com')
        other = self.auth_headers(email='panel@example.com')
        self.assertEqual(self.client.get('/api/panel', headers=other).json(), empty)
        # La eliminación debe reflejarse en el resumen y la actividad del propietario.
        self.client.delete(f"/api/asignaturas/{subject['id']}", headers=headers)
        self.assertEqual(self.client.get('/api/panel', headers=headers).json(), empty)

    def test_study_session_persistence_retry_isolation_and_delete(self):
        import uuid
        self.register()
        headers = self.auth_headers()
        subject = self.create_subject(headers)
        url = f"/api/asignaturas/{subject['id']}/sesiones"
        payload = {
            "clave": str(uuid.uuid4()), "inicio": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
            "duracion_segundos": 240, "movimientos": 3, "sensor_disponible": True,
            "latitud": -33.45, "longitud": -70.66, "precision_metros": 12.5,
            "objetivo": "Repasar derivadas",
        }
        self.assertEqual(self.client.get(url).status_code, 401)
        saved = self.client.post(url, headers=headers, json=payload)
        self.assertEqual(saved.status_code, 201, saved.text)
        self.assertEqual(saved.json()["objetivo"], payload["objetivo"])
        self.assertEqual(saved.json()["latitud"], -33.45)
        self.assertEqual(self.client.post(url, headers=headers, json=payload).json()["id"], saved.json()["id"])
        self.assertEqual(len(self.client.get(url, headers=headers).json()), 1)
        self.register(email="otro@example.com")
        other = self.auth_headers(email="otro@example.com")
        self.assertEqual(self.client.get(url, headers=other).status_code, 404)
        self.assertEqual(self.client.post(url, headers=other, json=payload).status_code, 404)
        item = f"{url}/{saved.json()['id']}"
        self.assertEqual(self.client.delete(item, headers=other).status_code, 404)
        self.assertEqual(self.client.delete(item, headers=headers).status_code, 204)
        self.assertEqual(self.client.get(url, headers=headers).json(), [])

    def test_study_session_rejects_invalid_sensor_location_duration_and_fields(self):
        import uuid
        self.register()
        headers = self.auth_headers()
        subject = self.create_subject(headers)
        url = f"/api/asignaturas/{subject['id']}/sesiones"
        payload = {
            "clave": str(uuid.uuid4()), "inicio": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
            "duracion_segundos": 30, "movimientos": 0, "sensor_disponible": False, "objetivo": "Leer apuntes",
        }
        for invalid in [
            {"latitud": 91, "longitud": 0}, {"latitud": 1}, {"precision_metros": 5},
            {"movimientos": 1}, {"duracion_segundos": 0}, {"duracion_segundos": 999},
            {"duracion_segundos": True}, {"objetivo": "   "}, {"usuario_id": 2},
            {"inicio": datetime.now().isoformat()}, {"inicio": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()},
        ]:
            with self.subTest(invalid=invalid):
                self.assertEqual(self.client.post(url, headers=headers, json=payload | invalid).status_code, 422)
        saved = self.client.post(url, headers=headers, json=payload)
        self.assertEqual(saved.status_code, 201, saved.text)
        self.assertIsNone(saved.json()["latitud"])
        self.assertFalse(saved.json()["sensor_disponible"])

    def setUp(self):
        self.test_password = secrets.token_urlsafe(24)
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_local = sessionmaker(
            bind=self.engine,
            autoflush=False,
            expire_on_commit=False,
        )

        def override_get_db():
            with self.session_local() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def register(self, email="ana@example.com", name="Ana"):
        return self.client.post(
            "/api/auth/register",
            json={
                "nombre": name,
                "correo": email,
                "password": self.test_password,
            },
        )

    def login(self, email="ana@example.com"):
        return self.client.post(
            "/api/auth/login",
            json={"correo": email, "password": self.test_password},
        )

    def create_subject(self, headers, name="Matemática"):
        response = self.client.post(
            "/api/asignaturas",
            headers=headers,
            json={"nombre": name, "codigo": "MAT101", "semestre": "2026-2"},
        )
        self.assertEqual(response.status_code, 201, response.text)
        self.assert_response_has_no_secrets(response)
        return response.json()

    def create_evaluation(self, headers, subject_id, name, grade, weight):
        response = self.client.post(
            f"/api/asignaturas/{subject_id}/evaluaciones",
            headers=headers,
            json={"nombre": name, "nota": grade, "ponderacion": weight},
        )
        self.assert_response_has_no_secrets(response)
        return response

    def auth_headers(self, email="ana@example.com"):
        response = self.login(email)
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def assert_response_has_no_secrets(self, response):
        body = response.text
        self.assertNotIn("password_hash", body)
        self.assertNotIn("JWT_SECRET", body)
        secret, _ = jwt_settings()
        self.assertNotIn(secret, body)

    def test_docs_and_openapi_are_available(self):
        docs = self.client.get("/docs")
        self.assertEqual(docs.status_code, 200)
        self.assertIn("swagger-ui", docs.text.lower())

        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/auth/register", paths)
        self.assertIn("/api/asignaturas/{asignatura_id}/resumen", paths)

    def test_register_login_duplicate_and_wrong_credentials(self):
        registered = self.register()
        self.assertEqual(registered.status_code, 201, registered.text)
        self.assertEqual(registered.json()["correo"], "ana@example.com")
        self.assert_response_has_no_secrets(registered)

        duplicate = self.register(email="ANA@example.com")
        self.assertEqual(duplicate.status_code, 409)

        wrong_password = self.client.post(
            "/api/auth/login",
            json={"correo": "ana@example.com", "password": "incorrecta"},
        )
        self.assertEqual(wrong_password.status_code, 401)

        logged_in = self.login()
        self.assertEqual(logged_in.status_code, 200, logged_in.text)
        self.assert_response_has_no_secrets(logged_in)
        current_user = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {logged_in.json()['access_token']}"},
        )
        self.assertEqual(current_user.json(), registered.json())
        self.assert_response_has_no_secrets(current_user)

    def test_private_routes_reject_missing_invalid_and_expired_tokens(self):
        subject_id = "/api/asignaturas"
        self.assertEqual(self.client.get(subject_id).status_code, 401)
        self.assertEqual(
            self.client.get(
                subject_id,
                headers={"Authorization": "Bearer invalid"},
            ).status_code,
            401,
        )

        secret, _ = jwt_settings()
        now = datetime.now(timezone.utc)
        expired_token = jwt.encode(
            {
                "sub": "1",
                "iss": ISSUER,
                "iat": now - timedelta(minutes=2),
                "exp": now - timedelta(minutes=1),
            },
            secret,
            algorithm="HS256",
        )
        expired = self.client.get(
            subject_id,
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        self.assertEqual(expired.status_code, 401)

    def test_assignments_support_complete_crud_and_ignore_client_owner(self):
        self.register()
        headers = self.auth_headers()

        forged_owner = self.client.post(
            "/api/asignaturas",
            headers=headers,
            json={
                "nombre": "No aceptar propietario",
                "codigo": None,
                "semestre": "2026-2",
                "usuario_id": 999,
            },
        )
        self.assertEqual(forged_owner.status_code, 422)

        subject = self.create_subject(headers)
        subject_id = subject["id"]
        self.assertNotIn("usuario_id", subject)
        self.assertEqual(
            self.client.get("/api/asignaturas", headers=headers).json(),
            [subject],
        )
        self.assertEqual(
            self.client.get(
                f"/api/asignaturas/{subject_id}",
                headers=headers,
            ).json(),
            subject,
        )

        updated = self.client.put(
            f"/api/asignaturas/{subject_id}",
            headers=headers,
            json={
                "nombre": "Matemática II",
                "codigo": None,
                "semestre": "2027-1",
            },
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assert_response_has_no_secrets(updated)
        self.assertEqual(updated.json()["nombre"], "Matemática II")
        self.assertEqual(
            self.client.delete(
                f"/api/asignaturas/{subject_id}",
                headers=headers,
            ).status_code,
            204,
        )
        self.assertEqual(
            self.client.get(
                f"/api/asignaturas/{subject_id}",
                headers=headers,
            ).status_code,
            404,
        )

    def test_evaluations_support_complete_crud_and_pending_grade(self):
        self.register()
        headers = self.auth_headers()
        subject_id = self.create_subject(headers)["id"]

        created = self.create_evaluation(
            headers,
            subject_id,
            "Prueba pendiente",
            None,
            100,
        )
        self.assertEqual(created.status_code, 201, created.text)
        self.assert_response_has_no_secrets(created)
        evaluation_id = created.json()["id"]
        self.assertIsNone(created.json()["nota"])

        listed = self.client.get(
            f"/api/asignaturas/{subject_id}/evaluaciones",
            headers=headers,
        )
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)

        fetched = self.client.get(
            f"/api/asignaturas/{subject_id}/evaluaciones/{evaluation_id}",
            headers=headers,
        )
        self.assertEqual(fetched.status_code, 200, fetched.text)
        self.assert_response_has_no_secrets(fetched)

        updated = self.client.put(
            f"/api/asignaturas/{subject_id}/evaluaciones/{evaluation_id}",
            headers=headers,
            json={"nombre": "Prueba calificada", "nota": 6, "ponderacion": 100},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assert_response_has_no_secrets(updated)
        self.assertEqual(updated.json()["nota"], 6)

        deleted = self.client.delete(
            f"/api/asignaturas/{subject_id}/evaluaciones/{evaluation_id}",
            headers=headers,
        )
        self.assertEqual(deleted.status_code, 204)

    def test_final_average_is_5_6_for_5_at_40_and_6_at_60(self):
        self.register()
        headers = self.auth_headers()
        subject_id = self.create_subject(headers)["id"]
        self.assertEqual(
            self.create_evaluation(headers, subject_id, "Prueba", 5, 40).status_code,
            201,
        )
        self.assertEqual(
            self.create_evaluation(headers, subject_id, "Examen", 6, 60).status_code,
            201,
        )

        summary = self.client.get(
            f"/api/asignaturas/{subject_id}/resumen",
            headers=headers,
        )
        self.assert_response_has_no_secrets(summary)
        summary = summary.json()
        self.assertEqual(summary["promedio_final"], 5.6)
        self.assertEqual(summary["aporte_acumulado"], 5.6)
        self.assertEqual(summary["promedio_parcial"], 5.6)

    def test_partial_average_and_required_grade_for_remaining_weight(self):
        self.register()
        headers = self.auth_headers()
        subject_id = self.create_subject(headers)["id"]
        self.assertEqual(
            self.create_evaluation(headers, subject_id, "Prueba", 5, 40).status_code,
            201,
        )

        summary = self.client.get(
            f"/api/asignaturas/{subject_id}/resumen",
            headers=headers,
        ).json()
        self.assertEqual(summary["aporte_acumulado"], 2.0)
        self.assertEqual(summary["promedio_parcial"], 5.0)
        self.assertIsNone(summary["promedio_final"])
        self.assertEqual(summary["porcentaje_restante"], 60.0)
        self.assertEqual(summary["promedio_necesario"], 3.33)
        self.assertFalse(summary["meta_asegurada"])
        self.assertFalse(summary["meta_inalcanzable"])

    def test_pending_evaluations_and_unregistered_weight_are_remaining(self):
        self.register()
        headers = self.auth_headers()
        subject_id = self.create_subject(headers)["id"]
        self.assertEqual(
            self.create_evaluation(
                headers,
                subject_id,
                "Pendiente",
                None,
                40,
            ).status_code,
            201,
        )

        summary = self.client.get(
            f"/api/asignaturas/{subject_id}/resumen",
            headers=headers,
        ).json()
        self.assertEqual(summary["evaluaciones_pendientes"], 1)
        self.assertEqual(summary["ponderacion_pendiente"], 40.0)
        self.assertEqual(summary["porcentaje_restante"], 100.0)
        self.assertEqual(summary["aporte_acumulado"], 0.0)
        self.assertIsNone(summary["promedio_parcial"])
        self.assertIsNone(summary["promedio_final"])

    def test_out_of_range_grades_are_rejected(self):
        self.register()
        headers = self.auth_headers()
        subject_id = self.create_subject(headers)["id"]

        for grade in (0.99, 7.01):
            with self.subTest(grade=grade):
                response = self.create_evaluation(
                    headers,
                    subject_id,
                    "Nota inválida",
                    grade,
                    10,
                )
                self.assertEqual(response.status_code, 422)

    def test_weight_total_over_100_is_rejected_on_create_and_update(self):
        self.register()
        headers = self.auth_headers()
        subject_id = self.create_subject(headers)["id"]
        first = self.create_evaluation(headers, subject_id, "Primera", 5, 60)
        second = self.create_evaluation(headers, subject_id, "Segunda", None, 40)
        self.assertEqual(first.status_code, 201, first.text)
        self.assertEqual(second.status_code, 201, second.text)

        over_create = self.create_evaluation(
            headers,
            subject_id,
            "Exceso",
            None,
            0.01,
        )
        self.assertEqual(over_create.status_code, 422)

        over_update = self.client.put(
            f"/api/asignaturas/{subject_id}/evaluaciones/{second.json()['id']}",
            headers=headers,
            json={"nombre": "Segunda", "nota": None, "ponderacion": 40.01},
        )
        self.assertEqual(over_update.status_code, 422)

        valid_update = self.client.put(
            f"/api/asignaturas/{subject_id}/evaluaciones/{second.json()['id']}",
            headers=headers,
            json={"nombre": "Segunda", "nota": None, "ponderacion": 40},
        )
        self.assertEqual(valid_update.status_code, 200, valid_update.text)

    def test_second_user_cannot_read_update_or_delete_first_users_data(self):
        self.register()
        first_headers = self.auth_headers()
        subject_id = self.create_subject(first_headers)["id"]
        evaluation = self.create_evaluation(
            first_headers,
            subject_id,
            "Privada",
            5,
            100,
        )
        evaluation_id = evaluation.json()["id"]

        self.assertEqual(self.register("beto@example.com", "Beto").status_code, 201)
        second_headers = self.auth_headers("beto@example.com")

        foreign_subject_paths = [
            f"/api/asignaturas/{subject_id}",
            f"/api/asignaturas/{subject_id}/evaluaciones",
            f"/api/asignaturas/{subject_id}/resumen",
        ]
        for path in foreign_subject_paths:
            with self.subTest(path=path):
                self.assertEqual(
                    self.client.get(path, headers=second_headers).status_code,
                    404,
                )

        self.assertEqual(
            self.client.put(
                f"/api/asignaturas/{subject_id}",
                headers=second_headers,
                json={
                    "nombre": "Modificada",
                    "codigo": None,
                    "semestre": "2026-2",
                },
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(
                f"/api/asignaturas/{subject_id}",
                headers=second_headers,
            ).status_code,
            404,
        )

        foreign_evaluation_path = (
            f"/api/asignaturas/{subject_id}/evaluaciones/{evaluation_id}"
        )
        self.assertEqual(
            self.client.get(foreign_evaluation_path, headers=second_headers).status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                f"/api/asignaturas/{subject_id}/evaluaciones",
                headers=second_headers,
                json={"nombre": "No autorizada", "nota": 1, "ponderacion": 10},
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.put(
                foreign_evaluation_path,
                headers=second_headers,
                json={"nombre": "Modificada", "nota": 1, "ponderacion": 100},
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(
                foreign_evaluation_path,
                headers=second_headers,
            ).status_code,
            404,
        )

        with self.session_local() as db:
            first_user = db.query(models.Usuario).filter_by(
                correo="ana@example.com"
            ).one()
            stored_hash = first_user.password_hash
        self.assertNotEqual(stored_hash, self.test_password)
        self.assertTrue(stored_hash.startswith("$argon2id$"))


if __name__ == "__main__":
    unittest.main()
