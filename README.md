# Gestor de Notas Universitarias

Aplicación web para gestionar asignaturas y evaluaciones académicas con cálculo automático de promedios, nota necesaria y estado de la meta. Construida con **Angular 21**, **FastAPI** y **PostgreSQL**.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 + Angular Material 21 |
| Backend | Python 3.12 + FastAPI 0.115 |
| Base de datos | PostgreSQL 17 (Docker) |
| Autenticación | JWT (HS256) + bcrypt/argon2 |
| ORM | SQLAlchemy 2 |

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Python | 3.12 | `python --version` |
| Node.js | 20 LTS | `node --version` |
| npm | 10 | `npm --version` |
| Docker + Docker Compose | 24 / v2 | `docker --version` |

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

## Skills de agentes de IA

Este proyecto integra Skills de la colección pública de
[Anthropic Skills](https://github.com/anthropics/skills), bajo `.github/skills/`.
Se seleccionaron dos Skills relacionadas directamente con este proyecto:

- `webapp-testing`: prueba aplicaciones web locales con Playwright, permite
  verificar flujos del frontend, capturar screenshots y revisar logs del
  navegador. Incluye `scripts/with_server.py` para gestionar servidores.
- `frontend-design`: guía la definición y mejora de una interfaz visual
  intencional, incluyendo paleta, tipografía, composición y estados de la UI.

Las Skills siguen el formato `SKILL.md` y son compatibles con agentes que
implementan el estándar Agent Skills. Para experimentar con ellas, solicita al
agente una prueba del flujo de registro/login usando `webapp-testing`, o una
propuesta de mejora visual de la aplicación usando `frontend-design`.

Para ejecutar `webapp-testing`, instala sus dependencias en el entorno del
backend:

```powershell
cd backend
python -m pip install -r requirements-test.txt
python -m playwright install chromium
```

---

## Configuración inicial

### 1. Copiar las variables de entorno

```bash
# En la raíz del proyecto
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
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

---

## Levantar la base de datos (Docker)

```bash
# Desde la raíz del proyecto
docker compose up -d
```

Verifica que esté sana:
```bash
docker compose ps
# El servicio "db" debe mostrar estado "healthy"
```

Para detenerla (los datos se conservan en el volumen):
```bash
docker compose down
```

---

## Backend (FastAPI)

### Instalar dependencias

```bash
cd backend

# Crear entorno virtual (recomendado)
python -m venv .venv

# Activar en Windows
.venv\Scripts\activate
# Activar en macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

### Ejecutar el servidor

```bash
# Desde la carpeta backend/
uvicorn app.main:app --reload --port 8000
```

El backend queda disponible en:
- API: http://127.0.0.1:8000
- Documentación interactiva: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health

> Las tablas se crean automáticamente en el primer arranque (SQLAlchemy `create_all`).

---

## Frontend (Angular)

```bash
cd frontend

# Instalar dependencias (solo la primera vez)
npm install

# Servidor de desarrollo con proxy al backend
npm start
```

La aplicación queda en: http://localhost:4200

> El archivo `proxy.conf.json` redirige `/api/*` → `http://127.0.0.1:8000` automáticamente,
> por lo que no se necesita configurar CORS en desarrollo local.

---

## Ejecutar los tests del backend

Los tests corren con SQLite en memoria (sin necesidad de Docker):

```bash
cd backend

# Instalar dependencias de test
pip install -r requirements-test.txt

# Ejecutar todos los tests
python -m pytest tests/ -v
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
| `GET` | `/api/asignaturas/{id}` | Obtener asignatura |
| `PUT` | `/api/asignaturas/{id}` | Editar asignatura |
| `DELETE` | `/api/asignaturas/{id}` | Eliminar asignatura |
| `GET` | `/api/asignaturas/{id}/evaluaciones` | Listar evaluaciones |
| `POST` | `/api/asignaturas/{id}/evaluaciones` | Crear evaluación |
| `PUT` | `/api/asignaturas/{id}/evaluaciones/{eid}` | Editar evaluación |
| `DELETE` | `/api/asignaturas/{id}/evaluaciones/{eid}` | Eliminar evaluación |
| `GET` | `/api/asignaturas/{id}/resumen` | Resumen de notas calculado |
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
| `JWT_SECRET` | Secreto para firmar JWT (≥ 32 chars) | `abc123...` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token en minutos | `30` |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos (CSV) | `http://localhost:4200` |
