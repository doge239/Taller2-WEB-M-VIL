# Gestor de Notas Universitarias

Aplicación web para organizar asignaturas y evaluaciones, calcular promedios ponderados y estimar la nota necesaria para alcanzar una meta. Incluye autenticación de usuarios y persistencia en PostgreSQL.

## Tecnologías

| Componente | Tecnología |
|---|---|
| Frontend | Angular 21, Angular Material |
| API | FastAPI, Python 3.12 o superior |
| Base de datos | PostgreSQL 17 |
| ORM | SQLAlchemy 2 |
| Autenticación | JWT (HS256) y contraseñas con Argon2id |

## Requisitos

- Python CPython 3.12 o superior. En Windows, usa el lanzador `py` incluido con CPython.
- Node.js 20.19+, 22.12+ o 24+, y npm 10 o superior.
- Docker Desktop con Docker Compose v2.

En Windows, el Python de MSYS no es compatible con el paquete binario `psycopg[binary]` utilizado por el backend. Si `py` no está disponible, instala CPython para Windows desde python.org incluyendo **Python Launcher**, y vuelve a abrir PowerShell.

## Estructura

- `backend/app/models.py`: modelos SQLAlchemy de usuarios, asignaturas y evaluaciones.
- `backend/app/routers/`: endpoints de autenticación, asignaturas y evaluaciones.
- `backend/app/schemas/`: validación de datos de entrada y salida.
- `backend/app/security.py`: hashing de contraseñas y autenticación JWT.
- `backend/app/calculos.py`: cálculos de promedios y notas necesarias.
- `backend/app/database.py`: conexión y sesiones de PostgreSQL.
- `backend/tests/`: pruebas de integración de la API.
- `frontend/src/app/`: interfaz Angular, páginas, componentes y servicios.
- `compose.yaml`: servicio PostgreSQL para desarrollo local.

Cada usuario puede tener varias asignaturas y cada asignatura puede incluir varias evaluaciones. Los datos se guardan en PostgreSQL mediante SQLAlchemy. La base parte sin cuentas precargadas: se crea una cuenta desde la opción de registro de la aplicación.

## Configuración

Desde la raíz del repositorio, crea `.env` a partir de la plantilla si todavía no existe.

**Windows PowerShell**

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

**macOS / Linux**

```bash
if [ ! -f .env ]; then cp .env.example .env; fi
```

Revisa los valores de `.env`. Cambia el secreto JWT por uno aleatorio de al menos 32 caracteres. Puedes generarlo con:

```powershell
py -3 -c "import secrets; print(secrets.token_hex(32))"
```

La plantilla usa el puerto local `5433` para PostgreSQL. Si ese puerto está ocupado, elige otro puerto libre y coloca el mismo valor en `POSTGRES_PORT` dentro de `.env`; Docker Compose y el backend leen ese archivo. No subas `.env` al repositorio: está excluido por `.gitignore`.

## Ejecutar en Windows

Abre tres terminales de PowerShell en la raíz del repositorio y mantenlas abiertas mientras utilizas la aplicación.

### 1. PostgreSQL — Terminal 1

```powershell
docker compose up -d
docker compose ps
```

Espera a que el servicio `db` muestre el estado `healthy` antes de iniciar el backend. Docker guarda los datos en el volumen `notas_data`.

### 2. Backend — Terminal 2

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

La API queda disponible en <http://127.0.0.1:8000>, la documentación interactiva en <http://127.0.0.1:8000/docs> y el estado de la base en <http://127.0.0.1:8000/api/health>. El health check debe responder `{"estado":"ok","base_de_datos":"conectada"}`.

### 3. Frontend — Terminal 3

```powershell
cd frontend
npm.cmd ci
npm.cmd start
```

Abre <http://localhost:4200>. El proxy de desarrollo reenvía las llamadas `/api/*` a la API local del puerto `8000`.

## Ejecutar en macOS o Linux

Prepara `.env` y PostgreSQL desde la raíz del proyecto, igual que en la sección de configuración.

**Terminal 1 — base de datos**

```bash
docker compose up -d
docker compose ps
```

**Terminal 2 — backend**

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 3 — frontend**

```bash
cd frontend
npm ci
npm start
```

## Pruebas del backend

Las pruebas utilizan SQLite en memoria; no requieren iniciar PostgreSQL. Con el entorno virtual creado desde `backend/`, instala las dependencias de prueba y ejecuta pytest.

**Windows PowerShell**

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt
.\.venv\Scripts\python.exe -m pytest tests/ -v
```

**macOS / Linux**

```bash
cd backend
.venv/bin/python -m pip install -r requirements-test.txt
.venv/bin/python -m pytest tests/ -v
```

Las pruebas cubren registro e inicio de sesión, protección JWT, operaciones CRUD, aislamiento de datos entre usuarios, validación de notas y ponderaciones, y cálculos de promedios.

## Funcionalidades

1. Crear una cuenta e iniciar sesión.
2. Crear, editar, listar y eliminar asignaturas.
3. Agregar evaluaciones con su ponderación y nota; una nota puede quedar pendiente.
4. Consultar el promedio parcial y el aporte acumulado.
5. Estimar la nota necesaria en las evaluaciones restantes para alcanzar la meta.

## Seguridad

- Las contraseñas se almacenan como hashes Argon2id.
- Las rutas privadas requieren un JWT firmado con HS256 y con expiración.
- Los datos de asignaturas y evaluaciones se aíslan por usuario autenticado.
- El backend valida las notas y evita que el peso total de evaluaciones supere el 100 %.
- No se incluyen usuarios ni contraseñas de demostración.

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/register` | Registrar usuario |
| `POST` | `/api/auth/login` | Iniciar sesión y obtener un JWT |
| `GET` | `/api/auth/me` | Obtener el usuario autenticado |
| `GET`, `POST` | `/api/asignaturas` | Listar y crear asignaturas |
| `GET`, `PUT`, `DELETE` | `/api/asignaturas/{asignatura_id}` | Consultar, editar y eliminar una asignatura |
| `GET`, `POST` | `/api/asignaturas/{asignatura_id}/evaluaciones` | Listar y crear evaluaciones |
| `GET`, `PUT`, `DELETE` | `/api/asignaturas/{asignatura_id}/evaluaciones/{evaluacion_id}` | Consultar, editar y eliminar una evaluación |
| `GET` | `/api/asignaturas/{asignatura_id}/resumen` | Consultar el resumen calculado de notas |
| `GET` | `/api/health` | Comprobar la conexión a PostgreSQL |

La especificación completa de la API está disponible en <http://127.0.0.1:8000/docs> mientras el backend está en ejecución.

## Detener los servicios

Detén el backend y el frontend con `Ctrl+C` en sus terminales. Desde la raíz, ejecuta `docker compose down` para detener PostgreSQL. Los datos permanecen en el volumen `notas_data`.
