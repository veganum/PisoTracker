import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { PisosStore } from '../../data/pisos.store';
import { ESTADOS_PIPELINE, EstadoPipeline } from '../../models/estado-pipeline';
import { barriosDe, Distrito, DISTRITOS_NOMBRES } from '../../models/madrid';
import { ESTADOS_PISO, EstadoPiso, Piso, TIPOS_CONTACTO, TipoContacto } from '../../models/piso.model';
import { puntuacionPiso } from '../../data/puntuacion.util';
import { Icono } from '../../../../shared/icono/icono';
import { PisoCard } from '../piso-card/piso-card';

/**
 * Vista de lista con filtros combinables (distrito, barrio, estado del
 * pipeline, tipo de contacto y estado del piso). Los filtros son signals y el
 * resultado un `computed()` que reacciona a ellos y al store.
 */
@Component({
  selector: 'app-lista-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PisoCard, Icono],
  template: `
    <div class="space-y-3">
      <!-- Buscador -->
      <div class="relative">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <app-icono nombre="search" [tam]="16" />
        </span>
        <input
          type="search"
          [value]="busqueda()"
          (input)="busqueda.set(valor($event))"
          placeholder="Buscar por dirección, barrio, inmobiliaria, notas…"
          class="campo py-2.5 pl-9 text-sm"
        />
      </div>

      <!-- Filtros -->
      <div class="grid grid-cols-2 gap-2">
        <select [value]="orden()" (change)="orden.set(valor($event))" class="campo col-span-2 py-2.5 text-sm">
          <option value="ninguno">Orden: por defecto</option>
          <option value="precioAsc">Precio ↑ (más barato)</option>
          <option value="precioDesc">Precio ↓ (más caro)</option>
          <option value="precioM2">€/m² ↑</option>
          <option value="metrosDesc">Metros ↓ (más grande)</option>
          <option value="puntuacionDesc">Puntuación ↓</option>
          <option value="cita">Fecha de cita</option>
        </select>

        <select
          [value]="fDistrito()"
          (change)="cambiarDistrito(valor($event))"
          class="campo py-2.5 text-sm"
        >
          <option value="">Todos los distritos</option>
          @for (d of distritos; track d) {
            <option [value]="d">{{ d }}</option>
          }
        </select>

        <select
          [value]="fBarrio()"
          (change)="fBarrio.set(valor($event))"
          [disabled]="barriosFiltro().length === 0"
          class="campo py-2.5 text-sm disabled:opacity-50"
        >
          <option value="">{{ fDistrito() ? 'Todos los barrios' : 'Elige distrito' }}</option>
          @for (b of barriosFiltro(); track b) {
            <option [value]="b">{{ b }}</option>
          }
        </select>

        <select [value]="fEstado()" (change)="fEstado.set(valor($event))" class="campo py-2.5 text-sm">
          <option value="">Todos los estados</option>
          @for (e of estadosPipeline; track e.valor) {
            <option [value]="e.valor">{{ e.valor }}</option>
          }
        </select>

        <select [value]="fContacto()" (change)="fContacto.set(valor($event))" class="campo py-2.5 text-sm">
          <option value="">Cualquier contacto</option>
          @for (t of tiposContacto; track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>

        <select
          [value]="fEstadoPiso()"
          (change)="fEstadoPiso.set(valor($event))"
          class="campo col-span-2 py-2.5 text-sm"
        >
          <option value="">Cualquier reforma</option>
          @for (e of estadosPiso; track e) {
            <option [value]="e">{{ e }}</option>
          }
        </select>
      </div>

      <div class="flex items-center justify-between px-1">
        <p class="text-sm text-muted">{{ resultados().length }} piso(s)</p>
        @if (hayFiltros()) {
          <button type="button" (click)="limpiar()" class="text-sm font-semibold text-primary">
            Limpiar filtros
          </button>
        }
      </div>

      <!-- Resultados -->
      @if (resultados().length === 0) {
        <div class="tarjeta px-4 py-12 text-center">
          <p class="text-4xl">🔍</p>
          <p class="mt-2 text-sm text-muted">No hay pisos que coincidan con los filtros.</p>
        </div>
      } @else {
        <div class="grid gap-4 pt-1 sm:grid-cols-2 xl:grid-cols-3">
          @for (piso of resultados(); track piso.id) {
            <app-piso-card
              [piso]="piso"
              (editar)="editar.emit($event)"
              (borrar)="borrar.emit($event)"
            />
          }
        </div>
      }
    </div>
  `,
})
export class ListaView {
  private readonly store = inject(PisosStore);

  readonly editar = output<Piso>();
  readonly borrar = output<Piso>();

  constructor() {
    // Al abrir la Lista, si venimos de pulsar un distrito en el mapa, lo aplicamos.
    const delMapa = this.store.distritoMapa();
    if (delMapa) {
      this.fDistrito.set(delMapa);
    }

    // El barrio del punto pulsado llega un instante después (geocodificación):
    // lo aplicamos al filtro cuando esté disponible.
    effect(() => {
      const barrio = this.store.barrioMapa();
      if (barrio) {
        this.fBarrio.set(barrio);
      }
    });
  }

  // Opciones de filtro
  readonly distritos = DISTRITOS_NOMBRES;
  readonly estadosPipeline = ESTADOS_PIPELINE;
  readonly tiposContacto = TIPOS_CONTACTO;
  readonly estadosPiso = ESTADOS_PISO;

  // Filtros (''/vacío = sin filtrar por ese criterio).
  readonly fDistrito = signal('');
  readonly fBarrio = signal('');
  readonly fEstado = signal('');
  readonly fContacto = signal('');
  readonly fEstadoPiso = signal('');
  readonly busqueda = signal('');
  readonly orden = signal('ninguno');

  /** Barrios del distrito filtrado (para el selector dependiente). */
  readonly barriosFiltro = computed(() => barriosDe(this.fDistrito() as Distrito | ''));

  readonly hayFiltros = computed(
    () =>
      !!(
        this.fDistrito() ||
        this.fBarrio() ||
        this.fEstado() ||
        this.fContacto() ||
        this.fEstadoPiso() ||
        this.busqueda().trim() ||
        this.orden() !== 'ninguno'
      ),
  );

  /** Pisos tras aplicar filtros + búsqueda textual. */
  readonly filtrados = computed(() => {
    const distrito = this.fDistrito();
    const barrio = this.fBarrio();
    const estado = this.fEstado() as EstadoPipeline | '';
    const contacto = this.fContacto() as TipoContacto | '';
    const estadoPiso = this.fEstadoPiso() as EstadoPiso | '';
    const q = this.busqueda().trim().toLowerCase();

    return this.store.pisos().filter((p) => {
      if (distrito && p.distrito !== distrito) return false;
      if (barrio && p.barrio !== barrio) return false;
      if (estado && p.estado !== estado) return false;
      if (contacto && p.tipoContacto !== contacto) return false;
      if (estadoPiso && p.estadoPiso !== estadoPiso) return false;
      if (q) {
        const texto = [p.direccion, p.distrito, p.barrio, p.inmobiliaria, p.notas]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  });

  /** Resultado final: filtrados + ordenados según el criterio elegido. */
  readonly resultados = computed(() => {
    const lista = [...this.filtrados()];
    const pm2 = (p: Piso) => (p.metros > 0 ? p.precio / p.metros : Number.MAX_SAFE_INTEGER);

    switch (this.orden()) {
      case 'precioAsc':
        return lista.sort((a, b) => a.precio - b.precio);
      case 'precioDesc':
        return lista.sort((a, b) => b.precio - a.precio);
      case 'precioM2':
        return lista.sort((a, b) => pm2(a) - pm2(b));
      case 'metrosDesc':
        return lista.sort((a, b) => b.metros - a.metros);
      case 'puntuacionDesc':
        return lista.sort((a, b) => puntuacionPiso(b) - puntuacionPiso(a));
      case 'cita':
        return lista.sort((a, b) => (a.fechaCita ?? '').localeCompare(b.fechaCita ?? ''));
      default:
        return lista;
    }
  });

  /** Cambia el distrito del filtro y resetea el barrio (depende del distrito). */
  cambiarDistrito(valor: string): void {
    this.fDistrito.set(valor);
    this.fBarrio.set('');
  }

  limpiar(): void {
    this.fDistrito.set('');
    this.fBarrio.set('');
    this.fEstado.set('');
    this.fContacto.set('');
    this.fEstadoPiso.set('');
    this.busqueda.set('');
    this.orden.set('ninguno');
  }

  valor(ev: Event): string {
    return (ev.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
