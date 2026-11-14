import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiUrl } from '../src/app/config/api-url.ts';

const origin = 'https://api.example.com';

test('web conserva el proxy relativo', () => {
  assert.equal(resolveApiUrl('/api/asignaturas', false, origin), '/api/asignaturas');
});

test('Android redirige login, registro y rutas privadas conservando parámetros', () => {
  for (const path of ['/api/auth/login', '/api/auth/register', '/api/asignaturas/1/evaluaciones?x=1']) {
    assert.equal(resolveApiUrl(path, true, `${origin}/`), `${origin}${path}`);
  }
});

test('no modifica recursos locales ni URLs ajenas', () => {
  for (const url of ['/assets/icon.png', '/apifalsa', '//otro.example/api/', 'https://otro.example/api/']) {
    assert.equal(resolveApiUrl(url, true, origin), url);
  }
});

test('rechaza servidores sin HTTPS, con credenciales o rutas ambiguas', () => {
  for (const base of ['http://api.example.com', 'https://user:pass@api.example.com', `${origin}/api`, `${origin}?x=1`, `${origin}#fragment`]) {
    assert.throws(() => resolveApiUrl('/api/asignaturas', true, base));
  }
});
