import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { PisosStore } from '../../data/pisos.store';
import { ESTADOS_PIPELINE, EstadoPipeline } from '../../models/estado-pipeline';
import {
  BARRIOS,
  Barrio,
  ESTADOS_PISO,
  EstadoPiso,
  Piso,
  TIPOS_CONTACTO,
  TipoContacto,
} from '../../models/piso.model';
import { PisoCard } from '../piso-card/piso-card';

/**
 * Vista de lista con filtros combinables (barrio, estado del pipeline,
 * tipo de contacto y estado del piso). Los filtros son signals y el
 * resultado un `computed()` que reacciona a ellos y al store.
 */
@Component({
  selector: 'app-lista-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PisoCard],
  template: `
    <div class="space-y-3">
      <!-- Filtros -->
      <div class="grid grid-cols-2 gap-2">
        <select [value]="fBarrio()" (change)="fBarrio.set(valor($event))" class="campo py-2.5 text-sm">
          <option value="">Todos los barrios</option>
          @for (b of barrios; track b) {
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
          class="campo py-2.5 text-sm"
        >
          <option value="">Cualquier reforma</option>
          @for (e of estadosPiso; track e) {
            <option [value]="e">{{ e }}</option>
          }
        </select>
      </div>

      <div class="flex items-center justify-between px-1">
        <p class="text-sm text-muted">{{ filtrados().length }} piso(s)</p>
        @if (hayFiltros()) {
          <button type="button" (click)="limpiar()" class="text-sm font-semibold text-primary">
            Limpiar filtros
          </button>
        }
      </div>

      <!-- Resultados -->
      @if (filtrados().length === 0) {
        <div class="tarjeta px-4 py-12 text-center">
          <p class="text-4xl">🔍</p>
          <p class="mt-2 text-sm text-muted">No hay pisos que coincidan con los filtros.</p>
        </div>
      } @else {
        <div class="space-y-4 pt-1">
          @for (piso of filtrados(); track piso.id) {
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

  // Opciones de filtro
  readonly barrios = BARRIOS;
  readonly estadosPipeline = ESTADOS_PIPELINE;
  readonly tiposContacto = TIPOS_CONTACTO;
  readonly estadosPiso = ESTADOS_PISO;

  // Filtros (''/vacío = sin filtrar por ese criterio)
  readonly fBarrio = signal('');
  readonly fEstado = signal('');
  readonly fContacto = signal('');
  readonly fEstadoPiso = signal('');

  readonly hayFiltros = computed(
    () => !!(this.fBarrio() || this.fEstado() || this.fContacto() || this.fEstadoPiso()),
  );

  /** Pisos resultantes de aplicar todos los filtros activos. */
  readonly filtrados = computed(() => {
    const barrio = this.fBarrio() as Barrio | '';
    const estado = this.fEstado() as EstadoPipeline | '';
    const contacto = this.fContacto() as TipoContacto | '';
    const estadoPiso = this.fEstadoPiso() as EstadoPiso | '';

    return this.store.pisos().filter((p) => {
      if (barrio && p.barrio !== barrio) return false;
      if (estado && p.estado !== estado) return false;
      if (contacto && p.tipoContacto !== contacto) return false;
      if (estadoPiso && p.estadoPiso !== estadoPiso) return false;
      return true;
    });
  });

  limpiar(): void {
    this.fBarrio.set('');
    this.fEstado.set('');
    this.fContacto.set('');
    this.fEstadoPiso.set('');
  }

  valor(ev: Event): string {
    return (ev.target as HTMLSelectElement).value;
  }
}
