import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { PisosStore } from '../../data/pisos.store';
import {
  ESTADOS_FLUJO,
  EstadoPipeline,
} from '../../models/estado-pipeline';
import { Piso } from '../../models/piso.model';

interface ColumnaTablero {
  estado: EstadoPipeline;
  color: string;
  pisos: Piso[];
}

@Component({
  selector: 'app-kanban-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPisosFlujo() === 0) {
      <div class="tarjeta px-4 py-12 text-center">
        <p class="text-4xl">🏠</p>
        <p class="mt-2 text-sm font-semibold text-text">Sin pisos en el tablero</p>
        <p class="mt-1 text-xs text-muted">
          Añade un piso desde el Mapa o la Lista para verlo aquí.
        </p>
      </div>
    } @else {
      <div class="space-y-2 lg:grid lg:grid-cols-4 lg:gap-4 lg:space-y-0">
        @for (col of columnas(); track col.estado) {
          <div class="overflow-hidden rounded-2xl bg-surface-2 lg:flex lg:flex-col">

            <!-- Cabecera del estado / columna -->
            <button
              type="button"
              (click)="alternarExpandido(col.estado)"
              class="flex w-full items-center gap-2.5 px-3 py-3 transition lg:cursor-default"
              [class.opacity-40]="col.pisos.length === 0"
            >
              <span
                class="h-3 w-3 shrink-0 rounded-full"
                [style.background-color]="col.color"
              ></span>
              <span class="flex-1 text-left text-sm font-semibold text-text">
                {{ col.estado }}
              </span>
              <span class="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                {{ col.pisos.length }}
              </span>
              <svg
                viewBox="0 0 24 24"
                class="h-4 w-4 shrink-0 text-muted transition-transform lg:hidden"
                [class.rotate-180]="expandidos().has(col.estado)"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <!-- Cards: ocultas en móvil si colapsado; siempre visibles en desktop -->
            <div
              class="lg:block lg:flex-1 lg:overflow-y-auto"
              [class.hidden]="!expandidos().has(col.estado)"
              style="max-height: calc(100vh - 220px)"
            >
              <div class="space-y-1.5 px-2 pb-2">
                @if (col.pisos.length === 0) {
                  <p class="py-6 text-center text-xs text-muted">Sin pisos aquí</p>
                }
                @for (piso of col.pisos; track piso.id) {
                  <button
                    type="button"
                    (click)="editar.emit(piso)"
                    class="tarjeta w-full border-l-[3px] px-3 py-3.5 text-left transition active:scale-[0.98]"
                    [style.border-left-color]="col.color"
                  >
                    <p class="truncate text-sm font-semibold text-text">
                      {{ piso.direccion }}
                    </p>
                    <p class="mt-0.5 truncate text-xs text-muted">
                      {{ formatearPrecio(piso.precio) }} · {{ piso.distrito }} · {{ nombreContacto(piso) }}
                    </p>
                    @if (piso.fechaCita) {
                      <p class="mt-1 text-xs font-medium" [style.color]="col.color">
                        📅 {{ formatearCita(piso.fechaCita) }}
                      </p>
                    }
                  </button>
                }
              </div>
            </div>

          </div>
        }
      </div>
    }
  `,
})
export class KanbanView {
  private readonly store = inject(PisosStore);

  readonly editar = output<Piso>();

  readonly columnas = computed<ColumnaTablero[]>(() => {
    const pisos = this.store.pisos();
    return ESTADOS_FLUJO.map((cfg) => ({
      estado: cfg.valor,
      color: cfg.color,
      pisos: pisos.filter((p) => p.estado === cfg.valor),
    }));
  });

  readonly totalPisosFlujo = computed(() =>
    this.columnas().reduce((sum, col) => sum + col.pisos.length, 0),
  );

  readonly expandidos = signal<Set<EstadoPipeline>>(
    new Set(
      ESTADOS_FLUJO.filter((cfg) =>
        inject(PisosStore)
          .pisos()
          .some((p) => p.estado === cfg.valor),
      ).map((cfg) => cfg.valor),
    ),
  );

  alternarExpandido(estado: EstadoPipeline): void {
    const actual = new Set(this.expandidos());
    if (actual.has(estado)) {
      actual.delete(estado);
    } else {
      actual.add(estado);
    }
    this.expandidos.set(actual);
  }

  formatearPrecio(precio: number): string {
    return precio > 0 ? precio.toLocaleString('es-ES') + ' €' : 'Sin precio';
  }

  nombreContacto(piso: Piso): string {
    return piso.tipoContacto === 'Inmobiliaria' && piso.inmobiliaria
      ? piso.inmobiliaria
      : 'Particular';
  }

  /** Fecha de cita abreviada: "lun 23 jun · 10:00" */
  formatearCita(iso: string): string {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} · ${hora}`;
  }
}
