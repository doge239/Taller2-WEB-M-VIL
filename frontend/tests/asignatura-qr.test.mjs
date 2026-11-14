import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const fuente = readFileSync(new URL('../src/app/config/asignatura-qr.ts', import.meta.url), 'utf8');
const codigo = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { crearQrAsignatura, leerQrAsignatura } = await import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`);

test('el QR comparte datos públicos y permite recuperarlos sin ids ni notas', () => {
  const datos = { nombre: 'Cálculo', codigo: 'MAT101', semestre: '2026-2', id: 50, usuario_id: 7, notas: [7] };
  const qr = crearQrAsignatura(datos);
  assert.deepEqual(leerQrAsignatura(qr), { nombre: 'Cálculo', codigo: 'MAT101', semestre: '2026-2' });
  assert.equal(qr.includes('usuario_id'), false);
  assert.equal(Object.hasOwn(JSON.parse(qr), 'notas'), false);
});

test('rechaza URLs, JSON inválido, versiones desconocidas y campos fuera de límites', () => {
  const valido = JSON.parse(crearQrAsignatura({ nombre: 'Web móvil', codigo: null, semestre: '2026-2' }));
  for (const texto of ['https://example.com', 'null', '{}', 'a'.repeat(2001),
    ...[{ version: 2 }, { nombre: ' ' }, { semestre: 'x'.repeat(31) }, { codigo: 123 }]
      .map(cambio => JSON.stringify({ ...valido, ...cambio }))]) {
    assert.throws(() => leerQrAsignatura(texto));
  }
});
