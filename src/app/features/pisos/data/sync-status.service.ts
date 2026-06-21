import { inject, Injectable, signal } from '@angular/core';
import { STORAGE } from '../../../core/persistence/storage.token';
import { ToastService } from './toast.service';

/** Estado global de sincronización con el backend. */
export type EstadoSync = 'ok' | 'guardando' | 'pendiente' | 'error';

const CLAVE_OUTBOX = 'pisotracker.outbox';

/**
 * Capa de escritura RESILIENTE sobre el puerto de persistencia.
 *
 * Centraliza el guardado y, si falla (p. ej. sin red), encola el cambio en un
 * "buzón de salida" (outbox) por clave —última escritura gana— que:
 *   - se PERSISTE en localStorage (sobrevive a recargas),
 *   - se REINTENTA al recuperar la conexión (`online`).
 *
 * Expone `estado` para la UI: Guardando… / Pendiente / Error / OK. Nunca
 * muestra detalles técnicos: el detalle va a consola, al usuario un aviso.
 */
@Injectable({ providedIn: 'root' })
export class SyncStatusService {
  private readonly storage = inject(STORAGE);
  private readonly toast = inject(ToastService);

  /** Estado actual de la sincronización. */
  readonly estado = signal<EstadoSync>('ok');

  /** Cambios pendientes de guardar (clave → último valor). */
  private readonly pendientes = new Map<string, unknown>();
  /** Nº de escrituras en vuelo. */
  private enVuelo = 0;

  constructor() {
    this.restaurarOutbox();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => void this.vaciarOutbox());
    }
  }

  /** Guarda un valor; si falla, lo encola y reintenta al reconectar. */
  async guardar<T>(clave: string, valor: T): Promise<void> {
    this.enVuelo++;
    this.estado.set('guardando');
    try {
      await this.storage.guardar(clave, valor);
      this.pendientes.delete(clave);
    } catch (error) {
      console.error('[sync] guardado fallido, encolando:', clave, error);
      this.pendientes.set(clave, valor);
      this.persistirOutbox();
      this.toast.mostrar('⚠️ Sin conexión: se guardará al reconectar');
    } finally {
      this.enVuelo = Math.max(0, this.enVuelo - 1);
      this.actualizarEstado();
    }
  }

  /** Reintenta todos los cambios pendientes (al volver la conexión). */
  private async vaciarOutbox(): Promise<void> {
    if (this.pendientes.size === 0) {
      return;
    }
    this.estado.set('guardando');
    for (const [clave, valor] of [...this.pendientes]) {
      try {
        await this.storage.guardar(clave, valor);
        this.pendientes.delete(clave);
      } catch {
        // Sigue sin poder: se queda pendiente para el próximo intento.
      }
    }
    this.persistirOutbox();
    const reconectado = this.pendientes.size === 0;
    this.actualizarEstado();
    if (reconectado) {
      this.toast.mostrar('Sincronizado ✓');
    }
  }

  private actualizarEstado(): void {
    if (this.enVuelo > 0) {
      this.estado.set('guardando');
    } else {
      this.estado.set(this.pendientes.size > 0 ? 'pendiente' : 'ok');
    }
  }

  private persistirOutbox(): void {
    try {
      localStorage.setItem(CLAVE_OUTBOX, JSON.stringify([...this.pendientes]));
    } catch {
      // Sin localStorage: no podemos persistir el buzón, no es crítico.
    }
  }

  private restaurarOutbox(): void {
    try {
      const crudo = typeof localStorage !== 'undefined' ? localStorage.getItem(CLAVE_OUTBOX) : null;
      if (!crudo) {
        return;
      }
      for (const [clave, valor] of JSON.parse(crudo) as [string, unknown][]) {
        this.pendientes.set(clave, valor);
      }
      if (this.pendientes.size > 0) {
        this.estado.set('pendiente');
        void this.vaciarOutbox();
      }
    } catch {
      // Buzón corrupto: lo ignoramos.
    }
  }
}
