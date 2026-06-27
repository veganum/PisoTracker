import { Distrito } from './madrid';

/** Tipo de entidad de contacto. */
export type TipoContactoEntidad = 'Inmobiliaria' | 'Financiera';

/** Unidad de los honorarios o comisión (euros o porcentaje). */
export type UnidadHonorarios = '€' | '%';

/** Subtipo de una entidad financiera. */
export type SubtipoFinanciera = 'Banco' | 'Broker';

export const SUBTIPOS_FINANCIERA: readonly SubtipoFinanciera[] = ['Banco', 'Broker'];

/**
 * Contacto de la búsqueda de vivienda: una **inmobiliaria** o una
 * **financiera/broker**. Un único modelo con `tipo` como discriminador.
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
  /** Texto libre: "Kiron", "Departamento propio", "Hipotecas.com"… Vacío = no ofrece. */
  servicioFinanciero: string;
  direccion: string;

  // --- Financiera / Broker ---
  subtipo: SubtipoFinanciera;
  /** Registrado como intermediario en el Banco de España (Ley 5/2019). */
  registradoBdE: boolean;
  entidades: string;
  /** Financiación máxima sobre el valor tasado (%). */
  financiacionMax: number;
  /** Financia también los gastos de compra (>80-100% del precio). */
  financiaGastos: boolean;

  // Hipoteca fija
  hipotecaFija: boolean;
  /** TIN de la hipoteca fija ofrecida (%). */
  tinFijo: number;

  // Hipoteca variable / mixta
  hipotecaMixta: boolean;
  /** Diferencial sobre Euríbor (%). P.ej. 0.75 → Euríbor + 0.75%. */
  diferencial: number;

  /** Plazo máximo financiable (años). */
  plazoMaximo: number;
  /** TAE orientativa indicada por la entidad (%). */
  tae: number;

  comisionApertura: number;
  unidadComisionApertura: UnidadHonorarios;
  comisionIntermediacion: number;
  /** Vinculaciones/productos exigidos que afectan a la TAE real. */
  vinculaciones: string;
  /** Tiempo estimado de aprobación (días hábiles). */
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
    servicioFinanciero: '',
    direccion: '',
    subtipo: 'Broker',
    registradoBdE: false,
    entidades: '',
    financiacionMax: 80,
    financiaGastos: false,
    hipotecaFija: false,
    tinFijo: 0,
    hipotecaMixta: false,
    diferencial: 0,
    plazoMaximo: 30,
    tae: 0,
    comisionApertura: 0,
    unidadComisionApertura: '%',
    comisionIntermediacion: 0,
    vinculaciones: '',
    tiempoAprobacion: 0,
    preaprobacionOnline: false,
  };
}
