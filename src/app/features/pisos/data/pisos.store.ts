import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { STORAGE } from '../../../core/persistence/storage.token';
import { CondicionesInmobiliaria, Piso } from '../models/piso.model';
import { PISOS_SEED } from './pisos.seed';
import { calcularRango, puntuacionPiso } from './puntuacion.util';

/** Un favorito con su puntuación ya calculada (para la vista de favoritos). */
export interface FavoritoPuntuado {
  piso: Piso;
  puntos: number;
}

const CLAVE_PISOS = 'pisotracker.pisos';
const CLAVE_INMOBILIARIAS = 'pisotracker.inmobiliarias';

/**
 * Estado central de la aplicación (signal store).
 *
 * - Inyecta el PUERTO de persistencia (`STORAGE`), nunca `localStorage`.
 * - Mantiene el estado en signals y lo persiste automáticamente vía `effect()`.
 * - Expone `computed()` derivados (favoritos ordenados, agencias detectadas).
 */
@Injectable({ providedIn: 'root' })
export class PisosStore {
  private readonly storage = inject(STORAGE);

  // --- Estado base (signals) ---
  /** Lista de pisos. Se inicializa desde persistencia o, si está vacía, del seed. */
  readonly pisos = signal<Piso[]>(this.cargarPisos());

  /** Condiciones por inmobiliaria (estado aparte, también persistido). */
  readonly condiciones = signal<CondicionesInmobiliaria[]>(this.cargarCondiciones());

  constructor() {
    // Persistencia automática: cada cambio de estado se guarda vía el puerto.
    effect(() => this.storage.guardar(CLAVE_PISOS, this.pisos()));
    effect(() => this.storage.guardar(CLAVE_INMOBILIARIAS, this.condiciones()));
  }

  // --- Derivados (computed) ---

  /** Rango de precios/metros sobre todos los pisos (base de la puntuación). */
  readonly rango = computed(() => calcularRango(this.pisos()));

  /** Favoritos puntuados y ordenados de mayor a menor puntuación. */
  readonly favoritos = computed<FavoritoPuntuado[]>(() => {
    const rango = this.rango();
    return this.pisos()
      .filter((p) => p.estado === 'Favorito')
      .map((piso) => ({ piso, puntos: puntuacionPiso(piso, rango) }))
      .sort((a, b) => b.puntos - a.puntos);
  });

  /** Nombres únicos de inmobiliarias detectados automáticamente en los pisos. */
  readonly nombresInmobiliarias = computed<string[]>(() => {
    const nombres = this.pisos()
      .filter((p) => p.tipoContacto === 'Inmobiliaria' && !!p.inmobiliaria?.trim())
      .map((p) => p.inmobiliaria!.trim());
    return [...new Set(nombres)].sort((a, b) => a.localeCompare(b));
  });

  /**
   * Agencias listas para mostrar/editar: para cada nombre detectado se busca
   * su condición guardada o se genera una por defecto.
   */
  readonly agencias = computed<CondicionesInmobiliaria[]>(() => {
    const guardadas = this.condiciones();
    return this.nombresInmobiliarias().map(
      (nombre) =>
        guardadas.find((c) => c.nombre === nombre) ?? {
          nombre,
          honorarios: 0,
          comision: 0,
          exclusiva: false,
          notas: '',
        },
    );
  });

  // --- Mutaciones de pisos ---

  añadir(piso: Piso): void {
    this.pisos.update((lista) => [...lista, piso]);
  }

  actualizar(piso: Piso): void {
    this.pisos.update((lista) => lista.map((p) => (p.id === piso.id ? piso : p)));
  }

  borrar(id: string): void {
    this.pisos.update((lista) => lista.filter((p) => p.id !== id));
  }

  // --- Mutaciones de condiciones de inmobiliaria ---

  /** Inserta o actualiza (upsert) las condiciones de una agencia por nombre. */
  guardarCondiciones(cond: CondicionesInmobiliaria): void {
    this.condiciones.update((lista) => {
      const existe = lista.some((c) => c.nombre === cond.nombre);
      return existe
        ? lista.map((c) => (c.nombre === cond.nombre ? cond : c))
        : [...lista, cond];
    });
  }

  // --- Carga inicial (privado) ---

  private cargarPisos(): Piso[] {
    const guardados = this.storage.cargar<Piso[]>(CLAVE_PISOS);
    // Solo usamos el seed la primera vez (almacenamiento vacío o inexistente).
    return guardados && guardados.length > 0 ? guardados : PISOS_SEED;
  }

  private cargarCondiciones(): CondicionesInmobiliaria[] {
    return this.storage.cargar<CondicionesInmobiliaria[]>(CLAVE_INMOBILIARIAS) ?? [];
  }
}
