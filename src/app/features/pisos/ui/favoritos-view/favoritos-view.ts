import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { desglosePuntuacion } from '../../data/puntuacion.util';
import { PisosStore } from '../../data/pisos.store';
import { Piso } from '../../models/piso.model';
import { ComparativaModal } from '../comparativa-modal/comparativa-modal';
import { PisoCard } from '../piso-card/piso-card';

const MAX_SELECCION = 3;

@Component({
  selector: 'app-favoritos-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PisoCard, ComparativaModal],
  template: `
    @if (favoritos().length === 0) {
      <div class="tarjeta px-4 py-12 text-center">
        <p class="text-4xl">⭐</p>
        <p class="mt-2 text-sm text-muted">Aún no has marcado ningún piso como Favorito.</p>
      </div>
    } @else {
      <div class="space-y-4 pb-24">
        <p class="px-1 text-sm text-muted">
          Ordenados por puntuación según tu perfil de búsqueda (≤200k, ≥2 hab, plantas bajas,
          transporte, sin riesgos…).
          @if (favoritos().length >= 2) {
            <span class="ml-1 text-primary">Selecciona 2 o 3 para comparar.</span>
          }
        </p>

        @for (fav of favoritos(); track fav.piso.id; let i = $index) {
          <div class="space-y-1.5">
            <app-piso-card
              [piso]="fav.piso"
              [ranking]="i + 1"
              [puntos]="fav.puntos"
              [estaEnComparativa]="favoritos().length >= 2 ? estaSeleccionado(fav.piso.id) : null"
              (editar)="editar.emit($event)"
              (descartar)="descartar.emit($event)"
              (comparativa)="alternarSeleccion(fav.piso.id)"
            />

            <!-- Desglose de puntuación -->
            <div class="flex flex-wrap gap-1.5 px-1">
              @for (factor of desglose(fav.piso); track factor.etiqueta) {
                <span
                  class="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium ring-1 ring-border"
                  [class.text-success]="factor.puntos > 0"
                  [class.text-danger]="factor.puntos < 0"
                >
                  {{ factor.etiqueta }} {{ factor.puntos > 0 ? '+' : '' }}{{ factor.puntos }}
                </span>
              }
            </div>
          </div>
        }
      </div>

      <!-- Botón fijo "Comparar" -->
      @if (seleccionados().size >= 2) {
        <div class="fixed bottom-20 left-0 right-0 z-[1500] flex justify-center px-4 lg:bottom-6">
          <button
            type="button"
            (click)="mostrarComparativa.set(true)"
            class="btn-primario flex items-center gap-2 rounded-2xl px-6 py-3 shadow-xl"
          >
            📊 Comparar ({{ seleccionados().size }})
          </button>
        </div>
      }
    }

    <!-- Modal comparativa -->
    @if (mostrarComparativa()) {
      <app-comparativa-modal
        [pisos]="pisosSeleccionados()"
        [puntos]="puntosSeleccionados()"
        (cerrar)="mostrarComparativa.set(false)"
      />
    }
  `,
})
export class FavoritosView {
  private readonly store = inject(PisosStore);

  readonly editar = output<Piso>();
  readonly descartar = output<Piso>();

  readonly favoritos = this.store.favoritos;

  readonly seleccionados = signal<Set<string>>(new Set());
  readonly mostrarComparativa = signal(false);

  readonly pisosSeleccionados = computed<Piso[]>(() => {
    const ids = this.seleccionados();
    return this.store.favoritos()
      .filter((f) => ids.has(f.piso.id))
      .map((f) => f.piso);
  });

  readonly puntosSeleccionados = computed<number[]>(() => {
    const ids = this.seleccionados();
    return this.store.favoritos()
      .filter((f) => ids.has(f.piso.id))
      .map((f) => f.puntos);
  });

  alternarSeleccion(id: string): void {
    const set = new Set(this.seleccionados());
    if (set.has(id)) {
      set.delete(id);
    } else if (set.size < MAX_SELECCION) {
      set.add(id);
    }
    this.seleccionados.set(set);
  }

  estaSeleccionado(id: string): boolean {
    return this.seleccionados().has(id);
  }

  puedeSeleccionar(id: string): boolean {
    return this.seleccionados().has(id) || this.seleccionados().size < MAX_SELECCION;
  }

  desglose(piso: Piso) {
    return desglosePuntuacion(piso);
  }
}
