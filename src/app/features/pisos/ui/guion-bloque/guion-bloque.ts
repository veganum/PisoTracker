import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { GuionStore } from '../../data/guion.store';
import { BloqueGuion } from '../../models/guion.model';

/**
 * Un bloque del guion: cabecera colapsable con progreso y lista de preguntas
 * con casilla, edición en línea, borrado y alta de nuevas preguntas.
 * Inyecta el `GuionStore` y opera directamente sobre él.
 */
@Component({
  selector: 'app-guion-bloque',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article class="tarjeta overflow-hidden">
      <!-- Cabecera colapsable -->
      <button
        type="button"
        (click)="expandido.set(!expandido())"
        class="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-lg">
          {{ bloque().icono }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-bold text-text">{{ bloque().titulo }}</span>
          <span class="text-xs text-muted">{{ hechas() }}/{{ total() }} preguntas</span>
        </span>
        <span class="text-muted transition" [class.rotate-180]="expandido()">▾</span>
      </button>

      @if (expandido()) {
        <div class="space-y-1 px-2 pb-2">
          @for (pregunta of bloque().preguntas; track pregunta.id) {
            <div class="rounded-2xl px-2 py-1.5 transition hover:bg-surface-2">
              @if (editandoId() === pregunta.id) {
                <!-- Edición en línea -->
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    [value]="textoEdicion()"
                    (input)="textoEdicion.set(valor($event))"
                    (keydown.enter)="guardarEdicion()"
                    (keydown.escape)="editandoId.set(null)"
                    class="campo py-2 text-sm"
                  />
                  <button
                    type="button"
                    (click)="guardarEdicion()"
                    class="shrink-0 rounded-xl bg-primary-btn px-3 py-2 text-sm font-semibold text-on-primary"
                  >
                    OK
                  </button>
                </div>
              } @else {
                <div class="flex items-start gap-2.5">
                  <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      [checked]="pregunta.hecha"
                      (change)="store.alternar(pregunta.id)"
                      class="mt-0.5 h-5 w-5 shrink-0 accent-primary-btn"
                    />
                    <span
                      class="text-sm text-text"
                      [class.line-through]="pregunta.hecha"
                      [class.text-muted]="pregunta.hecha"
                    >
                      {{ pregunta.texto }}
                    </span>
                  </label>
                  <button
                    type="button"
                    (click)="empezarEdicion(pregunta.id, pregunta.texto)"
                    aria-label="Editar pregunta"
                    class="shrink-0 rounded-lg px-1.5 py-1 text-sm text-muted active:scale-90"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    (click)="store.borrarPregunta(pregunta.id)"
                    aria-label="Borrar pregunta"
                    class="shrink-0 rounded-lg px-1.5 py-1 text-sm text-muted active:scale-90"
                  >
                    🗑️
                  </button>
                </div>
              }
            </div>
          }

          <!-- Alta de nueva pregunta -->
          <div class="flex items-center gap-2 px-2 pt-1.5">
            <input
              type="text"
              [value]="nuevaPregunta()"
              (input)="nuevaPregunta.set(valor($event))"
              (keydown.enter)="agregar()"
              placeholder="Añadir pregunta…"
              class="campo py-2 text-sm"
            />
            <button
              type="button"
              (click)="agregar()"
              [disabled]="!nuevaPregunta().trim()"
              class="shrink-0 rounded-xl bg-primary-btn px-3.5 py-2 text-lg font-semibold text-on-primary disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      }
    </article>
  `,
})
export class GuionBloque {
  protected readonly store = inject(GuionStore);

  /** Bloque a renderizar. */
  readonly bloque = input.required<BloqueGuion>();

  // Estado local de la UI
  readonly expandido = signal(true);
  readonly nuevaPregunta = signal('');
  readonly editandoId = signal<string | null>(null);
  readonly textoEdicion = signal('');

  readonly total = computed(() => this.bloque().preguntas.length);
  readonly hechas = computed(() => this.bloque().preguntas.filter((p) => p.hecha).length);

  empezarEdicion(id: string, texto: string): void {
    this.editandoId.set(id);
    this.textoEdicion.set(texto);
  }

  guardarEdicion(): void {
    const id = this.editandoId();
    if (id) {
      this.store.editarPregunta(id, this.textoEdicion());
    }
    this.editandoId.set(null);
  }

  agregar(): void {
    this.store.añadirPregunta(this.bloque().id, this.nuevaPregunta());
    this.nuevaPregunta.set('');
  }

  valor(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }
}
