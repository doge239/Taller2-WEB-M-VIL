import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from './services/auth.service';
import { AndroidNavigationService } from './services/android-navigation.service';
import { EstudioService } from './services/estudio.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly androidNavigation = inject(AndroidNavigationService);
  protected readonly auth = inject(AuthService);
  protected readonly estudio = inject(EstudioService);

  protected cerrarSesion(): void {
    if (this.estudio.actual() && !window.confirm('Tienes una sesión de estudio sin guardar. ¿Cerrar sesión y descartarla?')) return;
    this.auth.logout();
  }
}
