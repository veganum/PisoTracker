import { inject, Injectable, signal } from '@angular/core';
import { ToastService } from './toast.service';

/** Estado global de sincronización con el backend. */
export type EstadoSync = 'ok' | 'guardando' | 'error';

/**
 * Centraliza el estado de las escrituras a persistencia para poder mostrarlo
 * en la UI (Guardando… / Guardado / Error al sincronizar) y avisar al usuario
 * cuando un guardado falla, sin exponer detalles técnicos de Supabase.
 */
@Injectable({ providedIn: 'root' })
export class SyncStatusService {
  private readonly toast = inject(ToastService);

  /** Estado actual de la sincronización. */
  readonly estado = signal<EstadoSync>('ok');

  /** Nº de escrituras en vuelo (para no bajar a 'ok' con otras pendientes). */
  private enVuelo = 0;

  /**
   * Ejecuta una escritura controlando el estado y los errores. El detalle
   * técnico va a consola; al usuario solo un mensaje comprensible.
   */
  async ejecutar(fn: () => Promise<void>): Promise<void> {
    this.enVuelo++;
    this.estado.set('guardando');
    try {
      await fn();
      this.enVuelo = Math.max(0, this.enVuelo - 1);
      if (this.enVuelo === 0) {
        this.estado.set('ok');
      }
    } catch (error) {
      this.enVuelo = Math.max(0, this.enVuelo - 1);
      this.estado.set('error');
      this.toast.mostrar('⚠️ Error al sincronizar. Reintenta.');
      console.error('[sync] fallo al guardar:', error);
    }
  }
}
