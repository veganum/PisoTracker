import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { STORAGE } from '../../../core/persistence/storage.token';
import { BloqueGuion } from '../models/guion.model';
import { GUION_SEED } from './guion.seed';

const CLAVE_GUION = 'pisotracker.guion';

/** Progreso de respuestas (hechas/total). */
export interface ProgresoGuion {
  hechas: number;
  total: number;
}

/**
 * Estado del "Guion": bloques de preguntas preparadas para la compra.
 *
 * Sigue el mismo patrón que `PisosStore`: signals + persistencia automática
 * vía el puerto `STORAGE` (nunca `localStorage` directamente).
 */
@Injectable({ providedIn: 'root' })
export class GuionStore {
  private readonly storage = inject(STORAGE);

  /** Bloques del guion (cargados de persistencia o del seed si está vacío). */
  readonly bloques = signal<BloqueGuion[]>(this.cargar());

  constructor() {
    effect(() => this.storage.guardar(CLAVE_GUION, this.bloques()));
  }

  /** Progreso global (preguntas marcadas / total). */
  readonly progreso = computed<ProgresoGuion>(() => {
    const preguntas = this.bloques().flatMap((b) => b.preguntas);
    return {
      hechas: preguntas.filter((p) => p.hecha).length,
      total: preguntas.length,
    };
  });

  // --- Mutaciones ---

  /** Marca/desmarca una pregunta. */
  alternar(preguntaId: string): void {
    this.bloques.update((bloques) =>
      bloques.map((b) => ({
        ...b,
        preguntas: b.preguntas.map((p) =>
          p.id === preguntaId ? { ...p, hecha: !p.hecha } : p,
        ),
      })),
    );
  }

  /** Añade una pregunta nueva al final de un bloque. */
  añadirPregunta(bloqueId: string, texto: string): void {
    const limpio = texto.trim();
    if (!limpio) {
      return;
    }
    this.bloques.update((bloques) =>
      bloques.map((b) =>
        b.id === bloqueId
          ? { ...b, preguntas: [...b.preguntas, { id: crypto.randomUUID(), texto: limpio, hecha: false }] }
          : b,
      ),
    );
  }

  /** Edita el texto de una pregunta. */
  editarPregunta(preguntaId: string, texto: string): void {
    const limpio = texto.trim();
    if (!limpio) {
      return;
    }
    this.bloques.update((bloques) =>
      bloques.map((b) => ({
        ...b,
        preguntas: b.preguntas.map((p) => (p.id === preguntaId ? { ...p, texto: limpio } : p)),
      })),
    );
  }

  /** Borra una pregunta. */
  borrarPregunta(preguntaId: string): void {
    this.bloques.update((bloques) =>
      bloques.map((b) => ({
        ...b,
        preguntas: b.preguntas.filter((p) => p.id !== preguntaId),
      })),
    );
  }

  /** Desmarca todas las preguntas (reinicia el checklist). */
  reiniciar(): void {
    this.bloques.update((bloques) =>
      bloques.map((b) => ({
        ...b,
        preguntas: b.preguntas.map((p) => ({ ...p, hecha: false })),
      })),
    );
  }

  private cargar(): BloqueGuion[] {
    const guardado = this.storage.cargar<BloqueGuion[]>(CLAVE_GUION);
    return guardado && guardado.length > 0 ? guardado : GUION_SEED;
  }
}
