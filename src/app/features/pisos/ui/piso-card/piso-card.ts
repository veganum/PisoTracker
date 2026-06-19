import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { colorEstado } from '../../models/estado-pipeline';
import { Piso } from '../../models/piso.model';

/**
 * Tarjeta reutilizable de un piso. Muestra todos los datos de un vistazo,
 * con el barrio y el estado siempre visibles. Emite acciones hacia arriba.
 */
@Component({
  selector: 'app-piso-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [DecimalPipe, DatePipe],
  template: `
    <article class="tarjeta overflow-hidden">
      <!-- Cabecera: barrio + estado bien visibles -->
      <header class="flex items-center justify-between gap-2 px-4 pt-3.5">
        <span class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ piso().barrio }}
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white"
          [style.background-color]="color()"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-white/90"></span>
          {{ piso().estado }}
        </span>
      </header>

      <div class="px-4 pb-4 pt-1.5">
        <!-- Ranking + dirección -->
        <div class="flex items-start gap-2.5">
          @if (ranking() !== null) {
            <span
              class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-btn text-sm font-bold text-on-primary"
            >
              {{ ranking() }}
            </span>
          }
          <h3 class="text-base font-semibold leading-tight text-text">
            {{ piso().direccion }}
          </h3>
        </div>

        <!-- Precio + puntuación -->
        <div class="mt-2.5 flex items-baseline justify-between">
          <p class="text-2xl font-bold tracking-tight text-text">
            {{ piso().precio | number: '1.0-0' }} €
          </p>
          @if (puntos() !== null) {
            <p class="flex items-baseline gap-1 text-star">
              <span class="text-lg font-bold">{{ puntos() }}</span>
              <span class="text-xs font-medium">pts</span>
            </p>
          }
        </div>

        <!-- Características -->
        <ul class="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
          <li>{{ piso().metros }} m²</li>
          <li aria-hidden="true" class="text-border">·</li>
          <li>{{ piso().habitaciones }} hab</li>
          <li aria-hidden="true" class="text-border">·</li>
          <li>{{ piso().banos }} baño{{ piso().banos === 1 ? '' : 's' }}</li>
          <li aria-hidden="true" class="text-border">·</li>
          <li>Planta {{ piso().planta }}</li>
          <li aria-hidden="true" class="text-border">·</li>
          <li>{{ piso().ascensor ? 'Con ascensor' : 'Sin ascensor' }}</li>
        </ul>

        <!-- Estado del inmueble + contacto -->
        <div class="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          <span class="rounded-lg bg-surface-2 px-2.5 py-1 font-medium text-text ring-1 ring-border">
            {{ piso().estadoPiso }}
          </span>
          <span class="rounded-lg bg-surface-2 px-2.5 py-1 font-medium text-text ring-1 ring-border">
            {{
              piso().tipoContacto === 'Inmobiliaria'
                ? (piso().inmobiliaria || 'Inmobiliaria')
                : 'Particular'
            }}
          </span>
          @if (piso().estado === 'Agendado' && piso().fechaCita) {
            <span class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium text-white" [style.background-color]="color()">
              🗓️ {{ piso().fechaCita | date: 'dd/MM HH:mm' }}
            </span>
          }
        </div>

        <!-- Notas -->
        @if (piso().notas.trim()) {
          <p class="mt-2.5 line-clamp-2 text-sm text-muted">{{ piso().notas }}</p>
        }

        <!-- Acciones -->
        <div class="mt-3.5 flex items-center gap-2">
          @if (piso().url.trim()) {
            <a
              [href]="piso().url"
              target="_blank"
              rel="noopener"
              class="btn-suave flex-1 text-center text-sm"
            >
              Ver anuncio
            </a>
          }
          <button
            type="button"
            (click)="editar.emit(piso())"
            class="btn-primario flex-1 py-2.5 text-sm"
          >
            Editar
          </button>
          <button
            type="button"
            (click)="borrar.emit(piso())"
            aria-label="Descartar piso"
            class="rounded-2xl bg-danger/10 px-3 py-2.5 text-base text-danger transition active:scale-[0.96]"
          >
            🗑️
          </button>
        </div>
      </div>
    </article>
  `,
})
export class PisoCard {
  /** Piso a mostrar. */
  readonly piso = input.required<Piso>();
  /** Posición en el ranking de favoritos (null si no aplica). */
  readonly ranking = input<number | null>(null);
  /** Puntuación calculada (null si no aplica). */
  readonly puntos = input<number | null>(null);

  readonly editar = output<Piso>();
  readonly borrar = output<Piso>();

  /** Color del estado para el badge. */
  readonly color = computed(() => colorEstado(this.piso().estado));
}
