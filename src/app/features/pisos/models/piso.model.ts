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

  // --- Costes (todos opcionales; 0/'' = sin dato) ---
  /** Gastos de comunidad (€/mes). */
  gastosComunidad: number;
  /** IBI anual (€/año). */
  ibiAnual: number;
  /** Derramas conocidas (texto; vacío = ninguna). */
  derramas: string;
  /** Estimación de reforma (€). */
  reformaEstimada: number;

  // --- Transporte (minutos andando; 0 = sin dato) ---
  minutosMetro: number;
  minutosBus: number;

  // --- Riesgos ---
  ocupado: boolean;
  nudaPropiedad: boolean;
  observacionesLegales: string;

  // --- Otros ---
  /** Certificado energético (A–G; '' = desconocido). */
  certificadoEnergetico: string;
  /** Fecha de publicación del anuncio (ISO; '' = sin dato). */
  fechaPublicacion: string;
  /** Fecha de última revisión por el usuario (ISO; '' = sin dato). */
  fechaUltimaRevision: string;

  // --- Gestión ---
  estado: EstadoPipeline;
  /** ISO (fecha y hora). Obligatorio si `estado === 'Agendado'`. */
  fechaCita?: string;
  /** Con quién es la visita (nombre del agente, propietario, etc.). */
  contactoCita: string;
  /** Notas específicas de la cita (preguntas a hacer, cosas a llevar…). */
  notasCita: string;
  notas: string;

  // --- Mapa ---
  lat: number;
  lng: number;
}
