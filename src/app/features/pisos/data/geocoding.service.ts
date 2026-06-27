import { Injectable } from '@angular/core';
import { Distrito, DISTRITOS } from '../models/madrid';

/** Resultado de una búsqueda de dirección (Photon/Komoot). */
export interface ResultadoBusqueda {
  etiqueta: string;
  lat: number;
  lng: number;
}

/** Resultado de la geocodificación inversa (campos best-effort). */
export interface DireccionDetectada {
  direccion: string | null;
  distrito: Distrito | null;
  barrio: string | null;
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

  /**
   * Búsqueda directa de dirección usando Photon (Komoot/OSM).
   * Sin API key, diseñado para autocomplete. Bbox limita resultados a Madrid.
   */
  async buscarDireccion(texto: string): Promise<ResultadoBusqueda[]> {
    if (!texto.trim()) return [];
    // Sin header Accept para evitar CORS preflight. Bias hacia Madrid con lon/lat.
    // Intentamos Photon primero; si falla, caemos a Nominatim (búsqueda puntual).
    const resultados = await this.buscarPhoton(texto) ?? await this.buscarNominatim(texto);
    return resultados;
  }

  private async buscarPhoton(texto: string): Promise<ResultadoBusqueda[] | null> {
    // Centro de Madrid como bias (lat/lon). Sin bbox para evitar restricciones.
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(texto)}` +
      `&lang=es&limit=5&lat=40.4168&lon=-3.7038`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      type F = { geometry: { coordinates: [number, number] }; properties: { name?: string; street?: string; housenumber?: string; city?: string; district?: string; county?: string } };
      const data = (await resp.json()) as { features: F[] };
      if (!data.features?.length) return null;
      return data.features
        .filter((f) => {
          // Filtrar solo resultados cercanos a Madrid (radio ~30 km)
          const lat = f.geometry.coordinates[1];
          const lng = f.geometry.coordinates[0];
          return lat > 40.1 && lat < 40.7 && lng > -4.1 && lng < -3.3;
        })
        .map((f) => {
          const p = f.properties;
          const calle = p.street
            ? p.housenumber ? `${p.street}, ${p.housenumber}` : p.street
            : (p.name ?? '');
          const partes = [calle, p.district ?? p.county, p.city ?? 'Madrid'].filter(Boolean);
          return {
            etiqueta: partes.join(' · '),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          };
        });
    } catch {
      return null;
    }
  }

  private async buscarNominatim(texto: string): Promise<ResultadoBusqueda[]> {
    // Nominatim: búsqueda puntual (no autocomplete), limitada a Madrid.
    const url =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(texto + ' Madrid')}` +
      `&format=jsonv2&limit=5&countrycodes=es&accept-language=es`;
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'PisoTracker/1.0' },
      });
      if (!resp.ok) return [];
      const data = (await resp.json()) as { display_name: string; lat: string; lon: string }[];
      return data.map((r) => ({
        etiqueta: r.display_name.split(',').slice(0, 3).join(', '),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }));
    } catch {
      return [];
    }
  }

  /** Dado un punto, intenta obtener la calle, el distrito y el barrio. */
  async reverse(lat: number, lng: number): Promise<DireccionDetectada> {
    const url =
      `${this.base}?format=jsonv2&lat=${lat}&lon=${lng}` +
      `&zoom=18&addressdetails=1&accept-language=es`;
    try {
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!resp.ok) {
        return { direccion: null, distrito: null, barrio: null };
      }
      const data = (await resp.json()) as NominatimRespuesta;
      const dir = data.address ?? {};

      const calle = dir.road ?? dir.pedestrian ?? dir.residential ?? '';
      const direccion = calle
        ? dir.house_number
          ? `${calle}, ${dir.house_number}`
          : calle
        : (data.display_name?.split(',')[0]?.trim() ?? null);

      const { distrito, barrio } = this.detectarDistritoBarrio(dir);
      return { direccion: direccion || null, distrito, barrio };
    } catch {
      // Sin red / CORS / respuesta inesperada: degradamos a entrada manual.
      return { direccion: null, distrito: null, barrio: null };
    }
  }

  /**
   * Intenta deducir distrito y barrio a partir de los campos de Nominatim.
   * Primero busca un barrio conocido (y de él deriva el distrito); si no,
   * intenta casar el distrito directamente.
   */
  private detectarDistritoBarrio(dir: NominatimDireccion): {
    distrito: Distrito | null;
    barrio: string | null;
  } {
    const candidatos = [dir.suburb, dir.neighbourhood, dir.quarter, dir.city_district, dir.borough]
      .filter((c): c is string => !!c)
      .map((c) => c.toLowerCase());

    // 1) ¿Algún candidato coincide con un barrio conocido?
    for (const d of DISTRITOS) {
      for (const b of d.barrios) {
        if (candidatos.some((c) => c.includes(b.toLowerCase()))) {
          return { distrito: d.nombre, barrio: b };
        }
      }
    }

    // 2) Si no, ¿coincide con el nombre de un distrito?
    for (const d of DISTRITOS) {
      if (candidatos.some((c) => c.includes(d.nombre.toLowerCase()))) {
        return { distrito: d.nombre, barrio: null };
      }
    }

    return { distrito: null, barrio: null };
  }
}
