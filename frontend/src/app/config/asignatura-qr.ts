import { AsignaturaPayload } from '../models/api.models';

// Un QR contiene datos públicos de la asignatura, nunca ids de usuario ni tokens.
export function crearQrAsignatura(datos: AsignaturaPayload): string {
  return JSON.stringify({ tipo: 'gestor-notas/asignatura', version: 1,
    nombre: datos.nombre, codigo: datos.codigo, semestre: datos.semestre });
}

export function leerQrAsignatura(texto: string): AsignaturaPayload {
  if (texto.length > 2000) throw new Error('El QR es demasiado grande.');
  let valor: unknown;
  try { valor = JSON.parse(texto); } catch { throw new Error('Este QR no contiene una asignatura del gestor.'); }
  if (!valor || typeof valor !== 'object') throw new Error('QR de asignatura inválido.');
  const d = valor as Record<string, unknown>;
  if (d['tipo'] !== 'gestor-notas/asignatura' || d['version'] !== 1)
    throw new Error('Este QR no es compatible con el gestor de notas.');
  const textoValido = (v: unknown, max: number): v is string =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!textoValido(d['nombre'], 120) || !textoValido(d['semestre'], 30) ||
      !(d['codigo'] == null || (typeof d['codigo'] === 'string' && d['codigo'].length <= 30)))
    throw new Error('El QR tiene campos incompletos o demasiado largos.');
  return { nombre: d['nombre'].trim(), semestre: d['semestre'].trim(),
    codigo: typeof d['codigo'] === 'string' ? d['codigo'].trim() || null : null };
}
