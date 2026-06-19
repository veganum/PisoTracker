# CLAUDE.md — Contexto del proyecto PisoTracker

## Qué es

App **mobile-first** para seguir pisos en venta en Madrid durante la búsqueda de
vivienda: mapa con marcadores por estado, pipeline de gestión, favoritos
puntuados automáticamente, condiciones por inmobiliaria y un **guion** de
preguntas para los distintos momentos de la compra.

## Stack

- **Angular 22**, componentes **standalone**, proyecto **zoneless** (sin Zone.js;
  Angular 22 es zoneless por defecto, no se registra `provideZoneChangeDetection`).
- **Signals** para todo el estado reactivo.
- **Tailwind CSS v4** (vía `@tailwindcss/postcss`, configurado en `.postcssrc.json`;
  se importa con `@import 'tailwindcss'` en `src/styles.css`).
- **Leaflet** + `@types/leaflet`, tiles de OpenStreetMap (sin API key).
- **TypeScript estricto** (`strict` + `strictTemplates`).

## Convenciones (IMPORTANTES, respétalas)

- **Standalone siempre.** Nada de NgModules.
- **`ChangeDetectionStrategy.OnPush`** en todos los componentes.
- **Signals + APIs modernas:** `signal()`, `computed()`, `effect()`,
  `input()` / `output()` como funciones, `viewChild()`.
- **Control flow nativo** en plantillas: `@if`, `@for`, `@switch` (nunca
  `*ngIf` / `*ngFor`).
- **Plantillas inline** en los componentes (`template:` con Tailwind).
- **Todo el código y los comentarios en español.**
- Sin tests por ahora (se añadirán después).

## Arquitectura

Screaming Architecture por features + hexagonal **solo en persistencia**.

```text
src/app/
├── core/
│   ├── persistence/       → StoragePort (puerto), adaptadores, InjectionToken
│   └── theme/             → ThemeService (claro/oscuro)
└── features/pisos/
    ├── models/            → Piso, EstadoPipeline (+ colores), Guion, tipos
    ├── data/              → PisosStore, GuionStore, seeds, puntuación,
    │                        toast, geocoding
    ├── ui/<vista>/        → mapa, lista, favoritos, agencias, guion(+bloque),
    │                        form, card, diálogo
    └── pisos.page.ts      → shell con pestañas inferiores
```

## Persistencia INTERCAMBIABLE (clave)

El estado se persiste a través del **puerto** `STORAGE`
(`core/persistence/storage.token.ts`). Los stores inyectan el puerto, nunca
`localStorage` directamente.

- Adaptadores: `LocalStorageAdapter` (JSON + try/catch) y `MemoryStorageAdapter`.
- Cambiar de mecanismo = **una sola línea** en `src/app/app.config.ts`:

  ```typescript
  { provide: STORAGE, useClass: LocalStorageAdapter }   // ↔ MemoryStorageAdapter / RestApiAdapter
  ```

- Un futuro `RestApiAdapter` / `IndexedDbAdapter` solo implementa `StoragePort`
  y se registra ahí; ni los stores ni los componentes cambian.
- **Claves de almacenamiento:** `pisotracker.pisos`, `pisotracker.inmobiliarias`,
  `pisotracker.guion`, `pisotracker.tema`.

## Estado central

### `PisosStore` (`providedIn: 'root'`)

- `pisos = signal<Piso[]>(...)` inicializado desde el puerto (o el seed si está vacío).
- `condiciones = signal<CondicionesInmobiliaria[]>(...)` para las agencias.
- `effect()` que persiste automáticamente cada cambio vía el puerto.
- `computed()`: `rango`, `favoritos` (puntuados y ordenados),
  `nombresInmobiliarias`, `agencias`.
- Mutaciones: `añadir`, `actualizar`, `borrar`, `guardarCondiciones`.

### `GuionStore` (`providedIn: 'root'`)

- `bloques = signal<BloqueGuion[]>(...)` desde el puerto (o `GUION_SEED`).
- `effect()` de persistencia; `computed()` `progreso` (hechas/total).
- Mutaciones: `alternar`, `añadirPregunta`, `editarPregunta`, `borrarPregunta`,
  `reiniciar`.

### `ThemeService` (`providedIn: 'root'`)

- Tema **claro/oscuro** con preferencia `'auto' | 'claro' | 'oscuro'` (persistida).
- `'auto'` sigue a `prefers-color-scheme`; `alternar()` fuerza claro/oscuro.
- Un `effect()` aplica/quita la clase `.dark` en `<html>`, que activa los
  **design tokens** oscuros de `styles.css`.

## Reglas de negocio

- **Pipeline de estados** (con color de marcador): Interesado `#3b82f6`,
  Contactado `#f97316`, Agendado `#eab308`, Visitado `#a855f7`, Favorito `#d4af37`.
  Orden cronológico. "Descartar" = borrado definitivo con confirmación (NO es un
  estado del pipeline).
- **Puntuación** (`data/puntuacion.util.ts`, función pura): precio inverso 0–10,
  m² directo 0–10, habitaciones ×1.5, estado piso 3/2/1, ascensor +1. Se calcula
  sobre el `rango` (mín/máx de precio y m²) de TODOS los pisos.
- **Favoritos**: solo `estado === 'Favorito'`, ordenados por puntuación desc, con
  ranking numerado.
- **Agencias**: se **detectan automáticamente** de los pisos con
  `tipoContacto === 'Inmobiliaria'`. El `computed` `agencias` fusiona los nombres
  detectados con las condiciones guardadas (default si no existen).
- **Guion**: 3 bloques semilla (Visita al piso / Financiera-hipoteca /
  Inmobiliaria-propietario) con preguntas editables. Checklist **global** (las
  marcas no son por piso); botón "Reiniciar" desmarca todo.
- **Formulario** (`ui/piso-form`): signal-first (un signal por campo, validaciones
  con `computed`). Validaciones: dirección obligatoria; `fechaCita` obligatoria si
  `estado === 'Agendado'`; campo inmobiliaria visible si
  `tipoContacto === 'Inmobiliaria'`.
- **Geocodificación inversa** (`data/geocoding.service.ts`): al pinchar el mapa en
  un **alta nueva**, llama a **Nominatim (OSM)** vía `fetch` y autocompleta
  Dirección y Barrio (best-effort; no pisa lo que el usuario ya haya escrito).
  Degrada a entrada manual si falla. Límite responsable ~1 req/seg.
- **Sugerencia de inmobiliaria**: el campo usa un **desplegable propio** (no
  `<datalist>`) que sugiere agencias existentes y permite escribir nuevas.

## UI / UX

- **Pestañas inferiores** fijas (5): 🗺️ Mapa · 📋 Lista · ⭐ Favoritos ·
  🏢 Agencias · 📝 Guion. Pastilla de acento (`.tab-activa`) en la activa.
- **FAB "+"** (alta de piso) **solo en Mapa y Lista** (`@if tab === 'mapa'||'lista'`).
- **Mapa**: clic añade piso con coordenadas fijadas; cursor `crosshair`; la leyenda
  captura el clic (NO añade). Tiles **OSM siempre**, también en modo oscuro.
- **Estilo iOS suave** con **design tokens semánticos** (Tailwind v4 `@theme inline`
  con variables que cambian bajo `.dark`). Clases reutilizables en `styles.css`:
  `.tarjeta`, `.campo`, `.etiqueta`, `.btn-primario`, `.btn-suave`. Acento: índigo.
- **Leaflet** vive aislado en `ui/mapa-view`: init con `afterNextRender()`,
  redibujo de marcadores con `effect()`, limpieza con `DestroyRef`. Los marcadores
  usan `L.divIcon` (gota SVG) para evitar el problema de iconos rotos del bundler.

## Gotchas / aprendizajes (no repetir errores)

- **`ñ` (y no-ASCII) en expresiones de plantilla**: el lexer de Angular las
  rechaza. Los métodos invocados desde el HTML deben ir SIN `ñ` (p. ej. `agregar()`
  en vez de `añadir()`). En código TS puro `añadir`/`añadirPregunta` sí valen.
- **Custom elements y `space-y`/márgenes**: el host de un componente
  (`<app-xxx>`) es `inline` por defecto e **ignora márgenes verticales**. Si una
  lista de componentes "no separa", añade `host: { class: 'block' }` al componente.
- **z-index sobre Leaflet**: `<main>` es `position:relative` sin `z-index`, así que
  no crea contexto de apilamiento y los controles de Leaflet (`z-index:1000`)
  "suben" a la raíz. Los overlays (modal, diálogo, toast) van por **encima de
  1000** (form `z-[2000]`, diálogo `z-[2100]`, toast `z-[2200]`).
- **Modo oscuro en Tailwind v4**: se usa `@custom-variant dark (&:where(.dark, .dark *))`
  y `@theme inline` mapeando a variables CSS; NO `bg-opacity-*` (deprecado) — usar
  `color/opacidad` (p. ej. `bg-primary/15`) o una clase con `color-mix`.

## Entorno de build (Windows, importante)

La máquina tiene **varias instalaciones de Node** (nvm + un shim viejo v20 en
`AppData\Roaming\npm`). `npx @angular/cli` puede resolver erróneamente a v20 y
fallar el gate de versión. Para compilar de forma fiable se usa el Node v26 de
`C:\Program Files\nodejs` directamente:

```bash
node ./node_modules/@angular/cli/bin/ng.js build --configuration development
```

`npm start` (`ng serve`) funciona con la terminal normal del usuario (que ya usa v26).

## Comandos útiles

```bash
npm start                 # ng serve → http://localhost:4200
npm run build             # build de producción (dist/pisotracker)
npm run watch             # build en modo watch (desarrollo)

# Si npx/ng falla por la versión de Node, invoca el CLI con el Node v26:
node ./node_modules/@angular/cli/bin/ng.js serve
node ./node_modules/@angular/cli/bin/ng.js build --configuration development
```

- **Añadir una vista nueva:** crea el componente en `features/pisos/ui/<vista>/`,
  impórtalo en `pisos.page.ts` (array `imports`), añade su `@case` en el `@switch`
  y una entrada en `pestanas`.
- **Resetear datos en el navegador:** borra las claves `pisotracker.*` de
  `localStorage` (DevTools → Application → Local Storage) y recarga: se vuelve a
  sembrar desde los seeds.
- **Cambiar persistencia a memoria** (no persiste entre recargas): en
  `app.config.ts`, `{ provide: STORAGE, useClass: MemoryStorageAdapter }`.
