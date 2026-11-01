import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../services/notificacion.service';

const RUTAS_PUBLICAS = ['/api/auth/login', '/api/auth/register'];

/**
 * 1) Agrega automáticamente `Authorization: Bearer <JWT>` a las llamadas a la API.
 * 2) Si el backend responde 401 con una sesión activa (token vencido/inválido),
 *    cierra la sesión y lleva al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notificaciones = inject(NotificacionService);

  const esApi = req.url.startsWith('/api/');
  const esPublica = RUTAS_PUBLICAS.some((r) => req.url.startsWith(r));
  const token = auth.token();

  const peticion =
    esApi && !esPublica && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(peticion).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        esApi &&
        !esPublica &&
        auth.autenticado()
      ) {
        auth.logout();
        notificaciones.error('Tu sesión expiró. Inicia sesión nuevamente.');
      }
      return throwError(() => err);
    }),
  );
};
