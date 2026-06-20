import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { USAR_SUPABASE } from './core/config';
import { LocalStorageAdapter } from './core/persistence/local-storage.adapter';
import { SupabaseAdapter } from './core/persistence/supabase.adapter';
import { STORAGE } from './core/persistence/storage.token';
// import { MemoryStorageAdapter } from './core/persistence/memory-storage.adapter';

/**
 * Configuración de la aplicación (zoneless por defecto en Angular 22:
 * no se registra Zone.js ni `provideZoneChangeDetection`).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    // ─────────────────────────────────────────────────────────────
    //  PERSISTENCIA (puerto + adaptador). El mecanismo se elige con el
    //  flag `USAR_SUPABASE` de `core/config.ts`:
    //
    //    false → LocalStorageAdapter (local, sin login)
    //    true  → SupabaseAdapter      (nube + RLS, requiere login)
    //
    //  Alternativas adicionales (cambiar la clase y listo):
    //    { provide: STORAGE, useClass: MemoryStorageAdapter }  ← en memoria
    //  Ni los stores ni los componentes se enteran del cambio.
    // ─────────────────────────────────────────────────────────────
    { provide: STORAGE, useClass: USAR_SUPABASE ? SupabaseAdapter : LocalStorageAdapter },
  ],
};
