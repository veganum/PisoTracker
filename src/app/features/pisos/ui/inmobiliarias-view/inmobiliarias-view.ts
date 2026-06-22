import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PisosStore } from '../../data/pisos.store';
import { TipoContactoEntidad } from '../../models/contacto.model';
import { ContactoCard } from '../contacto-card/contacto-card';

/**
 * Vista de contactos. Un segmentado superior **filtra** entre inmobiliarias y
 * financieras (se muestra solo una lista, menos scroll) y, a la vez, fija el
 * **tipo** del contacto que se cree con "Añadir".
 */
@Component({
  selector: 'app-inmobiliarias-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContactoCard],
  template: `
    <div class="space-y-3">
      <!-- Segmentado: filtra la lista y fija el tipo de alta -->
      <div class="flex gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-border">
        @for (t of tipos; track t) {
          <button
            type="button"
            (click)="vista.set(t)"
            class="flex-1 rounded-xl py-2 text-sm font-semibold transition"
            [class.bg-surface]="vista() === t"
            [class.text-text]="vista() === t"
            [class.shadow-sm]="vista() === t"
            [class.text-muted]="vista() !== t"
          >
            {{ t === 'Inmobiliaria' ? '🏢 Inmobiliarias' : '🏦 Financieras' }}
            ({{ t === 'Inmobiliaria' ? inmobiliarias().length : financieras().length }})
          </button>
        }
      </div>

      <!-- Alta del tipo seleccionado -->
      <div class="tarjeta flex items-center gap-2 p-3">
        <input
          type="text"
          [value]="nuevoNombre()"
          (input)="nuevoNombre.set(valor($event))"
          (keydown.enter)="agregar()"
          [placeholder]="esInmo() ? 'Nueva inmobiliaria…' : 'Nueva financiera/broker…'"
          class="campo py-2.5 text-sm"
        />
        <button
          type="button"
          (click)="agregar()"
          [disabled]="!nuevoNombre().trim()"
          class="btn-primario shrink-0 px-4 py-2.5 text-sm"
        >
          Añadir
        </button>
      </div>

      <!-- Lista de la vista seleccionada -->
      @if (contactos().length === 0) {
        <div class="tarjeta px-4 py-10 text-center">
          <p class="text-4xl">{{ esInmo() ? '🏢' : '🏦' }}</p>
          <p class="mt-2 text-sm text-muted">
            @if (esInmo()) {
              Aún no hay inmobiliarias. Añade una arriba o se detectan al crear pisos con contacto
              "Inmobiliaria".
            } @else {
              Aún no hay financieras. Añade una arriba (Kiron, tu banco, un broker…).
            }
          </p>
        </div>
      } @else {
        <div class="grid gap-4 pt-1 sm:grid-cols-2">
          @for (c of contactos(); track c.nombre) {
            <app-contacto-card [contacto]="c" />
          }
        </div>
      }
    </div>
  `,
})
export class InmobiliariasView {
  private readonly store = inject(PisosStore);

  readonly inmobiliarias = this.store.inmobiliarias;
  readonly financieras = this.store.financieras;

  readonly tipos: readonly TipoContactoEntidad[] = ['Inmobiliaria', 'Financiera'];
  /** Tipo mostrado/activo (filtra la lista y fija el tipo de alta). */
  readonly vista = signal<TipoContactoEntidad>('Inmobiliaria');
  readonly nuevoNombre = signal('');

  readonly esInmo = computed(() => this.vista() === 'Inmobiliaria');

  /** Contactos de la vista activa. */
  readonly contactos = computed(() => (this.esInmo() ? this.inmobiliarias() : this.financieras()));

  /** Crea el contacto escrito con el tipo de la vista activa. */
  agregar(): void {
    if (this.store.crearContacto(this.nuevoNombre(), this.vista())) {
      this.nuevoNombre.set('');
    }
  }

  valor(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }
}
