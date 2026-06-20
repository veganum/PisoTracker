import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { STORAGE } from '../../../core/persistence/storage.token';
import { Contacto, contactoVacio, TipoContactoEntidad } from '../models/contacto.model';
import { Distrito, DISTRITOS_NOMBRES } from '../models/madrid';
import { Piso } from '../models/piso.model';
import { CONTACTOS_SEED } from './contactos.seed';
import { PISOS_SEED } from './pisos.seed';
import { calcularRango, puntuacionPiso } from './puntuacion.util';

/** Forma antigua del estado de inmobiliaria (antes de unificar en Contacto). */
type ContactoLegacy = Partial<Contacto> & {
  nombre?: string;
  honorarios?: number;
  comision?: number;
  notas?: string;
};

/** Normaliza un contacto al modelo actual, tolerando el formato antiguo. */
function migrarContacto(c: ContactoLegacy): Contacto {
  // Formato nuevo: completamos posibles campos nuevos con sus valores por defecto.
  if (c.tipo === 'Inmobiliaria' || c.tipo === 'Financiera') {
    return { ...contactoVacio(c.nombre ?? '', c.tipo), ...(c as Contacto) };
  }
  // Formato antiguo (CondicionesInmobiliaria): siempre inmobiliaria.
  const base = contactoVacio(c.nombre ?? '', 'Inmobiliaria');
  base.url = c.url ?? '';
  base.exclusiva = !!c.exclusiva;
  base.observaciones = c.notas ?? '';
  if (typeof c.honorarios === 'number' && c.honorarios > 0) {
    base.honorariosComprador = c.honorarios;
    base.unidadComprador = '€';
  } else if (typeof c.comision === 'number' && c.comision > 0) {
    base.honorariosComprador = c.comision;
    base.unidadComprador = '%';
  }
  return base;
}

/** Forma "antigua" de un piso (antes de separar distrito/barrio). */
type PisoLegacy = Omit<Piso, 'distrito' | 'barrio'> & { distrito?: string; barrio?: string };

/** Mapeo de los barrios antiguos (mezcla de distritos y barrios) al modelo nuevo. */
const MAPA_LEGACY: Record<string, { distrito: Distrito; barrio: string }> = {
  Usera: { distrito: 'Usera', barrio: '' },
  Carabanchel: { distrito: 'Carabanchel', barrio: '' },
  Villaverde: { distrito: 'Villaverde', barrio: '' },
  Almendrales: { distrito: 'Usera', barrio: 'Almendrales' },
  Vallecas: { distrito: 'Puente de Vallecas', barrio: '' },
  Latina: { distrito: 'Latina', barrio: '' },
  Arganzuela: { distrito: 'Arganzuela', barrio: '' },
};

/**
 * Normaliza un piso al modelo actual (distrito + barrio). Tolera datos
 * guardados con el formato antiguo (solo `barrio`, sin `distrito`).
 */
function migrarPiso(p: Piso): Piso {
  const raw = p as PisoLegacy;
  // Si ya trae un distrito válido, solo aseguramos que barrio sea string.
  if (DISTRITOS_NOMBRES.includes(raw.distrito as Distrito)) {
    return { ...p, barrio: raw.barrio ?? '' };
  }
  const legacy = MAPA_LEGACY[raw.barrio ?? ''] ?? { distrito: 'Centro' as Distrito, barrio: '' };
  return { ...p, distrito: legacy.distrito, barrio: legacy.barrio };
}

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

  /** Contactos: inmobiliarias y financieras (estado aparte, también persistido). */
  readonly contactos = signal<Contacto[]>(this.cargarContactos());

  constructor() {
    // Persistencia automática: cada cambio de estado se guarda vía el puerto.
    effect(() => this.storage.guardar(CLAVE_PISOS, this.pisos()));
    effect(() => this.storage.guardar(CLAVE_INMOBILIARIAS, this.contactos()));
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
   * Inmobiliarias listas para mostrar/editar: une las DETECTADAS en los pisos
   * con las CREADAS a mano. Para cada nombre se devuelve su contacto guardado
   * o uno por defecto de tipo Inmobiliaria.
   */
  readonly inmobiliarias = computed<Contacto[]>(() => {
    const guardados = this.contactos().filter((c) => c.tipo === 'Inmobiliaria');
    const nombres = [
      ...new Set([...this.nombresInmobiliarias(), ...guardados.map((c) => c.nombre)]),
    ].sort((a, b) => a.localeCompare(b));
    return nombres.map(
      (nombre) => guardados.find((c) => c.nombre === nombre) ?? contactoVacio(nombre, 'Inmobiliaria'),
    );
  });

  /** Financieras/brokers (solo se crean a mano, no se detectan de los pisos). */
  readonly financieras = computed<Contacto[]>(() =>
    this.contactos()
      .filter((c) => c.tipo === 'Financiera')
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  /** Nombres de inmobiliarias (detectadas + creadas) para sugerir en el formulario. */
  readonly nombresInmobiliariasSugeridas = computed<string[]>(() =>
    this.inmobiliarias().map((c) => c.nombre),
  );

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

  // --- Mutaciones de contactos (inmobiliarias / financieras) ---

  /** Inserta o actualiza (upsert) un contacto por nombre. */
  guardarContacto(contacto: Contacto): void {
    this.contactos.update((lista) => {
      const existe = lista.some((c) => c.nombre === contacto.nombre);
      return existe
        ? lista.map((c) => (c.nombre === contacto.nombre ? contacto : c))
        : [...lista, contacto];
    });
  }

  /**
   * Crea un contacto "suelto". No hace nada si el nombre está vacío o ya existe
   * (entre los del mismo tipo). Devuelve `true` si se creó.
   */
  crearContacto(nombre: string, tipo: TipoContactoEntidad): boolean {
    const limpio = nombre.trim();
    const existentes = tipo === 'Inmobiliaria' ? this.inmobiliarias() : this.financieras();
    if (!limpio || existentes.some((c) => c.nombre.toLowerCase() === limpio.toLowerCase())) {
      return false;
    }
    this.guardarContacto(contactoVacio(limpio, tipo));
    return true;
  }

  /** Borra un contacto por nombre (las inmobiliarias detectadas reaparecen del piso). */
  borrarContacto(nombre: string): void {
    this.contactos.update((lista) => lista.filter((c) => c.nombre !== nombre));
  }

  // --- Carga inicial (privado) ---

  private cargarPisos(): Piso[] {
    const guardados = this.storage.cargar<Piso[]>(CLAVE_PISOS);
    // Solo usamos el seed la primera vez (almacenamiento vacío o inexistente).
    const lista = guardados && guardados.length > 0 ? guardados : PISOS_SEED;
    return lista.map((p) => migrarPiso(p));
  }

  private cargarContactos(): Contacto[] {
    const guardados = this.storage.cargar<ContactoLegacy[]>(CLAVE_INMOBILIARIAS);
    // Solo usamos el seed la primera vez (almacenamiento vacío o inexistente).
    const lista = guardados && guardados.length > 0 ? guardados : CONTACTOS_SEED;
    return lista.map((c) => migrarContacto(c));
  }
}
