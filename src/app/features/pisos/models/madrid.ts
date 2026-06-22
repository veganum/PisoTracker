/**
 * Catálogo oficial de los 21 distritos de Madrid con sus barrios
 * administrativos. Es la ÚNICA fuente de verdad para selectores y filtros.
 *
 * - `distrito` en el modelo `Piso` es un tipo cerrado (estos 21 nombres).
 * - `barrio` se guarda como `string` validado contra el distrito elegido
 *   (no se hace un union de 131 nombres: la tabla ya es la fuente de verdad).
 */

/** Los 21 distritos de Madrid. */
export type Distrito =
  | 'Centro'
  | 'Arganzuela'
  | 'Retiro'
  | 'Salamanca'
  | 'Chamartín'
  | 'Tetuán'
  | 'Chamberí'
  | 'Fuencarral-El Pardo'
  | 'Moncloa-Aravaca'
  | 'Latina'
  | 'Carabanchel'
  | 'Usera'
  | 'Puente de Vallecas'
  | 'Moratalaz'
  | 'Ciudad Lineal'
  | 'Hortaleza'
  | 'Villaverde'
  | 'Villa de Vallecas'
  | 'Vicálvaro'
  | 'San Blas-Canillejas'
  | 'Barajas';

export interface DistritoMadrid {
  nombre: Distrito;
  barrios: string[];
}

/** Tabla distrito → barrios administrativos. */
export const DISTRITOS: readonly DistritoMadrid[] = [
  {
    nombre: 'Centro',
    barrios: ['Palacio', 'Embajadores', 'Cortes', 'Justicia', 'Universidad', 'Sol'],
  },
  {
    nombre: 'Arganzuela',
    barrios: [
      'Imperial',
      'Acacias',
      'Chopera',
      'Legazpi',
      'Delicias',
      'Palos de la Frontera',
      'Atocha',
    ],
  },
  {
    nombre: 'Retiro',
    barrios: ['Pacífico', 'Adelfas', 'Estrella', 'Ibiza', 'Jerónimos', 'Niño Jesús'],
  },
  {
    nombre: 'Salamanca',
    barrios: ['Recoletos', 'Goya', 'Fuente del Berro', 'Guindalera', 'Lista', 'Castellana'],
  },
  {
    nombre: 'Chamartín',
    barrios: [
      'El Viso',
      'Prosperidad',
      'Ciudad Jardín',
      'Hispanoamérica',
      'Nueva España',
      'Castilla',
    ],
  },
  {
    nombre: 'Tetuán',
    barrios: [
      'Bellas Vistas',
      'Cuatro Caminos',
      'Castillejos',
      'Almenara',
      'Valdeacederas',
      'Berruguete',
    ],
  },
  {
    nombre: 'Chamberí',
    barrios: ['Gaztambide', 'Arapiles', 'Trafalgar', 'Almagro', 'Ríos Rosas', 'Vallehermoso'],
  },
  {
    nombre: 'Fuencarral-El Pardo',
    barrios: [
      'El Pardo',
      'Fuentelarreina',
      'Peñagrande',
      'Pilar',
      'La Paz',
      'Valverde',
      'Mirasierra',
      'El Goloso',
    ],
  },
  {
    nombre: 'Moncloa-Aravaca',
    barrios: [
      'Casa de Campo',
      'Argüelles',
      'Ciudad Universitaria',
      'Valdezarza',
      'Valdemarín',
      'El Plantío',
      'Aravaca',
    ],
  },
  {
    nombre: 'Latina',
    barrios: [
      'Los Cármenes',
      'Puerta del Ángel',
      'Lucero',
      'Aluche',
      'Campamento',
      'Cuatro Vientos',
      'Las Águilas',
    ],
  },
  {
    nombre: 'Carabanchel',
    barrios: [
      'Comillas',
      'Opañel',
      'San Isidro',
      'Vista Alegre',
      'Puerta Bonita',
      'Buenavista',
      'Abrantes',
    ],
  },
  {
    nombre: 'Usera',
    barrios: [
      'Orcasitas',
      'Orcasur',
      'San Fermín',
      'Almendrales',
      'Moscardó',
      'Zofío',
      'Pradolongo',
    ],
  },
  {
    nombre: 'Puente de Vallecas',
    barrios: [
      'Entrevías',
      'San Diego',
      'Palomeras Bajas',
      'Palomeras Sureste',
      'Portazgo',
      'Numancia',
    ],
  },
  {
    nombre: 'Moratalaz',
    barrios: ['Pavones', 'Horcajo', 'Marroquina', 'Media Legua', 'Fontarrón', 'Vinateros'],
  },
  {
    nombre: 'Ciudad Lineal',
    barrios: [
      'Ventas',
      'Pueblo Nuevo',
      'Quintana',
      'Concepción',
      'San Pascual',
      'San Juan Bautista',
      'Colina',
      'Atalaya',
      'Costillares',
    ],
  },
  {
    nombre: 'Hortaleza',
    barrios: [
      'Palomas',
      'Piovera',
      'Canillas',
      'Pinar del Rey',
      'Apóstol Santiago',
      'Valdefuentes',
    ],
  },
  {
    nombre: 'Villaverde',
    barrios: [
      'Villaverde Alto-Casco Histórico',
      'San Cristóbal',
      'Butarque',
      'Los Rosales',
      'Ángeles',
    ],
  },
  {
    nombre: 'Villa de Vallecas',
    barrios: ['Casco Histórico de Vallecas', 'Santa Eugenia', 'Ensanche de Vallecas'],
  },
  {
    nombre: 'Vicálvaro',
    barrios: ['Casco Histórico de Vicálvaro', 'Valdebernardo', 'Valderrivas', 'El Cañaveral'],
  },
  {
    nombre: 'San Blas-Canillejas',
    barrios: ['Simancas', 'Hellín', 'Amposta', 'Arcos', 'Rosas', 'Rejas', 'Canillejas', 'Salvador'],
  },
  {
    nombre: 'Barajas',
    barrios: [
      'Alameda de Osuna',
      'Aeropuerto',
      'Casco Histórico de Barajas',
      'Timón',
      'Corralejos',
    ],
  },
];

/** Nombres de los distritos (para poblar selectores). */
export const DISTRITOS_NOMBRES: readonly Distrito[] = DISTRITOS.map((d) => d.nombre);

/** Barrios de un distrito (vacío si no se reconoce). */
export function barriosDe(distrito: Distrito | '' | null | undefined): string[] {
  return DISTRITOS.find((d) => d.nombre === distrito)?.barrios ?? [];
}

/** Normaliza un texto para comparar sin acentos ni mayúsculas. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Dado el nombre (posiblemente sin acentos) de un barrio, devuelve su
 * `distrito` y el nombre canónico del barrio. `null` si no se reconoce.
 */
export function ubicarBarrio(nombreCrudo: string): { distrito: Distrito; barrio: string } | null {
  const objetivo = normalizar(nombreCrudo);
  for (const d of DISTRITOS) {
    for (const b of d.barrios) {
      if (normalizar(b) === objetivo) {
        return { distrito: d.nombre, barrio: b };
      }
    }
  }
  return null;
}
