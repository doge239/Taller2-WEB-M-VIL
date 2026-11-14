import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const androidDir = fileURLToPath(new URL('../android/', import.meta.url));
const defaultSdk = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk')
  : undefined;
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || defaultSdk;

if (!existsSync(path.join(androidDir, 'local.properties')) && (!sdk || !existsSync(sdk))) {
  console.error('Falta el Android SDK. Instala Android Studio, abre frontend/android y configura el SDK (API 36). Consulta ANDROID.md.');
  process.exit(1);
}

const result = spawnSync(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', [':app:assembleDebug'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, ...(sdk ? { ANDROID_HOME: sdk } : {}) },
});

if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`APK generado: ${path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')}`);
