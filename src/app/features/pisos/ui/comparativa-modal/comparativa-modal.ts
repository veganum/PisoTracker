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

  const pm2s = pisos.map((p) => (p.precio > 0 && p.metros > 0 ? Math.round(p.precio / p.metros) : 0));
  const coloresPm2 = colorearNumericos(pm2s, true);
  fila('€/m²', pisos.map((p, i) => ({
    texto: pm2s[i] > 0 ? pm2s[i].toLocaleString('es-ES') + ' €' : '—',
    color: coloresPm2[i],
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
    const planta = p.planta === 0 ? 'Baja' : p.planta < 0 ? 'Sótano' : `${p.planta}ª`;
    return `${planta} · ${p.ascensor ? 'con ascensor' : 'sin ascensor'}`;
  })));

  const ordenReforma: Record<string, number> = {
    'Listo para entrar': 3,
    'Reforma parcial': 2,
    'Reforma total': 1,
  };
  const coloresReforma = colorearNumericos(pisos.map((p) => ordenReforma[p.estadoPiso] ?? 2), false);
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
    <div class="fixed inset-0 z-[2000] flex flex-col bg-surface">

      <header class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 class="text-base font-bold text-text">📊 Comparativa</h2>
        <button
          type="button"
          (click)="cerrar.emit()"
          class="flex h-8 w-8 items-center justify-center rounded-xl text-muted transition active:scale-90"
          aria-label="Cerrar comparativa"
        >
          <app-icono nombre="x" [tam]="18" />
        </button>
      </header>

      <div class="flex-1 overflow-auto">
        <table class="w-full border-collapse text-sm">
          <thead class="sticky top-0 z-10 bg-surface-2">
            <tr>
              <th class="w-28 border-b border-border px-3 py-2.5 text-left text-xs font-semibold text-muted">
                Campo
              </th>
              @for (piso of pisos(); track piso.id) {
                <th class="border-b border-border px-3 py-2.5 text-left text-xs font-semibold text-text">
                  {{ piso.direccion }}
                </th>
              }
            </tr>
          </thead>

          <tbody>
            @for (fila of filas(); track fila.etiqueta; let par = $even) {
              <tr [class.bg-surface-2]="par">
                <td class="border-b border-border/50 px-3 py-2.5 text-xs font-medium text-muted">
                  {{ fila.etiqueta }}
                </td>
                @for (val of fila.valores; track $index) {
                  <td
                    class="border-b border-border/50 px-3 py-2.5 text-sm font-semibold"
                    [class.bg-success/10]="val.color === 'verde'"
                    [class.text-success]="val.color === 'verde'"
                    [class.bg-danger/10]="val.color === 'rojo'"
                    [class.text-danger]="val.color === 'rojo'"
                    [class.text-text]="val.color === 'neutro'"
                  >
                    {{ val.texto }}
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ComparativaModal {
  readonly pisos = input.required<Piso[]>();
  readonly puntos = input.required<number[]>();
  readonly cerrar = output<void>();

  readonly filas = computed(() => construirFilas(this.pisos(), this.puntos()));
}
