import { inject, Injectable, signal } from '@angular/core';
import { USAR_SUPABASE } from '../config';
import { SupabaseService } from '../supabase/supabase.service';

/** Usuario autenticado (subconjunto mínimo). */
export interface Usuario {
  id: string;
  email: string | null;
}

/**
 * Autenticación vía Supabase (email + contraseña). Expone la sesión como
 * signal. Si `USAR_SUPABASE` está desactivado, queda inerte (no hay login).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sb = inject(SupabaseService).client;

  /** Usuario actual (`null` = no autenticado). */
  readonly usuario = signal<Usuario | null>(null);
  /** `true` mientras se comprueba si hay sesión guardada. */
  readonly cargandoSesion = signal(true);

  constructor() {
    if (!USAR_SUPABASE) {
      // Modo localStorage: no hay autenticación.
      this.cargandoSesion.set(false);
      return;
    }

    // Restaura una sesión previa (si la hay) y escucha cambios de sesión.
    void this.sb.auth.getSession().then(({ data }) => {
      this.aplicar(data.session?.user ?? null);
      this.cargandoSesion.set(false);
    });
    this.sb.auth.onAuthStateChange((_evento, session) => {
      const nuevoId = session?.user?.id ?? null;
      const anteriorId = this.usuario()?.id ?? null;
      this.aplicar(session?.user ?? null);

      // Si cambia el USUARIO una vez ya cargada la app (login distinto o
      // logout), recargamos: los stores son singletons con datos en memoria y
      // así evitamos mostrar/guardar datos del usuario anterior. La carga
      // inicial (cargandoSesion) no dispara recarga.
      if (!this.cargandoSesion() && nuevoId !== anteriorId) {
        location.reload();
      }
    });
  }

  /** Inicia sesión. Devuelve un mensaje de error o `null` si fue bien. */
  async entrar(email: string, password: string): Promise<string | null> {
    const { error } = await this.sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? this.traducir(error.message) : null;
  }

  /** Cierra la sesión. */
  async salir(): Promise<void> {
    await this.sb.auth.signOut();
  }

  private aplicar(user: { id: string; email?: string } | null): void {
    this.usuario.set(user ? { id: user.id, email: user.email ?? null } : null);
  }

  /** Traduce los mensajes de error más comunes de Supabase. */
  private traducir(mensaje: string): string {
    if (/invalid login credentials/i.test(mensaje)) {
      return 'Email o contraseña incorrectos.';
    }
    if (/email not confirmed/i.test(mensaje)) {
      return 'Tu email no está confirmado todavía.';
    }
    return mensaje;
  }
}
