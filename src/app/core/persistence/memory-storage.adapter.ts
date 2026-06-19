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
 * Se serializa igual que el adaptador real (clon profundo vía JSON) para
 * imitar su comportamiento y evitar mutaciones accidentales por referencia.
 */
@Injectable()
export class MemoryStorageAdapter implements StoragePort {
  private readonly almacen = new Map<string, string>();

  cargar<T>(clave: string): T | null {
    const crudo = this.almacen.get(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  }

  guardar<T>(clave: string, valor: T): void {
    this.almacen.set(clave, JSON.stringify(valor));
  }

  borrar(clave: string): void {
    this.almacen.delete(clave);
  }
}

/*
 * FUTURO: RestApiAdapter / IndexedDbAdapter
 * -----------------------------------------
 * Cualquier nuevo mecanismo solo tiene que implementar `StoragePort`:
 *
 *   @Injectable()
 *   export class RestApiAdapter implements StoragePort {
 *     private http = inject(HttpClient);
 *     cargar<T>(clave: string): T | null { ... }   // GET /estado/:clave
 *     guardar<T>(clave: string, valor: T): void { ... } // PUT /estado/:clave
 *     borrar(clave: string): void { ... }          // DELETE /estado/:clave
 *   }
 *
 * y registrarse en app.config.ts:
 *   { provide: STORAGE, useClass: RestApiAdapter }
 * Ni el store ni los componentes cambian una sola línea.
 */
