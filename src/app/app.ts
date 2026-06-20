import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import { Login } from './core/auth/login';
import { USAR_SUPABASE } from './core/config';
import { PisosPage } from './features/pisos/pisos.page';

/**
 * Componente raíz. Si la app usa Supabase, protege el contenido tras el login;
 * con `localStorage` muestra la app directamente (sin autenticación).
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PisosPage, Login],
  template: `
    @if (!authRequerido) {
      <app-pisos-page />
    } @else if (auth.cargandoSesion()) {
      <div class="flex min-h-[100dvh] items-center justify-center bg-bg text-muted">Cargando…</div>
    } @else if (auth.usuario()) {
      <app-pisos-page />
    } @else {
      <app-login />
    }
  `,
})
export class App {
  protected readonly authRequerido = USAR_SUPABASE;
  protected readonly auth = inject(AuthService);
}
