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
import { GeocodingService, ResultadoBusqueda } from '../../data/geocoding.service';
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

const MADRID: L.LatLngTuple = [40.4168, -3.7038];
const ZOOM_INICIAL = 12;

@Component({
  selector: 'app-mapa-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  imports: [Icono],
  template: `
    <div class="relative h-full w-full">
      <div #mapa class="h-full w-full"></div>

      <!-- ── Controles superiores derecha (buscador + centrar + distritos) ── -->
      <div class="absolute right-3 top-3 z-[1050] flex flex-col gap-2">

        <!-- Buscador: botón cuando cerrado, pill cuando abierto -->
        <div class="relative">
          @if (buscadorAbierto()) {
            <!-- Pill expandido, crece hacia la izquierda -->
            <div class="absolute right-0 top-0 w-72 max-w-[calc(100vw-5.5rem)] overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/20 backdrop-blur-xl"
              style="background: color-mix(in srgb, var(--color-surface) 65%, transparent)">
              <div class="flex items-center gap-2 px-3 py-2.5">
                <app-icono nombre="search" [tam]="16" class="shrink-0 text-muted" />
                <input
                  type="text"
                  [value]="textoBusqueda()"
                  (input)="onTextoBusqueda($event)"
                  (keydown.escape)="cerrarBuscador()"
                  placeholder="Calle, número, barrio…"
                  class="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
                  autocomplete="off"
                />
                @if (buscando()) {
                  <span class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"></span>
                }
                @if (soportaVoz) {
                  <button type="button" (click)="iniciarVoz()"
                    [attr.aria-label]="escuchando() ? 'Escuchando…' : 'Buscar por voz'"
                    class="shrink-0 transition"
                    [class.text-danger]="escuchando()"
                    [class.text-muted]="!escuchando()"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="22"/>
                    </svg>
                  </button>
                }
                <button type="button" (click)="cerrarBuscador()" aria-label="Cerrar buscador"
                  class="shrink-0 text-muted transition hover:text-text">
                  <app-icono nombre="x" [tam]="16" />
                </button>
              </div>
              @if (resultadosBusqueda().length > 0) {
                <ul class="border-t border-white/10">
                  @for (r of resultadosBusqueda(); track r.etiqueta) {
                    <li>
                      <button type="button" (click)="seleccionarResultado(r)"
                        class="flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white/10 active:bg-white/10">
                        <span class="mt-0.5 shrink-0 text-base">📍</span>
                        <span class="text-sm text-text">{{ r.etiqueta }}</span>
                      </button>
                    </li>
                  }
                </ul>
              }
              @if (!buscando() && textoBusqueda().trim().length >= 3 && resultadosBusqueda().length === 0) {
                <p class="border-t border-white/10 px-3 py-2.5 text-sm text-muted">Sin resultados.</p>
              }
            </div>
            <!-- Espaciador para mantener la altura del botón colapsado -->
            <div class="h-10 w-10"></div>
          } @else {
            <button type="button" (click)="abrirBuscador()" aria-label="Buscar calle o dirección"
              class="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ring-1 ring-white/20 backdrop-blur-xl transition active:scale-90"
              style="background: color-mix(in srgb, var(--color-surface) 65%, transparent)">
              <app-icono nombre="search" [tam]="20" />
            </button>
          }
        </div>

        <!-- Centrar en todos -->
        <button type="button" (click)="centrarEnTodos()" aria-label="Centrar el mapa en todos los pisos"
          class="flex h-10 w-10 items-center justify-center rounded-xl text-text shadow-lg ring-1 ring-white/20 backdrop-blur-xl transition active:scale-90"
          style="background: color-mix(in srgb, var(--color-surface) 65%, transparent)">
          <app-icono nombre="crosshair" [tam]="20" />
        </button>

        <!-- Distritos -->
        <button type="button" (click)="alternarDistritos()"
          [attr.aria-pressed]="distritosVisibles()"
          aria-label="Mostrar u ocultar distritos" title="Distritos"
          class="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ring-1 backdrop-blur-xl transition active:scale-90"
          [class.bg-primary-btn]="distritosVisibles()"
          [class.text-on-primary]="distritosVisibles()"
          [class.ring-transparent]="distritosVisibles()"
          [class.ring-white/20]="!distritosVisibles()"
          [class.text-text]="!distritosVisibles()"
          [style.background]="distritosVisibles() ? '' : 'color-mix(in srgb, var(--color-surface) 65%, transparent)'"
        >
          <app-icono nombre="layers" [tam]="20" />
        </button>
      </div>

      <!-- ── Leyenda (liquid glass) ── -->
      <div
        class="absolute bottom-3 left-3 z-[1000] cursor-default select-none rounded-2xl px-3 py-2.5 text-xs shadow-lg ring-1 ring-white/20 backdrop-blur-xl"
        style="background: color-mix(in srgb, var(--color-surface) 70%, transparent)"
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
  private readonly geocoding = inject(GeocodingService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly mapaEl = viewChild.required<ElementRef<HTMLDivElement>>('mapa');

  readonly nuevo = output<{ lat: number; lng: number }>();
  readonly editar = output<Piso>();
  readonly descartar = output<Piso>();
  readonly filtrarDistrito = output<Distrito>();

  readonly estados = ESTADOS_PIPELINE.filter((e) => e.valor !== 'Descartado');
  readonly distritosVisibles = signal(false);

  // ── Buscador ──
  readonly buscadorAbierto = signal(false);
  readonly textoBusqueda = signal('');
  readonly resultadosBusqueda = signal<ResultadoBusqueda[]>([]);
  readonly buscando = signal(false);
  readonly escuchando = signal(false);
  readonly soportaVoz =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  private mapa?: L.Map;
  private capaMarcadores?: L.LayerGroup;
  private capaDistritos?: L.GeoJSON;
  private marcadorBusquedaLeaflet?: L.Marker;
  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => this.inicializarMapa());

    effect(() => {
      const pisos = this.store.pisosFiltrados();
      if (this.mapa) {
        this.redibujarMarcadores(pisos);
      }
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.debounceTimer);
      this.mapa?.remove();
      this.mapa = undefined;
    });
  }

  // ── Buscador ──────────────────────────────────────────────────────────────

  abrirBuscador(): void {
    this.buscadorAbierto.set(true);
    this.textoBusqueda.set('');
    this.resultadosBusqueda.set([]);
  }

  cerrarBuscador(): void {
    this.buscadorAbierto.set(false);
    this.textoBusqueda.set('');
    this.resultadosBusqueda.set([]);
    this.buscando.set(false);
    clearTimeout(this.debounceTimer);
  }

  onTextoBusqueda(ev: Event): void {
    const texto = (ev.target as HTMLInputElement).value;
    this.textoBusqueda.set(texto);
    clearTimeout(this.debounceTimer);
    if (texto.trim().length < 3) {
      this.resultadosBusqueda.set([]);
      this.buscando.set(false);
      return;
    }
    this.buscando.set(true);
    this.debounceTimer = setTimeout(async () => {
      const resultados = await this.geocoding.buscarDireccion(texto);
      this.resultadosBusqueda.set(resultados);
      this.buscando.set(false);
    }, 400);
  }

  seleccionarResultado(r: ResultadoBusqueda): void {
    this.cerrarBuscador();
    if (!this.mapa) return;
    this.limpiarMarcadorBusqueda();
    this.mapa.flyTo([r.lat, r.lng], 17);
    const marcador = L.marker([r.lat, r.lng], { icon: this.iconoBusqueda() });
    marcador.bindPopup(this.htmlPopupBusqueda(r), { className: 'popup-busqueda' });
    marcador.on('popupopen', (e: L.PopupEvent) => {
      const raiz = e.popup.getElement();
      if (!raiz) return;
      raiz.querySelector<HTMLButtonElement>('.btn-anadir-busqueda')?.addEventListener('click', () => {
        this.mapa?.closePopup();
        this.limpiarMarcadorBusqueda();
        this.nuevo.emit({ lat: r.lat, lng: r.lng });
      });
      raiz.querySelector<HTMLButtonElement>('.btn-cerrar-busqueda')?.addEventListener('click', () => {
        this.mapa?.closePopup();
        this.limpiarMarcadorBusqueda();
      });
    });
    marcador.addTo(this.mapa);
    marcador.openPopup();
    this.marcadorBusquedaLeaflet = marcador;
  }

  limpiarMarcadorBusqueda(): void {
    if (this.marcadorBusquedaLeaflet && this.mapa) {
      this.mapa.removeLayer(this.marcadorBusquedaLeaflet);
      this.marcadorBusquedaLeaflet = undefined;
    }
  }

  iniciarVoz(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w['SpeechRecognition'] ?? w['webkitSpeechRecognition'];
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SR as any)();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = false;
    this.escuchando.set(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const texto = e.results[0][0].transcript as string;
      this.textoBusqueda.set(texto);
      this.escuchando.set(false);
      this.buscadorAbierto.set(true);
      this.buscando.set(true);
      void this.geocoding.buscarDireccion(texto).then((r) => {
        this.resultadosBusqueda.set(r);
        this.buscando.set(false);
      });
    };
    rec.onerror = () => this.escuchando.set(false);
    rec.onend = () => this.escuchando.set(false);
    rec.start();
  }

  // ── Mapa ──────────────────────────────────────────────────────────────────

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

    mapa.on('click', (e: L.LeafletMouseEvent) => {
      this.nuevo.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    this.capaMarcadores = L.layerGroup().addTo(mapa);
    this.mapa = mapa;
    this.redibujarMarcadores(this.store.pisosFiltrados());
  }

  centrarEnTodos(): void {
    const pisos = this.store.pisos();
    if (!this.mapa || pisos.length === 0) return;
    const bounds = L.latLngBounds(pisos.map((p) => [p.lat, p.lng] as L.LatLngTuple));
    this.mapa.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }

  async alternarDistritos(): Promise<void> {
    const mostrar = !this.distritosVisibles();
    this.distritosVisibles.set(mostrar);
    if (!this.mapa) return;
    if (mostrar) {
      if (!this.capaDistritos) {
        this.capaDistritos = await this.cargarDistritos();
      }
      this.capaDistritos?.addTo(this.mapa);
    } else if (this.capaDistritos) {
      this.mapa.removeLayer(this.capaDistritos);
    }
  }

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
            L.DomEvent.stopPropagation(e);
            this.store.distritoMapa.set(distrito);
            this.store.barrioMapa.set('');
            this.filtrarDistrito.emit(distrito);
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

  private redibujarMarcadores(pisos: Piso[]): void {
    const capa = this.capaMarcadores;
    if (!capa) return;
    capa.clearLayers();
    for (const piso of pisos) {
      const marcador = L.marker([piso.lat, piso.lng], {
        icon: this.iconoGota(colorEstado(piso.estado)),
      });
      marcador.bindPopup(this.htmlPopup(piso));
      marcador.on('popupopen', (e: L.PopupEvent) => this.cablearPopup(e, piso));
      capa.addLayer(marcador);
    }
  }

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

  private iconoBusqueda(): L.DivIcon {
    return L.divIcon({
      className: 'marcador-busqueda',
      html: `<div style="width:20px;height:20px;border-radius:50%;background:#4f46e5;border:3px solid #fff;box-shadow:0 2px 10px rgba(79,70,229,0.6)"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -14],
    });
  }

  private htmlPopupBusqueda(r: ResultadoBusqueda): string {
    return `
      <div style="min-width:190px;font-family:inherit">
        <p style="margin:0;font-size:11px;color:var(--color-muted);font-weight:500">📍 Dirección encontrada</p>
        <p style="margin:4px 0 10px;font-weight:600;font-size:13px;color:var(--color-text);line-height:1.3">${this.escapar(r.etiqueta)}</p>
        <div style="display:flex;gap:6px">
          <button class="btn-anadir-busqueda"
            style="flex:1;padding:8px 0;border:0;border-radius:8px;
                   background:var(--color-primary-btn);color:var(--color-on-primary);
                   font-weight:600;font-size:12px;cursor:pointer">
            ➕ Añadir piso aquí
          </button>
          <button class="btn-cerrar-busqueda"
            style="padding:8px 10px;border:0;border-radius:8px;
                   background:var(--color-surface-2);color:var(--color-muted);
                   font-weight:600;font-size:12px;cursor:pointer">
            ✕
          </button>
        </div>
      </div>`;
  }

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

  private cablearPopup(e: L.PopupEvent, piso: Piso): void {
    const raiz = e.popup.getElement();
    if (!raiz) return;
    raiz.querySelector<HTMLButtonElement>('.btn-editar')?.addEventListener('click', () => {
      this.mapa?.closePopup();
      this.editar.emit(piso);
    });
    raiz.querySelector<HTMLButtonElement>('.btn-borrar')?.addEventListener('click', () => {
      this.mapa?.closePopup();
      this.descartar.emit(piso);
    });
  }

  private escapar(texto: string): string {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }
}
