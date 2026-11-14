# Gestor de Notas Universitarias

La ampliación del **Taller 3** incorpora importación y uso compartido de
asignaturas por QR, sesiones de estudio con GPS y acelerómetro Android,
historial privado y construcción automática del APK con GitHub Actions.
Consulta [ANDROID.md](ANDROID.md) para construir e instalar la aplicación.
Las nuevas rutas requieren iniciar o desplegar el backend actualizado.

La versión Android 1.1 incorpora un panel con promedios y notas pendientes,
actividad de estudio acumulada, navegación inferior y bloques de 15, 25 o 45
minutos. Incluye un inicio nativo animado y una preferencia para reducir el
movimiento desde Cuenta. El panel consume `GET /api/panel` de este backend.

Aplicación web para gestionar asignaturas y evaluaciones académicas con cálculo automático de promedios, nota necesaria y estado de la meta. Construida con **Angular 21**, **FastAPI** y **PostgreSQL**.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 + Angular Material 21 |
| Backend | Python 3.12+ + FastAPI (`>=0.115,<1`) |
| Base de datos | PostgreSQL 17 (Docker) |
| Autenticación | JWT (HS256) + Argon2id |
| ORM | SQLAlchemy 2 |

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Python | 3.12 | `python --version` |
| Node.js | 20.19+, 22.12+ o 24+ | `node --version` |
| npm | 10 | `npm --version` |
| Docker + Docker Compose | 24+ / v2 | `docker --version`, `docker compose version` |

---

## Estructura del proyecto

```
Taller2-WEB-M-VIL/
├── backend/          # API FastAPI
│   ├── app/
│   │   ├── models.py       # Modelos SQLAlchemy
│   │   ├── schemas/        # Esquemas Pydantic
│   │   ├── routers/        # Endpoints REST
│   │   ├── security.py     # JWT y hashing
│   │   ├── calculos.py     # Lógica de notas
│   │   ├── database.py     # Conexión PostgreSQL
│   │   └── main.py         # App FastAPI + CORS
│   ├── tests/
│   │   └── test_api.py     # Tests de integración
│   ├── requirements.txt
│   └── requirements-test.txt
├── frontend/         # SPA Angular
│   └── src/app/
│       ├── pages/          # Login, Registro, Asignaturas, Detalle
│       ├── components/     # Diálogos reutilizables
│       ├── services/       # HTTP + estado reactivo (Signals)
│       ├── guards/         # Protección de rutas
│       └── interceptors/   # JWT automático
├── compose.yaml      # PostgreSQL en Docker
└── .env.example      # Variables de entorno (plantilla)
```

---

## Configuración inicial

### 1. Copiar las variables de entorno

```powershell
# Windows PowerShell, desde la raíz del proyecto
Copy-Item .env.example .env
```

```bash
# macOS / Linux, desde la raíz del proyecto
cp .env.example .env
```

Edita `.env` y completa los valores:

```env
POSTGRES_USER=notas
POSTGRES_PASSWORD=tu_clave_segura_aqui
POSTGRES_DB=gestor_notas
POSTGRES_PORT=55433
POSTGRES_HOST=127.0.0.1
JWT_SECRET=reemplaza_esto_por_un_secreto_de_al_menos_32_caracteres
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=http://localhost:4200
```

> **Importante**: `JWT_SECRET` debe tener al menos 32 caracteres aleatorios.
> Puedes generar uno con: `python -c "import secrets; print(secrets.token_hex(32))"`

El backend crea las tablas al iniciar, pero no inserta usuarios ni contraseñas
de prueba. Cada integrante puede crear su propia cuenta desde `/registro`.
Los datos de cada usuario se guardan en su base PostgreSQL local.

## Levantar el proyecto en Windows

Abre **tres terminales de PowerShell** en la carpeta raíz del proyecto. Ejecuta los pasos en orden: base de datos, backend y frontend. Mantén las terminales del backend y frontend abiertas mientras uses la aplicación.

### 1. Base de datos (Terminal 1)

```powershell
# Desde la raíz. No sobrescribe un .env que ya exista.
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d
docker compose ps
```

Espera a que el servicio `db` muestre `healthy` antes de iniciar el backend. El puerto publicado es el valor de `POSTGRES_PORT` en `.env`; el backend usa ese mismo valor para conectarse. Si cambias el puerto, vuelve a iniciar el servicio con `docker compose up -d`.

### 2. Backend (Terminal 2)

```powershell
cd backend

# Crear el entorno virtual e instalar dependencias (solo la primera vez)
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Iniciar la API
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

El backend queda disponible en:
- API: http://127.0.0.1:8000
- Documentación interactiva: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health

El health check debe responder `{"estado":"ok","base_de_datos":"conectada"}`. Las tablas se crean automáticamente al iniciar la API (SQLAlchemy `create_all`).

### 3. Frontend (Terminal 3)

```powershell
cd frontend

# Instalar dependencias (solo la primera vez)
npm.cmd install

# Servidor de desarrollo con proxy al backend
npm.cmd start
```

Abre http://localhost:4200. Registra una cuenta y crea una asignatura para empezar; no hay usuarios de prueba precargados.

> El archivo `proxy.conf.json` redirige `/api/*` → `http://127.0.0.1:8000` automáticamente,
> por lo que no se necesita configurar CORS en desarrollo local.

### macOS / Linux

Desde la raíz, prepara el entorno con `cp .env.example .env` (si aún no existe) y `docker compose up -d`. En una terminal, inicia el backend con `cd backend && python -m venv .venv && .venv/bin/python -m pip install -r requirements.txt && .venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`. En otra, inicia el frontend con `cd frontend && npm install && npm start`. Espera a que PostgreSQL esté sano antes de iniciar el backend.

### Detener los servicios

Detén backend y frontend con `Ctrl+C` en sus terminales. Para detener PostgreSQL desde la raíz ejecuta `docker compose down`; los datos siguen guardados en el volumen `notas_data`.

### Si no inicia

- Si `db` no llega a `healthy`, revisa que Docker Desktop esté iniciado y que el puerto indicado por `POSTGRES_PORT` esté libre.
- Si falla el health check del backend, confirma que la base esté `healthy` y que `.env` tenga el mismo usuario, clave, base y puerto usados por Docker.
- Si PowerShell bloquea `npm`, usa `npm.cmd` como en los comandos anteriores.
- Si Angular abre pero no puede llamar a la API, confirma que el backend siga ejecutándose en el puerto `8000`.

---

## Ejecutar los tests del backend

Los tests corren con SQLite en memoria (sin necesidad de Docker):

```powershell
cd backend

# Instalar dependencias de test
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt

# Ejecutar todos los tests
.\.venv\Scripts\python.exe -m pytest tests/ -v
```

### Casos de prueba incluidos

| Test | Qué verifica |
|---|---|
| `test_docs_and_openapi_are_available` | `/docs` y `/openapi.json` responden correctamente |
| `test_register_login_duplicate_and_wrong_credentials` | Registro, login, correo duplicado, credenciales incorrectas |
| `test_private_routes_reject_missing_invalid_and_expired_tokens` | Rutas protegidas rechazan tokens ausentes, inválidos y expirados |
| `test_assignments_support_complete_crud_and_ignore_client_owner` | CRUD completo de asignaturas + previene forjar propietario |
| `test_evaluations_support_complete_crud_and_pending_grade` | CRUD completo de evaluaciones con nota pendiente (NULL) |
| `test_final_average_is_5_6_for_5_at_40_and_6_at_60` | Promedio ponderado: 5×40% + 6×60% = 5.6 |
| `test_partial_average_and_required_grade_for_remaining_weight` | Nota necesaria y aporte acumulado parciales |
| `test_pending_evaluations_and_unregistered_weight_are_remaining` | Pendientes y porcentaje sin asignar cuentan como peso restante |
| `test_out_of_range_grades_are_rejected` | Rechaza notas fuera del rango de 1.0 a 7.0 |
| `test_weight_total_over_100_is_rejected_on_create_and_update` | Rechaza ponderaciones acumuladas mayores a 100 % |
| `test_second_user_cannot_read_update_or_delete_first_users_data` | Aislamiento total entre usuarios (404 en datos ajenos) |

---

## Flujo de uso

1. **Registrarse** en `/registro` → el sistema inicia sesión automáticamente
2. **Crear asignaturas** con nombre, código (opcional) y semestre
3. **Agregar evaluaciones** a cada asignatura con ponderación y nota (opcional si está pendiente)
4. **Ver el resumen**: promedio parcial, aporte acumulado, nota necesaria en el porcentaje restante
5. **Ajustar la meta** de nota (por defecto 4.0) para recalcular en tiempo real

---

## Seguridad implementada

- Contraseñas almacenadas con **argon2id** (nunca en texto plano)
- Tokens JWT con expiración configurable, firmados con HS256
- Rutas privadas protegidas en el backend (`get_current_user`) y en el frontend (Guard + Interceptor)
- Aislamiento por `usuario_id`: un usuario nunca puede ver ni modificar datos de otro
- El frontend cierra sesión automáticamente al detectar un 401 (token expirado)
- No hay secretos en el repositorio (`.env` está en `.gitignore`)

---

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/register` | Registrar usuario |
| `POST` | `/api/auth/login` | Iniciar sesión → devuelve JWT |
| `GET` | `/api/auth/me` | Usuario autenticado actual |
| `GET` | `/api/asignaturas` | Listar mis asignaturas |
| `POST` | `/api/asignaturas` | Crear asignatura |
| `GET` | `/api/asignaturas/{asignatura_id}` | Obtener asignatura |
| `PUT` | `/api/asignaturas/{asignatura_id}` | Editar asignatura |
| `DELETE` | `/api/asignaturas/{asignatura_id}` | Eliminar asignatura |
| `GET` | `/api/asignaturas/{asignatura_id}/evaluaciones` | Listar evaluaciones |
| `POST` | `/api/asignaturas/{asignatura_id}/evaluaciones` | Crear evaluación |
| `GET` | `/api/asignaturas/{asignatura_id}/evaluaciones/{evaluacion_id}` | Obtener evaluación |
| `PUT` | `/api/asignaturas/{asignatura_id}/evaluaciones/{evaluacion_id}` | Editar evaluación |
| `DELETE` | `/api/asignaturas/{asignatura_id}/evaluaciones/{evaluacion_id}` | Eliminar evaluación |
| `GET` | `/api/asignaturas/{asignatura_id}/resumen` | Resumen de notas calculado |
| `GET` | `/api/health` | Estado de la base de datos |

Documentación completa e interactiva en **http://127.0.0.1:8000/docs**

---

## Variables de entorno — referencia

| Variable | Descripción | Ejemplo |
|---|---|---|
| `POSTGRES_USER` | Usuario de PostgreSQL | `notas` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `mi_clave_segura` |
| `POSTGRES_DB` | Nombre de la base de datos | `gestor_notas` |
| `POSTGRES_PORT` | Puerto expuesto en el host | `55433` |
| `POSTGRES_HOST` | Host de PostgreSQL | `127.0.0.1` |
| `JWT_SECRET` | Secreto aleatorio local para firmar JWT (≥ 32 chars) | Generar con `secrets.token_hex(32)` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token en minutos | `30` |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos (CSV) | `http://localhost:4200` |
