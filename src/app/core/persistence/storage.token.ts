import { InjectionToken } from '@angular/core';
import { StoragePort } from './storage.port';

/**
 * Token de inyección del puerto de persistencia.
 *
 * Se inyecta SIEMPRE este token (el puerto), nunca una implementación
 * concreta. La implementación se decide en `app.config.ts`:
 *
 *   { provide: STORAGE, useClass: LocalStorageAdapter }
 *
 * Cambiar `LocalStorageAdapter` por `MemoryStorageAdapter` (o un futuro
 * `RestApiAdapter`) es lo único que hay que tocar para cambiar de mecanismo.
 */
export const STORAGE = new InjectionToken<StoragePort>('STORAGE');
