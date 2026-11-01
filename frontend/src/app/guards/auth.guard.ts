import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protege las rutas privadas: si no hay sesión, redirige al login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.autenticado()) return true;
  return router.createUrlTree(['/login'], {
    queryParams: { redirectTo: state.url },
  });
};

/** Evita que un usuario ya autenticado vea el login o el registro. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.autenticado() ? router.createUrlTree(['/asignaturas']) : true;
};
