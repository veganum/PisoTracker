import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Pantalla de inicio de sesión (email + contraseña). Se muestra cuando la app
 * usa Supabase y no hay sesión. Formulario signal-first.
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-[100dvh] items-center justify-center bg-bg p-6">
      <div class="w-full max-w-sm">
        <div class="mb-6 text-center">
          <div
            class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-btn text-2xl shadow-sm"
          >
            🏠
          </div>
          <h1 class="text-2xl font-bold text-text">PisoTracker</h1>
          <p class="mt-1 text-sm text-muted">Inicia sesión para sincronizar tus pisos</p>
        </div>

        <form class="tarjeta space-y-4 p-5" (submit)="$event.preventDefault(); entrar()">
          <label class="block">
            <span class="etiqueta">Email</span>
            <input
              type="email"
              autocomplete="username"
              [value]="email()"
              (input)="email.set(valor($event))"
              placeholder="tu@email.com"
              class="campo"
            />
          </label>

          <label class="block">
            <span class="etiqueta">Contraseña</span>
            <input
              type="password"
              autocomplete="current-password"
              [value]="password()"
              (input)="password.set(valor($event))"
              placeholder="••••••••"
              class="campo"
            />
          </label>

          @if (error()) {
            <p class="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{{ error() }}</p>
          }

          <button
            type="submit"
            [disabled]="cargando() || !email().trim() || !password()"
            class="btn-primario w-full"
          >
            {{ cargando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>

        <p class="mt-4 text-center text-xs text-muted">¿Sin cuenta? Pídesela al administrador.</p>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);

  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');
  readonly cargando = signal(false);

  async entrar(): Promise<void> {
    if (this.cargando() || !this.email().trim() || !this.password()) {
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    const fallo = await this.auth.entrar(this.email(), this.password());
    if (fallo) {
      this.error.set(fallo);
    }
    this.cargando.set(false);
  }

  valor(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }
}
