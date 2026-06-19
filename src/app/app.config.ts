import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { LocalStorageAdapter } from './core/persistence/local-storage.adapter';
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
    //  PERSISTENCIA (puerto + adaptador). Cambiar el mecanismo es
    //  cambiar SOLO esta línea:
    //
    //    { provide: STORAGE, useClass: LocalStorageAdapter }   ← actual
    //    { provide: STORAGE, useClass: MemoryStorageAdapter }  ← en memoria
    //    { provide: STORAGE, useClass: RestApiAdapter }        ← futuro
    //
    //  Ni el store ni los componentes se enteran del cambio.
    // ─────────────────────────────────────────────────────────────
    { provide: STORAGE, useClass: LocalStorageAdapter },
  ],
};
