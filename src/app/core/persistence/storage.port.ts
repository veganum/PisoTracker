/**
 * Puerto de persistencia (arquitectura hexagonal).
 *
 * Define el CONTRATO que la aplicación necesita para guardar y recuperar
 * datos, sin acoplarse a ninguna tecnología concreta (localStorage, REST,
 * Supabase, IndexedDB...). Los stores dependen de esta interfaz, nunca de una
 * implementación. Así, cambiar el mecanismo de persistencia es cambiar
 * UNA sola línea de `providers` en `app.config.ts`.
 *
 * Las operaciones son **asíncronas** (`Promise`) para poder respaldar tanto
 * adaptadores locales (localStorage/memoria, resuelven al instante) como
 * remotos (Supabase/REST, que van por red).
 */
export interface StoragePort {
  /** Recupera y deserializa el valor asociado a la clave, o `null` si no existe. */
  cargar<T>(clave: string): Promise<T | null>;

  /** Serializa y guarda el valor bajo la clave indicada. */
  guardar<T>(clave: string, valor: T): Promise<void>;

  /** Elimina el valor asociado a la clave. */
  borrar(clave: string): Promise<void>;
}
