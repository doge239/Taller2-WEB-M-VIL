import '@angular/compiler';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom, of, throwError } from 'rxjs';

// Compila los interceptores reales; Angular se comparte con el proceso de pruebas.
const output = new URL('../node_modules/.cache/android-tests/interceptors.mjs', import.meta.url);
await build({
  stdin: {
    contents: `
      export { authInterceptor } from './src/app/interceptors/auth.interceptor';
      export { apiInterceptor } from './src/app/interceptors/api.interceptor';
      export { AuthService } from './src/app/services/auth.service';
      export { NotificacionService } from './src/app/services/notificacion.service';
      export { ANDROID_API_ORIGIN } from './src/app/config/api.config';
    `,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
    loader: 'ts',
  },
  outfile: fileURLToPath(output),
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
});
const { authInterceptor, apiInterceptor, AuthService, NotificacionService, ANDROID_API_ORIGIN } =
  await import(output.href);

function setup() {
  const state = { loggedOut: false, message: null };
  const injector = Injector.create({ providers: [
    { provide: AuthService, useValue: {
      token: () => 'test-token',
      autenticado: () => !state.loggedOut,
      logout: () => { state.loggedOut = true; },
    } },
    { provide: NotificacionService, useValue: {
      error: (message) => { state.message = message; },
    } },
  ] });
  return { injector, state };
}

test('Android conserva JWT al transformar una URL privada y cierra sesión ante 401', async () => {
  const { injector, state } = setup();
  const previous = Capacitor.isNativePlatform;
  Capacitor.isNativePlatform = () => true;
  try {
    const response = runInInjectionContext(injector, () =>
      authInterceptor(new HttpRequest('GET', '/api/asignaturas'), (authenticated) =>
        apiInterceptor(authenticated, (sent) => {
          assert.equal(sent.url, `${ANDROID_API_ORIGIN}/api/asignaturas`);
          assert.equal(sent.headers.get('Authorization'), 'Bearer test-token');
          return throwError(() => new HttpErrorResponse({ status: 401 }));
        })),
    );
    await assert.rejects(firstValueFrom(response), (error) => error.status === 401);
    assert.equal(state.loggedOut, true);
    assert.match(state.message, /expir/);
  } finally {
    Capacitor.isNativePlatform = previous;
    injector.destroy();
  }
});

test('login, registro y recursos externos no reciben el token de sesión', async () => {
  const { injector, state } = setup();
  try {
    for (const url of ['/api/auth/login', '/api/auth/register', 'https://otro.example/api/datos']) {
      const response = runInInjectionContext(injector, () =>
        authInterceptor(new HttpRequest('GET', url), (sent) => {
          assert.equal(sent.headers.has('Authorization'), false);
          return of(new HttpResponse({ status: 200 }));
        }),
      );
      await firstValueFrom(response);
    }
    assert.equal(state.loggedOut, false);
  } finally {
    injector.destroy();
  }
});
