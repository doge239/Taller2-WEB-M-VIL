import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { EstadoVacio } from '../../components/estado-vacio/estado-vacio';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, EstadoVacio],
  template: `
    <div class="pagina">
      <app-estado-vacio
        icono="travel_explore"
        titulo="Esta página no está en tu plan de estudio"
        descripcion="La dirección no existe o fue movida."
      >
        <a mat-flat-button routerLink="/asignaturas">Volver a mis asignaturas</a>
      </app-estado-vacio>
    </div>
  `,
})
export class NotFound {}
