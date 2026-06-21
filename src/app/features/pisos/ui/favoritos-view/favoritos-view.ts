import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { desglosePuntuacion } from '../../data/puntuacion.util';
import { PisosStore } from '../../data/pisos.store';
import { Piso } from '../../models/piso.model';
import { PisoCard } from '../piso-card/piso-card';

/**
 * Vista de favoritos: solo pisos en estado "Favorito", ordenados por
 * puntuación (mayor a menor) con ranking numerado, puntos y **desglose** de
 * cómo se ha calculado la puntuación (por reglas).
 */
@Component({
  selector: 'app-favoritos-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PisoCard],
  template: `
    @if (favoritos().length === 0) {
      <div class="tarjeta px-4 py-12 text-center">
        <p class="text-4xl">⭐</p>
        <p class="mt-2 text-sm text-muted">Aún no has marcado ningún piso como Favorito.</p>
      </div>
    } @else {
      <div class="space-y-4">
        <p class="px-1 text-sm text-muted">
          Ordenados por puntuación según tu perfil de búsqueda (≤200k, ≥2 hab, plantas bajas,
          transporte, sin riesgos…).
        </p>
        @for (fav of favoritos(); track fav.piso.id; let i = $index) {
          <div class="space-y-1.5">
            <app-piso-card
              [piso]="fav.piso"
              [ranking]="i + 1"
              [puntos]="fav.puntos"
              (editar)="editar.emit($event)"
              (borrar)="borrar.emit($event)"
            />
            <!-- Desglose de la puntuación -->
            <div class="flex flex-wrap gap-1.5 px-1">
              @for (factor of desglose(fav.piso); track factor.etiqueta) {
                <span
                  class="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium ring-1 ring-border"
                  [style.color]="factor.puntos > 0 ? '#16a34a' : '#dc2626'"
                >
                  {{ factor.etiqueta }} {{ factor.puntos > 0 ? '+' : '' }}{{ factor.puntos }}
                </span>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class FavoritosView {
  private readonly store = inject(PisosStore);

  readonly favoritos = this.store.favoritos;

  readonly editar = output<Piso>();
  readonly borrar = output<Piso>();

  /** Desglose de factores de la puntuación de un piso. */
  desglose(piso: Piso) {
    return desglosePuntuacion(piso);
  }
}
