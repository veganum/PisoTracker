import { Distrito } from './madrid';
import { EstadoPipeline } from './estado-pipeline';

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
  /** Distrito de Madrid (obligatorio). */
  distrito: Distrito;
  /** Barrio administrativo dentro del distrito ('' si no se especifica). */
  barrio: string;
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
