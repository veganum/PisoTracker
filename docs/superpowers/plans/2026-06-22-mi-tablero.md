# Mi tablero — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir la vista "Mi tablero" como tercer segmento en YoView: acordeón vertical en móvil y columnas en desktop, agrupando pisos por sus 4 estados cronológicos.

**Architecture:** Componente nuevo `KanbanView` standalone/OnPush que inyecta `PisosStore` y emite `editar`. `YoView` lo importa y añade el segmento `'tablero'`. La responsividad (acordeón ↔ columnas) se resuelve en CSS puro (`hidden lg:block`) sin JS de detección de pantalla.

**Tech Stack:** Angular 22 standalone, signals, Tailwind v4, `ESTADOS_FLUJO` y `colorEstado` del modelo existente.

---

## Archivos

| Acción | Ruta |
|---|---|
| **Crear** | `src/app/features/pisos/ui/kanban-view/kanban-view.ts` |
| **Modificar** | `src/app/features/pisos/ui/yo-view/yo-view.ts` |

---

### Tarea 1: Crear `KanbanView`

**Archivos:**
- Crear: `src/app/features/pisos/ui/kanban-view/kanban-view.ts`

- [ ] **Paso 1: Crear el componente con código completo**

Crea el archivo `src/app/features/pisos/ui/kanban-view/kanban-view.ts` con este contenido:

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { PisosStore } from '../../data/pisos.store';
import {
  ESTADOS_FLUJO,
  EstadoPipeline,
} from '../../models/estado-pipeline';
import { Piso } from '../../models/piso.model';

interface ColumnaTablero {
  estado: EstadoPipeline;
  color: string;
  pisos: Piso[];
}

@Component({
  selector: 'app-kanban-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPisosFlujo() === 0) {
      <div class="tarjeta px-4 py-12 text-center">
        <p class="text-4xl">🏠</p>
        <p class="mt-2 text-sm font-semibold text-text">Sin pisos en el tablero</p>
        <p class="mt-1 text-xs text-muted">
          Añade un piso desde el Mapa o la Lista para verlo aquí.
        </p>
      </div>
    } @else {
      <div class="space-y-2 lg:grid lg:grid-cols-4 lg:gap-4 lg:space-y-0">
        @for (col of columnas(); track col.estado) {
          <div class="overflow-hidden rounded-2xl bg-surface-2 lg:flex lg:flex-col">

            <!-- Cabecera del estado / columna -->
            <button
              type="button"
              (click)="alternarExpandido(col.estado)"
              class="flex w-full items-center gap-2.5 px-3 py-3 transition lg:cursor-default"
              [class.opacity-40]="col.pisos.length === 0"
            >
              <span
                class="h-3 w-3 shrink-0 rounded-full"
                [style.background-color]="col.color"
              ></span>
              <span class="flex-1 text-left text-sm font-semibold text-text">
                {{ col.estado }}
              </span>
              <span class="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                {{ col.pisos.length }}
              </span>
              <!-- Chevron solo en móvil -->
              <svg
                viewBox="0 0 24 24"
                class="h-4 w-4 shrink-0 text-muted transition-transform lg:hidden"
                [class.rotate-180]="expandidos().has(col.estado)"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <!-- Cards: ocultas en móvil si no está expandido; siempre visibles en desktop -->
            <div
              class="lg:block lg:flex-1 lg:overflow-y-auto"
              [class.hidden]="!expandidos().has(col.estado)"
              style="max-height: calc(100vh - 220px)"
            >
              <div class="space-y-1.5 px-2 pb-2">
                @if (col.pisos.length === 0) {
                  <p class="py-6 text-center text-xs text-muted">Sin pisos aquí</p>
                }
                @for (piso of col.pisos; track piso.id) {
                  <button
                    type="button"
                    (click)="editar.emit(piso)"
                    class="tarjeta w-full border-l-[3px] px-3 py-2.5 text-left transition active:scale-[0.98]"
                    [style.border-left-color]="col.color"
                  >
                    <p class="truncate text-sm font-semibold text-text">
                      {{ piso.direccion }}
                    </p>
                    <p class="mt-0.5 truncate text-xs text-muted">
                      {{ formatearPrecio(piso.precio) }} · {{ nombreContacto(piso) }}
                    </p>
                  </button>
                }
              </div>
            </div>

          </div>
        }
      </div>
    }
  `,
})
export class KanbanView {
  private readonly store = inject(PisosStore);

  readonly editar = output<Piso>();

  /** Columnas en orden fijo del flujo lineal. */
  readonly columnas = computed<ColumnaTablero[]>(() => {
    const pisos = this.store.pisos();
    return ESTADOS_FLUJO.map((cfg) => ({
      estado: cfg.valor,
      color: cfg.color,
      pisos: pisos.filter((p) => p.estado === cfg.valor),
    }));
  });

  /** Cuántos pisos hay en total en los estados del flujo. */
  readonly totalPisosFlujo = computed(() =>
    this.columnas().reduce((sum, col) => sum + col.pisos.length, 0),
  );

  /**
   * Estados expandidos. Se inicializa con los que ya tienen pisos;
   * los vacíos arrancan colapsados. El store ya está cargado cuando
   * el usuario llega a esta pestaña (el shell lo garantiza con cargado()).
   */
  readonly expandidos = signal<Set<EstadoPipeline>>(
    new Set(
      ESTADOS_FLUJO.filter((cfg) =>
        // Lectura síncrona del signal — segura porque el store ya está cargado
        inject(PisosStore)
          .pisos()
          .some((p) => p.estado === cfg.valor),
      ).map((cfg) => cfg.valor),
    ),
  );

  alternarExpandido(estado: EstadoPipeline): void {
    const actual = new Set(this.expandidos());
    if (actual.has(estado)) {
      actual.delete(estado);
    } else {
      actual.add(estado);
    }
    this.expandidos.set(actual);
  }

  formatearPrecio(precio: number): string {
    return precio > 0 ? precio.toLocaleString('es-ES') + ' €' : 'Sin precio';
  }

  nombreContacto(piso: Piso): string {
    return piso.tipoContacto === 'Inmobiliaria' && piso.inmobiliaria
      ? piso.inmobiliaria
      : 'Particular';
  }
}
```

- [ ] **Paso 2: Comprobar que compila sin errores**

```bash
node ./node_modules/@angular/cli/bin/ng.js build --configuration development
```

Esperado: build sin errores de TypeScript. Si falla por tipos, revisar que `EstadoPipeline` se importa de `estado-pipeline.ts` y `ESTADOS_FLUJO` también.

---

### Tarea 2: Integrar `KanbanView` en `YoView`

**Archivos:**
- Modificar: `src/app/features/pisos/ui/yo-view/yo-view.ts`

- [ ] **Paso 1: Actualizar imports y tipo `Segmento`**

En `yo-view.ts`, cambia la línea:
```typescript
type Segmento = 'citas' | 'guion';
```
por:
```typescript
type Segmento = 'citas' | 'tablero' | 'guion';
```

Añade `KanbanView` a los imports de Angular en la parte de arriba del archivo (junto a `GuionView` e `Icono`):
```typescript
import { KanbanView } from '../kanban-view/kanban-view';
```

En el decorador `@Component`, añade `KanbanView` al array `imports`:
```typescript
imports: [GuionView, Icono, KanbanView],
```

- [ ] **Paso 2: Actualizar el array de segmentos**

Localiza el array `segmentos` al final de la clase:
```typescript
readonly segmentos: { id: Segmento; etiqueta: string }[] = [
  { id: 'citas', etiqueta: '📅 Citas' },
  { id: 'guion', etiqueta: '📝 Guion' },
];
```

Sustitúyelo por:
```typescript
readonly segmentos: { id: Segmento; etiqueta: string }[] = [
  { id: 'citas', etiqueta: '📅 Citas' },
  { id: 'tablero', etiqueta: '📊 Mi tablero' },
  { id: 'guion', etiqueta: '📝 Guion' },
];
```

- [ ] **Paso 3: Añadir el `@case` del tablero en la plantilla**

En la plantilla, localiza el bloque `@switch (segmento())`. Añade el nuevo caso entre `'citas'` y `'guion'`:

```html
@case ('tablero') {
  <app-kanban-view (editar)="editar.emit($event)" />
}
```

El `@switch` completo debe quedar así:

```html
@switch (segmento()) {
  @case ('citas') {
    @if (citas().length === 0) {
      <!-- ... bloque vacío existente sin cambios ... -->
    } @else {
      <!-- ... lista de citas existente sin cambios ... -->
    }
  }
  @case ('tablero') {
    <app-kanban-view (editar)="editar.emit($event)" />
  }
  @case ('guion') {
    <app-guion-view />
  }
}
```

- [ ] **Paso 4: Verificar build final**

```bash
node ./node_modules/@angular/cli/bin/ng.js build --configuration development
```

Esperado: build limpio sin errores ni warnings de templates.

- [ ] **Paso 5: Probar manualmente en el navegador**

```bash
npm start
```

Verificar en `http://localhost:4200`:

1. La pestaña "Yo" muestra ahora 3 botones en el segmentado: `📅 Citas · 📊 Mi tablero · 📝 Guion`.
2. Al pulsar "Mi tablero" aparecen las 4 secciones de estados.
3. Los estados con pisos arrancan expandidos; los vacíos, colapsados.
4. Tocar una cabecera expande/colapsa su sección (solo en móvil; en desktop siempre visible).
5. Tocar una card abre el formulario de edición del piso.
6. En desktop (redimensionar ventana a `lg:`) las 4 secciones se convierten en columnas horizontales.

- [ ] **Paso 6: Commit**

```bash
git add src/app/features/pisos/ui/kanban-view/kanban-view.ts src/app/features/pisos/ui/yo-view/yo-view.ts
git commit -m "feat: añadir vista Mi tablero (acordeón móvil / columnas desktop)"
```

---

## Auto-revisión del plan

- **Cobertura del spec:** ✅ Acordeón móvil, columnas desktop, 4 estados flujo, card con dirección/precio/contacto, tap = editar, estados vacíos colapsados, estado global vacío, estados laterales excluidos.
- **Placeholders:** ninguno — todo el código es completo y ejecutable.
- **Consistencia de tipos:** `ColumnaTablero.estado: EstadoPipeline`, `expandidos: Signal<Set<EstadoPipeline>>`, `alternarExpandido(estado: EstadoPipeline)` — consistente en todas las referencias.
- **Nota sobre `inject()` en inicializador de campo:** Angular 22 permite `inject()` en inicializadores de campos de clase (fuera del constructor) porque se ejecutan en el contexto de inyección. Es el patrón estándar del proyecto.
