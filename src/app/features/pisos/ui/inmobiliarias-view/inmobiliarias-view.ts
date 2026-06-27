import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { PisosStore } from '../../data/pisos.store';
import { TipoContactoEntidad } from '../../models/contacto.model';
import { Piso } from '../../models/piso.model';
import { ContactoCard } from '../contacto-card/contacto-card';

@Component({
  selector: 'app-inmobiliarias-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContactoCard],
  template: `
    <div class="space-y-3">
      <!-- Segmentado -->
      <div class="flex gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-border">
        @for (t of tipos; track t) {
          <button
            type="button"
            (click)="cambiarVista(t)"
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

      <!-- Alta -->
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
          aria-label="Añadir"
          class="btn-primario flex shrink-0 items-center justify-center px-4 py-2.5"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <!-- Lista -->
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
            <div class="space-y-1">
              <app-contacto-card [contacto]="c" />
              <!-- Solo inmobiliarias: chip de pisos asociados -->
              @if (esInmo()) {
                @let num = pisosDeInmo(c.nombre).length;
                <button
                  type="button"
                  (click)="alternarSeleccion(c.nombre)"
                  class="flex w-full items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition"
                  [class.bg-primary/10]="seleccionada() === c.nombre"
                  [class.text-primary]="seleccionada() === c.nombre"
                  [class.bg-surface-2]="seleccionada() !== c.nombre"
                  [class.text-muted]="seleccionada() !== c.nombre"
                >
                  🏠 {{ num }} piso{{ num !== 1 ? 's' : '' }} asociado{{ num !== 1 ? 's' : '' }}
                  @if (seleccionada() === c.nombre) { · ocultar } @else if (num > 0) { · ver }
                </button>
              }
            </div>
          }
        </div>

        <!-- Panel de pisos de la inmobiliaria seleccionada -->
        @if (seleccionada() && pisosSeleccionada().length > 0) {
          <div class="tarjeta overflow-hidden">
            <div class="border-b border-border px-4 py-3">
              <p class="text-sm font-semibold text-text">Pisos de {{ seleccionada() }}</p>
            </div>
            <div class="divide-y divide-border">
              @for (piso of pisosSeleccionada(); track piso.id) {
                <button
                  type="button"
                  (click)="editar.emit(piso)"
                  class="flex w-full items-center gap-3 px-4 py-3 text-left transition active:scale-[0.99]"
                >
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" [style.background-color]="colorEstado(piso.estado)"></span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold text-text">{{ piso.direccion }}</p>
                    <p class="text-xs text-muted">{{ piso.estado }} · {{ formatearPrecio(piso.precio) }}</p>
                  </div>
                  <span class="text-xs text-muted">{{ piso.distrito }}</span>
                </button>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class InmobiliariasView {
  private readonly store = inject(PisosStore);

  readonly editar = output<Piso>();

  readonly inmobiliarias = this.store.inmobiliarias;
  readonly financieras = this.store.financieras;

  readonly tipos: readonly TipoContactoEntidad[] = ['Inmobiliaria', 'Financiera'];
  readonly vista = signal<TipoContactoEntidad>('Inmobiliaria');
  readonly nuevoNombre = signal('');
  readonly seleccionada = signal<string | null>(null);

  readonly esInmo = computed(() => this.vista() === 'Inmobiliaria');
  readonly contactos = computed(() => (this.esInmo() ? this.inmobiliarias() : this.financieras()));

  readonly pisosSeleccionada = computed(() => {
    const nombre = this.seleccionada();
    if (!nombre) return [];
    return this.store.pisos().filter((p) => p.inmobiliaria === nombre);
  });

  pisosDeInmo(nombre: string): Piso[] {
    return this.store.pisos().filter((p) => p.inmobiliaria === nombre);
  }

  colorEstado(estado: string): string {
    const cfg = [
      { valor: 'Interesado', color: '#3b82f6' },
      { valor: 'Contactado', color: '#f97316' },
      { valor: 'Agendado', color: '#22c55e' },
      { valor: 'Visitado', color: '#a855f7' },
      { valor: 'Favorito', color: '#d4af37' },
      { valor: 'Pendiente condiciones', color: '#14b8a6' },
    ].find((e) => e.valor === estado);
    return cfg?.color ?? '#6b7280';
  }

  cambiarVista(t: TipoContactoEntidad): void {
    this.vista.set(t);
    this.seleccionada.set(null);
  }

  alternarSeleccion(nombre: string): void {
    this.seleccionada.set(this.seleccionada() === nombre ? null : nombre);
  }

  agregar(): void {
    if (this.store.crearContacto(this.nuevoNombre(), this.vista())) {
      this.nuevoNombre.set('');
    }
  }

  formatearPrecio(precio: number): string {
    return precio > 0 ? precio.toLocaleString('es-ES') + ' €' : 'Sin precio';
  }

  valor(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }
}
