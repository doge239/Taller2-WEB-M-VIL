import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginPayload, RegistroPayload, TokenRespuesta, Usuario } from '../models/api.models';

const CLAVE_SESION = 'gestor_notas_sesion';

interface SesionGuardada {
  token: string;
  usuario: Usuario;
  expiraEn: number; // epoch ms
}

/**
 * Gestiona la sesión. El estado vive en Signals: cualquier componente que
 * lea `usuario()` o `autenticado()` se actualiza solo al iniciar/cerrar sesión.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(null);
  private readonly _usuario = signal<Usuario | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly token = this._token.asReadonly();
  readonly autenticado = computed(() => this._token() !== null);

  constructor() {
    this.restaurarSesion();
  }

  registrar(datos: RegistroPayload): Observable<Usuario> {
    return this.http.post<Usuario>('/api/auth/register', datos);
  }

  login(datos: LoginPayload): Observable<TokenRespuesta> {
    return this.http.post<TokenRespuesta>('/api/auth/login', datos).pipe(
      tap((resp) => this.guardarSesion(resp)),
    );
  }

  logout(redirigir = true): void {
    this._token.set(null);
    this._usuario.set(null);
    localStorage.removeItem(CLAVE_SESION);
    if (redirigir) {
      this.router.navigate(['/login']);
    }
  }

  private guardarSesion(resp: TokenRespuesta): void {
    const sesion: SesionGuardada = {
      token: resp.access_token,
      usuario: resp.usuario,
      expiraEn: Date.now() + resp.expires_in * 1000,
    };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    this._token.set(sesion.token);
    this._usuario.set(sesion.usuario);
  }

  private restaurarSesion(): void {
    try {
      const raw = localStorage.getItem(CLAVE_SESION);
      if (!raw) return;
      const sesion = JSON.parse(raw) as SesionGuardada;
      if (!sesion.token || sesion.expiraEn <= Date.now()) {
        localStorage.removeItem(CLAVE_SESION);
        return;
      }
      this._token.set(sesion.token);
      this._usuario.set(sesion.usuario);
    } catch {
      localStorage.removeItem(CLAVE_SESION);
    }
  }
}
