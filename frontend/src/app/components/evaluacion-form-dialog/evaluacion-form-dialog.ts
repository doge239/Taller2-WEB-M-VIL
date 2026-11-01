import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Evaluacion } from '../../models/api.models';
import { EvaluacionesService } from '../../services/evaluaciones.service';
import { NotificacionService } from '../../services/notificacion.service';

export interface EvaluacionDialogData {
  asignaturaId: number;
  evaluacion: Evaluacion | null;
  /** Ponderación ya usada por las demás evaluaciones de la asignatura. */
  ponderacionUsada: number;
}

/** La nota es opcional (evaluación pendiente), pero si existe debe estar entre 1 y 7. */
const notaOpcional: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = c.value;
  if (v === null || v === '' || v === undefined) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return { notaRango: true };
  return n >= 1 && n <= 7 ? null : { notaRango: true };
};

@Component({
  selector: 'app-evaluacion-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './evaluacion-form-dialog.html',
  styleUrl: './evaluacion-form-dialog.scss',
})
export class EvaluacionFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EvaluacionesService);
  private readonly notificaciones = inject(NotificacionService);
  private readonly dialogRef = inject(MatDialogRef<EvaluacionFormDialog, Evaluacion>);
  protected readonly data = inject<EvaluacionDialogData>(MAT_DIALOG_DATA);

  protected readonly guardando = signal(false);
  protected readonly esEdicion = this.data.evaluacion !== null;
  protected readonly disponible = Math.max(0, +(100 - this.data.ponderacionUsada).toFixed(2));

  protected readonly form = this.fb.group({
    nombre: [this.data.evaluacion?.nombre ?? '', [Validators.required, Validators.maxLength(120)]],
    nota: [this.data.evaluacion?.nota ?? (null as number | null), [notaOpcional]],
    ponderacion: [
      this.data.evaluacion?.ponderacion ?? (null as number | null),
      [Validators.required, Validators.min(0.01), Validators.max(this.disponible)],
    ],
  });

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const nombre = (v.nombre ?? '').trim();
    if (!nombre) {
      this.form.controls.nombre.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }
    const payload = {
      nombre,
      nota: v.nota === null || (v.nota as unknown) === '' ? null : Number(v.nota),
      ponderacion: Number(v.ponderacion),
    };

    this.guardando.set(true);
    const peticion = this.data.evaluacion
      ? this.service.editar(this.data.asignaturaId, this.data.evaluacion.id, payload)
      : this.service.crear(this.data.asignaturaId, payload);

    peticion.subscribe({
      next: (resultado) => {
        this.notificaciones.exito(
          this.esEdicion ? 'Evaluación actualizada' : 'Evaluación creada',
        );
        this.dialogRef.close(resultado);
      },
      error: (err) => {
        this.guardando.set(false);
        this.notificaciones.errorDesde(err, 'No se pudo guardar la evaluación');
      },
    });
  }
}
