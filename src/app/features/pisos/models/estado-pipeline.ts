/**
 * Pipeline de estados de un piso.
 *
 * - FLUJO lineal (avance cronológico): Interesado → Contactado → Agendado → Visitado
 * - LATERALES (no son fase del flujo, son marcadores): Favorito, Pendiente condiciones
 *
 * "Descartar" no es un estado: es un borrado definitivo (con confirmación).
 */
export type EstadoPipeline =
  | 'Interesado'
  | 'Contactado'
  | 'Agendado'
  | 'Visitado'
  | 'Favorito'
  | 'Pendiente condiciones';

/** Metadatos de presentación de cada estado del pipeline. */
export interface ConfigEstado {
  readonly valor: EstadoPipeline;
  /** Color del marcador en el mapa y de los acentos en la UI. */
  readonly color: string;
  /** Significado corto para mostrar en la interfaz. */
  readonly significado: string;
  /** `true` si es una fase del flujo lineal; `false` si es un estado lateral. */
  readonly flujo: boolean;
  /** Icono para los estados laterales (Favorito / Pendiente condiciones). */
  readonly icono?: string;
}

/**
 * Configuración de los estados.
 * Es la fuente de verdad para colores, selectores y leyendas.
 */
export const ESTADOS_PIPELINE: readonly ConfigEstado[] = [
  { valor: 'Interesado', color: '#3b82f6', significado: 'Visto en portal', flujo: true },
  { valor: 'Contactado', color: '#f97316', significado: 'Llamado/escrito, esperando', flujo: true },
  {
    valor: 'Agendado',
    color: '#22c55e',
    significado: 'Cita fijada (requiere fecha y hora)',
    flujo: true,
  },
  { valor: 'Visitado', color: '#a855f7', significado: 'Visto en persona', flujo: true },
  {
    valor: 'Favorito',
    color: '#d4af37',
    significado: 'Candidato serio',
    flujo: false,
    icono: '⭐',
  },
  {
    valor: 'Pendiente condiciones',
    color: '#14b8a6',
    significado: 'Esperando bajada de precio o cambio de condiciones',
    flujo: false,
    icono: '⏳',
  },
] as const;

/** Estados del flujo lineal (en orden). */
export const ESTADOS_FLUJO: readonly ConfigEstado[] = ESTADOS_PIPELINE.filter((e) => e.flujo);

/** Estados laterales (marcadores fuera del flujo). */
export const ESTADOS_LATERALES: readonly ConfigEstado[] = ESTADOS_PIPELINE.filter((e) => !e.flujo);

/** Acceso directo color por estado (derivado de ESTADOS_PIPELINE). */
export const COLOR_ESTADO: Record<EstadoPipeline, string> = ESTADOS_PIPELINE.reduce(
  (acc, e) => {
    acc[e.valor] = e.color;
    return acc;
  },
  {} as Record<EstadoPipeline, string>,
);

/** Devuelve el color de un estado (azul por defecto si no se reconoce). */
export function colorEstado(estado: EstadoPipeline): string {
  return COLOR_ESTADO[estado] ?? '#3b82f6';
}
