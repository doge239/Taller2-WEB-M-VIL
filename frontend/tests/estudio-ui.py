"""Smoke de interfaz con API simulada; no sustituye las pruebas del hardware Android.

Ejecutar tras compilar Angular. Inicia y cierra un servidor en un puerto temporal.
"""
import json
import time
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright, expect


def main(base_url):
    subjects = [{"id": 1, "nombre": "Matemática", "codigo": "MAT101", "semestre": "2026-2"}]
    sessions = []
    attempts = []
    fail_once = [True]
    errors = []

    def api(route):
        req = route.request
        path = req.url.split('/api', 1)[1]
        status, body = 200, {}
        if path == '/asignaturas':
            if req.method == 'POST':
                subjects.append({**req.post_data_json, 'id': len(subjects) + 1})
                status, body = 201, subjects[-1]
            else:
                body = subjects
        elif path == '/asignaturas/1':
            body = subjects[0]
        elif path == '/asignaturas/1/evaluaciones':
            body = []
        elif '/resumen' in path:
            body = dict(asignatura_id=1, evaluaciones_totales=0, evaluaciones_calificadas=0,
                evaluaciones_pendientes=0, meta=4, aporte_acumulado=0, promedio_parcial=None,
                promedio_final=None, ponderacion_calificada=0, ponderacion_pendiente=0,
                porcentaje_restante=100, promedio_necesario=4, meta_asegurada=False,
                meta_inalcanzable=False, sin_porcentaje_restante=False)
        elif path == '/asignaturas/1/sesiones':
            if req.method == 'POST':
                payload = req.post_data_json
                attempts.append(payload)
                if fail_once[0]:
                    fail_once[0] = False
                    status, body = 503, {'detail': 'Prueba de conexión interrumpida. Reintenta el guardado.'}
                else:
                    sessions.append({**payload, 'id': 1, 'asignatura_id': 1})
                    status, body = 201, sessions[-1]
            else:
                body = sessions
        elif path == '/asignaturas/1/sesiones/1' and req.method == 'DELETE':
            sessions.clear()
            status, body = 204, None
        else:
            status, body = 404, {'detail': path}
        route.fulfill(status=status, content_type='application/json', body=json.dumps(body) if body is not None else '')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 390, 'height': 844},
            geolocation={'latitude': -33.45, 'longitude': -70.66, 'accuracy': 10}, permissions=['geolocation'])
        context.add_init_script("localStorage.setItem('gestor_notas_sesion', JSON.stringify({token:'smoke-token',usuario:{id:1,nombre:'Ana',correo:'ana@example.com'},expiraEn:Date.now()+3600000}));")
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/api/**', api)
        page.goto(base_url)
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('heading', name='Mis asignaturas')).to_be_visible()
        page.get_by_role('button', name='Importar QR').click()
        page.get_by_text('Introducir contenido manualmente').click()
        qr = json.dumps({'tipo':'gestor-notas/asignatura','version':1,'nombre':'Web móvil','codigo':'WM101','semestre':'2026-2'})
        page.get_by_label('Contenido del QR').fill('https://example.com')
        page.get_by_role('button', name='Revisar asignatura').click()
        expect(page.get_by_role('alert')).to_contain_text('QR')
        page.get_by_label('Contenido del QR').fill(qr)
        page.get_by_role('button', name='Revisar asignatura').click()
        expect(page.get_by_label('Nombre', exact=True)).to_have_value('Web móvil')
        page.get_by_role('button', name='Guardar', exact=True).click()
        expect(page.get_by_text('Web móvil', exact=True)).to_be_visible()
        page.get_by_role('link', name='Ver notas').first.click()
        page.wait_for_load_state('networkidle')
        page.get_by_role('button', name='Compartir QR').click()
        expect(page.get_by_alt_text('Código QR para importar esta asignatura')).to_be_visible()
        page.get_by_role('button', name='Cerrar', exact=True).last.click()
        page.get_by_label('¿Qué vas a estudiar?').fill('Repasar derivadas')
        page.get_by_role('button', name='Añadir ubicación').click()
        expect(page.get_by_text('precisión ±10 m', exact=False)).to_be_visible()
        page.get_by_role('button', name='Empezar a estudiar').click()
        expect(page.get_by_text('Acelerómetro no disponible.', exact=False)).to_be_visible()
        expect(page.get_by_role('timer')).not_to_have_text('00:00', timeout=5000)
        page.get_by_role('button', name='Pausar', exact=True).click()
        paused = page.get_by_role('timer').inner_text()
        time.sleep(1.2)
        assert page.get_by_role('timer').inner_text() == paused
        page.get_by_role('button', name='Continuar', exact=True).click()
        expect(page.get_by_role('button', name='Pausar', exact=True)).to_be_visible()
        page.get_by_role('button', name='Terminar', exact=True).click()
        page.get_by_role('button', name='Guardar sesión', exact=True).click()
        expect(page.get_by_text('Prueba de conexión interrumpida. Reintenta el guardado.', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Guardar sesión', exact=True)).to_be_enabled()
        page.get_by_role('button', name='Guardar sesión', exact=True).click()
        expect(page.locator('.registro strong')).to_have_text('Repasar derivadas')
        assert len(attempts) == 2 and attempts[0]['clave'] == attempts[1]['clave']
        assert attempts[1]['latitud'] == -33.45 and attempts[1]['sensor_disponible'] is False
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Desborde horizontal móvil'
        Path('artifacts').mkdir(exist_ok=True)
        page.screenshot(path='artifacts/estudio-mobile.png', full_page=True)
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.screenshot(path='artifacts/estudio-desktop.png', full_page=True)
        page.get_by_role('button', name='Eliminar sesión de estudio', exact=True).click()
        page.get_by_role('dialog').get_by_role('button', name='Eliminar', exact=True).click()
        expect(page.get_by_text('Tu próxima sesión será la primera.')).to_be_visible()
        assert not errors, errors
        print('PASS: importación QR, QR generado, GPS, pausa/continuación, degradación de sensor, reintento, historial, eliminación y diseño móvil/desktop.')
        browser.close()


if __name__ == '__main__':
    directory = Path(__file__).resolve().parents[1] / 'dist/frontend/browser'
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(directory)))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        main(f'http://127.0.0.1:{server.server_port}')
    finally:
        server.shutdown()
        server.server_close()
