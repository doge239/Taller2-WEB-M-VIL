import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Asignatura } from '../../models/api.models';
import { AsignaturasService } from '../../services/asignaturas.service';
import { NotificacionService } from '../../services/notificacion.service';

/** Crear (sin datos) o editar (con `Asignatura`) una asignatura. */
@Component({
  selector: 'app-asignatura-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './asignatura-form-dialog.html',
  styleUrl: './asignatura-form-dialog.scss',
})
export class AsignaturaFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AsignaturasService);
  private readonly notificaciones = inject(NotificacionService);
  private readonly dialogRef = inject(MatDialogRef<AsignaturaFormDialog, Asignatura>);
  protected readonly asignatura = inject<Asignatura | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly guardando = signal(false);
  protected readonly esEdicion = this.asignatura !== null;

  protected readonly form = this.fb.nonNullable.group({
    nombre: [this.asignatura?.nombre ?? '', [Validators.required, Validators.maxLength(120)]],
    codigo: [this.asignatura?.codigo ?? '', [Validators.maxLength(30)]],
    semestre: [this.asignatura?.semestre ?? '', [Validators.required, Validators.maxLength(30)]],
  });

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombre, codigo, semestre } = this.form.getRawValue();
    const payload = {
      nombre: nombre.trim(),
      codigo: codigo.trim() || null,
      semestre: semestre.trim(),
    };
    if (!payload.nombre || !payload.semestre) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const peticion = this.asignatura
      ? this.service.editar(this.asignatura.id, payload)
      : this.service.crear(payload);

    peticion.subscribe({
      next: (resultado) => {
        this.notificaciones.exito(
          this.esEdicion ? 'Asignatura actualizada' : 'Asignatura creada',
        );
        this.dialogRef.close(resultado);
      },
      error: (err) => {
        this.guardando.set(false);
        this.notificaciones.errorDesde(err, 'No se pudo guardar la asignatura');
      },
    });
  }
}
