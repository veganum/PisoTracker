/**
 * Puerto de persistencia (arquitectura hexagonal).
 *
 * Define el CONTRATO que la aplicación necesita para guardar y recuperar
 * datos, sin acoplarse a ninguna tecnología concreta (localStorage, REST,
 * IndexedDB...). El `PisosStore` depende de esta interfaz, nunca de una
 * implementación. Así, cambiar el mecanismo de persistencia es cambiar
 * UNA sola línea de `providers` en `app.config.ts`.
 */
export interface StoragePort {
  /** Recupera y deserializa el valor asociado a la clave, o `null` si no existe. */
  cargar<T>(clave: string): T | null;

  /** Serializa y guarda el valor bajo la clave indicada. */
  guardar<T>(clave: string, valor: T): void;

  /** Elimina el valor asociado a la clave. */
  borrar(clave: string): void;
}
