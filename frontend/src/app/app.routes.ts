import { Routes } from '@angular/router';
import { authGuard, invitadoGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'asignaturas' },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesión',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    canActivate: [invitadoGuard],
    title: 'Crear cuenta',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: 'asignaturas',
    canActivate: [authGuard],
    title: 'Mis asignaturas',
    loadComponent: () =>
      import('./pages/asignaturas/asignaturas').then((m) => m.Asignaturas),
  },
  {
    path: 'asignaturas/:id',
    canActivate: [authGuard],
    title: 'Detalle de asignatura',
    loadComponent: () =>
      import('./pages/asignatura-detalle/asignatura-detalle').then(
        (m) => m.AsignaturaDetalle,
      ),
  },
  {
    path: '**',
    title: 'No encontrado',
    loadComponent: () =>
      import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
