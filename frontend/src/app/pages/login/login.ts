import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { NotificacionService } from '../../services/notificacion.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificaciones = inject(NotificacionService);

  protected readonly cargando = signal(false);
  protected readonly verPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (resp) => {
        this.notificaciones.exito(`¡Hola, ${resp.usuario.nombre}!`);
        const destino = this.route.snapshot.queryParamMap.get('redirectTo');
        // Solo rutas internas, para evitar redirecciones abiertas.
        const seguro = destino && destino.startsWith('/') && !destino.startsWith('//');
        this.router.navigateByUrl(seguro ? destino : '/asignaturas');
      },
      error: (err) => {
        this.cargando.set(false);
        this.notificaciones.errorDesde(err, 'No se pudo iniciar sesión');
      },
    });
  }
}
