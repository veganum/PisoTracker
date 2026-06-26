import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core';
import { PisosStore } from '../../data/pisos.store';
import { ESTADOS_PIPELINE } from '../../models/estado-pipeline';
import { barriosDe, Distrito, DISTRITOS_NOMBRES } from '../../models/madrid';
import { ESTADOS_PISO, Piso, TIPOS_CONTACTO } from '../../models/piso.model';
import { puntuacionPiso } from '../../data/puntuacion.util';
import { Icono } from '../../../../shared/icono/icono';
import { PisoCard } from '../piso-card/piso-card';

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
          [value]="store.busqueda()"
          (input)="store.busqueda.set(valor($event))"
          placeholder="Buscar por dirección, barrio, inmobiliaria, notas…"
          class="campo py-2.5 pl-9 text-sm"
        />
      </div>

      <!-- Filtros -->
      <div class="grid grid-cols-2 gap-2">
        <select
          (change)="store.orden.set(valor($event))"
          class="campo col-span-2 py-2.5 text-sm"
        >
          <option value="ninguno" [selected]="store.orden() === 'ninguno'">Orden: por defecto</option>
          <option value="precioAsc" [selected]="store.orden() === 'precioAsc'">Precio ↑ (más barato)</option>
          <option value="precioDesc" [selected]="store.orden() === 'precioDesc'">Precio ↓ (más caro)</option>
          <option value="precioM2" [selected]="store.orden() === 'precioM2'">€/m² ↑</option>
          <option value="metrosDesc" [selected]="store.orden() === 'metrosDesc'">Metros ↓ (más grande)</option>
          <option value="puntuacionDesc" [selected]="store.orden() === 'puntuacionDesc'">Puntuación ↓</option>
          <option value="cita" [selected]="store.orden() === 'cita'">Fecha de cita</option>
        </select>

        <select
          (change)="store.cambiarDistrito(valor($event))"
          class="campo py-2.5 text-sm"
        >
          <option value="" [selected]="!store.fDistrito()">Todos los distritos</option>
          @for (d of distritos; track d) {
            <option [value]="d" [selected]="store.fDistrito() === d">{{ d }}</option>
          }
        </select>

        <select
          (change)="store.fBarrio.set(valor($event))"
          [disabled]="barriosFiltro().length === 0"
          class="campo py-2.5 text-sm disabled:opacity-50"
        >
          <option value="" [selected]="!store.fBarrio()">
            {{ store.fDistrito() ? 'Todos los barrios' : 'Elige distrito' }}
          </option>
          @for (b of barriosFiltro(); track b) {
            <option [value]="b" [selected]="store.fBarrio() === b">{{ b }}</option>
          }
        </select>

        <select
          (change)="store.fEstado.set(valor($event))"
          class="campo py-2.5 text-sm"
        >
          <option value="" [selected]="!store.fEstado()">Todos los estados</option>
          @for (e of estadosPipeline; track e.valor) {
            <option [value]="e.valor" [selected]="store.fEstado() === e.valor">{{ e.valor }}</option>
          }
        </select>

        <select
          (change)="store.fContacto.set(valor($event))"
          class="campo py-2.5 text-sm"
        >
          <option value="" [selected]="!store.fContacto()">Cualquier contacto</option>
          @for (t of tiposContacto; track t) {
            <option [value]="t" [selected]="store.fContacto() === t">{{ t }}</option>
          }
        </select>

        <select
          (change)="store.fEstadoPiso.set(valor($event))"
          class="campo col-span-2 py-2.5 text-sm"
        >
          <option value="" [selected]="!store.fEstadoPiso()">Cualquier reforma</option>
          @for (e of estadosPiso; track e) {
            <option [value]="e" [selected]="store.fEstadoPiso() === e">{{ e }}</option>
          }
        </select>
      </div>

      <div class="flex items-center justify-between px-1">
        <p class="text-sm text-muted">
          {{ resultados().length }} piso(s)
          @if (store.hayFiltros()) {
            <span class="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {{ store.numFiltros() }} filtro(s)
            </span>
          }
        </p>
        @if (store.hayFiltros()) {
          <button type="button" (click)="store.limpiarFiltros()" class="text-sm font-semibold text-primary">
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
  readonly store = inject(PisosStore);

  readonly editar = output<Piso>();
  readonly borrar = output<Piso>();

  readonly distritos = DISTRITOS_NOMBRES;
  readonly estadosPipeline = ESTADOS_PIPELINE;
  readonly tiposContacto = TIPOS_CONTACTO;
  readonly estadosPiso = ESTADOS_PISO;

  readonly barriosFiltro = computed(() => barriosDe(this.store.fDistrito() as Distrito | ''));

  /** Pisos filtrados + ordenados (la ordenación es solo de la vista). */
  readonly resultados = computed(() => {
    const lista = [...this.store.pisosFiltrados()];
    const pm2 = (p: Piso) => (p.metros > 0 ? p.precio / p.metros : Number.MAX_SAFE_INTEGER);

    switch (this.store.orden()) {
      case 'precioAsc':   return lista.sort((a, b) => a.precio - b.precio);
      case 'precioDesc':  return lista.sort((a, b) => b.precio - a.precio);
      case 'precioM2':    return lista.sort((a, b) => pm2(a) - pm2(b));
      case 'metrosDesc':  return lista.sort((a, b) => b.metros - a.metros);
      case 'puntuacionDesc': return lista.sort((a, b) => puntuacionPiso(b) - puntuacionPiso(a));
      case 'cita':        return lista.sort((a, b) => (a.fechaCita ?? '').localeCompare(b.fechaCita ?? ''));
      default:            return lista;
    }
  });

  valor(ev: Event): string {
    return (ev.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
