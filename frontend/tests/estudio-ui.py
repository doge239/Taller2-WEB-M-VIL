"""Smoke de interfaz con API simulada; no sustituye las pruebas del hardware Android.

Ejecutar tras compilar Angular. Inicia y cierra un servidor en un puerto temporal.
"""
import json
import time
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from datetime import datetime, timedelta, timezone
from playwright.sync_api import sync_playwright, expect


def main(base_url):
    subjects = [
        {"id": 1, "nombre": "Matemática", "codigo": "MAT101", "semestre": "2026-2"},
        {"id": 2, "nombre": "Programación", "codigo": "INF201", "semestre": "2026-2"},
        {"id": 3, "nombre": "Redes", "codigo": "INF210", "semestre": "2026-2"},
    ]
    sessions = [{'id': 40, 'asignatura_id': 2, 'clave': 'fixture', 'inicio': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        'duracion_segundos': 1500, 'movimientos': 2, 'sensor_disponible': True,
        'latitud': None, 'longitud': None, 'precision_metros': None, 'objetivo': 'Repasar funciones y arreglos'}]
    attempts = []
    fail_once = [True]
    errors = []

    def summary(subject_id):
        graded = subject_id in [1, 2]
        return dict(asignatura_id=subject_id, evaluaciones_totales=2 if subject_id == 1 else 1 if graded else 0,
            evaluaciones_calificadas=1 if graded else 0, evaluaciones_pendientes=1 if subject_id == 1 else 0,
            meta=4, aporte_acumulado=2.32 if subject_id == 1 else 6.2 if graded else 0,
            promedio_parcial=5.8 if subject_id == 1 else 6.2 if graded else None,
            promedio_final=6.2 if subject_id == 2 else None, ponderacion_calificada=40 if subject_id == 1 else 100 if graded else 0,
            ponderacion_pendiente=60 if subject_id == 1 else 0, porcentaje_restante=60 if subject_id == 1 else 0 if graded else 100,
            promedio_necesario=2.8 if subject_id == 1 else None if graded else 4, meta_asegurada=subject_id == 2,
            meta_inalcanzable=False, sin_porcentaje_restante=subject_id == 2)

    def api(route):
        req = route.request
        path = req.url.split('/api', 1)[1]
        status, body = 200, {}
        if path == '/panel':
            body = dict(evaluaciones_pendientes=1, evaluaciones_calificadas=2,
                segundos_estudio=sum(s['duracion_segundos'] for s in sessions), sesiones_estudio=len(sessions),
                asignaturas=[{**a, 'resumen':summary(a['id']),
                    'segundos_estudio':sum(s['duracion_segundos'] for s in sessions if s['asignatura_id']==a['id']),
                    'sesiones_estudio':sum(1 for s in sessions if s['asignatura_id']==a['id'])} for a in subjects],
                actividad=[{**s, 'asignatura_nombre':next(a['nombre'] for a in subjects if a['id']==s['asignatura_id'])} for s in reversed(sessions)])
        elif path == '/asignaturas':
            if req.method == 'POST':
                subjects.append({**req.post_data_json, 'id': len(subjects) + 1})
                status, body = 201, subjects[-1]
            else:
                body = subjects
        elif path == '/asignaturas/1':
            body = subjects[0]
        elif path == '/asignaturas/1/evaluaciones':
            body = [{'id':1, 'nombre':'Certamen 1', 'nota':5.8, 'ponderacion':40}, {'id':2, 'nombre':'Examen', 'nota':None, 'ponderacion':60}]
        elif '/resumen' in path:
            body = summary(1)
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
                body = [s for s in sessions if s['asignatura_id'] == 1]
        elif path == '/asignaturas/1/sesiones/1' and req.method == 'DELETE':
            sessions[:] = [s for s in sessions if s['id'] != 1]
            status, body = 204, None
        else:
            status, body = 404, {'detail': path}
        route.fulfill(status=status, content_type='application/json', body=json.dumps(body) if body is not None else '')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        Path('artifacts').mkdir(exist_ok=True)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, record_video_dir='artifacts/video', record_video_size={'width':390, 'height':844},
            geolocation={'latitude': -33.45, 'longitude': -70.66, 'accuracy': 10}, permissions=['geolocation'])
        context.add_init_script("localStorage.setItem('gestor_notas_sesion', JSON.stringify({token:'smoke-token',usuario:{id:1,nombre:'Ana',correo:'ana@example.com'},expiraEn:Date.now()+3600000}));")
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/api/**', api)
        page.goto(base_url)
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('heading', name='Mis asignaturas')).to_be_visible()
        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({'width':width, 'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Desborde en panel: {width}px'
        page.set_viewport_size({'width':390, 'height':844})
        expect(page.locator('.dato').filter(has_text='Notas por registrar').locator('strong')).to_have_text('1')
        page.get_by_role('button', name='Con notas pendientes').click()
        expect(page.locator('.asignatura')).to_have_count(1)
        page.get_by_role('button', name='Todas', exact=False).click()
        expect(page.locator('.asignatura')).to_have_count(3)
        Path('artifacts').mkdir(exist_ok=True)
        page.screenshot(path='artifacts/asignaturas-mobile.png', full_page=True, animations='disabled')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.screenshot(path='artifacts/asignaturas-desktop.png', full_page=True, animations='disabled')
        page.set_viewport_size({'width': 390, 'height': 844})
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
        page.screenshot(path='artifacts/qr-mobile.png', full_page=True, animations='disabled')
        page.get_by_role('button', name='Cerrar', exact=True).last.click()
        page.get_by_role('button', name='Estudiar', exact=True).click()
        expect(page.get_by_role('button', name='25 min', exact=True)).to_have_attribute('aria-pressed', 'true')
        page.get_by_role('button', name='15 min', exact=True).click()
        page.get_by_label('¿Qué vas a estudiar?').fill('Repasar derivadas')
        page.get_by_role('button', name='Añadir ubicación').click()
        expect(page.get_by_text('precisión ±10 m', exact=False)).to_be_visible()
        page.get_by_role('button', name='Empezar a estudiar').click()
        expect(page.get_by_text('Acelerómetro no disponible.', exact=False)).to_be_visible()
        expect(page.get_by_role('timer')).not_to_have_text('00:00', timeout=5000)
        page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        page.screenshot(path='artifacts/estudio-en-curso.png', full_page=True, animations='disabled', style='mat-snack-bar-container { visibility: hidden; }')
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
        page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
        page.screenshot(path='artifacts/estudio-mobile.png', full_page=True, animations='disabled', style='mat-snack-bar-container { visibility: hidden; }')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.screenshot(path='artifacts/estudio-desktop.png', full_page=True, animations='disabled', style='mat-snack-bar-container { visibility: hidden; }')
        # El historial global usa datos del backend y conserva el tiempo de todas las asignaturas.
        page.set_viewport_size({'width': 390, 'height': 844})
        page.get_by_role('navigation', name='Navegación principal').get_by_role('link', name='Actividad', exact=True).click()
        expect(page.get_by_role('heading', name='Actividad de estudio')).to_be_visible()
        expect(page.locator('.actividad-registro')).to_have_count(2)
        page.screenshot(path='artifacts/actividad-mobile.png', full_page=True, animations='disabled')
        page.get_by_role('navigation', name='Navegación principal').get_by_role('link', name='Cuenta', exact=True).click()
        expect(page.get_by_role('heading', name='Mi cuenta')).to_be_visible()
        toggle = page.get_by_role('switch', name='Reducir animaciones')
        toggle.click()
        expect(page.locator('html')).to_have_class('movimiento-reducido')
        page.reload()
        expect(page.get_by_role('switch', name='Reducir animaciones')).to_be_checked()
        page.screenshot(path='artifacts/cuenta-mobile.png', full_page=True, animations='disabled')
        page.get_by_role('switch', name='Reducir animaciones').click()
        page.get_by_role('navigation', name='Navegación principal').get_by_role('link', name='Asignaturas', exact=True).click()
        page.get_by_role('link', name='Ver notas').first.click()
        page.get_by_role('button', name='Estudiar', exact=True).click()
        page.get_by_role('button', name='Eliminar sesión de estudio', exact=True).click()
        page.get_by_role('dialog').get_by_role('button', name='Eliminar', exact=True).click()
        expect(page.get_by_text('Tu próxima sesión será la primera.')).to_be_visible()
        assert not errors, errors
        guest = browser.new_context(viewport={'width': 1440, 'height': 1000})
        auth_page = guest.new_page()
        auth_page.goto(base_url)
        auth_page.wait_for_load_state('networkidle')
        expect(auth_page.get_by_role('heading', name='Iniciar sesión', exact=True)).to_be_visible()
        auth_page.screenshot(path='artifacts/login-desktop.png', full_page=True, animations='disabled')
        auth_page.set_viewport_size({'width': 390, 'height': 844})
        auth_page.screenshot(path='artifacts/login-mobile.png', full_page=True, animations='disabled')
        auth_page.get_by_role('link', name='Regístrate', exact=True).click()
        expect(auth_page.get_by_role('heading', name='Crear cuenta', exact=True)).to_be_visible()
        auth_page.screenshot(path='artifacts/registro-mobile.png', full_page=True, animations='disabled')
        for width in [320, 390, 768, 1440]:
            auth_page.set_viewport_size({'width': width, 'height': 900})
            assert auth_page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Desborde en registro: {width}px'
        guest.close()
        reduced = browser.new_context(reduced_motion='reduce', viewport={'width':390, 'height':844})
        reduced_page = reduced.new_page()
        reduced_page.goto(base_url)
        reduced_page.wait_for_load_state('networkidle')
        expect(reduced_page.locator('html')).to_have_class('movimiento-reducido')
        reduced.close()
        print('PASS: panel y filtros, QR, GPS, bloque de estudio, pausa y reintento, actividad, navegación inferior, preferencias persistentes, movimiento reducido y diseño 320-1440px.')
        context.close()
        browser.close()


if __name__ == '__main__':
    directory = Path(__file__).resolve().parents[1] / 'dist/frontend/browser'
    class SPAHandler(SimpleHTTPRequestHandler):
        def do_GET(self):
            if not Path(self.translate_path(self.path)).is_file() and '.' not in self.path:
                self.path = '/index.html'
            return super().do_GET()

    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SPAHandler, directory=str(directory)))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        main(f'http://127.0.0.1:{server.server_port}')
    finally:
        server.shutdown()
        server.server_close()
