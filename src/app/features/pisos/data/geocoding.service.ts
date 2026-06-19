import { Injectable } from '@angular/core';
import { Barrio, BARRIOS } from '../models/piso.model';

/** Resultado de la geocodificación inversa (campos best-effort). */
export interface DireccionDetectada {
  direccion: string | null;
  barrio: Barrio | null;
}

/** Subconjunto de la respuesta de Nominatim que nos interesa. */
interface NominatimDireccion {
  road?: string;
  pedestrian?: string;
  residential?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
  borough?: string;
}
interface NominatimRespuesta {
  display_name?: string;
  address?: NominatimDireccion;
}

/**
 * Geocodificación INVERSA (coordenadas → dirección) usando Nominatim de
 * OpenStreetMap: gratis, sin API key, coherente con los tiles OSM.
 *
 * Uso responsable: máx. ~1 petición/seg (de sobra para clics manuales del
 * usuario). Ante cualquier error o falta de cobertura, devuelve `null` y el
 * usuario sigue pudiendo escribir la dirección a mano.
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly base = 'https://nominatim.openstreetmap.org/reverse';

  /** Dado un punto, intenta obtener la calle y el barrio. */
  async reverse(lat: number, lng: number): Promise<DireccionDetectada> {
    const url =
      `${this.base}?format=jsonv2&lat=${lat}&lon=${lng}` +
      `&zoom=18&addressdetails=1&accept-language=es`;
    try {
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!resp.ok) {
        return { direccion: null, barrio: null };
      }
      const data = (await resp.json()) as NominatimRespuesta;
      const dir = data.address ?? {};

      const calle = dir.road ?? dir.pedestrian ?? dir.residential ?? '';
      const direccion = calle
        ? dir.house_number
          ? `${calle}, ${dir.house_number}`
          : calle
        : (data.display_name?.split(',')[0]?.trim() ?? null);

      return {
        direccion: direccion || null,
        barrio: this.detectarBarrio(dir),
      };
    } catch {
      // Sin red / CORS / respuesta inesperada: degradamos a entrada manual.
      return { direccion: null, barrio: null };
    }
  }

  /** Mapea los campos de Nominatim a uno de nuestros barrios conocidos. */
  private detectarBarrio(dir: NominatimDireccion): Barrio | null {
    const candidatos = [
      dir.suburb,
      dir.neighbourhood,
      dir.quarter,
      dir.city_district,
      dir.borough,
      dir.residential,
      dir.road,
    ]
      .filter((c): c is string => !!c)
      .join(' ')
      .toLowerCase();

    for (const b of BARRIOS) {
      if (b !== 'Otro' && candidatos.includes(b.toLowerCase())) {
        return b;
      }
    }
    return null;
  }
}
