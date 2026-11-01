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
        titulo="Página no encontrada"
        descripcion="La dirección que buscas no existe."
      >
        <a mat-flat-button routerLink="/">Volver al inicio</a>
      </app-estado-vacio>
    </div>
  `,
})
export class NotFound {}
