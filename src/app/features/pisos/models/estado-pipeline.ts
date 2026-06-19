/**
 * Pipeline de estados de un piso (orden cronológico del proceso de búsqueda).
 *
 *   Interesado → Contactado → Agendado → Visitado → Favorito
 *
 * "Descartar" no es un estado: es un borrado definitivo (con confirmación).
 */
export type EstadoPipeline =
  | 'Interesado'
  | 'Contactado'
  | 'Agendado'
  | 'Visitado'
  | 'Favorito';

/** Metadatos de presentación de cada estado del pipeline. */
export interface ConfigEstado {
  readonly valor: EstadoPipeline;
  /** Color del marcador en el mapa y de los acentos en la UI. */
  readonly color: string;
  /** Significado corto para mostrar en la interfaz. */
  readonly significado: string;
}

/**
 * Configuración de los estados EN ORDEN cronológico.
 * Es la fuente de verdad para colores, selectores y leyendas.
 */
export const ESTADOS_PIPELINE: readonly ConfigEstado[] = [
  { valor: 'Interesado', color: '#3b82f6', significado: 'Visto en portal' },
  { valor: 'Contactado', color: '#f97316', significado: 'Llamado/escrito, esperando' },
  { valor: 'Agendado', color: '#eab308', significado: 'Cita fijada (requiere fecha y hora)' },
  { valor: 'Visitado', color: '#a855f7', significado: 'Visto en persona' },
  { valor: 'Favorito', color: '#d4af37', significado: 'Candidato serio' },
] as const;

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
