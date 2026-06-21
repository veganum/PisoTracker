import { inject, Injectable, signal } from '@angular/core';
import { USAR_SUPABASE } from '../../../core/config';
import { STORAGE } from '../../../core/persistence/storage.token';
import { ToastService } from './toast.service';

/** Claves de datos de la app que tiene sentido migrar a la nube. */
const CLAVES = [
  'pisotracker.pisos',
  'pisotracker.inmobiliarias',
  'pisotracker.guion',
  'pisotracker.tema',
];
/** Marca de que ya se migró (para no volver a ofrecerlo). */
const MARCA_MIGRADO = 'pisotracker.migrado';

/**
 * Migración puntual de los datos guardados en `localStorage` (uso previo sin
 * cuenta) hacia Supabase. Solo aplica cuando la app usa Supabase y hay datos
 * locales sin migrar. Sube cada blob tal cual mediante el puerto activo
 * (que ya es el adaptador de Supabase) y recarga para releer desde la nube.
 */
@Injectable({ providedIn: 'root' })
export class MigracionService {
  private readonly storage = inject(STORAGE);
  private readonly toast = inject(ToastService);

  /** Hay datos locales antiguos que se pueden importar a la cuenta. */
  readonly disponible = signal(this.hayDatosLocales());
  /** Migración en curso. */
  readonly migrando = signal(false);

  private hayDatosLocales(): boolean {
    if (!USAR_SUPABASE || typeof localStorage === 'undefined') {
      return false;
    }
    if (localStorage.getItem(MARCA_MIGRADO)) {
      return false;
    }
    return CLAVES.some((clave) => !!localStorage.getItem(clave));
  }

  /** Sube los datos locales a Supabase (sobreescribe lo que haya) y recarga. */
  async migrar(): Promise<void> {
    this.migrando.set(true);
    try {
      for (const clave of CLAVES) {
        const crudo = localStorage.getItem(clave);
        if (!crudo) {
          continue;
        }
        await this.storage.guardar(clave, JSON.parse(crudo));
      }
      localStorage.setItem(MARCA_MIGRADO, '1');
      this.disponible.set(false);
      this.toast.mostrar('Datos importados ✓');
      // Recargamos para releer el estado ya desde la nube.
      setTimeout(() => location.reload(), 700);
    } catch (error) {
      console.error('[migración] fallo al importar:', error);
      this.toast.mostrar('⚠️ No se pudo importar. Reinténtalo.');
    } finally {
      this.migrando.set(false);
    }
  }
}
