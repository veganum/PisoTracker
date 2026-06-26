import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { Icono } from '../../../../shared/icono/icono';
import { Piso } from '../../models/piso.model';

type Color = 'verde' | 'rojo' | 'neutro';

interface ValorCelda {
  texto: string;
  color: Color;
}

interface FilaComparativa {
  etiqueta: string;
  valores: ValorCelda[];
}

function colorearNumericos(valores: number[], menorEsMejor: boolean): Color[] {
  const validos = valores.filter((v) => v > 0);
  if (validos.length < 2) return valores.map(() => 'neutro');
  const min = Math.min(...validos);
  const max = Math.max(...validos);
  if (min === max) return valores.map(() => 'neutro');
  return valores.map((v) => {
    if (v <= 0) return 'neutro';
    if (menorEsMejor) return v === min ? 'verde' : v === max ? 'rojo' : 'neutro';
    return v === max ? 'verde' : v === min ? 'rojo' : 'neutro';
  });
}

function construirFilas(pisos: Piso[], puntos: number[]): FilaComparativa[] {
  const filas: FilaComparativa[] = [];
  const fila = (etiqueta: string, valores: ValorCelda[]) => filas.push({ etiqueta, valores });
  const neutros = (textos: string[]): ValorCelda[] =>
    textos.map((t) => ({ texto: t, color: 'neutro' }));

  fila('Zona', neutros(pisos.map((p) => (p.barrio ? `${p.distrito} · ${p.barrio}` : p.distrito))));

  const coloresPrecios = colorearNumericos(pisos.map((p) => p.precio), true);
  fila('Precio', pisos.map((p, i) => ({
    texto: p.precio > 0 ? p.precio.toLocaleString('es-ES') + ' €' : '—',
    color: coloresPrecios[i],
  })));

  const pm2s = pisos.map((p) =>
    p.precio > 0 && p.metros > 0 ? Math.round(p.precio / p.metros) : 0,
  );
  fila('€/m²', pisos.map((_p, i) => ({
    texto: pm2s[i] > 0 ? pm2s[i].toLocaleString('es-ES') + ' €' : '—',
    color: colorearNumericos(pm2s, true)[i],
  })));

  const coloresMetros = colorearNumericos(pisos.map((p) => p.metros), false);
  fila('Metros', pisos.map((p, i) => ({
    texto: p.metros > 0 ? p.metros + ' m²' : '—',
    color: coloresMetros[i],
  })));

  const coloresHabs = colorearNumericos(pisos.map((p) => p.habitaciones), false);
  fila('Habitaciones', pisos.map((p, i) => ({
    texto: p.habitaciones > 0 ? p.habitaciones + ' hab' : '—',
    color: coloresHabs[i],
  })));

  fila('Planta', neutros(pisos.map((p) => {
    const pl = p.planta === 0 ? 'Baja' : p.planta < 0 ? 'Sótano' : `${p.planta}ª`;
    return `${pl} · ${p.ascensor ? '🛗' : '🚶'}`;
  })));

  const ordenReforma: Record<string, number> = {
    'Listo para entrar': 3,
    'Reforma parcial': 2,
    'Reforma total': 1,
  };
  const coloresReforma = colorearNumericos(
    pisos.map((p) => ordenReforma[p.estadoPiso] ?? 2),
    false,
  );
  fila('Reforma', pisos.map((p, i) => ({ texto: p.estadoPiso, color: coloresReforma[i] })));

  const coloresComunidad = colorearNumericos(pisos.map((p) => p.gastosComunidad), true);
  fila('Comunidad', pisos.map((p, i) => ({
    texto: p.gastosComunidad > 0 ? p.gastosComunidad + ' €/mes' : '—',
    color: coloresComunidad[i],
  })));

  const coloresMetro = colorearNumericos(pisos.map((p) => p.minutosMetro), true);
  fila('Metro 🚇', pisos.map((p, i) => ({
    texto: p.minutosMetro > 0 ? p.minutosMetro + ' min' : '—',
    color: coloresMetro[i],
  })));

  const coloresBus = colorearNumericos(pisos.map((p) => p.minutosBus), true);
  fila('Bus 🚌', pisos.map((p, i) => ({
    texto: p.minutosBus > 0 ? p.minutosBus + ' min' : '—',
    color: coloresBus[i],
  })));

  const coloresPuntos = colorearNumericos(puntos, false);
  fila('Puntuación ⭐', puntos.map((pts, i) => ({
    texto: pts + ' pts',
    color: coloresPuntos[i],
  })));

  return filas;
}

@Component({
  selector: 'app-comparativa-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icono],
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 backdrop-blur-sm lg:items-center"
      (click)="cerrar.emit()"
    >
      <!-- Sheet: sube desde abajo en móvil, centrado en desktop -->
      <div
        class="animar-sheet flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-surface lg:max-w-2xl lg:rounded-3xl"
        (click)="$event.stopPropagation()"
      >
        <!-- Handle + cabecera -->
        <div class="shrink-0 px-4 pb-4 pt-3">
          <!-- Handle (solo móvil) -->
          <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-border lg:hidden"></div>

          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-text">📊 Comparativa</h2>
            <button
              type="button"
              (click)="cerrar.emit()"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted transition active:scale-90"
              aria-label="Cerrar"
            >
              <app-icono nombre="x" [tam]="16" />
            </button>
          </div>

          <!-- Chips identificadores de cada piso -->
          <div class="mt-3 flex gap-2 overflow-x-auto pb-0.5">
            @for (piso of pisos(); track piso.id; let i = $index) {
              <div class="flex shrink-0 items-center gap-1.5 rounded-2xl bg-surface-2 px-3 py-1.5 ring-1 ring-border">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {{ letras[i] }}
                </span>
                <span class="max-w-[160px] truncate text-xs font-semibold text-text">
                  {{ piso.direccion }}
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Separador -->
        <div class="h-px shrink-0 bg-border"></div>

        <!-- Filas de comparación -->
        <div class="flex-1 overflow-y-auto px-3 py-3">
          @for (fila of filas(); track fila.etiqueta; let par = $even) {
            <div
              class="flex items-center gap-3 rounded-2xl px-3 py-3 transition"
              [class.bg-surface-2]="par"
            >
              <!-- Etiqueta -->
              <span class="w-24 shrink-0 text-xs font-medium text-muted leading-tight">
                {{ fila.etiqueta }}
              </span>

              <!-- Valores lado a lado -->
              <div class="flex flex-1 gap-2">
                @for (val of fila.valores; track $index) {
                  <div
                    class="flex flex-1 items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold text-center leading-tight"
                    [class.bg-success/10]="val.color === 'verde'"
                    [class.text-success]="val.color === 'verde'"
                    [class.bg-danger/10]="val.color === 'rojo'"
                    [class.text-danger]="val.color === 'rojo'"
                    [class.text-text]="val.color === 'neutro'"
                    [class.text-muted]="val.texto === '—'"
                  >
                    {{ val.texto }}
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Pie con botón cerrar (accesibilidad móvil) -->
        <div class="shrink-0 px-4 pb-8 pt-3 lg:pb-4">
          <button
            type="button"
            (click)="cerrar.emit()"
            class="btn-suave w-full text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ComparativaModal {
  readonly pisos = input.required<Piso[]>();
  readonly puntos = input.required<number[]>();
  readonly cerrar = output<void>();

  readonly letras = ['A', 'B', 'C'];
  readonly filas = computed(() => construirFilas(this.pisos(), this.puntos()));
}
