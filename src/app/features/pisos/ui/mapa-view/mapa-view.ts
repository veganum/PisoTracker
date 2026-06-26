import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Icono } from '../../../../shared/icono/icono';
import { PisosStore } from '../../data/pisos.store';
import { UbicacionService } from '../../data/ubicacion.service';
import { colorEstado, ESTADOS_PIPELINE } from '../../models/estado-pipeline';
import { Distrito } from '../../models/madrid';
import { Piso } from '../../models/piso.model';

/** Nombres del GeoJSON que difieren de nuestro catálogo (acentos / nombre). */
const NOMBRES_DISTRITO: Record<string, Distrito> = {
  Chamartin: 'Chamartín',
  Tetuan: 'Tetuán',
  Chamberi: 'Chamberí',
  Vicalvaro: 'Vicálvaro',
  'San Blas': 'San Blas-Canillejas',
};

/** Centro y zoom inicial: Madrid. */
const MADRID: L.LatLngTuple = [40.4168, -3.7038];
const ZOOM_INICIAL = 12;

/**
 * Vista de mapa (Leaflet).
 *
 * Todo el ciclo de vida IMPERATIVO de Leaflet queda aislado aquí:
 *   - `afterNextRender()` inicializa el mapa cuando el contenedor ya existe.
 *   - Un `effect()` redibuja los marcadores cuando cambian los pisos (signals).
 *   - `DestroyRef` limpia el mapa al destruir el componente.
 *
 * Interacciones:
 *   - Clic en el mapa  → emite `nuevo` con las coordenadas (abre el alta).
 *   - Popup del marcador → dirección, barrio, precio, estado y botones
 *     Editar / Borrar (que emiten `editar` / `borrar`).
 */
@Component({
  selector: 'app-mapa-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  imports: [Icono],
  template: `
    <div class="relative h-full w-full">
      <div #mapa class="h-full w-full"></div>

      <!-- Controles superiores derecha -->
      <div class="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          (click)="centrarEnTodos()"
          aria-label="Centrar el mapa en todos los pisos"
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface/95 text-text shadow-lg ring-1 ring-border backdrop-blur transition active:scale-90"
        >
          <app-icono nombre="crosshair" [tam]="20" />
        </button>
        <button
          type="button"
          (click)="alternarDistritos()"
          [attr.aria-pressed]="distritosVisibles()"
          aria-label="Mostrar u ocultar distritos"
          title="Distritos"
          class="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ring-1 backdrop-blur transition active:scale-90"
          [class.bg-primary-btn]="distritosVisibles()"
          [class.text-on-primary]="distritosVisibles()"
          [class.ring-transparent]="distritosVisibles()"
          [class.bg-surface]="!distritosVisibles()"
          [class.text-text]="!distritosVisibles()"
          [class.ring-border]="!distritosVisibles()"
        >
          <app-icono nombre="layers" [tam]="20" />
        </button>
      </div>

      <!-- Leyenda de colores del pipeline (captura el clic: no añade vivienda) -->
      <div
        class="absolute bottom-3 left-3 z-[1000] cursor-default select-none rounded-2xl bg-surface/95 px-3 py-2.5 text-xs shadow-lg ring-1 ring-border backdrop-blur"
      >
        <p class="mb-1.5 font-semibold text-text">Toca el mapa para añadir 📍</p>
        <ul class="space-y-1">
          @for (e of estados; track e.valor) {
            <li class="flex items-center gap-1.5 text-muted">
              <span class="h-2.5 w-2.5 rounded-full" [style.background-color]="e.color"></span>
              {{ e.valor }}
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class MapaView {
  private readonly store = inject(PisosStore);
  private readonly ubicacion = inject(UbicacionService);
  private readonly destroyRef = inject(DestroyRef);

  /** Contenedor del mapa. */
  private readonly mapaEl = viewChild.required<ElementRef<HTMLDivElement>>('mapa');

  readonly nuevo = output<{ lat: number; lng: number }>();
  readonly editar = output<Piso>();
  readonly borrar = output<Piso>();
  /** Distrito pulsado en el mapa (para filtrar la lista). */
  readonly filtrarDistrito = output<Distrito>();

  /** Estados del pipeline para la leyenda de colores. */
  readonly estados = ESTADOS_PIPELINE;

  /** Si la capa de distritos está visible. */
  readonly distritosVisibles = signal(false);

  private mapa?: L.Map;
  private capaMarcadores?: L.LayerGroup;
  private capaDistritos?: L.GeoJSON;

  constructor() {
    // Inicializa Leaflet cuando el DOM del componente ya está pintado.
    afterNextRender(() => this.inicializarMapa());

    // Redibuja los marcadores cuando cambian los pisos o los filtros activos.
    effect(() => {
      const pisos = this.store.pisosFiltrados();
      if (this.mapa) {
        this.redibujarMarcadores(pisos);
      }
    });

    // Limpieza del mapa al destruir el componente (al cambiar de pestaña).
    this.destroyRef.onDestroy(() => {
      this.mapa?.remove();
      this.mapa = undefined;
    });
  }

  /** Crea el mapa, la capa de tiles de OpenStreetMap y los listeners. */
  private inicializarMapa(): void {
    const mapa = L.map(this.mapaEl().nativeElement, {
      center: MADRID,
      zoom: ZOOM_INICIAL,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa);

    // Clic en el mapa → alta de piso con coordenadas ya fijadas.
    mapa.on('click', (e: L.LeafletMouseEvent) => {
      this.nuevo.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    this.capaMarcadores = L.layerGroup().addTo(mapa);
    this.mapa = mapa;

    // Dibujo inicial (el contenedor ya tiene tamaño real aquí).
    this.redibujarMarcadores(this.store.pisos());
  }

  /** Ajusta el encuadre del mapa para que se vean todos los pisos. */
  centrarEnTodos(): void {
    const pisos = this.store.pisos();
    if (!this.mapa || pisos.length === 0) {
      return;
    }
    const bounds = L.latLngBounds(pisos.map((p) => [p.lat, p.lng] as L.LatLngTuple));
    this.mapa.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }

  /** Muestra u oculta la capa de distritos (carga el GeoJSON la 1ª vez). */
  async alternarDistritos(): Promise<void> {
    const mostrar = !this.distritosVisibles();
    this.distritosVisibles.set(mostrar);
    if (!this.mapa) {
      return;
    }
    if (mostrar) {
      if (!this.capaDistritos) {
        this.capaDistritos = await this.cargarDistritos();
      }
      this.capaDistritos?.addTo(this.mapa);
    } else if (this.capaDistritos) {
      this.mapa.removeLayer(this.capaDistritos);
    }
  }

  /** Carga el GeoJSON de los 21 distritos y construye su capa estilizada. */
  private async cargarDistritos(): Promise<L.GeoJSON | undefined> {
    try {
      const resp = await fetch('distritos-madrid.geojson');
      const datos = await resp.json();
      return L.geoJSON(datos, {
        style: () => ({ color: '#4f46e5', weight: 1.5, fillColor: '#4f46e5', fillOpacity: 0.06 }),
        onEachFeature: (feature, capa) => {
          const bruto = (feature.properties?.['name'] as string) ?? '';
          const distrito = (NOMBRES_DISTRITO[bruto] ?? bruto) as Distrito;
          capa.bindTooltip(distrito, { sticky: true });
          capa.on('click', (e) => {
            L.DomEvent.stopPropagation(e); // no dispares el "añadir piso" del mapa
            this.store.distritoMapa.set(distrito); // distrito fiable (del polígono)
            this.store.barrioMapa.set(''); // se rellenará al ubicar el barrio
            this.filtrarDistrito.emit(distrito); // salta a la pestaña Lista (ya filtra)
            // Barrio EXACTO del punto por geometría (point-in-polygon, asíncrono).
            const { lat, lng } = (e as L.LeafletMouseEvent).latlng;
            this.ubicacion.ubicar(lat, lng).then((loc) => {
              if (loc && loc.distrito === distrito) {
                this.store.barrioMapa.set(loc.barrio);
                this.store.fBarrio.set(loc.barrio);
              }
            });
          });
          capa.on('mouseover', () => (capa as L.Path).setStyle({ fillOpacity: 0.18 }));
          capa.on('mouseout', () => (capa as L.Path).setStyle({ fillOpacity: 0.06 }));
        },
      });
    } catch (error) {
      console.error('[distritos] no se pudo cargar el GeoJSON:', error);
      this.distritosVisibles.set(false);
      return undefined;
    }
  }

  /** Vacía y vuelve a pintar todos los marcadores. */
  private redibujarMarcadores(pisos: Piso[]): void {
    const capa = this.capaMarcadores;
    if (!capa) {
      return;
    }
    capa.clearLayers();

    for (const piso of pisos) {
      const marcador = L.marker([piso.lat, piso.lng], {
        icon: this.iconoGota(colorEstado(piso.estado)),
      });

      marcador.bindPopup(this.htmlPopup(piso));
      // Cableamos los botones del popup al abrirse (DOM imperativo de Leaflet).
      marcador.on('popupopen', (e: L.PopupEvent) => this.cablearPopup(e, piso));

      capa.addLayer(marcador);
    }
  }

  /** Icono "gota" SVG coloreado según el estado del pipeline. */
  private iconoGota(color: string): L.DivIcon {
    const html = `
      <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.6 14 26 14 26s14-16.4 14-26C28 6.27 21.73 0 14 0z"
              fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="14" cy="14" r="5" fill="#ffffff"/>
      </svg>`;
    return L.divIcon({
      className: 'marcador-piso',
      html,
      iconSize: [28, 40],
      iconAnchor: [14, 40],
      popupAnchor: [0, -38],
    });
  }

  /** Contenido HTML del popup (estilos en línea para no depender de purga CSS). */
  private htmlPopup(piso: Piso): string {
    const color = colorEstado(piso.estado);
    const precio = piso.precio.toLocaleString('es-ES');
    return `
      <div style="min-width:180px;font-family:inherit">
        <p style="margin:0;font-weight:700;color:#18181b">${this.escapar(piso.direccion)}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#71717a">${this.escapar(piso.distrito)}${piso.barrio ? ' · ' + this.escapar(piso.barrio) : ''}</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#18181b">${precio} €</p>
        <span style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:9999px;
              font-size:11px;font-weight:700;color:#fff;background:${color}">${piso.estado}</span>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn-editar" style="flex:1;padding:6px 0;border:0;border-radius:8px;
                  background:#18181b;color:#fff;font-weight:600;cursor:pointer">Editar</button>
          <button class="btn-borrar" style="flex:1;padding:6px 0;border:0;border-radius:8px;
                  background:#fee2e2;color:#dc2626;font-weight:600;cursor:pointer">Borrar</button>
        </div>
      </div>`;
  }

  /** Engancha los botones del popup a las salidas del componente. */
  private cablearPopup(e: L.PopupEvent, piso: Piso): void {
    const raiz = e.popup.getElement();
    if (!raiz) {
      return;
    }
    raiz.querySelector<HTMLButtonElement>('.btn-editar')?.addEventListener('click', () => {
      this.mapa?.closePopup();
      this.editar.emit(piso);
    });
    raiz.querySelector<HTMLButtonElement>('.btn-borrar')?.addEventListener('click', () => {
      this.mapa?.closePopup();
      this.borrar.emit(piso);
    });
  }

  /** Escapa texto para inyectarlo con seguridad en el HTML del popup. */
  private escapar(texto: string): string {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }
}
