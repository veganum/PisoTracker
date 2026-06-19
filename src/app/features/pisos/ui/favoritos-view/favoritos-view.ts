import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { PisosStore } from '../../data/pisos.store';
import { Piso } from '../../models/piso.model';
import { PisoCard } from '../piso-card/piso-card';

/**
 * Vista de favoritos: solo pisos en estado "Favorito", ordenados por
 * puntuación (mayor a menor) con ranking numerado y puntos visibles.
 * La ordenación y la puntuación las provee el `computed` del store.
 */
@Component({
  selector: 'app-favoritos-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PisoCard],
  template: `
    @if (favoritos().length === 0) {
      <div class="tarjeta px-4 py-12 text-center">
        <p class="text-4xl">⭐</p>
        <p class="mt-2 text-sm text-muted">
          Aún no has marcado ningún piso como Favorito.
        </p>
      </div>
    } @else {
      <div class="space-y-4">
        <p class="px-1 text-sm text-muted">
          Ordenados por puntuación automática (precio, m², habitaciones, estado y ascensor).
        </p>
        @for (fav of favoritos(); track fav.piso.id; let i = $index) {
          <app-piso-card
            [piso]="fav.piso"
            [ranking]="i + 1"
            [puntos]="fav.puntos"
            (editar)="editar.emit($event)"
            (borrar)="borrar.emit($event)"
          />
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
}
