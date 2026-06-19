import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PisosStore } from '../../data/pisos.store';
import { CondicionesInmobiliaria } from '../../models/piso.model';

/**
 * Vista de inmobiliarias. Detecta automáticamente las agencias presentes en
 * los pisos y permite editar sus condiciones (honorarios, % comisión,
 * exclusiva, notas). Cada cambio se persiste vía el store (upsert).
 */
@Component({
  selector: 'app-inmobiliarias-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (agencias().length === 0) {
      <div class="tarjeta px-4 py-12 text-center">
        <p class="text-4xl">🏢</p>
        <p class="mt-2 text-sm text-muted">
          No hay inmobiliarias todavía. Se detectan solas al añadir pisos con
          contacto de tipo "Inmobiliaria".
        </p>
      </div>
    } @else {
      <div class="space-y-4">
        @for (agencia of agencias(); track agencia.nombre) {
          <article class="tarjeta space-y-3 p-4">
            <div class="flex items-center gap-2.5">
              <span
                class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-lg"
              >
                🏢
              </span>
              <h3 class="text-base font-bold text-text">{{ agencia.nombre }}</h3>
              @if (agencia.exclusiva) {
                <span class="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Exclusiva
                </span>
              }
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="etiqueta">Honorarios (€)</span>
                <input
                  type="number"
                  inputmode="numeric"
                  [value]="agencia.honorarios"
                  (input)="actualizar(agencia, { honorarios: num($event) })"
                  class="campo py-2.5"
                />
              </label>
              <label class="block">
                <span class="etiqueta">Comisión (%)</span>
                <input
                  type="number"
                  inputmode="decimal"
                  step="0.1"
                  [value]="agencia.comision"
                  (input)="actualizar(agencia, { comision: num($event) })"
                  class="campo py-2.5"
                />
              </label>
            </div>

            <label class="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <input
                type="checkbox"
                [checked]="agencia.exclusiva"
                (change)="actualizar(agencia, { exclusiva: marcado($event) })"
                class="h-5 w-5 accent-primary-btn"
              />
              <span class="text-base font-medium text-text">Trabajan en exclusiva</span>
            </label>

            <label class="block">
              <span class="etiqueta">Notas</span>
              <textarea
                rows="2"
                [value]="agencia.notas"
                (input)="actualizar(agencia, { notas: valor($event) })"
                placeholder="Trato, condiciones, contacto…"
                class="campo resize-none py-2.5"
              ></textarea>
            </label>
          </article>
        }
      </div>
    }
  `,
})
export class InmobiliariasView {
  private readonly store = inject(PisosStore);

  readonly agencias = this.store.agencias;

  /** Aplica un cambio parcial sobre una agencia y lo persiste (upsert). */
  actualizar(agencia: CondicionesInmobiliaria, cambios: Partial<CondicionesInmobiliaria>): void {
    this.store.guardarCondiciones({ ...agencia, ...cambios });
  }

  num(ev: Event): number {
    const n = Number((ev.target as HTMLInputElement).value);
    return Number.isFinite(n) ? n : 0;
  }
  marcado(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }
  valor(ev: Event): string {
    return (ev.target as HTMLInputElement | HTMLTextAreaElement).value;
  }
}
