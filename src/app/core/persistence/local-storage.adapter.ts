import { Injectable } from '@angular/core';
import { StoragePort } from './storage.port';

/**
 * Adaptador de persistencia sobre `window.localStorage`.
 *
 * Aunque `localStorage` es síncrono, implementa el puerto **asíncrono**
 * (resuelve al instante con `Promise.resolve`) para cumplir el contrato común
 * con los adaptadores remotos. Serializa/deserializa a JSON con `try/catch`
 * para tolerar entornos sin `localStorage` (SSR, JSON corrupto, cuota llena...);
 * ante cualquier error se degrada de forma silenciosa.
 */
@Injectable()
export class LocalStorageAdapter implements StoragePort {
  /** Comprueba que `localStorage` esté disponible (no lo está en SSR). */
  private get disponible(): boolean {
    return typeof localStorage !== 'undefined';
  }

  async cargar<T>(clave: string): Promise<T | null> {
    if (!this.disponible) {
      return null;
    }
    try {
      const crudo = localStorage.getItem(clave);
      return crudo ? (JSON.parse(crudo) as T) : null;
    } catch {
      // JSON corrupto o acceso denegado: tratamos como "sin datos".
      return null;
    }
  }

  async guardar<T>(clave: string, valor: T): Promise<void> {
    if (!this.disponible) {
      return;
    }
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Cuota superada o almacenamiento bloqueado: ignoramos.
    }
  }

  async borrar(clave: string): Promise<void> {
    if (!this.disponible) {
      return;
    }
    try {
      localStorage.removeItem(clave);
    } catch {
      // Sin acción posible.
    }
  }
}
