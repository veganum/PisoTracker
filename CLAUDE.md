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
- **Leaflet** + `@types/leaflet`, tiles de OpenStreetMap (sin API key). GeoJSON de
  distritos y barrios de Madrid en `public/` (sin API key).
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
    ├── models/            → Piso, EstadoPipeline (flujo/laterales + colores),
    │                        madrid (distritos+barrios+ubicarBarrio), Contacto,
    │                        Guion, tipos
    ├── data/              → PisosStore, GuionStore, seeds (pisos/contactos/guion),
    │                        puntuación, toast, geocoding, ubicacion (point-in-
    │                        polygon), sync-status (outbox), migración
    ├── ui/<vista>/        → mapa, lista, favoritos, inmobiliarias(+contacto-card),
    │                        guion(+bloque), form, card, diálogo
    └── pisos.page.ts      → shell: pestañas (móvil) + sidebar (desktop)
```

## Persistencia INTERCAMBIABLE (clave)

El estado se persiste a través del **puerto** `STORAGE`
(`core/persistence/storage.token.ts`). Los stores inyectan el puerto, nunca
`localStorage` ni Supabase directamente.

- Adaptadores: `LocalStorageAdapter` (JSON + try/catch), `MemoryStorageAdapter`
  (en memoria) y `SupabaseAdapter` (nube + RLS).
- **El mecanismo lo decide un único flag** `USAR_SUPABASE` en `core/config.ts`,
  leído en `app.config.ts`:

  ```typescript
  // app.config.ts
  { provide: STORAGE, useClass: USAR_SUPABASE ? SupabaseAdapter : LocalStorageAdapter }
  ```

  - `true`  → **Supabase** (nube, sincroniza entre dispositivos, requiere login).
  - `false` → **localStorage** (local, sin login, no sincroniza).
  - ⚠️ **Tener este flag en `false` es lo que rompe la sincronización**: si
    «todo vuelve al estado original» o no aparece en otro dispositivo, lo
    primero es comprobar que está en `true` y que el build desplegado lo tiene.
- Un futuro `IndexedDbAdapter` / `RestApiAdapter` solo implementa `StoragePort`
  y se registra ahí; ni los stores ni los componentes cambian.
- **Claves de almacenamiento:** `pisotracker.pisos`, `pisotracker.inmobiliarias`
  (guarda `Contacto[]`: inmobiliarias **y** financieras), `pisotracker.guion`,
  `pisotracker.tema`. (Internas, no de datos: `pisotracker.outbox`,
  `pisotracker.migrado`.)

### Modelo Supabase (cuando `USAR_SUPABASE = true`)

- **Almacén clave-valor por usuario** en la tabla `estado`
  (`user_id · clave · valor jsonb · actualizado_en`). El `SupabaseAdapter` hace
  `upsert` con `onConflict: 'user_id,clave'`; el `user_id` lo pone Postgres por
  defecto (`auth.uid()`) y **RLS** garantiza que cada usuario solo ve lo suyo.
  Las claves son las mismas `pisotracker.*` (un blob JSON por clave).
- **Autenticación** (`core/auth/AuthService`): email + contraseña vía Supabase.
  Sesión persistida por el SDK; `usuario` como signal; si cambia el usuario con
  la app ya cargada (login distinto/logout) **recarga** para no mezclar datos.
  Con `USAR_SUPABASE = false` queda inerte (no hay login).
- **Resiliencia offline** (`data/SyncStatusService`): TODA escritura pasa por
  `sync.guardar(clave, valor)`. Si falla (sin red), encola en un **outbox** por
  clave (última escritura gana), lo **persiste** en `localStorage` y lo
  **reintenta** al volver la conexión (evento `online`). Expone `estado`
  (`ok | guardando | pendiente | error`) para el indicador de la cabecera.
- **Realtime** (`core/supabase/RealtimeService`): se suscribe a `postgres_changes`
  de la tabla `estado`; cuando otro dispositivo cambia una clave, el `PisosStore`
  refresca el signal (compara JSON para no entrar en bucle). **Requiere habilitar
  Realtime** para la tabla: `alter publication supabase_realtime add table
  public.estado;`. Sin eso, igual sincroniza pero solo **al recargar**.
- **Migración local → nube** (`data/MigracionService`): si hay datos en
  `localStorage` de un uso previo sin cuenta, ofrece un banner para subirlos a
  Supabase una vez (marca `pisotracker.migrado`). Sobrescribe lo que haya y
  recarga.

## Estado central

### `PisosStore` (`providedIn: 'root'`)

- `pisos = signal<Piso[]>([])`; se rellena **asíncrono** en `inicializar()` desde
  el puerto (`?? PISOS_SEED` si nunca se guardó; `[]` guardado se respeta). Al
  cargar se **migran** pisos antiguos (barrio plano → `distrito` + `barrio`, y se
  rellenan los campos nuevos de costes/transporte/riesgos con `migrarPiso`).
- `contactos = signal<Contacto[]>([])` inmobiliarias + financieras (seed si nunca
  guardado; migra el formato antiguo `CondicionesInmobiliaria` a `Contacto`).
- `cargado = signal(false)`: los `effect()` de persistencia **solo guardan tras la
  carga inicial** (si no, machacarían los datos con los signals vacíos).
- Persistencia: dos `effect()` que llaman a `sync.guardar(clave, …)` (outbox), no
  al puerto directo. Realtime: `realtime.escuchar(clave, …)` refresca el signal si
  el valor remoto difiere del local.
- `distritoMapa` / `barrioMapa = signal('')`: distrito y barrio elegidos al pulsar
  un polígono en el mapa; la Lista los lee para prefiltrar (ver «Distritos en mapa»).
- `computed()`: `rango`, `favoritos` (puntuados y ordenados), `nombresInmobiliarias`
  (detectadas en pisos), `inmobiliarias` (detectadas + creadas), `financieras`,
  `nombresInmobiliariasSugeridas`.
- Mutaciones: `añadir`, `actualizar`, `borrar`, `guardarContacto`, `crearContacto`,
  `borrarContacto`.

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

- **Pipeline de estados** (`models/estado-pipeline.ts`, con color de marcador):
  - **Flujo lineal** (`ESTADOS_FLUJO`): Interesado `#3b82f6` → Contactado `#f97316`
    → Agendado `#eab308` → Visitado `#a855f7`.
  - **Laterales** (`ESTADOS_LATERALES`, fuera del flujo): Favorito `#d4af37` ⭐,
    Pendiente condiciones `#14b8a6` ⏳ (esperando bajada de precio/cambio).
  - `estado` es UN solo valor de los 6. "Descartar" = borrado con confirmación.
- **Distritos y barrios** (`models/madrid.ts`): los **21 distritos** oficiales de
  Madrid con sus **131 barrios**. `Piso` tiene `distrito` (obligatorio) + `barrio`
  (`string`, opcional). El barrio se valida contra el distrito elegido (selects
  enlazados). `barriosDe(distrito)` da los barrios. `ubicarBarrio(nombre)` resuelve
  un barrio (sin acentos/mayúsculas) a `{distrito, barrio}` canónicos.
- **Campos del `Piso`** (`models/piso.model.ts`), además de localización/inmueble:
  costes (`gastosComunidad`, `ibiAnual`, `derramas`, `reformaEstimada`), transporte
  (`minutosMetro`, `minutosBus`), riesgos (`ocupado`, `nudaPropiedad`,
  `observacionesLegales`) y otros (`certificadoEnergetico`, `fechaPublicacion`,
  `fechaUltimaRevision`). Todos opcionales (0/'' = sin dato); `migrarPiso` los
  rellena por defecto en pisos antiguos.
- **Puntuación** (`data/puntuacion.util.ts`, función pura): precio inverso 0–10,
  m² directo 0–10, habitaciones ×1.5, estado piso 3/2/1, ascensor +1. Se calcula
  sobre el `rango` (mín/máx de precio y m²) de TODOS los pisos.
- **Favoritos**: solo `estado === 'Favorito'`, ordenados por puntuación desc, con
  ranking numerado.
- **Contactos** (`models/contacto.model.ts`, un solo modelo con `tipo`
  discriminador `'Inmobiliaria' | 'Financiera'`):
  - **Inmobiliarias**: se **detectan** de los pisos con `tipoContacto === 'Inmobiliaria'`
    y se fusionan con las creadas a mano. Campos: contacto, tel/email/web, distritos
    donde trabaja (multi-select), honorarios comprador/vendedor (nº + €/%), exclusiva,
    financiación propia/Kiron, dirección, valoración, observaciones.
  - **Financieras/brokers** (solo manuales): subtipo Banco/Broker, Registrado BdE,
    entidades, financiación máx %, financia gastos, fija/mixta, comisiones, vinculaciones,
    días de aprobación, preaprobación online.
- **Guion**: 3 bloques semilla (Visita al piso / Financiera-hipoteca /
  Inmobiliaria-propietario) con preguntas editables. Checklist **global** (las
  marcas no son por piso); botón "Reiniciar" desmarca todo.
- **Formulario** (`ui/piso-form`): signal-first (un signal por campo, validaciones
  con `computed`). Validaciones: dirección obligatoria; **distrito obligatorio**;
  `fechaCita` obligatoria si `estado === 'Agendado'`; campo inmobiliaria visible si
  `tipoContacto === 'Inmobiliaria'`. El estado se elige con un **stepper** (los 4 del
  flujo) + chips para los laterales.
- **Autocompletado al alta (mapa)**: al pinchar el mapa en un **alta nueva** se
  combinan dos fuentes (best-effort, sin pisar lo que el usuario ya escribió):
  - `data/geocoding.service.ts` (**Nominatim/OSM** vía `fetch`) → la **calle/
    dirección**. Degrada a entrada manual si falla. Límite responsable ~1 req/seg.
  - `data/ubicacion.service.ts` → **Distrito y Barrio** por **point-in-polygon**
    (ray casting) sobre `public/barrios-madrid.geojson`, cargado una sola vez. Es
    fiable y offline (Nominatim devuelve barrios poco consistentes). Devuelve
    `{distrito, barrio}` canónicos vía `ubicarBarrio`.
- **Distritos en el mapa** (`ui/mapa-view`): botón 🗂️ (capa) que muestra/oculta
  los 21 polígonos (`public/distritos-madrid.geojson`, cargado on-demand). Clic en
  un polígono: `stopPropagation` (no añade piso) → fija `distritoMapa` (del
  polígono, fiable) y emite `filtrarDistrito` → salta a la **Lista** ya prefiltrada;
  en paralelo `ubicacion.ubicar(lat,lng)` resuelve el `barrioMapa` exacto. Algunos
  nombres del GeoJSON difieren del catálogo (sin acentos): `NOMBRES_DISTRITO` los
  mapea. La Lista lee `distritoMapa` en el constructor y `barrioMapa` con un
  `effect()` (llega un instante después).
- **Sugerencia de inmobiliaria**: el campo usa un **desplegable propio** (no
  `<datalist>`) que sugiere inmobiliarias existentes y permite escribir nuevas.

## UI / UX

- **Navegación responsive**: en **móvil** pestañas inferiores fijas (5): 🗺️ Mapa ·
  📋 Lista · ⭐ Favoritos · 🏢 Inmob. · 📝 Guion (`id: 'agencias'`, etiqueta
  abreviada). En **desktop** (`lg:`) un `<aside>` sidebar lateral (la barra inferior
  se oculta con `lg:hidden`). Pastilla de acento (`.tab-activa`) en la activa.
- **Cabecera**: indicador de **estado de sincronización** (del `SyncStatusService`),
  toggle de tema y, con Supabase, botón de salir. Banner de **migración** si hay
  datos locales por importar.
- **Iconografía híbrida**: emojis donde aportan color (estados, pestañas) +
  `<app-icono>` (SVGs Lucide inline) donde conviene un icono neutro (acciones CRUD,
  buscar, copiar, tel/mail, capa, salir). Accesibilidad: `FocusTrap` en overlays.
- **FAB "+"** (alta de piso) **solo en Mapa y Lista** (`@if tab === 'mapa'||'lista'`).
- **Vista Inmob.**: un segmentado superior **filtra** entre Inmobiliarias y
  Financieras (se muestra una sola lista) y fija el **tipo** del alta. Teléfono/email
  con chips de **📋 copiar** (portapapeles + toast) y **📞/✉️** (tel:/mailto).
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
- **Persistencia asíncrona + guardia `cargado`**: la carga inicial es `async`. Los
  `effect()` que persisten DEBEN comprobar `cargado()` antes de escribir, o
  guardarían los signals vacíos sobre los datos buenos. `null` del puerto = nunca
  guardado (usar seed); `[]` = el usuario lo vació (respetar). No confundir.
- **Síntoma «todo vuelve al estado original»**: casi siempre es `USAR_SUPABASE`
  en `false` (app en modo localStorage) o un build desplegado con el flag viejo.
  Verificar el flag y recompilar/redeploy antes de buscar bugs en el CRUD.
- **Realtime no llega**: falta `alter publication supabase_realtime add table
  public.estado;` en Supabase. El CRUD persiste igual; solo no hay sync *en vivo*
  (sí al recargar).

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
  sembrar desde los seeds. (En modo Supabase los datos viven en la nube; borra las
  filas de la tabla `estado` de tu usuario para resembrar.)
- **Cambiar persistencia:** flag `USAR_SUPABASE` en `core/config.ts`
  (`true` = nube, `false` = localStorage). Para memoria: en `app.config.ts`,
  `{ provide: STORAGE, useClass: MemoryStorageAdapter }`.

### Setup de Supabase (una vez)

```sql
-- 1) Tabla clave-valor por usuario
create table public.estado (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  clave text not null,
  valor jsonb,
  actualizado_en timestamptz not null default now(),
  primary key (user_id, clave)
);

-- 2) RLS: cada usuario solo accede a lo suyo
alter table public.estado enable row level security;
create policy "propios" on public.estado
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Sincronización EN VIVO (Realtime). Sin esto, sincroniza solo al recargar.
alter publication supabase_realtime add table public.estado;
```

- Crea tu usuario en **Authentication → Users** (email + contraseña).
- `SUPABASE_CONFIG` (url + `anonKey`) vive en `core/config.ts`. La `anonKey` es
  pública; **nunca** pongas la `service_role` en el frontend.
