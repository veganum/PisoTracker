import { EstadoPiso, Piso } from '../models/piso.model';

/**
 * Rango de valores (mín./máx.) del conjunto de pisos, necesario para
 * normalizar precio y metros entre 0 y 1.
 */
export interface RangoPuntuacion {
  precioMin: number;
  precioMax: number;
  metrosMin: number;
  metrosMax: number;
}

/** Puntos por estado material del piso (mejor estado = más puntos). */
const PUNTOS_ESTADO: Record<EstadoPiso, number> = {
  'Listo para entrar': 3,
  'Reforma parcial': 2,
  'Reforma total': 1,
};

/**
 * Calcula el rango (mín./máx. de precio y metros) sobre TODOS los pisos.
 * Si la lista está vacía devuelve un rango neutro para evitar divisiones
 * por cero.
 */
export function calcularRango(pisos: Piso[]): RangoPuntuacion {
  if (pisos.length === 0) {
    return { precioMin: 0, precioMax: 0, metrosMin: 0, metrosMax: 0 };
  }
  const precios = pisos.map((p) => p.precio);
  const metros = pisos.map((p) => p.metros);
  return {
    precioMin: Math.min(...precios),
    precioMax: Math.max(...precios),
    metrosMin: Math.min(...metros),
    metrosMax: Math.max(...metros),
  };
}

/** Normaliza un valor a [0, 1] de forma directa (mayor valor = más cerca de 1). */
function normalizar(valor: number, min: number, max: number): number {
  if (max <= min) {
    return 1; // todos iguales: no penalizamos a nadie
  }
  return (valor - min) / (max - min);
}

/** Normaliza de forma inversa (menor valor = más cerca de 1). */
function normalizarInverso(valor: number, min: number, max: number): number {
  if (max <= min) {
    return 1;
  }
  return (max - valor) / (max - min);
}

/**
 * Puntuación automática de un piso (más puntos = mejor opción).
 * Función PURA: mismo piso + mismo rango ⇒ misma puntuación.
 *
 * Desglose:
 *   - Precio:       inverso, normalizado 0–10 (más barato, mejor)
 *   - m²:           directo, normalizado 0–10 (más grande, mejor)
 *   - Habitaciones: nº × 1.5
 *   - Estado piso:  Listo=3 / Reforma parcial=2 / Reforma total=1
 *   - Ascensor:     +1 si tiene
 */
export function puntuacionPiso(piso: Piso, rango: RangoPuntuacion): number {
  const puntosPrecio = normalizarInverso(piso.precio, rango.precioMin, rango.precioMax) * 10;
  const puntosMetros = normalizar(piso.metros, rango.metrosMin, rango.metrosMax) * 10;
  const puntosHabitaciones = piso.habitaciones * 1.5;
  const puntosEstado = PUNTOS_ESTADO[piso.estadoPiso];
  const puntosAscensor = piso.ascensor ? 1 : 0;

  const total =
    puntosPrecio + puntosMetros + puntosHabitaciones + puntosEstado + puntosAscensor;

  // Redondeo a un decimal para una lectura cómoda en la card.
  return Math.round(total * 10) / 10;
}
