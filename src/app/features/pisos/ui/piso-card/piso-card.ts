import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Icono } from '../../../../shared/icono/icono';
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
  imports: [DecimalPipe, DatePipe, Icono],
  template: `
    <article class="tarjeta overflow-hidden">
      <!-- Cabecera: barrio + estado bien visibles -->
      <header class="flex items-center justify-between gap-2 px-4 pt-3.5">
        <span class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ piso().distrito }}{{ piso().barrio ? ' · ' + piso().barrio : '' }}
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
          <p class="tabular text-2xl font-bold tracking-tight text-text">
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
          <span
            class="rounded-lg bg-surface-2 px-2.5 py-1 font-medium text-text ring-1 ring-border"
          >
            {{ piso().estadoPiso }}
          </span>
          <span
            class="rounded-lg bg-surface-2 px-2.5 py-1 font-medium text-text ring-1 ring-border"
          >
            {{
              piso().tipoContacto === 'Inmobiliaria'
                ? piso().inmobiliaria || 'Inmobiliaria'
                : 'Particular'
            }}
          </span>
          @if (piso().estado === 'Agendado' && piso().fechaCita) {
            <span
              class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium text-white"
              [style.background-color]="color()"
            >
              🗓️ {{ piso().fechaCita | date: 'dd/MM HH:mm' }}
            </span>
          }
        </div>

        <!-- Avisos de riesgo / coste -->
        @if (
          piso().ocupado ||
          piso().nudaPropiedad ||
          piso().derramas.trim() ||
          piso().observacionesLegales.trim()
        ) {
          <div class="mt-2.5 flex flex-wrap gap-1.5 text-xs">
            @if (piso().ocupado) {
              <span class="rounded-lg bg-danger/10 px-2 py-0.5 font-semibold text-danger"
                >⚠️ Ocupado</span
              >
            }
            @if (piso().nudaPropiedad) {
              <span class="rounded-lg bg-danger/10 px-2 py-0.5 font-semibold text-danger"
                >⚠️ Nuda propiedad</span
              >
            }
            @if (piso().derramas.trim()) {
              <span class="rounded-lg bg-danger/10 px-2 py-0.5 font-semibold text-danger"
                >💸 Derrama</span
              >
            }
            @if (piso().observacionesLegales.trim()) {
              <span class="rounded-lg bg-danger/10 px-2 py-0.5 font-semibold text-danger"
                >⚖️ Legal</span
              >
            }
          </div>
        }

        <!-- Notas -->
        @if (piso().notas.trim()) {
          <p class="mt-2.5 line-clamp-2 text-sm text-muted">{{ piso().notas }}</p>
        }

        <!-- Acciones: todos los botones a la misma altura (py-2.5) -->
        <div class="mt-3.5 flex items-center gap-2">
          @if (piso().url.trim()) {
            <a
              [href]="piso().url"
              target="_blank"
              rel="noopener"
              aria-label="Ver anuncio"
              title="Ver anuncio"
              class="flex h-11 flex-1 items-center justify-center rounded-2xl bg-surface-2 text-muted ring-1 ring-border/60 transition active:scale-[0.96]"
            >
              <app-icono nombre="link" [tam]="18" />
            </a>
          }
          <!-- Análisis de coste (solo si hay precio) -->
          @if (piso().precio > 0) {
            <button
              type="button"
              (click)="mostrarAnalisis.set(true)"
              aria-label="Análisis de coste"
              title="Análisis de coste"
              class="flex h-11 flex-1 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 transition active:scale-[0.96]"
            >
              <span class="text-sm font-bold leading-none">€</span>
            </button>
          }
          <!-- Comparativa: violeta (solo en favoritos) -->
          @if (estaEnComparativa() !== null) {
            <button
              type="button"
              (click)="comparativa.emit()"
              [attr.aria-label]="estaEnComparativa() ? 'Quitar de comparativa' : 'Añadir a comparativa'"
              [attr.title]="estaEnComparativa() ? 'Quitar de comparativa' : 'Añadir a comparativa'"
              class="flex h-11 flex-1 items-center justify-center rounded-2xl ring-1 transition active:scale-[0.96]"
              [class.bg-violet-500/25]="estaEnComparativa()"
              [class.text-violet-500]="estaEnComparativa()"
              [class.ring-violet-500/40]="estaEnComparativa()"
              [class.bg-violet-500/10]="!estaEnComparativa()"
              [class.text-violet-400]="!estaEnComparativa()"
              [class.ring-violet-500/20]="!estaEnComparativa()"
            >
              <span class="text-base leading-none">📊</span>
            </button>
          }
          <!-- Editar: amarillo -->
          <button
            type="button"
            (click)="editar.emit(piso())"
            aria-label="Editar piso"
            title="Editar"
            class="flex h-11 flex-1 items-center justify-center rounded-2xl bg-warning/15 text-warning ring-1 ring-warning/30 transition active:scale-[0.96]"
          >
            <app-icono nombre="pencil" [tam]="18" />
          </button>
          <!-- Eliminar: rojo -->
          <button
            type="button"
            (click)="borrar.emit(piso())"
            aria-label="Descartar piso"
            title="Descartar"
            class="flex h-11 flex-1 items-center justify-center rounded-2xl bg-danger/10 text-danger ring-1 ring-danger/25 transition active:scale-[0.96]"
          >
            <app-icono nombre="trash" [tam]="18" />
          </button>
        </div>
      </div>
    </article>

    <!-- ── Sheet de análisis de coste ── -->
    @if (mostrarAnalisis()) {
      <div
        class="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 backdrop-blur-sm lg:items-center"
        (click)="mostrarAnalisis.set(false)"
      >
        <div
          class="w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 pb-10 lg:max-h-[90vh] lg:rounded-3xl lg:pb-6"
          (click)="$event.stopPropagation()"
        >
          <!-- Cabecera -->
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">Análisis de coste</p>
              <p class="mt-0.5 text-base font-bold text-text">{{ piso().direccion }}</p>
              <p class="text-2xl font-bold text-text">{{ piso().precio | number:'1.0-0' }} €</p>
            </div>
            <button type="button" (click)="mostrarAnalisis.set(false)"
              class="shrink-0 rounded-full bg-surface-2 p-2 text-muted">
              <app-icono nombre="x" [tam]="16" />
            </button>
          </div>

          <!-- Coste total -->
          <div class="mb-4 rounded-2xl bg-surface-2 p-4">
            <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Coste de compra (2ª mano)</p>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">Precio</span>
                <span class="font-medium text-text">{{ piso().precio | number:'1.0-0' }} €</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">ITP (6%)</span>
                <span class="font-medium text-text">{{ costes().itp | number:'1.0-0' }} €</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Notaría (~0,3%)</span>
                <span class="font-medium text-text">{{ costes().notaria | number:'1.0-0' }} €</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Registro (~0,2%)</span>
                <span class="font-medium text-text">{{ costes().registro | number:'1.0-0' }} €</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Tasación</span>
                <span class="font-medium text-text">400 €</span>
              </div>
              <div class="flex justify-between border-t border-border pt-2">
                <span class="font-bold text-text">Total para entrar</span>
                <span class="font-bold text-primary">{{ costes().total | number:'1.0-0' }} €</span>
              </div>
            </div>
          </div>

          <!-- Hipoteca -->
          <div class="rounded-2xl bg-surface-2 p-4">
            <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Hipoteca estimada</p>

            <!-- Parámetros ajustables -->
            <div class="mb-4 grid grid-cols-3 gap-2">
              <label class="block">
                <span class="etiqueta text-[10px]">Entrada %</span>
                <input type="number" inputmode="numeric" min="5" max="50"
                  [value]="entradaPct()"
                  (input)="entradaPct.set(numInput($event))"
                  class="campo py-2 text-center text-sm font-semibold" />
              </label>
              <label class="block">
                <span class="etiqueta text-[10px]">Tipo %</span>
                <input type="number" inputmode="decimal" step="0.1" min="0"
                  [value]="tipoInteres()"
                  (input)="tipoInteres.set(numInput($event))"
                  class="campo py-2 text-center text-sm font-semibold" />
              </label>
              <label class="block">
                <span class="etiqueta text-[10px]">Plazo (años)</span>
                <input type="number" inputmode="numeric" min="5" max="40"
                  [value]="plazo()"
                  (input)="plazo.set(numInput($event))"
                  class="campo py-2 text-center text-sm font-semibold" />
              </label>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">Entrada ({{ entradaPct() }}%)</span>
                <span class="font-medium text-text">{{ hipoteca().entrada | number:'1.0-0' }} €</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Capital a financiar</span>
                <span class="font-medium text-text">{{ hipoteca().capital | number:'1.0-0' }} €</span>
              </div>
              <div class="flex justify-between border-t border-border pt-2">
                <span class="font-bold text-text">Cuota mensual</span>
                <span class="font-bold text-primary text-base">{{ hipoteca().cuota | number:'1.0-0' }} €/mes</span>
              </div>
            </div>
          </div>

          <p class="mt-3 text-center text-xs text-muted">
            Estimación orientativa. No es una tasación oficial.
          </p>
        </div>
      </div>
    }
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
  /** null = no mostrar botón; true/false = mostrar activo/inactivo */
  readonly estaEnComparativa = input<boolean | null>(null);
  readonly comparativa = output<void>();

  readonly color = computed(() => colorEstado(this.piso().estado));

  // ── Análisis de coste ──────────────────────────────────────────
  readonly mostrarAnalisis = signal(false);
  readonly entradaPct = signal(20);
  readonly tipoInteres = signal(3.5);
  readonly plazo = signal(30);

  readonly costes = computed(() => {
    const p = this.piso().precio;
    const itp = p * 0.06;
    const notaria = Math.round(Math.min(Math.max(p * 0.003, 300), 2500));
    const registro = Math.round(Math.min(Math.max(p * 0.002, 150), 1200));
    const tasacion = 400;
    const gastos = itp + notaria + registro + tasacion;
    return { itp, notaria, registro, tasacion, total: p + gastos };
  });

  readonly hipoteca = computed(() => {
    const p = this.piso().precio;
    const entrada = Math.round(p * this.entradaPct() / 100);
    const capital = p - entrada;
    const r = this.tipoInteres() / 100 / 12;
    const n = this.plazo() * 12;
    const cuota = r > 0 ? capital * r / (1 - Math.pow(1 + r, -n)) : capital / n;
    return { entrada, capital, cuota: Math.round(cuota) };
  });

  numInput(ev: Event): number {
    const n = Number((ev.target as HTMLInputElement).value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
}
