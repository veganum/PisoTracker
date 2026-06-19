import { Injectable } from '@angular/core';
import { StoragePort } from './storage.port';

/**
 * Adaptador de persistencia sobre `window.localStorage`.
 *
 * Serializa/deserializa a JSON con `try/catch` para tolerar entornos sin
 * `localStorage` (SSR, modo incógnito con cuota llena, JSON corrupto...).
 * Ante cualquier error se degrada de forma silenciosa en lugar de romper
 * la aplicación.
 */
@Injectable()
export class LocalStorageAdapter implements StoragePort {
  /** Comprueba que `localStorage` esté disponible (no lo está en SSR). */
  private get disponible(): boolean {
    return typeof localStorage !== 'undefined';
  }

  cargar<T>(clave: string): T | null {
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

  guardar<T>(clave: string, valor: T): void {
    if (!this.disponible) {
      return;
    }
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Cuota superada o almacenamiento bloqueado: ignoramos.
    }
  }

  borrar(clave: string): void {
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
