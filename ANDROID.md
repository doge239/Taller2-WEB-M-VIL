# Aplicación Android: Gestor de notas

El proyecto Android está en `frontend/android`, con identificador `cl.gestornotas.app`.
El Taller 3 añade QR, GPS y acelerómetro nativo con historial de estudio.
Consulta [TALLER3.md](TALLER3.md) para el flujo de uso, arquitectura y Demo Day.
El dispositivo debe tener Android 8.0 / API 26 o posterior.
Capacitor empaqueta el frontend Angular dentro de la aplicación. FastAPI y
PostgreSQL siguen en el servidor: consultar y guardar notas requiere internet.
La versión web conserva sus rutas `/api/` y su proxy de desarrollo/Caddy.

## Requisitos

- Node.js 22 o superior compatible con Angular (este proyecto se verificó con Node 24).
- Android Studio 2025.2.1 o posterior, Android SDK Platform 36 y sus Build Tools.
- JDK 21 (también puede usarse el JDK incluido en Android Studio).

El wrapper usa Gradle 8.13 y Android Gradle Plugin 8.13.0. Mantén esta pareja:
Gradle 9.7.1 falla con este plugin. Si la terminal no encuentra Java, configura
`JAVA_HOME` con la carpeta de tu JDK 21 antes de ejecutar el build.

Abre `frontend/android` desde Android Studio y permite que termine la
sincronización de Gradle. Instala los paquetes que solicite el SDK Manager.
Android Studio configura `android/local.properties` con la ruta local del SDK;
ese archivo no se guarda en Git. Como alternativa, configura `ANDROID_HOME`.

## Backend y CORS

La dirección Android se configura en
`frontend/src/app/config/api.config.ts`. Inicialmente usa el mismo servidor
Railway que `frontend/Caddyfile`:

```text
https://taller2-web-m-vil-production.up.railway.app
```

La URL debe ser HTTPS y no llevar `/api` al final. No es un secreto y queda
incluida en el APK. No uses `localhost` para el backend: en un teléfono se
refiere al propio teléfono.

La aplicación usa `CapacitorHttp` (incluido en Capacitor), configurado en
`frontend/capacitor.config.ts`, para enviar las peticiones con las bibliotecas
HTTP nativas de Android. Así no depende de los permisos CORS del navegador
para comunicarse con el backend. Se mantienen los tokens y el manejo de
errores de Angular. Referencia: [HTTP nativo](https://capacitorjs.com/docs/apis/http).

Si desactivas ese transporte para usar las peticiones de la WebView, añade
`https://localhost` a `ALLOWED_ORIGINS` del backend, conservando los demás
orígenes. Por ejemplo:

```env
ALLOWED_ORIGINS=http://localhost:4200,https://localhost
```

En ese caso reinicia o vuelve a desplegar el backend tras cambiar la variable.
No hace falta cambiar Caddy para Android: la app llama a FastAPI directamente.
Para usar el historial, despliega primero la versión actualizada de FastAPI;
compilar el APK no actualiza el servidor Railway. Al iniciar, FastAPI crea la
tabla nueva `sesiones_estudio` sin borrar las tablas existentes.
Durante la integración, el health check remoto respondió con la base de datos
conectada; el servidor rechazó el preflight CORS de `https://localhost`, por lo
que es necesario mantener el transporte nativo o actualizar CORS si se desactiva.
Las operaciones completas deben verificarse en un dispositivo antes de distribuir.

## Preparar y ejecutar

Desde la raíz, en PowerShell:

```powershell
cd frontend
npm.cmd ci
npm.cmd run android:sync
npm.cmd run android:open
```

En Android Studio selecciona un emulador o un teléfono con depuración USB y
pulsa Run. También puedes usar `npm.cmd run android:run` con un dispositivo
configurado. Cada cambio del frontend requiere ejecutar `android:sync` para
actualizar los archivos empaquetados.

## Generar un APK instalable de prueba

```powershell
# Desde frontend, con el SDK configurado
npm.cmd run android:apk
```

El resultado se guarda en:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Copia el APK al teléfono y autoriza la instalación desde la aplicación con
la que lo abras. Este APK utiliza firma de depuración. Para Google Play,
genera un Android App Bundle de release firmado desde Android Studio
(Build > Generate Signed App Bundle or APK). Guarda tu clave de firma fuera
del repositorio.

## Verificación

La ampliación del Taller 3 tiene 13 pruebas de backend y 8 de lógica móvil.
El test visual está en `frontend/tests/estudio-ui.py`: usa Playwright con API y
GPS simulados y requiere Chromium instalado. Verifica importación y generación
de QR, pausa, continuación, guardado con reintento, historial y eliminación.
Desde `frontend`, con Playwright disponible en el entorno Python:

```powershell
..\backend\.venv-win\Scripts\python.exe tests/estudio-ui.py
```

Sustituye ese ejecutable por el Python de tu entorno si tiene otro nombre.
La prueba sirve el build local por un puerto temporal y cierra su servidor al terminar.

En el teléfono hay que probar además permisos de cámara/GPS aceptados y
rechazados, lectura del QR real, sensor y pausa al salir de la app. El test web
comprueba la degradación sin acelerómetro; no simula que hubo un sensor físico.

### Antecedentes de la integración Android inicial

La integración pasó la compilación de producción de Angular, la sincronización
de Capacitor, 6 pruebas de URLs/autenticación Android y las 11 pruebas del backend.
Se instalaron Android Studio 2026.2.2.8 y el Android SDK con API 36, Build Tools
35/36, Platform Tools y herramientas de línea de comandos. Se generó
`frontend/android/app/build/outputs/apk/debug/app-debug.apk` con
`:app:assembleDebug` y se verificó su firma. Todavía no se probó en un emulador
o teléfono.

En este equipo, `android/local.properties` indica la ruta local del SDK.
Android Studio usa Java 21 para Gradle mediante `.gradle/config.properties`
y `.idea/gradle.xml`; esos archivos son locales y están ignorados por Git.
El IDE conserva su propio Java 25. En otro equipo configura el JDK de Gradle
en Settings > Build, Execution, Deployment > Build Tools > Gradle según la
[documentación de Android](https://developer.android.com/build/jdks).

```powershell
cd frontend
npm.cmd run test:android
npm.cmd run android:sync
```

En un dispositivo, verifica registro, inicio de sesión, creación de asignaturas,
evaluaciones, cierre y reapertura de sesión. Comprueba el teclado en los
formularios y el botón Atrás: cierra el diálogo activo, vuelve del detalle a
las asignaturas y minimiza la aplicación desde las pantallas principales.

Documentación: [Capacitor Android](https://capacitorjs.com/docs/android),
[requisitos del entorno](https://capacitorjs.com/docs/getting-started/environment-setup).
