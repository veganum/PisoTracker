import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { Icono } from '../../../../shared/icono/icono';
import { PisosStore } from '../../data/pisos.store';
import { ToastService } from '../../data/toast.service';
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

const SIGUIENTE_ESTADO: Partial<Record<EstadoPipeline, EstadoPipeline>> = {
  Interesado: 'Contactado',
  Contactado: 'Agendado',
  Agendado: 'Visitado',
};

@Component({
  selector: 'app-kanban-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icono],
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

            <!-- Cards -->
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
                  <div
                    class="tarjeta border-l-[3px]"
                    [style.border-left-color]="col.color"
                  >
                    <!-- Cuerpo: tap = avanzar estado -->
                    <button
                      type="button"
                      (click)="avanzarEstado(piso)"
                      class="w-full px-4 pt-4 pb-3 text-left transition active:scale-[0.98]"
                    >
                      <p class="text-sm font-semibold leading-snug text-text">
                        {{ piso.direccion }}
                      </p>
                      <p class="mt-2 text-xs text-muted">
                        {{ formatearPrecio(piso.precio) }}
                      </p>
                      <p class="mt-0.5 text-xs text-muted">
                        {{ piso.distrito }} · {{ nombreContacto(piso) }}
                      </p>
                      @if (piso.fechaCita) {
                        <p class="mt-2 text-xs font-medium" [style.color]="col.color">
                          📅 {{ formatearCita(piso.fechaCita) }}
                        </p>
                      }
                    </button>

                    <!-- Pie: icono ojo (ver/editar) -->
                    <div class="flex items-center justify-end border-t border-border px-4 py-2">
                      <button
                        type="button"
                        (click)="editar.emit(piso)"
                        class="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:text-text active:scale-90"
                        aria-label="Ver detalle"
                      >
                        <app-icono nombre="eye" [tam]="15" />
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

          </div>
        }
      </div>
    }

    <!-- Sheet de decisión para pisos en Visitado -->
    @if (pisoDecision()) {
      <div
        class="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 backdrop-blur-sm lg:items-center"
        (click)="pisoDecision.set(null)"
      >
        <div
          class="w-full max-w-lg rounded-t-3xl bg-surface p-6 pb-10 lg:rounded-3xl lg:pb-6"
          (click)="$event.stopPropagation()"
        >
          <p class="mb-1 text-base font-bold text-text">¿Qué hacemos con este piso?</p>
          <p class="mb-5 truncate text-sm text-muted">{{ pisoDecision()!.direccion }}</p>

          <div class="space-y-2">
            <button
              type="button"
              (click)="aplicarDecision('Favorito')"
              class="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3.5 text-left transition active:scale-[0.98]"
            >
              <span class="text-xl">⭐</span>
              <div>
                <p class="text-sm font-semibold text-text">Favorito</p>
                <p class="text-xs text-muted">Candidato serio</p>
              </div>
            </button>
            <button
              type="button"
              (click)="aplicarDecision('Pendiente condiciones')"
              class="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3.5 text-left transition active:scale-[0.98]"
            >
              <span class="text-xl">⏳</span>
              <div>
                <p class="text-sm font-semibold text-text">Pendiente condiciones</p>
                <p class="text-xs text-muted">Esperando bajada de precio o cambio</p>
              </div>
            </button>
            <button
              type="button"
              (click)="pisoDecision.set(null)"
              class="w-full rounded-2xl bg-surface-2 px-4 py-3.5 text-sm font-medium text-muted transition active:scale-[0.98]"
            >
              Dejarlo en Visitado
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class KanbanView {
  private readonly store = inject(PisosStore);
  private readonly toast = inject(ToastService);

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

  /** Piso esperando decisión tras llegar a Visitado. */
  readonly pisoDecision = signal<Piso | null>(null);

  avanzarEstado(piso: Piso): void {
    const siguiente = SIGUIENTE_ESTADO[piso.estado];
    if (siguiente) {
      this.store.actualizar({ ...piso, estado: siguiente });
      // Expandir la columna destino si estaba colapsada
      const expandidos = new Set(this.expandidos());
      expandidos.add(siguiente);
      this.expandidos.set(expandidos);
      this.toast.mostrar(`Movido a ${siguiente}`);
    } else {
      // Está en Visitado → abrir sheet de decisión
      this.pisoDecision.set(piso);
    }
  }

  aplicarDecision(estado: EstadoPipeline): void {
    const piso = this.pisoDecision();
    if (piso) {
      this.store.actualizar({ ...piso, estado });
      this.toast.mostrar(`Marcado como ${estado}`);
    }
    this.pisoDecision.set(null);
  }

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

  formatearCita(iso: string): string {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} · ${hora}`;
  }
}
