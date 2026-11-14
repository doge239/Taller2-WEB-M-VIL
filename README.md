# Gestor de Notas Universitarias

Aplicación para organizar asignaturas, registrar evaluaciones y calcular promedios ponderados y la nota necesaria para una meta. Incluye versión web y aplicación Android con importación de asignaturas por QR y sesiones de estudio con ubicación y acelerómetro.

El **Taller 2** corresponde a la aplicación web full stack: Angular, FastAPI, PostgreSQL, CRUD y autenticación JWT. El **Taller 3** amplía esa misma aplicación con Capacitor, capacidades móviles, generación de APK y construcción automática en GitHub Actions.

## Arquitectura y tecnologías

| Capa | Implementación |
| --- | --- |
| Interfaz | Angular 21, Angular Material 21, TypeScript y SCSS |
| Estado y consultas | Signals, `computed`, `effect` y `httpResource` |
| Formularios | Reactive Forms y validadores |
| API | FastAPI, JSON y esquemas Pydantic |
| Persistencia | PostgreSQL 17 y SQLAlchemy 2 |
| Autenticación | JWT HS256 y contraseñas con Argon2id |
| Aplicación móvil | Capacitor 8 y proyecto nativo Android |
| Construcción Android | JDK 21, Gradle 8.13 y Android Gradle Plugin 8.13.0 |
| Automatización | GitHub Actions y APK debug descargable |

En web, Angular consume `/api` mediante el proxy de desarrollo o Caddy. En Android, los archivos de Angular están incluidos en el APK y se muestran en una WebView; Capacitor conecta la interfaz con los plugins nativos. La API y PostgreSQL permanecen en el servidor.

```text
Angular en navegador o WebView Android
                 │ HTTP / JSON + JWT en rutas privadas
                 ▼
              FastAPI
                 │ SQLAlchemy
                 ▼
             PostgreSQL
```

## Taller 2: aplicación web full stack

| Requisito | Implementación en el proyecto |
| --- | --- |
| Al menos cuatro vistas con Router | Registro, login, listado de asignaturas y detalle. La ampliación agrega Actividad y Cuenta. Rutas en `frontend/src/app/app.routes.ts`. |
| Componentes reutilizables | Formularios en diálogo, confirmaciones, resumen académico, estados vacíos y reloj de estudio en `frontend/src/app/components/`. |
| Servicios y consumo HTTP | `AsignaturasService`, `EvaluacionesService`, `AuthService`, `PanelService` y `EstudioService` separan el acceso a la API de las vistas. |
| Signals | Usuario autenticado, filtros, meta de nota y estado de estudio. `computed` deriva listas y contadores. |
| Recursos reactivos | `httpResource` carga listados, detalles, resúmenes e historial. El resumen depende del id de asignatura y de la meta. |
| Reactive Forms | Login, registro y creación/edición de asignaturas y evaluaciones con validaciones y mensajes. |
| Angular Material responsive | Toolbar, tarjetas, campos, botones, tabla, diálogos, menú, snackbar e indicadores de carga. |
| API REST FastAPI | Routers, esquemas de entrada/salida, códigos HTTP y documentación OpenAPI en `/docs`. |
| PostgreSQL y ORM | Usuario → asignaturas → evaluaciones, mediante claves foráneas y relaciones SQLAlchemy. La ampliación añade sesiones por asignatura. |
| CRUD completo | Crear, listar, consultar, editar y eliminar asignaturas y evaluaciones desde Angular. |
| Autenticación | Registro, login, logout, contraseñas con hash, JWT, guards y validación del usuario en endpoints privados. |
| Interceptor | `authInterceptor` agrega el JWT a las llamadas privadas propias; `apiInterceptor` adapta la URL para Android. |
| Estados de interfaz | Cargando, éxito, error, formulario inválido, listado vacío, filtros sin resultados y reintento. |

### Reglas académicas

- Notas de **1,0 a 7,0**. Una nota `null` representa una evaluación pendiente.
- Ponderación positiva y total por asignatura de hasta **100 %**.
- Aporte acumulado: `suma(nota × ponderación) / 100`.
- Promedio parcial: `suma(nota × ponderación) / peso ya calificado`.
- Promedio final: aporte acumulado cuando está calificado el 100 %.
- Nota necesaria: `(meta − aporte acumulado) × 100 / porcentaje restante`.
- Meta predeterminada 4,0, ajustable en el detalle para esa consulta. No se persiste como preferencia en la base de datos.
- El backend calcula en `backend/app/calculos.py`; Angular presenta el resultado. Las tarjetas del panel usan la meta predeterminada.

Ejemplo: nota 5 al 40 % y nota 6 al 60 % producen promedio final **5,6**. Con solo la primera nota, el promedio parcial es 5,0, el aporte es 2,0 y se necesita aproximadamente 3,33 en el 60 % restante para llegar a 4,0.

### Seguridad y persistencia

FastAPI obtiene la identidad del JWT y comprueba la propiedad de las asignaturas antes de consultar o modificar datos. Los guards controlan la navegación; la autorización efectiva también se aplica en el backend. Los recursos ajenos responden como no encontrados.

El JWT se envía mediante `Authorization: Bearer <token>`. La sesión se conserva en `localStorage` y no se restaura si su fecha guardada ya venció. Un 401 privado con sesión activa provoca el cierre de sesión. No se implementó refresh token.

Las credenciales reales se configuran mediante variables de entorno. `.env`, claves de firma y archivos locales del SDK se excluyen de Git. Los datos de la aplicación se guardan en PostgreSQL; SQLite en memoria se utiliza solamente para las pruebas automatizadas.

## Ejecutar la versión web

### Requisitos

| Herramienta | Versión o condición |
| --- | --- |
| Python | 3.12 o posterior compatible; pruebas locales realizadas con 3.13 |
| Node.js | Se recomienda 24, usado también por el workflow Android |
| npm | Disponible con Node.js; utilizar el lockfile del repositorio |
| Docker y Compose | Docker Desktop iniciado en Windows y Compose v2 |

Los comandos siguientes parten de la raíz del repositorio. En PowerShell se usa `npm.cmd` para evitar restricciones del script `npm.ps1`.

### 1. Configurar el entorno

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edita `.env` con tus valores. Reemplaza las credenciales de ejemplo y genera un secreto aleatorio; no publiques esos valores.

| Variable | Uso |
| --- | --- |
| `POSTGRES_USER` | Usuario de la base de datos |
| `POSTGRES_PASSWORD` | Contraseña de la base de datos |
| `POSTGRES_DB` | Nombre de la base de datos |
| `POSTGRES_HOST` | `127.0.0.1` al usar la base Docker desde el host |
| `POSTGRES_PORT` | Puerto publicado; la plantilla usa `5433` |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 bytes |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token; predeterminado 30 minutos |
| `ALLOWED_ORIGINS` | Orígenes web permitidos por CORS, separados por comas |

Para generar un secreto, guarda la salida de este comando únicamente en tu configuración:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Iniciar PostgreSQL

En una terminal, desde la raíz:

```powershell
docker compose up -d
docker compose ps
```

Espera a que `db` aparezca como `healthy`. Compose utiliza los datos de `.env`; el backend debe tener los mismos usuario, clave, base y puerto. PostgreSQL se publica en `127.0.0.1` y conserva los datos en el volumen `notas_data`.

### 3. Iniciar FastAPI

En otra terminal, desde la raíz:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

La creación del entorno e instalación son pasos de preparación; después basta con iniciar la API. Si utilizas otro entorno virtual, sustituye la ruta del ejecutable.

- Documentación: http://127.0.0.1:8000/docs
- Esquema OpenAPI: http://127.0.0.1:8000/openapi.json
- Estado: http://127.0.0.1:8000/api/health

Respuesta esperada del health check:

```json
{"estado":"ok","base_de_datos":"conectada"}
```

Las tablas se crean al iniciar mediante `Base.metadata.create_all`. No se insertan cuentas de prueba; cada usuario debe registrarse. Este mecanismo crea tablas faltantes, pero no sustituye migraciones para cambios futuros en columnas existentes.

### 4. Iniciar Angular

En una tercera terminal, desde la raíz:

```powershell
cd frontend
npm.cmd ci
npm.cmd start
```

Abre http://localhost:4200. `proxy.conf.json` redirige `/api` al backend local del puerto 8000 a través del servidor de desarrollo.

### macOS / Linux

Copia `.env.example` a `.env` si no existe, configura sus valores e inicia `docker compose up -d` desde la raíz. En terminales independientes:

```bash
# Backend, desde la raíz
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
# Frontend, desde la raíz
cd frontend
npm ci
npm start
```

### Flujo de uso web

1. Crear una cuenta en `/registro`; después se inicia sesión automáticamente.
2. Crear una asignatura con nombre, semestre y código opcional.
3. Abrir el detalle y agregar evaluaciones con ponderación y nota, o dejarlas pendientes.
4. Consultar promedios y nota necesaria; ajustar la meta para la consulta.
5. Editar o eliminar registros. Las eliminaciones solicitan confirmación.
6. Consultar el panel: «Notas por registrar» cuenta evaluaciones sin calificación, no plazos de entrega.
7. Cerrar sesión desde el menú o Cuenta.

Detén frontend y backend con `Ctrl+C`. Desde la raíz, `docker compose down` detiene PostgreSQL conservando el volumen. No hace falta borrar la base para actualizar la aplicación.

## Taller 3: aplicación Android con Capacitor

| Requisito | Implementación y verificación |
| --- | --- |
| Integración con Capacitor | `frontend/capacitor.config.ts` y plataforma `frontend/android/`. Identificador `cl.gestornotas.app`, nombre «Gestor de notas», versión Android 1.1. |
| Ícono e inicio | Ícono de libro e inicio animado AndroidX SplashScreen. `AppLaunchPlugin` coordina la salida con el primer render de Angular. |
| Build y APK | Angular de producción, `cap sync android` y Gradle `:app:assembleDebug`. APK generado y firma debug verificada localmente. |
| Cámara y lectura QR | `@capacitor/barcode-scanner` lee una ficha, se valida el contenido, se revisa en formulario y se crea por API. |
| Ubicación | `@capacitor/geolocation` obtiene coordenadas y precisión para asociarlas a una sesión de estudio. |
| Sensor adicional | `StudyMotionPlugin.java` utiliza `SensorManager` y el acelerómetro. Los movimientos forman parte del registro de estudio. |
| Integración con el backend | El QR reutiliza el CRUD de asignaturas. Las sesiones guardan objetivo, inicio, duración, movimientos, disponibilidad del sensor y ubicación opcional. |
| Permisos y errores | Solicitud al usar cámara/ubicación, mensajes de rechazo, GPS no disponible, sensor ausente y fallo de guardado. |
| Construcción automática | `.github/workflows/android.yml` instala dependencias, prueba, compila, sincroniza y sube el APK como artefacto. Debe comprobarse una ejecución remota exitosa. |
| Android real | Falta completar la evidencia física de instalación, cámara, GPS, sensor y API. El arranque comprobado en emulador no sustituye esa demostración. |

En Android, la interfaz incluye navegación inferior y muestra directamente el formulario de acceso. La animación inicial termina cuando Angular presenta su primera pantalla, sin esperar una respuesta del backend. Consultar y guardar datos requiere conexión al servidor.

### Requisitos Android

- Para construir: Node.js 24, JDK 21, Android SDK Platform 36 y Build Tools 36.0.0.
- Android Studio permite configurar el SDK, abrir el proyecto y ejecutar en un dispositivo o emulador. También se puede construir por línea de comandos con el SDK y Java configurados.
- Mantener Gradle Wrapper **8.13** y Android Gradle Plugin **8.13.0**. Gradle 9.7.1 no es compatible con este plugin en la configuración probada.
- Para instalar: **Android 8.0 / API 26 o posterior**. `compileSdk` y `targetSdk` son 36; no equivalen al mínimo de instalación.
- Configurar el SDK mediante `frontend/android/local.properties` o `ANDROID_HOME`. Esa ruta local no se versiona.

Abre `frontend/android` en Android Studio, espera la sincronización de Gradle e instala los paquetes necesarios desde **SDK Manager**. Para seleccionar Java 21, entra a **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK**. Si construyes desde la terminal, configura `JAVA_HOME` con la carpeta del JDK 21; el Java utilizado por el IDE puede ser distinto del utilizado por Gradle.

### Conexión de Android al backend

El origen se configura en `frontend/src/app/config/api.config.ts`:

```text
https://taller2-web-m-vil-production.up.railway.app
```

Debe ser un origen HTTPS accesible desde el teléfono, sin `/api` al final. `localhost` en el teléfono no apunta al PC. Despliega primero el backend de esta versión: deben existir `/api/panel` y las rutas de sesiones.

`authInterceptor` agrega el JWT a las rutas privadas relativas; después `apiInterceptor` las transforma al servidor Android. `CapacitorHttp` usa el transporte HTTP nativo, manteniendo la autenticación y validación del backend. Si se desactiva y se usa HTTP desde la WebView, configura los orígenes CORS necesarios, incluido `https://localhost`.

Por ejemplo, para permitir el desarrollo web local y la WebView en ese caso:

```env
ALLOWED_ORIGINS=http://localhost:4200,https://localhost
```

Conserva también el origen de tu web desplegada, si corresponde, y reinicia o despliega de nuevo el backend después de cambiar esta variable. Android llama directamente a FastAPI; el proxy de Caddy corresponde a la versión web.

### Construir y ejecutar Android

Desde la raíz, en PowerShell:

```powershell
cd frontend
npm.cmd ci
npm.cmd run android:sync
npm.cmd run android:open
```

`android:sync` compila Angular y copia sus archivos al proyecto Android, además de sincronizar plugins. En Android Studio selecciona un teléfono con depuración USB o un emulador y ejecuta Run. También puedes usar `npm.cmd run android:run` con un dispositivo configurado.

En macOS/Linux utiliza `npm` en lugar de `npm.cmd`. Cada cambio del frontend requiere volver a compilar y sincronizar para incluirse en el APK.

### Generar e instalar el APK

Desde `frontend`, con Java y el SDK configurados:

```powershell
npm.cmd run android:apk
```

El comando compila Angular, sincroniza Capacitor y ejecuta Gradle mediante `scripts/build-apk.mjs`. Resultado:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Copia el APK al teléfono, ábrelo y permite la instalación desde esa aplicación cuando Android lo solicite. El teléfono solo necesita instalar el APK; no Angular CLI, Python ni PostgreSQL. También puedes instalarlo por USB, desde `frontend` y con `adb` en PATH:

```powershell
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Angular se compila en producción y Android genera un **APK debug**, con firma automática de desarrollo. No se publica en Google Play como parte de esta entrega. Para actualizar la interfaz del teléfono hay que instalar el APK nuevo: subir código a GitHub no reemplaza el instalado.

### Uso integrado de cámara, ubicación y sensor

**Compartir e importar una asignatura:**

1. En el detalle pulsa **Compartir QR** y muestra el código en otra pantalla.
2. En el teléfono entra a **Mis asignaturas → Importar QR → Abrir cámara** y permite el acceso.
3. Escanea el QR, revisa los datos y guarda una copia de la asignatura en tu cuenta.

El QR no comparte notas ni sesiones privadas. El formato aceptado es:

```json
{"tipo":"gestor-notas/asignatura","version":1,"nombre":"Programación Web y Móvil","codigo":"WM101","semestre":"2026-2"}
```

Se validan tipo, versión y longitudes antes de abrir el formulario. Existe una alternativa para pegar el texto; la demostración de cámara requiere escanear realmente el código.

**Registrar una sesión de estudio:**

1. Abre una asignatura y pulsa **Estudiar** o selecciona la vista **Estudio**.
2. Escribe un objetivo y elige un bloque orientativo de 15, 25 o 45 minutos.
3. Opcionalmente pulsa **Añadir ubicación**, permite el acceso y revisa coordenadas y precisión.
4. Inicia y deja el teléfono sobre una superficie. El acelerómetro registra movimientos durante los tramos activos.
5. Pausa o continúa cuando corresponda. Al salir de la app se pausa la sesión.
6. Termina y pulsa **Guardar sesión**. Consulta el historial de la asignatura o **Actividad**, que reúne las sesiones y la distribución del tiempo registrado.
7. Si incluiste coordenadas, abre el lugar en OpenStreetMap desde el historial. También puedes eliminar una sesión guardada con confirmación.

La ubicación es opcional y no se sigue el recorrido. El sensor estima movimiento lineal restando gravedad; se cuenta un evento sobre 3 m/s² separado al menos 3 segundos del anterior. Ese contador no mide científicamente la atención ni prueba asistencia.

Se puede estudiar sin GPS o sin sensor, indicando la ausencia de datos. El aro representa tiempo frente al objetivo elegido; cumplirlo no guarda ni finaliza automáticamente. El cronómetro utiliza `performance.now()` para medir tramos activos y existe un máximo de 8 horas por sesión.

Si falla el guardado se puede reintentar con la misma UUID sin duplicar la sesión. Los borradores y el objetivo temporal viven en memoria: guarda antes de cerrar el proceso. No hay sincronización offline ni registro continuo en segundo plano.

### GitHub Actions y descarga del APK

La construcción automática está definida en `.github/workflows/android.yml` y realiza los pasos descritos a continuación.

Se activa con push a `main` o `master`, pull requests hacia esas ramas o ejecución manual con **Run workflow**. Realiza:

1. Checkout del código, Node 24 y Java 21.
2. Preparación del SDK con `setup-android` y `packages: 'platform-tools'`, evitando el paquete retirado `tools`.
3. Instalación de Platform 36 y Build Tools 36.0.0.
4. `npm ci` y `npm run test:android`.
5. Build de producción y sincronización de Capacitor.
6. Compilación `:app:assembleDebug` con el wrapper Gradle.
7. Publicación del APK como artefacto `gestor-notas-debug-<número de ejecución>`, disponible durante 14 días.

Descarga en **GitHub → Actions → Android APK → ejecución exitosa → Artifacts**. El APK no se guarda como archivo versionado del repositorio. La entrega requiere facilitar el archivo generado además del enlace al código; tener el workflow no demuestra que la ejecución remota haya terminado correctamente.

Al corregir el workflow, sube el commit y revisa la ejecución nueva. Reejecutar un commit anterior usa su configuración anterior. Esta automatización no despliega FastAPI ni instala actualizaciones en el teléfono.

## API principal

Las rutas de datos académicos requieren JWT. Consulta los cuerpos y respuestas completos en `/docs`.

| Método | Ruta | Operación |
| --- | --- | --- |
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login y JWT |
| GET | `/api/auth/me` | Usuario autenticado |
| GET / POST | `/api/asignaturas` | Listado y creación |
| GET / PUT / DELETE | `/api/asignaturas/{id}` | Consulta, edición y eliminación |
| GET / POST | `/api/asignaturas/{id}/evaluaciones` | Listado y creación de evaluaciones |
| GET / PUT / DELETE | `/api/asignaturas/{id}/evaluaciones/{evaluacion_id}` | Consulta, edición y eliminación |
| GET | `/api/asignaturas/{id}/resumen?meta=4` | Resumen de notas |
| GET / POST | `/api/asignaturas/{id}/sesiones` | Historial y guardado de sesión |
| DELETE | `/api/asignaturas/{id}/sesiones/{sesion_id}` | Eliminar sesión |
| GET | `/api/panel` | Resúmenes, totales y últimas 100 sesiones del usuario |
| GET | `/api/health` | Conexión a la base de datos |

Las sesiones guardan inicio con zona horaria, duración, objetivo, movimientos, disponibilidad del sensor y coordenadas/precisión opcionales. El backend valida rangos, coherencia de duración y coordenadas, UUID y propiedad de la asignatura. Los totales de actividad consideran todas las sesiones; los listados recientes tienen un límite de 100.

## Pruebas y verificación de la entrega

### Backend

Con `.env` configurado, desde la raíz:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt
.\.venv\Scripts\python.exe -m pytest tests -v
```

No hace falta iniciar Docker para estas pruebas: utilizan SQLite en memoria. Los 14 casos cubren documentación, registro/login, tokens ausentes/inválidos/expirados, CRUD, límites de notas y ponderaciones, aislamiento entre usuarios, cálculos, sesiones, reintentos y acumulados del panel.

### Frontend y prueba visual

Desde `frontend`:

```powershell
npm.cmd run test:android
npm.cmd run build
```

Las 8 pruebas de lógica móvil cubren URLs, envío de JWT, manejo de 401 y contrato QR. Para la prueba visual opcional, instala Playwright y Chromium en el entorno de pruebas. Desde la raíz:

```powershell
backend\.venv\Scripts\python.exe -m pip install playwright
backend\.venv\Scripts\python.exe -m playwright install chromium
cd frontend
..\backend\.venv\Scripts\python.exe tests/estudio-ui.py
```

El script sirve el build en un puerto temporal y cierra su servidor al terminar. Utiliza API y GPS simulados y comprueba panel, filtros, QR, bloques de estudio, pausa, reintento, actividad, preferencias y anchos de 320 a 1440 píxeles. Las capturas y videos quedan en `artifacts/` del directorio de ejecución, ignorado por Git.

### Estado de verificación

La última verificación local realizada durante la implementación pasó las 14 pruebas de backend, las 8 de lógica móvil, la prueba visual y la generación del APK con firma verificada. Se instaló y comprobó un arranque en frío y la llegada al formulario en el emulador `Medium_Phone_API_37.0`.

Para completar la evidencia del Taller 3 se debe comprobar en un **Android real**:

- Instalación del APK, registro/login, CRUD de notas y API actualizada.
- Cámara con un QR en otra pantalla y utilización de la ficha importada.
- GPS aceptado y rechazado, precisión y persistencia de las coordenadas.
- Acelerómetro real, pausa al salir, reanudación y guardado del registro.
- Reintento tras perder/restablecer conexión y consulta posterior del historial.
- Teclado en formularios y botón Atrás: cerrar el diálogo activo, volver del detalle a las asignaturas y minimizar la app desde las pantallas principales.

Además, hay que verificar una ejecución exitosa de Actions y descargar su APK. El emulador y los datos simulados no sustituyen la demostración física. La entrega incluye el enlace al repositorio, el APK generado y estas instrucciones para construir y ejecutar.

## Actualizar los servicios desplegados

El frontend web y el APK pueden actualizarse de forma independiente del backend. El servidor debe ejecutar el commit que incorpora los endpoints utilizados por la app.

Configura en el servicio FastAPI las variables PostgreSQL y JWT descritas antes. Esta implementación construye la conexión con `POSTGRES_*`; no lee `DATABASE_URL` directamente. Si el servicio usa `backend` como directorio raíz, instala su `requirements.txt` y utiliza como comando de inicio:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
```

El servicio PostgreSQL debe ser accesible con el host y puerto de ese entorno; revisa los valores antes de reutilizar la configuración Docker local.

En Railway, verifica que el despliegue corresponde al commit nuevo. Si no se activa al hacer push, utiliza **Deploy Latest Commit** desde la paleta de comandos. **Redeploy** sobre un despliegue anterior vuelve a usar su código. Comprueba `/api/health` y la presencia de `/api/panel` y las rutas de sesiones en `/docs`.

Para web de producción se incluye `frontend/Dockerfile`: compila Angular y sirve los archivos con Caddy. Al cambiar de servidor revisa `frontend/Caddyfile` para el proxy web y `frontend/src/app/config/api.config.ts` para Android. Cambiar esta última URL requiere generar e instalar otro APK.

## Estructura del repositorio

```text
backend/
  app/
    models.py              Modelos y relaciones SQLAlchemy
    calculos.py            Promedios y nota necesaria
    security.py            Hash y JWT
    database.py            Conexión y sesión de base de datos
    schemas/               Validación y contratos de API
    routers/               Auth, asignaturas, evaluaciones, sesiones y panel
  tests/test_api.py        Pruebas de integración
frontend/
  src/app/
    pages/                 Login, registro, asignaturas, detalle, actividad y cuenta
    components/            Formularios, resumen, QR, sesiones y reloj
    services/              API, estado y funciones móviles
    models/                Interfaces TypeScript
    guards/                Protección de navegación
    interceptors/          JWT y URL Android
    config/                Origen API y utilidades
  android/                 Plataforma y plugins propios Java
  capacitor.config.ts      Configuración de Capacitor
  scripts/build-apk.mjs     Construcción del APK
  tests/                   Lógica móvil y prueba de interfaz
.github/workflows/         Construcción automatizada Android
compose.yaml               PostgreSQL local
.env.example               Plantilla de configuración
```

## Solución de problemas

| Problema | Revisar |
| --- | --- |
| PostgreSQL no llega a `healthy` | Docker iniciado, puerto libre y variables de `.env`. |
| FastAPI no inicia o falla el health check | Conexión PostgreSQL, variables obligatorias y secreto JWT válido. |
| Angular abre sin cargar datos | API del puerto 8000 disponible y proxy configurado. |
| APK nuevo pero falla el panel | Backend desplegado con `/api/panel` y las rutas de sesiones. |
| Cambios no aparecen en Android | Compilar/sincronizar, generar APK e instalarlo. |
| Falla Java/Gradle | JDK 21, `JAVA_HOME`, SDK local y wrapper 8.13. |
| Actions busca el paquete `tools` | Workflow actualizado con `packages: 'platform-tools'`. |
| Cámara o GPS rechazados | Permisos de la app en Ajustes y reintento. |
| Sensor no disponible | El acelerómetro propio se ejecuta en Android; la app informa si no puede activarlo. |
