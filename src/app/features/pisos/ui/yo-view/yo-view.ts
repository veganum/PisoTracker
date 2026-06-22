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
import { colorEstado } from '../../models/estado-pipeline';
import { Piso } from '../../models/piso.model';
import { GuionView } from '../guion-view/guion-view';

type Segmento = 'citas' | 'guion';

interface CitaVista {
  piso: Piso;
  fecha: string;
  hora: string;
  pasada: boolean;
  color: string;
}

function formatearCita(piso: Piso): CitaVista {
  const d = new Date(piso.fechaCita!);
  const ahora = new Date();
  return {
    piso,
    fecha: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
    hora: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    pasada: d < ahora,
    color: colorEstado(piso.estado),
  };
}

/**
 * Vista "Yo": agenda de citas (pisos con `fechaCita`) + guion de preguntas.
 * Un segmentado superior alterna entre las dos secciones.
 */
@Component({
  selector: 'app-yo-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GuionView, Icono],
  template: `
    <!-- Segmentado -->
    <div class="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1">
      @for (s of segmentos; track s.id) {
        <button
          type="button"
          (click)="segmento.set(s.id)"
          class="flex-1 rounded-lg py-2 text-sm font-semibold transition"
          [class.bg-surface]="segmento() === s.id"
          [class.shadow-sm]="segmento() === s.id"
          [class.text-text]="segmento() === s.id"
          [class.text-muted]="segmento() !== s.id"
        >
          {{ s.etiqueta }}
        </button>
      }
    </div>

    @switch (segmento()) {
      @case ('citas') {
        @if (citas().length === 0) {
          <div class="tarjeta px-4 py-12 text-center">
            <p class="text-4xl">📅</p>
            <p class="mt-2 text-sm font-semibold text-text">Sin visitas agendadas</p>
            <p class="mt-1 text-xs text-muted">
              Pon un piso en estado «Agendado» para que aparezca aquí.
            </p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (c of citas(); track c.piso.id) {
              <div
                class="tarjeta overflow-hidden"
                [class.opacity-60]="c.pasada"
              >
                <!-- Franja de color del estado -->
                <div class="h-1 w-full" [style.background-color]="c.color"></div>

                <div class="p-4">
                  <!-- Fecha/hora -->
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <p
                      class="text-sm font-bold capitalize"
                      [class.text-text]="!c.pasada"
                      [class.text-muted]="c.pasada"
                    >
                      📅 {{ c.fecha }}
                    </p>
                    <span
                      class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                      [style.background-color]="c.color + '22'"
                      [style.color]="c.color"
                    >
                      {{ c.hora }}
                    </span>
                  </div>

                  <!-- Dirección + ubicación -->
                  <p class="font-semibold text-text">{{ c.piso.direccion }}</p>
                  <p class="mt-0.5 text-xs text-muted">
                    {{ c.piso.distrito }}{{ c.piso.barrio ? ' · ' + c.piso.barrio : '' }}
                  </p>

                  <!-- Contacto y notas de cita -->
                  @if (c.piso.contactoCita) {
                    <p class="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      👤 <span class="font-medium text-text">{{ c.piso.contactoCita }}</span>
                    </p>
                  }
                  @if (c.piso.notasCita) {
                    <p class="mt-1 rounded-xl bg-surface-2 px-3 py-2 text-xs text-text">
                      {{ c.piso.notasCita }}
                    </p>
                  }

                  <!-- Estado + precio -->
                  <div class="mt-2 flex items-center gap-2">
                    <span
                      class="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                      [style.background-color]="c.color"
                    >
                      {{ c.piso.estado }}
                    </span>
                    @if (c.piso.precio > 0) {
                      <span class="text-sm font-semibold text-text">
                        {{ c.piso.precio.toLocaleString('es-ES') }} €
                      </span>
                    }
                    @if (c.pasada) {
                      <span class="ml-auto text-xs text-muted italic">pasada</span>
                    }
                  </div>

                  <!-- Acciones -->
                  <div class="mt-3 flex gap-2">
                    <button
                      type="button"
                      (click)="editar.emit(c.piso)"
                      class="btn-suave flex flex-1 items-center justify-center gap-1.5 py-2 text-sm"
                    >
                      <app-icono nombre="pencil" [tam]="14" /> Editar
                    </button>
                    <button
                      type="button"
                      (click)="borrar.emit(c.piso)"
                      class="flex h-9 w-9 items-center justify-center rounded-xl text-danger ring-1 ring-danger/20 transition active:scale-90"
                      aria-label="Descartar piso"
                    >
                      <app-icono nombre="trash" [tam]="16" />
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }
      @case ('guion') {
        <app-guion-view />
      }
    }
  `,
})
export class YoView {
  private readonly store = inject(PisosStore);

  readonly editar = output<Piso>();
  readonly borrar = output<Piso>();

  readonly segmento = signal<Segmento>('citas');

  readonly segmentos: { id: Segmento; etiqueta: string }[] = [
    { id: 'citas', etiqueta: '📅 Citas' },
    { id: 'guion', etiqueta: '📝 Guion' },
  ];

  /** Pisos con fecha de cita, ordenados del más próximo al más lejano. */
  readonly citas = computed<CitaVista[]>(() =>
    this.store
      .pisos()
      .filter((p) => !!p.fechaCita)
      .sort((a, b) => (a.fechaCita ?? '').localeCompare(b.fechaCita ?? ''))
      .map((p) => formatearCita(p)),
  );
}
