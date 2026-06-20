import { Injectable } from '@angular/core';
import { StoragePort } from './storage.port';

/**
 * Adaptador de persistencia EN MEMORIA.
 *
 * Guarda los datos en un `Map` que vive mientras dura la sesión de la
 * aplicación (no sobrevive a recargas). Útil como:
 *   - Fallback seguro en SSR (donde no hay `localStorage`).
 *   - Modo de pruebas / demos sin tocar el almacenamiento real del usuario.
 *
 * Implementa el puerto asíncrono resolviendo al instante. Se serializa igual
 * que el adaptador real (clon profundo vía JSON) para imitar su comportamiento
 * y evitar mutaciones accidentales por referencia.
 */
@Injectable()
export class MemoryStorageAdapter implements StoragePort {
  private readonly almacen = new Map<string, string>();

  async cargar<T>(clave: string): Promise<T | null> {
    const crudo = this.almacen.get(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  }

  async guardar<T>(clave: string, valor: T): Promise<void> {
    this.almacen.set(clave, JSON.stringify(valor));
  }

  async borrar(clave: string): Promise<void> {
    this.almacen.delete(clave);
  }
}

/*
 * FUTURO: SupabaseAdapter / RestApiAdapter / IndexedDbAdapter
 * ----------------------------------------------------------
 * Cualquier nuevo mecanismo solo tiene que implementar `StoragePort`
 * (asíncrono) y registrarse en app.config.ts:
 *   { provide: STORAGE, useClass: SupabaseAdapter }
 * Ni los stores ni los componentes cambian una sola línea.
 */
