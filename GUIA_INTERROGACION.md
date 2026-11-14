# Guía para la interrogación

## Presentación breve

> Desarrollamos un gestor de notas universitarias. El frontend está hecho en Angular y permite registrarse, iniciar sesión, administrar asignaturas y registrar evaluaciones. Angular consume una API REST construida con FastAPI; la API valida los datos, autentica cada solicitud con JWT y guarda la información en PostgreSQL mediante SQLAlchemy. Cada usuario solo accede a sus propias asignaturas y evaluaciones. El sistema también calcula el promedio parcial, el aporte acumulado y la nota que se necesita para alcanzar una meta.

## Arquitectura

```text
Persona usuaria
    ↓
Angular: páginas, formularios y componentes Material
    ↓ solicitudes HTTP/JSON
Servicios Angular + interceptor JWT
    ↓
FastAPI: routers, esquemas Pydantic y autenticación
    ↓ SQLAlchemy
PostgreSQL
```

- **Frontend:** Angular 21 y Angular Material. Angular Router organiza las páginas. Los servicios separan las solicitudes HTTP de los componentes.
- **Backend:** FastAPI ofrece los endpoints REST y devuelve datos JSON. Los esquemas Pydantic validan las entradas y definen las respuestas.
- **Persistencia:** PostgreSQL corre en Docker. SQLAlchemy relaciona usuarios, asignaturas y evaluaciones.
- **Autenticación:** la contraseña se almacena como hash Argon2id. El backend firma JWT con HS256 y verifica el token en las rutas privadas.

## Qué hace cada parte del código

### Angular

| Ruta o carpeta | Responsabilidad |
|---|---|
| `frontend/src/app/app.routes.ts` | Define login, registro, listado, detalle y página no encontrada; protege rutas con Guards. |
| `frontend/src/app/pages/` | Contiene las vistas principales y coordina la interacción de cada pantalla. |
| `frontend/src/app/components/` | Reúne formularios en diálogos, confirmaciones, estados vacíos y resumen de notas reutilizables. |
| `frontend/src/app/services/auth.service.ts` | Registra e inicia sesión; mantiene la sesión y su expiración usando Signals. |
| `frontend/src/app/services/asignaturas.service.ts` | Carga la lista y el detalle con `httpResource()` y envía operaciones de creación, edición y eliminación. |
| `frontend/src/app/services/evaluaciones.service.ts` | Carga evaluaciones y resumen con `httpResource()`; envía altas, cambios y eliminaciones. |
| `frontend/src/app/interceptors/auth.interceptor.ts` | Agrega el JWT a las solicitudes privadas y cierra la sesión si la API responde 401. |
| `frontend/src/app/guards/auth.guard.ts` | Redirige a login si no hay sesión y evita que una persona autenticada vuelva a login o registro. |
| `frontend/src/app/services/notificacion.service.ts` | Muestra mensajes de éxito y error mediante `MatSnackBar`. |

Los formularios principales usan **Reactive Forms** con validaciones y mensajes. Los Signals mantienen estado reactivo, y `httpResource()` vuelve a cargar datos cuando cambian sus parámetros, por ejemplo el id de una asignatura o la meta de nota.

### FastAPI y datos

| Archivo o carpeta | Responsabilidad |
|---|---|
| `backend/app/main.py` | Crea la aplicación, configura CORS, registra los routers y crea las tablas al iniciar. |
| `backend/app/routers/auth.py` | Registra usuarios, valida credenciales y entrega el JWT. |
| `backend/app/routers/asignaturas.py` | Implementa el CRUD de asignaturas del usuario autenticado. |
| `backend/app/routers/evaluaciones.py` | Implementa el CRUD de evaluaciones y entrega el resumen de notas. |
| `backend/app/routers/dependencies.py` | Busca una asignatura y confirma que pertenezca al usuario autenticado. |
| `backend/app/schemas/` | Valida datos de entrada y define qué datos se devuelven. |
| `backend/app/security.py` | Genera y verifica hashes de contraseña; crea y valida JWT. |
| `backend/app/models.py` | Define las tablas y relaciones de SQLAlchemy. |
| `backend/app/database.py` | Lee `.env` y configura la conexión PostgreSQL. |
| `backend/app/calculos.py` | Calcula promedios, aporte, porcentaje restante y nota necesaria. |
| `backend/tests/test_api.py` | Prueba la API con SQLite en memoria, sin depender de Docker. |

## Flujo para explicar en la interrogación

### 1. Registro e inicio de sesión

1. La persona completa el formulario de registro en Angular.
2. Reactive Forms revisa campos obligatorios, formato del correo, largo de contraseña y confirmación.
3. `AuthService` envía el registro a `POST /api/auth/register`.
4. FastAPI valida con Pydantic, transforma la contraseña en un hash Argon2id y persiste el usuario con SQLAlchemy.
5. El frontend inicia sesión con `POST /api/auth/login`.
6. FastAPI compara la contraseña ingresada con el hash y, si coincide, firma un JWT con id de usuario, emisor y expiración.
7. Angular guarda el token y la expiración localmente; sus Signals actualizan el estado autenticado y la aplicación navega al listado.

### 2. Crear y listar una asignatura

1. En el listado se abre el diálogo de nueva asignatura.
2. El formulario valida nombre y semestre, y el servicio Angular envía el JSON a `POST /api/asignaturas`.
3. El interceptor agrega `Authorization: Bearer <token>`.
4. FastAPI valida el JWT con `get_current_user`. El endpoint obtiene el id del propietario desde ese usuario autenticado; no confía en un `usuario_id` enviado por el navegador.
5. SQLAlchemy guarda la asignatura vinculada al usuario.
6. La vista actualiza el listado. El detalle se carga al navegar a `/asignaturas/:id`.

### 3. Crear una evaluación y calcular el resumen

1. Desde el detalle se crea una evaluación con nombre, ponderación y, opcionalmente, nota.
2. Angular y Pydantic validan los campos; el backend también rechaza ponderaciones que hagan que el total de la asignatura supere el 100 %.
3. La evaluación queda relacionada con su asignatura en PostgreSQL.
4. La pantalla vuelve a pedir evaluaciones y resumen. La meta de nota también es un Signal; al cambiarla, `httpResource()` solicita el resumen actualizado.
5. `calculos.py` calcula los resultados en el backend y Angular los presenta.

## Cálculos de notas

- **Aporte acumulado:** suma de `nota × ponderación` de las evaluaciones calificadas, dividida por 100.
- **Promedio parcial:** suma ponderada de las notas calificadas dividida por la ponderación calificada.
- **Porcentaje restante:** 100 menos la ponderación ya calificada. Incluye evaluaciones pendientes y porcentaje aún no asignado.
- **Promedio necesario:** `(meta − aporte_acumulado) × 100 ÷ porcentaje_restante`.
- **Promedio final:** se informa cuando las evaluaciones calificadas completan el 100 %.

**Ejemplo:** una nota 5 con ponderación 40 % aporta `5 × 40 / 100 = 2`. Para lograr una meta 4, si queda 60 %: `(4 − 2) × 100 / 60 = 3,33`. Se necesita aproximadamente un 3,33 de promedio en lo que falta.

## Seguridad y manejo de errores

- Las contraseñas se almacenan como hash Argon2id; no se devuelve `password_hash` al frontend.
- El JWT tiene expiración y se valida en el backend en cada ruta privada.
- El Guard mejora la navegación, pero la protección real también está en FastAPI.
- Cada consulta de asignaturas comprueba el propietario. Intentar acceder a datos de otra persona devuelve 404.
- Una solicitud inválida devuelve 422; credenciales incorrectas, 401; correo duplicado, 409; recurso inexistente o ajeno, 404.
- El interceptor agrega el token y cierra la sesión local si el backend devuelve 401 por un token inválido o vencido.
- `.env` contiene configuración local y no se sube a Git. `.env.example` solo incluye marcadores, no secretos reales.

## Preguntas que podrían hacer

**¿Por qué usar servicios en Angular?**  
Para separar la comunicación HTTP de las vistas, reutilizar operaciones y mantener los componentes enfocados en la interfaz.

**¿Qué hacen Signals y `httpResource()`?**  
Signals mantienen estado reactivo, como la sesión y la meta. `httpResource()` carga datos asíncronos y vuelve a consultar cuando cambian sus parámetros.

**¿Para qué sirve el interceptor?**  
Agrega el JWT automáticamente a las solicitudes privadas y procesa errores 401 de sesión.

**¿Por qué el Guard no basta para proteger datos?**  
El Guard solo controla la navegación en el navegador. Una solicitud puede enviarse directamente a la API, por eso FastAPI valida el JWT y el propietario en el servidor.

**¿Cómo se evita que una persona cambie el dueño de una asignatura?**  
El backend toma el propietario desde el JWT validado. Los esquemas rechazan un `usuario_id` enviado como campo extra por el cliente.

**¿Por qué usar SQLAlchemy y PostgreSQL?**  
SQLAlchemy mapea clases Python a tablas y relaciones; PostgreSQL conserva los datos entre reinicios y permite consultas relacionales.

**¿Qué ocurre al eliminar una asignatura?**  
Sus evaluaciones se eliminan en cascada porque pertenecen a esa asignatura.

**¿Qué prueban los tests?**  
Registro/login, protección JWT, CRUD, validaciones de nota y ponderación, cálculos y aislamiento entre usuarios. Se usa SQLite en memoria para no requerir Docker al probar la API.

## Demostración sugerida

1. Registrar una cuenta nueva e iniciar sesión.
2. Crear una asignatura y mostrar cómo aparece en el listado.
3. Abrirla, crear una evaluación con nota y ponderación.
4. Explicar el resumen y cambiar la meta para mostrar el recálculo.
5. Señalar el servicio Angular, el endpoint FastAPI y el modelo SQLAlchemy implicados en ese flujo.

Al explicar cualquier funcionalidad, sigan esta secuencia: **acción en la pantalla → servicio HTTP → endpoint y validación → consulta o cambio en la base de datos → respuesta JSON → actualización de la interfaz**.
