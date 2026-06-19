import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { STORAGE } from '../persistence/storage.token';

/** Preferencia del usuario: seguir al sistema o forzar un tema. */
export type PreferenciaTema = 'auto' | 'claro' | 'oscuro';

const CLAVE_TEMA = 'pisotracker.tema';

/**
 * Gestiona el tema claro/oscuro.
 *
 * - Arranca en `auto`: sigue a `prefers-color-scheme` del sistema.
 * - El usuario puede forzar claro/oscuro con el toggle; la elección se
 *   persiste vía el puerto `STORAGE` (mismo mecanismo que el resto del estado).
 * - Un `effect()` aplica/quita la clase `.dark` en <html>, que es lo que
 *   activa los design tokens oscuros definidos en `styles.css`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(STORAGE);

  /** Preferencia elegida por el usuario (persistida). */
  readonly preferencia = signal<PreferenciaTema>(
    this.storage.cargar<PreferenciaTema>(CLAVE_TEMA) ?? 'auto',
  );

  /** Señal que refleja si el SISTEMA está en oscuro (se sincroniza con matchMedia). */
  private readonly sistemaOscuro = signal<boolean>(this.consultarSistema());

  /** Tema efectivo (lo que realmente se ve). */
  readonly oscuro = computed(() =>
    this.preferencia() === 'auto' ? this.sistemaOscuro() : this.preferencia() === 'oscuro',
  );

  constructor() {
    // Escucha cambios del tema del sistema (solo relevante en modo "auto").
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', (e) => this.sistemaOscuro.set(e.matches));
    }

    // Aplica la clase .dark y persiste la preferencia ante cualquier cambio.
    effect(() => {
      const oscuro = this.oscuro();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', oscuro);
      }
      this.storage.guardar(CLAVE_TEMA, this.preferencia());
    });
  }

  /** Alterna entre claro y oscuro (deja de seguir al sistema). */
  alternar(): void {
    this.preferencia.set(this.oscuro() ? 'claro' : 'oscuro');
  }

  private consultarSistema(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }
}
