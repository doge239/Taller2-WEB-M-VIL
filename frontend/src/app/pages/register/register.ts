import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificacionService } from '../../services/notificacion.service';

/** Validador del campo "confirmar": debe coincidir con la contraseña. */
function coincideConPassword(control: AbstractControl): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;
  return control.value && password !== control.value ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-register',
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
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificaciones = inject(NotificacionService);

  protected readonly cargando = signal(false);
  protected readonly verPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmar: ['', [Validators.required, coincideConPassword]],
  });

  constructor() {
    // Si cambia la contraseña, vuelve a validar la confirmación.
    this.form.controls.password.valueChanges.subscribe(() =>
      this.form.controls.confirmar.updateValueAndValidity(),
    );
  }

  protected registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombre, correo, password } = this.form.getRawValue();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      this.form.controls.nombre.setErrors({ required: true });
      return;
    }

    this.cargando.set(true);
    // Registra y luego inicia sesión automáticamente.
    this.auth
      .registrar({ nombre: nombreLimpio, correo: correo.trim(), password })
      .pipe(switchMap(() => this.auth.login({ correo: correo.trim(), password })))
      .subscribe({
        next: (resp) => {
          this.notificaciones.exito(`Cuenta creada. ¡Bienvenido/a, ${resp.usuario.nombre}!`);
          this.router.navigateByUrl('/asignaturas');
        },
        error: (err) => {
          this.cargando.set(false);
          this.notificaciones.errorDesde(err, 'No se pudo crear la cuenta');
        },
      });
  }
}
