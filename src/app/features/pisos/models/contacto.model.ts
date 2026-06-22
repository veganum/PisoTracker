import { Distrito } from './madrid';

/** Tipo de entidad de contacto. */
export type TipoContactoEntidad = 'Inmobiliaria' | 'Financiera';

export const TIPOS_CONTACTO_ENTIDAD: readonly TipoContactoEntidad[] = [
  'Inmobiliaria',
  'Financiera',
];

/** Unidad de los honorarios (euros o porcentaje). */
export type UnidadHonorarios = '€' | '%';

/** Subtipo de una entidad financiera. */
export type SubtipoFinanciera = 'Banco' | 'Broker';

export const SUBTIPOS_FINANCIERA: readonly SubtipoFinanciera[] = ['Banco', 'Broker'];

/**
 * Contacto de la búsqueda de vivienda: una **inmobiliaria** o una
 * **financiera/broker**. Un único modelo con `tipo` como discriminador; los
 * campos específicos de cada tipo conviven y solo se muestran los que tocan.
 * El `nombre` actúa como clave.
 */
export interface Contacto {
  // --- Comunes ---
  nombre: string;
  tipo: TipoContactoEntidad;
  personaContacto: string;
  telefono: string;
  email: string;
  url: string;
  /** Valoración personal 0–5 (0 = sin valorar). */
  valoracion: number;
  observaciones: string;

  // --- Inmobiliaria ---
  distritos: Distrito[];
  honorariosComprador: number;
  unidadComprador: UnidadHonorarios;
  honorariosVendedor: number;
  unidadVendedor: UnidadHonorarios;
  exclusiva: boolean;
  /** Financiación propia / colabora con Kiron. */
  financiacionPropia: boolean;
  direccion: string;

  // --- Financiera / Broker ---
  subtipo: SubtipoFinanciera;
  /** Registrado como intermediario en el Banco de España (Ley 5/2019). */
  registradoBdE: boolean;
  entidades: string;
  /** Financiación máxima sobre el valor (%). */
  financiacionMax: number;
  /** Financia también los gastos (>100%). */
  financiaGastos: boolean;
  hipotecaFija: boolean;
  hipotecaMixta: boolean;
  comisionApertura: number;
  comisionIntermediacion: number;
  /** Vinculaciones/productos exigidos (afectan a la TAE). */
  vinculaciones: string;
  /** Tiempo estimado de aprobación (días). */
  tiempoAprobacion: number;
  preaprobacionOnline: boolean;
}

/** Crea un contacto con todos los campos a su valor por defecto. */
export function contactoVacio(nombre: string, tipo: TipoContactoEntidad): Contacto {
  return {
    nombre,
    tipo,
    personaContacto: '',
    telefono: '',
    email: '',
    url: '',
    valoracion: 0,
    observaciones: '',
    distritos: [],
    honorariosComprador: 0,
    unidadComprador: '%',
    honorariosVendedor: 0,
    unidadVendedor: '%',
    exclusiva: false,
    financiacionPropia: false,
    direccion: '',
    subtipo: 'Broker',
    registradoBdE: false,
    entidades: '',
    financiacionMax: 0,
    financiaGastos: false,
    hipotecaFija: false,
    hipotecaMixta: false,
    comisionApertura: 0,
    comisionIntermediacion: 0,
    vinculaciones: '',
    tiempoAprobacion: 0,
    preaprobacionOnline: false,
  };
}
