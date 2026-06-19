import { BloqueGuion } from '../models/guion.model';

/** Crea una pregunta con id único a partir de su texto. */
function p(texto: string): { id: string; texto: string; hecha: boolean } {
  return { id: crypto.randomUUID(), texto, hecha: false };
}

/**
 * Guion inicial: preguntas preparadas para distintos momentos de la compra.
 * Se carga solo la primera vez (cuando el almacenamiento está vacío); a partir
 * de ahí el usuario lo personaliza y se persiste su versión.
 */
export const GUION_SEED: BloqueGuion[] = [
  {
    id: 'visita',
    icono: '🏠',
    titulo: 'Visita al piso',
    preguntas: [
      p('¿Qué orientación tiene y cuántas horas de luz natural entra?'),
      p('¿Hay humedades, grietas o señales de filtraciones?'),
      p('¿En qué estado están ventanas, aislamiento térmico y acústico?'),
      p('¿Qué antigüedad tienen las instalaciones (electricidad, agua, gas)?'),
      p('¿Qué tipo de calefacción y agua caliente tiene? ¿Consumo aproximado?'),
      p('¿Se oye ruido de vecinos, calle o instalaciones?'),
      p('¿Incluye plaza de garaje, trastero o mobiliario?'),
      p('¿Cómo es la presión del agua y funciona todo (grifos, enchufes, persianas)?'),
      p('¿Cuándo se reformó por última vez y qué habría que hacer?'),
    ],
  },
  {
    id: 'financiera',
    icono: '🏦',
    titulo: 'Financiera / hipoteca',
    preguntas: [
      p('¿Tipo fijo, variable o mixto? ¿Cuál me recomendáis para mi caso?'),
      p('¿Cuál es el TIN y, sobre todo, la TAE?'),
      p('¿Qué porcentaje del valor financiáis (80%, 90%, 100%)?'),
      p('¿A qué plazo máximo y cuál sería la cuota mensual estimada?'),
      p('¿Qué vinculaciones exigís (nómina, seguros, tarjetas) y cuánto bonifican?'),
      p('¿Qué comisiones hay (apertura, amortización parcial/total, subrogación)?'),
      p('¿Los gastos de tasación, notaría o gestoría quién los asume?'),
      p('¿Cuánto tardáis en dar la respuesta vinculante (FEIN)?'),
    ],
  },
  {
    id: 'inmobiliaria',
    icono: '🤝',
    titulo: 'Inmobiliaria / propietario',
    preguntas: [
      p('¿Por qué se vende y cuánto tiempo lleva en venta?'),
      p('¿Hay margen de negociación en el precio?'),
      p('¿El inmueble tiene cargas, deudas o hipoteca pendiente?'),
      p('¿Está la nota simple al día? ¿Me la podéis facilitar?'),
      p('¿Hay derramas aprobadas o pendientes en la comunidad?'),
      p('¿Cuáles son los gastos de la operación y quién paga cada uno?'),
      p('¿Está al corriente de IBI, comunidad y suministros?'),
      p('¿Qué documentación necesito para reservar y firmar arras?'),
    ],
  },
];
