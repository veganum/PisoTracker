# CLAUDE.md — Contexto del proyecto PisoTracker

## Qué es

App **mobile-first** para seguir pisos en venta en Madrid durante la búsqueda de
vivienda: mapa con marcadores por estado, pipeline de gestión, favoritos
puntuados automáticamente, tablero kanban, buscador de calles, comparativa de
favoritos, calculadora de coste real y condiciones por inmobiliaria/financiera.

## Stack

- **Angular 22**, componentes **standalone**, proyecto **zoneless** (sin Zone.js;
  Angular 22 es zoneless por defecto, no se registra `provideZoneChangeDetection`).
- **Signals** para todo el estado reactivo.
- **Tailwind CSS v4** (vía `@tailwindcss/postcss`, configurado en `.postcssrc.json`;
  se importa con `@import 'tailwindcss'` en `src/styles.css`).
- **Leaflet** + `@types/leaflet`, tiles de OpenStreetMap (sin API key). GeoJSON de
  distritos y barrios de Madrid en `public/` (sin API key).
- **Photon (Komoot)** para búsqueda directa de calles en el mapa (sin API key);
  fallback a Nominatim si falla. Ver `data/geocoding.service.ts`.
- **Supabase** (`@supabase/supabase-js`): nube + autenticación + Realtime como
  backend de persistencia **opcional** (ver «Persistencia»). La `anonKey` es
  pública por diseño; **RLS** protege los datos. NUNCA poner la `service_role`
  en el frontend.
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
- `docs/superpowers/` está en `.gitignore` (artefactos de desarrollo, no del repo).

## Arquitectura

Screaming Architecture por features + hexagonal **solo en persistencia**.

```text
src/app/
├── core/
│   ├── config.ts          → USAR_SUPABASE (flag) + SUPABASE_CONFIG (url/anonKey)
│   ├── persistence/       → StoragePort (puerto), adaptadores (local/memoria/
│   │                        supabase), InjectionToken
│   ├── auth/              → AuthService (login email/contraseña) + login (pantalla)
│   ├── supabase/          → SupabaseService (cliente), RealtimeService (sync vivo)
│   └── theme/             → ThemeService (claro/oscuro)
├── shared/
│   ├── icono/             → <app-icono> (SVGs Lucide inline, OnPush)
│   └── a11y/              → FocusTrap (directiva [appFocusTrap])
└── features/pisos/
    ├── models/            → Piso + EntradaHistorial, EstadoPipeline, madrid,
    │                        Contacto, Guion, tipos
    ├── data/              → PisosStore, GuionStore, seeds (pisos/contactos/guion),
    │                        puntuación, toast, geocoding (reverse+buscar),
    │                        ubicacion (point-in-polygon), sync-status (outbox)
    ├── ui/<vista>/        → mapa (+ buscador calles), lista, favoritos,
    │                        inmobiliarias (+ contacto-card), guion (+ bloque),
    │                        form, card, diálogo, kanban-view, yo-view,
    │                        comparativa-modal
    └── pisos.page.ts      → shell: pestañas (móvil) + sidebar (desktop)
```

## Persistencia INTERCAMBIABLE (clave)

El estado se persiste a través del **puerto** `STORAGE`
(`core/persistence/storage.token.ts`). Los stores inyectan el puerto, nunca
`localStorage` ni Supabase directamente.

- Adaptadores: `LocalStorageAdapter` (JSON + try/catch), `MemoryStorageAdapter`
  (en memoria) y `SupabaseAdapter` (nube + RLS).
- **El mecanismo lo decide un único flag** `USAR_SUPABASE` en `core/config.ts`:
  - `true`  → **Supabase** (nube, sincroniza entre dispositivos, requiere login).
  - `false` → **localStorage** (local, sin login, no sincroniza).
  - ⚠️ **Tener este flag en `false` es lo que rompe la sincronización.**

- **Claves de almacenamiento:** `pisotracker.pisos`, `pisotracker.inmobiliarias`,
  `pisotracker.guion`, `pisotracker.tema`. (Internas: `pisotracker.outbox`.)
- **Seeds vaciados:** `PISOS_SEED = []` y `CONTACTOS_SEED = []` — la app arranca
  vacía en cuentas nuevas. `GUION_SEED` se mantiene con las preguntas semilla.

### Modelo Supabase (cuando `USAR_SUPABASE = true`)

- **Almacén clave-valor por usuario** en la tabla `estado`
  (`user_id · clave · valor jsonb · actualizado_en`). El `SupabaseAdapter` hace
  `upsert` con `onConflict: 'user_id,clave'`; **RLS** garantiza que cada usuario
  solo ve lo suyo.
- **Resiliencia offline** (`data/SyncStatusService`): TODA escritura pasa por
  `sync.guardar(clave, valor)`. Si falla, encola en outbox y reintenta al volver
  la conexión. Expone `estado` (`ok | guardando | pendiente | error`).
- **Realtime** (`core/supabase/RealtimeService`): requiere
  `alter publication supabase_realtime add table public.estado;`.

## Estado central

### `PisosStore` (`providedIn: 'root'`)

- `pisos = signal<Piso[]>([])` — todos los pisos incluyendo descartados.
- `cargado = signal(false)` — los `effect()` de persistencia solo escriben tras carga.
- **Filtros de Lista** (persisten entre pestañas):
  `fDistrito`, `fBarrio`, `fEstado`, `fContacto`, `fEstadoPiso`, `busqueda`, `orden`
  — todos `signal('')` en el store. `hayFiltros`, `numFiltros` como `computed()`.
  Métodos: `cambiarDistrito(v)`, `limpiarFiltros()`.
- **Computeds derivados:**
  - `pisosFiltrados` — aplica filtros activos, **excluye siempre Descartado**.
    El mapa usa este computed para sus marcadores.
  - `pisosDescartados` — solo pisos con `estado === 'Descartado'`.
  - `favoritos` — puntuados y ordenados (excluye Descartado implícitamente).
  - `rango`, `inmobiliarias`, `financieras`, `nombresInmobiliarias`,
    `nombresInmobiliariasSugeridas`.
- **Mutaciones:** `añadir`, `actualizar`, `borrar`, `guardarContacto`,
  `crearContacto`, `borrarContacto`.
  - `actualizar` limpia `fechaCita` si se sale de Agendado, y registra el cambio
    de estado en `historialEstados`.
  - `añadir` inicializa `historialEstados` con la primera entrada.

### `GuionStore` (`providedIn: 'root'`)

- `bloques = signal<BloqueGuion[]>(...)` desde el puerto (o `GUION_SEED`).
- Mutaciones: `alternar`, `añadirPregunta`, `editarPregunta`, `borrarPregunta`,
  `reiniciar`.

### `ThemeService` (`providedIn: 'root'`)

- Tema `'auto' | 'claro' | 'oscuro'`; `'auto'` sigue `prefers-color-scheme`.
- `effect()` aplica/quita `.dark` en `<html>`.

## Reglas de negocio

### Pipeline de estados (`models/estado-pipeline.ts`)

- **Flujo lineal** (`ESTADOS_FLUJO`):
  Interesado `#3b82f6` → Contactado `#f97316` → Agendado `#22c55e` → Visitado `#a855f7`
- **Laterales** (`ESTADOS_LATERALES`):
  Favorito `#d4af37` ⭐, Pendiente condiciones `#14b8a6` ⏳
- **Descartado** `#9ca3af` 🗑️ — estado especial reversible (archivo):
  - No aparece en Lista activos, Favoritos, Kanban ni Mapa.
  - Visible en Lista → toggle "Descartados".
  - Se restaura al último estado antes del descarte (leyendo `historialEstados`).
  - Borrado permanente solo desde la vista Descartados (con confirmación).
- `estado` es UN solo valor de los 7. `fechaCita` se borra automáticamente
  al salir de Agendado (hacia cualquier otro estado).

### Campos del `Piso` (`models/piso.model.ts`)

Localización, inmueble, contacto, costes, transporte, riesgos, otros y gestión.
Campos nuevos: `historialEstados: EntradaHistorial[]` — registro cronológico
de cambios de estado `{ estado: EstadoPipeline; fecha: string (ISO) }`.
`migrarPiso` rellena `historialEstados: []` en pisos antiguos.

### Contactos (`models/contacto.model.ts`)

Un solo modelo con `tipo: 'Inmobiliaria' | 'Financiera'`.

**Inmobiliarias:** contacto, tel/email/web, dirección, distritos (multi-select),
honorarios comprador/vendedor (nº + €/%), exclusiva, `servicioFinanciero: string`
(texto libre: "Kiron", "Departamento propio"…; vacío = no ofrece), valoración,
observaciones.
> ⚠️ El campo anterior `financiacionPropia: boolean` fue renombrado a
> `servicioFinanciero: string`. La migración en `migrarContacto` lo convierte.

**Financieras/brokers:** subtipo Banco/Broker, registradoBdE, entidades, financiacionMax %, financiaGastos, hipotecaFija con `tinFijo` (TIN %), hipotecaMixta con `diferencial` (Euríbor+X %), `plazoMaximo` (años), `tae` (%), comisionApertura con `unidadComisionApertura` (€/%), comisionIntermediacion, vinculaciones, tiempoAprobacion (días), preaprobacionOnline.

### Acciones sobre pisos (pisos.page.ts)

- `descartarPiso(piso)` → `store.actualizar({...piso, estado: 'Descartado'})` sin confirmación (reversible).
- `restaurarPiso(piso)` → lee `historialEstados` y restaura al último estado previo al descarte.
- `pedirBorrar(piso)` → abre diálogo de confirmación para borrado **permanente** (solo desde Descartados).

### Buscador de calles en el mapa

`GeocodingService.buscarDireccion(texto)` — llama a **Photon (Komoot)** sin API key
con bias lat/lng hacia Madrid. Si Photon falla, fallback a **Nominatim search**.
Filtra resultados por radio de ~30km alrededor de Madrid en cliente.
Debounce 400ms, mínimo 3 caracteres, voz opcional (SpeechRecognition si el navegador lo soporta).
Al seleccionar resultado: mapa vuela a la ubicación y aparece marcador temporal con
popup "Añadir piso aquí" (liquid glass).

### Formulario (`ui/piso-form`)

Signal-first. Sección "Historial" colapsable al final: muestra `historialEstados`
como timeline con dots de color y fecha de cada estado.

### Calculadora de coste (piso-card)

Botón `€` en la fila de acciones (solo si hay precio). Abre un sheet con:

- Coste de compra: ITP, notaría, registro, tasación, honorarios inmo — todos **editables**, inicializados con estimaciones (ITP=6%, notaría≈0,3%, etc.).
- Hipoteca: entrada %, tipo %, plazo años — editables; cuota mensual calculada con fórmula PMT en tiempo real.

## UI / UX

- **Navegación:** 5 pestañas móvil: 🗺️ Mapa · 📋 Lista · ⭐ Favoritos · 🏢 Inmob. · 👤 Yo.
  Sidebar en desktop. Yo tiene 3 segmentos: 📅 Citas · 📊 Mi tablero · 📝 Guion.
- **Lista:** toggle 🏠 Activos / 🗑 Descartados en la parte superior.
  Filtros persistentes en el store. Badge de filtros activos.
- **Mapa (controles, liquid glass):** columna derecha con 🔍 buscador de calles,
  ⊕ centrar, 🗂 distritos. FAB `+` con el mismo estilo glass. Leyenda glass abajo-izquierda.
  Los pisos descartados NO aparecen en el mapa ni en la leyenda.
- **Mi tablero (kanban):** acordeón vertical en móvil, 4 columnas en desktop.
  Tap en card = avanza estado. Al llegar a Visitado → sheet con: ⭐ Favorito /
  ⏳ Pendiente / 🗑️ Descartar / Dejarlo en Visitado.
- **Favoritos:** comparativa 📊 (violeta) para 2-3 pisos → `ComparativaModal`.
- **Piso-card — fila de acciones** (todos `h-11 flex-1`):
  🔗 link (neutro) · `€` (índigo, análisis) · 📊 (violeta, comparativa en favoritos) ·
  ✏️ (amarillo, editar) · 🗑️ (rojo, descartar en activos; ↩ restaurar + 🗑️ en descartados).
- **ContactoCard:** secciones colapsables (Contacto / Distritos / Condiciones).
  Pills en lugar de checkboxes para opciones booleanas de financiera.
- **Estilo:** iOS suave, design tokens semánticos, `backdrop-blur-xl` + `color-mix`
  para liquid glass en controles del mapa y popup buscador.

## Gotchas / aprendizajes (no repetir errores)

- **`ñ` en expresiones de plantilla**: el lexer de Angular las rechaza en métodos
  invocados desde HTML. Usar `agregar()` en vez de `añadir()` en el template.
- **`[value]` en `<select>` nativo**: no funciona fiablemente cuando el valor se
  fija antes de que Angular renderice las `<option>`. Usar `[selected]="valor === x"`
  en cada `<option>` en su lugar.
- **`inject()` en inicializadores de campo**: válido en Angular 22, pero si el
  servicio ya está inyectado como `private readonly store`, usar `this.store` en el
  constructor en lugar de un segundo `inject()` en el inicializador.
- **Leaflet render inicial vs effect**: el `effect()` que redibuja marcadores no
  actúa en el primer render porque `this.mapa` aún es `undefined`. El render
  inicial debe llamar a `pisosFiltrados()` explícitamente en `inicializarMapa()`.
- **Photon bbox y URLSearchParams**: `URLSearchParams` codifica las comas de las
  coordenadas del bbox como `%2C`, lo que Photon rechaza. Construir la URL
  manualmente: `?q=${encodeURIComponent(texto)}&bbox=-3.95,40.25,-3.45,40.65`.
- **Pisos descartados en el mapa**: el `effect()` del mapa usa `pisosFiltrados()`
  (que excluye Descartado), pero el render inicial debe también usar `pisosFiltrados()`,
  no `pisos()`. Si se usa `pisos()` en la inicialización, los descartados aparecen
  brevemente hasta que el effect los elimina.
- **z-index sobre Leaflet**: overlays van por encima de 1000
  (form `z-[2000]`, diálogo `z-[2100]`, toast `z-[2200]`, sheet kanban `z-[2000]`).
- **Modo oscuro en Tailwind v4**: `@custom-variant dark (&:where(.dark, .dark *))`;
  NO `bg-opacity-*` (deprecado) — usar `bg-primary/15` o `color-mix`.
- **Persistencia asíncrona + guardia `cargado`**: los `effect()` DEBEN comprobar
  `cargado()` antes de escribir. `null` = nunca guardado (usar seed); `[]` = vacío
  intencionado (respetar).
- **Síntoma «todo vuelve al estado original»**: casi siempre `USAR_SUPABASE = false`.
- **Realtime no llega**: falta `alter publication supabase_realtime add table public.estado;`.

## Entorno de build (Windows, importante)

```bash
node ./node_modules/@angular/cli/bin/ng.js build --configuration development
```

`npm start` funciona con la terminal normal (Node v26).

## Comandos útiles

```bash
npm start        # ng serve → http://localhost:4200
npm run build    # build de producción
npm run watch    # build en modo watch
```

### Setup de Supabase (una vez)

```sql
create table public.estado (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  clave text not null,
  valor jsonb,
  actualizado_en timestamptz not null default now(),
  primary key (user_id, clave)
);
alter table public.estado enable row level security;
create policy "propios" on public.estado
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter publication supabase_realtime add table public.estado;
```
