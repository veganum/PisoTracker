import { EstadoPipeline } from './estado-pipeline';

/** Barrios de Madrid contemplados en la búsqueda. */
export type Barrio =
  | 'Usera'
  | 'Carabanchel'
  | 'Villaverde'
  | 'Almendrales'
  | 'Vallecas'
  | 'Latina'
  | 'Arganzuela'
  | 'Otro';

/** Lista de barrios para poblar selectores. */
export const BARRIOS: readonly Barrio[] = [
  'Usera',
  'Carabanchel',
  'Villaverde',
  'Almendrales',
  'Vallecas',
  'Latina',
  'Arganzuela',
  'Otro',
];

/** Estado material del inmueble. */
export type EstadoPiso = 'Listo para entrar' | 'Reforma parcial' | 'Reforma total';

export const ESTADOS_PISO: readonly EstadoPiso[] = [
  'Listo para entrar',
  'Reforma parcial',
  'Reforma total',
];

/** Quién publica/gestiona el piso. */
export type TipoContacto = 'Particular' | 'Inmobiliaria';

export const TIPOS_CONTACTO: readonly TipoContacto[] = ['Particular', 'Inmobiliaria'];

/**
 * Modelo central de la aplicación: un piso en seguimiento.
 * Los campos están agrupados conceptualmente (localización, inmueble,
 * contacto, gestión, mapa) igual que en el formulario.
 */
export interface Piso {
  id: string;

  // --- Localización ---
  direccion: string;
  barrio: Barrio;
  url: string;

  // --- Inmueble ---
  precio: number;
  metros: number;
  habitaciones: number;
  banos: number;
  planta: number;
  ascensor: boolean;
  estadoPiso: EstadoPiso;

  // --- Contacto ---
  tipoContacto: TipoContacto;
  inmobiliaria?: string;

  // --- Gestión ---
  estado: EstadoPipeline;
  /** ISO (fecha y hora). Obligatorio si `estado === 'Agendado'`. */
  fechaCita?: string;
  notas: string;

  // --- Mapa ---
  lat: number;
  lng: number;
}

/**
 * Condiciones económicas pactadas con una inmobiliaria.
 * Se gestionan por separado del piso y se detectan automáticamente a
 * partir de los pisos con `tipoContacto === 'Inmobiliaria'`.
 */
export interface CondicionesInmobiliaria {
  /** Nombre de la agencia (clave). */
  nombre: string;
  /** Honorarios fijos en euros. */
  honorarios: number;
  /** Comisión en porcentaje (%). */
  comision: number;
  /** Si trabajan en exclusiva. */
  exclusiva: boolean;
  notas: string;
}
