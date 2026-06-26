# Comparativa de Favoritos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir selección de 2-3 favoritos y tabla comparativa con colores verde/rojo por valor mejor/peor.

**Architecture:** Componente nuevo `ComparativaModal` (standalone, OnPush) que recibe los pisos seleccionados y sus puntuaciones como `input()`. `FavoritosView` gestiona el estado de selección localmente (signal, sin store) y muestra el modal cuando hay 2+ seleccionados.

**Tech Stack:** Angular 22 standalone, signals, Tailwind v4, `<app-icono>` existente.

---

## Archivos

| Acción | Ruta |
|---|---|
| **Crear** | `src/app/features/pisos/ui/comparativa-modal/comparativa-modal.ts` |
| **Modificar** | `src/app/features/pisos/ui/favoritos-view/favoritos-view.ts` |

---

### Tarea 1: Crear `ComparativaModal`

**Archivos:**
- Crear: `src/app/features/pisos/ui/comparativa-modal/comparativa-modal.ts`

- [ ] **Paso 1: Crear el componente completo**

```typescript
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

/** Colorea valores numéricos: si menorEsMejor, el menor es verde; si no, el mayor. */
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

  // Zona
  fila('Zona', neutros(pisos.map((p) => (p.barrio ? `${p.distrito} · ${p.barrio}` : p.distrito))));

  // Precio
  const coloresPrecios = colorearNumericos(pisos.map((p) => p.precio), true);
  fila('Precio', pisos.map((p, i) => ({
    texto: p.precio > 0 ? p.precio.toLocaleString('es-ES') + ' €' : '—',
    color: coloresPrecios[i],
  })));

  // €/m²
  const pm2s = pisos.map((p) => (p.precio > 0 && p.metros > 0 ? Math.round(p.precio / p.metros) : 0));
  const coloresPm2 = colorearNumericos(pm2s, true);
  fila('€/m²', pisos.map((p, i) => ({
    texto: pm2s[i] > 0 ? pm2s[i].toLocaleString('es-ES') + ' €' : '—',
    color: coloresPm2[i],
  })));

  // Metros
  const coloresMetros = colorearNumericos(pisos.map((p) => p.metros), false);
  fila('Metros', pisos.map((p, i) => ({
    texto: p.metros > 0 ? p.metros + ' m²' : '—',
    color: coloresMetros[i],
  })));

  // Habitaciones
  const coloresHabs = colorearNumericos(pisos.map((p) => p.habitaciones), false);
  fila('Habitaciones', pisos.map((p, i) => ({
    texto: p.habitaciones > 0 ? p.habitaciones + ' hab' : '—',
    color: coloresHabs[i],
  })));

  // Planta · Ascensor (textual)
  fila('Planta', neutros(pisos.map((p) => {
    const planta = p.planta === 0 ? 'Baja' : p.planta < 0 ? 'Sótano' : `${p.planta}ª`;
    return `${planta} · ${p.ascensor ? 'con ascensor' : 'sin ascensor'}`;
  })));

  // Estado reforma
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

  // Gastos comunidad
  const coloresComunidad = colorearNumericos(pisos.map((p) => p.gastosComunidad), true);
  fila('Comunidad', pisos.map((p, i) => ({
    texto: p.gastosComunidad > 0 ? p.gastosComunidad + ' €/mes' : '—',
    color: coloresComunidad[i],
  })));

  // Metro
  const coloresMetro = colorearNumericos(pisos.map((p) => p.minutosMetro), true);
  fila('Metro 🚇', pisos.map((p, i) => ({
    texto: p.minutosMetro > 0 ? p.minutosMetro + ' min' : '—',
    color: coloresMetro[i],
  })));

  // Bus
  const coloresBus = colorearNumericos(pisos.map((p) => p.minutosBus), true);
  fila('Bus 🚌', pisos.map((p, i) => ({
    texto: p.minutosBus > 0 ? p.minutosBus + ' min' : '—',
    color: coloresBus[i],
  })));

  // Puntuación
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
    <!-- Overlay a pantalla completa -->
    <div class="fixed inset-0 z-[2000] flex flex-col bg-surface">

      <!-- Cabecera -->
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

      <!-- Tabla con scroll horizontal y vertical -->
      <div class="flex-1 overflow-auto">
        <table class="w-full border-collapse text-sm">
          <!-- Cabecera: dirección de cada piso -->
          <thead class="sticky top-0 bg-surface-2 z-10">
            <tr>
              <th class="w-28 shrink-0 border-b border-border px-3 py-2.5 text-left text-xs font-semibold text-muted">
                Campo
              </th>
              @for (piso of pisos(); track piso.id) {
                <th class="border-b border-border px-3 py-2.5 text-left text-xs font-semibold text-text">
                  {{ piso.direccion }}
                </th>
              }
            </tr>
          </thead>

          <!-- Filas de comparación -->
          <tbody>
            @for (fila of filas(); track fila.etiqueta; let par = $even) {
              <tr [class.bg-surface-2]="par">
                <td class="border-b border-border/50 px-3 py-2.5 text-xs font-medium text-muted">
                  {{ fila.etiqueta }}
                </td>
                @for (val of fila.valores; track $index) {
                  <td
                    class="border-b border-border/50 px-3 py-2.5 text-sm font-semibold transition"
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
```

- [ ] **Paso 2: Verificar build sin errores**

```bash
node ./node_modules/@angular/cli/bin/ng.js build --configuration development
```

Esperado: build limpio. Si hay error de tipos, verificar que `Piso` se importa de `../../models/piso.model` y `Icono` de `../../../../shared/icono/icono`.

---

### Tarea 2: Actualizar `FavoritosView`

**Archivos:**
- Modificar: `src/app/features/pisos/ui/favoritos-view/favoritos-view.ts`

- [ ] **Paso 1: Reescribir el componente completo**

```typescript
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
            <!-- Envoltorio con botón de selección -->
            <div class="relative">
              <!-- Círculo de selección (esquina superior derecha) -->
              <button
                type="button"
                (click)="alternarSeleccion(fav.piso.id)"
                [disabled]="!puedeSeleccionar(fav.piso.id)"
                class="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition"
                [class.border-primary]="estaSeleccionado(fav.piso.id)"
                [class.bg-primary]="estaSeleccionado(fav.piso.id)"
                [class.border-border]="!estaSeleccionado(fav.piso.id)"
                [class.bg-surface]="!estaSeleccionado(fav.piso.id)"
                [class.opacity-30]="!puedeSeleccionar(fav.piso.id)"
                [attr.aria-label]="estaSeleccionado(fav.piso.id) ? 'Deseleccionar' : 'Seleccionar para comparar'"
              >
                @if (estaSeleccionado(fav.piso.id)) {
                  <svg viewBox="0 0 24 24" class="h-4 w-4 text-white" fill="none"
                    stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                }
              </button>

              <app-piso-card
                [piso]="fav.piso"
                [ranking]="i + 1"
                [puntos]="fav.puntos"
                (editar)="editar.emit($event)"
                (borrar)="borrar.emit($event)"
              />
            </div>

            <!-- Desglose de la puntuación -->
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

      <!-- Botón fijo "Comparar" cuando hay 2+ seleccionados -->
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

    <!-- Modal de comparativa -->
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
  readonly borrar = output<Piso>();

  readonly favoritos = this.store.favoritos;

  /** IDs de los favoritos seleccionados para comparar (máximo MAX_SELECCION). */
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
```

- [ ] **Paso 2: Build y verificación**

```bash
node ./node_modules/@angular/cli/bin/ng.js build --configuration development
```

Esperado: build limpio sin errores de tipos ni de plantilla.

- [ ] **Paso 3: Probar manualmente**

```bash
npm start
```

Verificar en `http://localhost:4200`:

1. Ir a la pestaña ⭐ Favoritos.
2. Aparece un círculo de selección en la esquina superior derecha de cada card.
3. Pulsar 2 cards → los círculos se marcan en azul con un check blanco.
4. Aparece el botón fijo `📊 Comparar (2)` sobre la barra inferior.
5. Una 3ª card puede seleccionarse; una 4ª queda desactivada (opacidad).
6. Pulsar `Comparar` → se abre el modal a pantalla completa.
7. La tabla muestra todas las filas con colores verde/rojo según valor mejor/peor.
8. Las celdas sin dato (`—`) no tienen color.
9. Pulsar `×` cierra el modal.
10. Deseleccionar hasta < 2 → el botón `Comparar` desaparece.

- [ ] **Paso 4: Commit**

```bash
git add src/app/features/pisos/ui/comparativa-modal/comparativa-modal.ts src/app/features/pisos/ui/favoritos-view/favoritos-view.ts
git commit -m "feat: comparativa de favoritos con tabla verde/rojo"
```

---

## Auto-revisión

- **Cobertura spec:** ✅ Selección con máximo 3, círculo visual, botón fijo, modal pantalla completa, todos los campos requeridos, colores verde/rojo, campos sin dato = `—` sin color.
- **Placeholders:** ninguno — código completo en cada paso.
- **Consistencia de tipos:** `ValorCelda`, `FilaComparativa`, `Color` definidos antes de usarse. `input.required<Piso[]>()` e `input.required<number[]>()` consistentes entre componente y llamada en template.
- **Nota botón fijo:** `bottom-20` en móvil (20 = 80px, por encima de la barra inferior de pestañas) y `lg:bottom-6` en desktop.
