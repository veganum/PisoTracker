import { Injectable } from '@angular/core';
import { Distrito, ubicarBarrio } from '../models/madrid';

/** Geometría GeoJSON mínima que nos interesa. */
type Geometria =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };
interface FeatureBarrio {
  properties?: { name?: string };
  geometry: Geometria;
}

/** ¿Está el punto (lng,lat) dentro del anillo? (ray casting). */
function enAnillo(lng: number, lat: number, anillo: number[][]): boolean {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    const cruza = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (cruza) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/** ¿Dentro de un polígono (anillo exterior menos agujeros)? */
function enPoligono(lng: number, lat: number, anillos: number[][][]): boolean {
  if (anillos.length === 0 || !enAnillo(lng, lat, anillos[0])) {
    return false;
  }
  for (let k = 1; k < anillos.length; k++) {
    if (enAnillo(lng, lat, anillos[k])) {
      return false; // está en un agujero
    }
  }
  return true;
}

function enGeometria(lng: number, lat: number, geom: Geometria): boolean {
  if (geom.type === 'Polygon') {
    return enPoligono(lng, lat, geom.coordinates);
  }
  return geom.coordinates.some((poly) => enPoligono(lng, lat, poly));
}

/**
 * Localiza el **distrito y barrio** de un punto del mapa por geometría
 * (point-in-polygon sobre el GeoJSON de barrios de Madrid). Es fiable y
 * offline, a diferencia de la geocodificación inversa (que falla con los
 * barrios). El GeoJSON se carga una sola vez, bajo demanda.
 */
@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private features?: FeatureBarrio[];
  private cargando?: Promise<void>;

  private async cargar(): Promise<void> {
    if (this.features) {
      return;
    }
    this.cargando ??= fetch('barrios-madrid.geojson')
      .then((r) => r.json())
      .then((data) => {
        this.features = (data.features ?? []) as FeatureBarrio[];
      })
      .catch((e) => {
        console.error('[ubicacion] no se pudo cargar barrios-madrid.geojson', e);
        this.features = [];
      });
    await this.cargando;
  }

  /** Distrito + barrio del punto, o `null` si cae fuera o no se reconoce. */
  async ubicar(lat: number, lng: number): Promise<{ distrito: Distrito; barrio: string } | null> {
    await this.cargar();
    for (const f of this.features ?? []) {
      if (enGeometria(lng, lat, f.geometry)) {
        return ubicarBarrio(f.properties?.name ?? '');
      }
    }
    return null;
  }
}
