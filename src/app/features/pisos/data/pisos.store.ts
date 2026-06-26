import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { STORAGE } from '../../../core/persistence/storage.token';
import { RealtimeService } from '../../../core/supabase/realtime.service';
import { Contacto, contactoVacio, TipoContactoEntidad } from '../models/contacto.model';
import { Distrito, DISTRITOS_NOMBRES } from '../models/madrid';
import type { EstadoPipeline } from '../models/estado-pipeline';
import type { EstadoPiso, TipoContacto } from '../models/piso.model';
import { Piso } from '../models/piso.model';
import { CONTACTOS_SEED } from './contactos.seed';
import { PISOS_SEED } from './pisos.seed';
import { calcularRango, puntuacionPiso } from './puntuacion.util';
import { SyncStatusService } from './sync-status.service';

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

/** Valores por defecto de los campos añadidos después (costes/riesgos/etc.). */
const CAMPOS_NUEVOS_DEFECTO = {
  gastosComunidad: 0,
  ibiAnual: 0,
  derramas: '',
  reformaEstimada: 0,
  minutosMetro: 0,
  minutosBus: 0,
  ocupado: false,
  nudaPropiedad: false,
  observacionesLegales: '',
  certificadoEnergetico: '',
  fechaPublicacion: '',
  fechaUltimaRevision: '',
  contactoCita: '',
  notasCita: '',
  historialEstados: [],
} satisfies Partial<Piso>;

/**
 * Normaliza un piso al modelo actual: separa distrito/barrio del formato
 * antiguo y rellena con valores por defecto los campos añadidos después.
 */
function migrarPiso(p: Piso): Piso {
  const raw = p as PisoLegacy;
  // Los defaults van primero: si `p` ya trae el campo, prevalece el suyo.
  const base = { ...CAMPOS_NUEVOS_DEFECTO, ...p };
  if (DISTRITOS_NOMBRES.includes(raw.distrito as Distrito)) {
    return { ...base, barrio: raw.barrio ?? '' };
  }
  const legacy = MAPA_LEGACY[raw.barrio ?? ''] ?? { distrito: 'Centro' as Distrito, barrio: '' };
  return { ...base, distrito: legacy.distrito, barrio: legacy.barrio };
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
  private readonly sync = inject(SyncStatusService);
  private readonly realtime = inject(RealtimeService);

  // --- Estado base (signals) ---
  /** Lista de pisos (se rellena de forma asíncrona desde el puerto). */
  readonly pisos = signal<Piso[]>([]);

  /** Contactos: inmobiliarias y financieras (estado aparte, también persistido). */
  readonly contactos = signal<Contacto[]>([]);

  /** `true` cuando ya se ha completado la carga inicial desde el puerto. */
  readonly cargado = signal(false);

  /** Distrito elegido desde el mapa (para prefiltrar la Lista). */
  readonly distritoMapa = signal('');
  /** Barrio detectado del punto pulsado en el mapa (best-effort, asíncrono). */
  readonly barrioMapa = signal('');

  constructor() {
    // Persistencia automática: cada cambio se guarda vía el puerto, pero SOLO
    // después de la carga inicial (si no, escribiríamos los signals vacíos
    // encima de los datos guardados antes de leerlos).
    effect(() => {
      const pisos = this.pisos();
      if (this.cargado()) {
        void this.sync.guardar(CLAVE_PISOS, pisos);
      }
    });
    effect(() => {
      const contactos = this.contactos();
      if (this.cargado()) {
        void this.sync.guardar(CLAVE_INMOBILIARIAS, contactos);
      }
    });

    // Sincronización en vivo: si otro dispositivo cambia los datos, refrescamos
    // (solo si el valor remoto difiere del local, para no entrar en bucle).
    this.realtime.escuchar(CLAVE_PISOS, (valor) => {
      if (!this.cargado()) return;
      const remoto = ((valor as Piso[]) ?? []).map((p) => migrarPiso(p));
      if (JSON.stringify(remoto) !== JSON.stringify(this.pisos())) {
        this.pisos.set(remoto);
      }
    });
    this.realtime.escuchar(CLAVE_INMOBILIARIAS, (valor) => {
      if (!this.cargado()) return;
      const remoto = ((valor as ContactoLegacy[]) ?? []).map((c) => migrarContacto(c));
      if (JSON.stringify(remoto) !== JSON.stringify(this.contactos())) {
        this.contactos.set(remoto);
      }
    });

    void this.inicializar();
  }

  // --- Filtros de la Lista (persisten entre cambios de pestaña) ---

  readonly fDistrito = signal('');
  readonly fBarrio = signal('');
  readonly fEstado = signal('');
  readonly fContacto = signal('');
  readonly fEstadoPiso = signal('');
  readonly busqueda = signal('');
  readonly orden = signal('ninguno');

  readonly numFiltros = computed(() =>
    [
      this.fDistrito(),
      this.fBarrio(),
      this.fEstado(),
      this.fContacto(),
      this.fEstadoPiso(),
      this.busqueda().trim(),
      this.orden() !== 'ninguno' ? '1' : '',
    ].filter(Boolean).length,
  );

  readonly hayFiltros = computed(() => this.numFiltros() > 0);

  /** Pisos tras aplicar los filtros activos (sin ordenar). El mapa lo usa para sincronizar marcadores. */
  readonly pisosFiltrados = computed(() => {
    const distrito = this.fDistrito();
    const barrio = this.fBarrio();
    const estado = this.fEstado() as EstadoPipeline | '';
    const contacto = this.fContacto() as TipoContacto | '';
    const estadoPiso = this.fEstadoPiso() as EstadoPiso | '';
    const q = this.busqueda().trim().toLowerCase();

    if (!distrito && !barrio && !estado && !contacto && !estadoPiso && !q) {
      return this.pisos();
    }
    return this.pisos().filter((p) => {
      if (distrito && p.distrito !== distrito) return false;
      if (barrio && p.barrio !== barrio) return false;
      if (estado && p.estado !== estado) return false;
      if (contacto && p.tipoContacto !== contacto) return false;
      if (estadoPiso && p.estadoPiso !== estadoPiso) return false;
      if (q) {
        const texto = [p.direccion, p.distrito, p.barrio, p.inmobiliaria, p.notas]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  });

  cambiarDistrito(valor: string): void {
    this.fDistrito.set(valor);
    this.fBarrio.set('');
  }

  limpiarFiltros(): void {
    this.fDistrito.set('');
    this.fBarrio.set('');
    this.fEstado.set('');
    this.fContacto.set('');
    this.fEstadoPiso.set('');
    this.busqueda.set('');
    this.orden.set('ninguno');
  }

  // --- Derivados (computed) ---

  /** Rango de precios/metros sobre todos los pisos (base de la puntuación). */
  readonly rango = computed(() => calcularRango(this.pisos()));

  /** Favoritos puntuados y ordenados de mayor a menor puntuación. */
  readonly favoritos = computed<FavoritoPuntuado[]>(() => {
    return this.pisos()
      .filter((p) => p.estado === 'Favorito')
      .map((piso) => ({ piso, puntos: puntuacionPiso(piso) }))
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
      (nombre) =>
        guardados.find((c) => c.nombre === nombre) ?? contactoVacio(nombre, 'Inmobiliaria'),
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
    const pisoConHistorial: Piso = {
      ...piso,
      historialEstados: [{ estado: piso.estado, fecha: new Date().toISOString() }],
    };
    this.pisos.update((lista) => [...lista, pisoConHistorial]);
  }

  actualizar(piso: Piso): void {
    const anterior = this.pisos().find((p) => p.id === piso.id);
    let pisoFinal = piso;
    // Limpiar cita al salir de Agendado
    if (anterior?.estado === 'Agendado' && piso.estado !== 'Agendado') {
      pisoFinal = { ...pisoFinal, fechaCita: undefined };
    }
    // Registrar cambio de estado en el historial
    if (anterior && anterior.estado !== piso.estado) {
      pisoFinal = {
        ...pisoFinal,
        historialEstados: [
          ...(pisoFinal.historialEstados ?? []),
          { estado: piso.estado, fecha: new Date().toISOString() },
        ],
      };
    }
    this.pisos.update((lista) => lista.map((p) => (p.id === pisoFinal.id ? pisoFinal : p)));
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

  /** Lee pisos y contactos del puerto (o usa los seeds si no hay nada). */
  private async inicializar(): Promise<void> {
    const [pisosGuardados, contactosGuardados] = await Promise.all([
      this.storage.cargar<Piso[]>(CLAVE_PISOS),
      this.storage.cargar<ContactoLegacy[]>(CLAVE_INMOBILIARIAS),
    ]);

    // `null` = nunca guardado → usamos el seed. `[]` = el usuario lo vació → se respeta.
    this.pisos.set((pisosGuardados ?? PISOS_SEED).map((p) => migrarPiso(p)));
    this.contactos.set((contactosGuardados ?? CONTACTOS_SEED).map((c) => migrarContacto(c)));

    // A partir de aquí, los effects de persistencia ya pueden escribir.
    this.cargado.set(true);
  }
}
