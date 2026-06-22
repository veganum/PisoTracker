import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GuionStore } from '../../data/guion.store';
import { GuionBloque } from '../guion-bloque/guion-bloque';

/**
 * Vista "Guion": preguntas preparadas por momentos de la compra.
 * Muestra el progreso global, un botón para reiniciar las marcas y la lista
 * de bloques (cada uno gestionado por `GuionBloque`).
 */
@Component({
  selector: 'app-guion-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GuionBloque],
  template: `
    <div class="space-y-4">
      <!-- Cabecera: progreso global + reiniciar -->
      <div class="tarjeta flex items-center gap-3 p-4">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-text">Tu guion de preguntas</p>
          <p class="text-xs text-muted">{{ progreso().hechas }}/{{ progreso().total }} marcadas</p>
          <!-- Barra de progreso -->
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              class="h-full rounded-full bg-primary-btn transition-all"
              [style.width.%]="porcentaje()"
            ></div>
          </div>
        </div>
        @if (progreso().hechas > 0) {
          <button
            type="button"
            (click)="store.reiniciar()"
            class="btn-suave shrink-0 px-4 py-2 text-sm"
          >
            Reiniciar
          </button>
        }
      </div>

      <!-- Bloques -->
      @for (bloque of store.bloques(); track bloque.id) {
        <app-guion-bloque [bloque]="bloque" />
      }

      <p class="px-2 pb-2 text-center text-xs text-muted">
        Marca, edita o añade tus propias preguntas. Se guardan automáticamente.
      </p>
    </div>
  `,
})
export class GuionView {
  protected readonly store = inject(GuionStore);

  readonly progreso = this.store.progreso;

  /** Porcentaje de progreso para la barra (0 si no hay preguntas). */
  porcentaje(): number {
    const { hechas, total } = this.progreso();
    return total === 0 ? 0 : Math.round((hechas / total) * 100);
  }
}
