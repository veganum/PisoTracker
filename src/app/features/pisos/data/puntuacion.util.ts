import { Piso } from '../models/piso.model';

/**
 * Rango de precio/metros del conjunto (se mantiene para mostrar el mínimo y
 * máximo en la UI; la puntuación ya NO depende de él).
 */
export interface RangoPuntuacion {
  precioMin: number;
  precioMax: number;
  metrosMin: number;
  metrosMax: number;
}

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

/** Un factor de la puntuación, con su etiqueta y los puntos (±) que aporta. */
export interface FactorPuntuacion {
  etiqueta: string;
  puntos: number;
}

/**
 * Puntuación por REGLAS y umbrales estables (no depende del piso más caro o más
 * barato de la lista). Refleja el perfil de búsqueda real: ≤200k €, ≥2 hab,
 * plantas bajas (penaliza 3ª+ sin ascensor), listo para entrar, €/m² ajustado,
 * cercanía a transporte y SIN riesgos legales/ocupación.
 *
 * Función PURA. `desglosePuntuacion` devuelve el detalle; `puntuacionPiso` el
 * total (suma de los factores con puntos ≠ 0).
 */
export function desglosePuntuacion(piso: Piso): FactorPuntuacion[] {
  const f: FactorPuntuacion[] = [];
  const add = (etiqueta: string, puntos: number) => {
    if (puntos !== 0) f.push({ etiqueta, puntos });
  };

  // Precio (umbral preferido 200.000 €)
  if (piso.precio > 0) {
    if (piso.precio <= 150000) add('Precio ≤ 150k', 20);
    else if (piso.precio <= 200000) add('Precio ≤ 200k', 12);
    else if (piso.precio <= 250000) add('Precio ≤ 250k', 4);
    else add('Precio > 250k', -6);
  }

  // €/m²
  if (piso.precio > 0 && piso.metros > 0) {
    const pm2 = piso.precio / piso.metros;
    if (pm2 <= 2000) add('€/m² muy bueno', 10);
    else if (pm2 <= 2500) add('€/m² bueno', 6);
    else if (pm2 <= 3000) add('€/m² correcto', 2);
    else if (pm2 > 3500) add('€/m² alto', -4);
  }

  // Habitaciones (mínimo deseado: 2)
  if (piso.habitaciones >= 3) add('3+ habitaciones', 8);
  else if (piso.habitaciones === 2) add('2 habitaciones', 6);
  else if (piso.habitaciones <= 1) add('1 habitación', -4);

  // Planta + ascensor (se prefieren plantas bajas; 3ª+ sin ascensor penaliza)
  if (piso.planta <= 0) add('Planta baja', 6);
  else if (piso.planta <= 2) add('Planta baja-media', 3);
  else if (piso.ascensor) add('Planta alta con ascensor', 1);
  else add('3ª+ planta sin ascensor', -10);

  if (piso.ascensor) add('Ascensor', 2);

  // Estado del inmueble
  if (piso.estadoPiso === 'Listo para entrar') add('Listo para entrar', 10);
  else if (piso.estadoPiso === 'Reforma parcial') add('Reforma parcial', -4);
  else if (piso.estadoPiso === 'Reforma total') add('Reforma total', -12);

  // Reforma estimada (€)
  if (piso.reformaEstimada > 30000) add('Reforma cara (>30k)', -8);
  else if (piso.reformaEstimada > 10000) add('Reforma media (>10k)', -4);
  else if (piso.reformaEstimada > 0) add('Reforma ligera', -1);

  // Transporte (minutos andando)
  if (piso.minutosMetro > 0) {
    if (piso.minutosMetro <= 5) add('Metro muy cerca', 8);
    else if (piso.minutosMetro <= 10) add('Metro cerca', 5);
    else if (piso.minutosMetro <= 15) add('Metro a 15 min', 2);
  }
  if (piso.minutosBus > 0 && piso.minutosBus <= 5) add('Bus muy cerca', 3);

  // Costes recurrentes
  if (piso.gastosComunidad > 150) add('Comunidad cara', -4);
  else if (piso.gastosComunidad > 0 && piso.gastosComunidad <= 50) add('Comunidad baja', 2);
  if (piso.ibiAnual > 600) add('IBI alto', -2);
  if (piso.derramas.trim()) add('Derrama pendiente', -10);

  // Energía
  const cee = piso.certificadoEnergetico.toUpperCase();
  if (cee === 'A' || cee === 'B') add('Eficiencia A/B', 3);
  else if (cee === 'F' || cee === 'G') add('Eficiencia F/G', -2);

  // Riesgos legales / ocupación
  if (piso.ocupado) add('Ocupado', -25);
  if (piso.nudaPropiedad) add('Nuda propiedad', -20);
  if (piso.observacionesLegales.trim()) add('Riesgo legal anotado', -10);

  return f;
}

/** Puntuación total (suma de factores), redondeada a 1 decimal. */
export function puntuacionPiso(piso: Piso): number {
  const total = desglosePuntuacion(piso).reduce((acc, x) => acc + x.puntos, 0);
  return Math.round(total * 10) / 10;
}
