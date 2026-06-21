# PisoTracker 🏠

Aplicación web **mobile-first** para el seguimiento personal de pisos en venta en
Madrid durante un proceso de búsqueda de vivienda. Marca pisos en un mapa,
gestiónalos en un pipeline de estados y compara tus favoritos por una puntuación
automática.

Construida con **Angular 22** (standalone + **zoneless** + **signals**),
**Tailwind CSS v4** y **Leaflet** (OpenStreetMap, sin API key).

## Funcionalidades

- 🗺️ **Mapa** (Leaflet): marcadores tipo gota coloreados por estado. Toca el
  mapa para añadir un piso con las coordenadas ya fijadas.
- 📋 **Lista**: tarjetas con todos los datos y filtros combinables (barrio,
  estado del pipeline, tipo de contacto, estado del inmueble).
- ⭐ **Favoritos**: solo los marcados como favorito, ordenados por puntuación
  automática con ranking numerado.
- 🏢 **Agencias**: inmobiliarias detectadas automáticamente, con sus honorarios,
  comisión, exclusiva y notas (editable y persistido).
- Persistencia automática en `localStorage` (intercambiable, ver más abajo).

## Cómo arrancar

```bash
npm install
npm start          # equivale a: ng serve
```

Abre <http://localhost:4200>.

Otros comandos:

```bash
npm run build      # compilación de producción
npm run watch      # build en modo watch (desarrollo)
```

> **Nota sobre Node.js:** Angular 22 requiere Node `v22.22.3+`, `v24.15.0+` o
> `v26.0.0+`.

## Cómo cambiar el adaptador de persistencia

La persistencia sigue el patrón **puerto + adaptador** (hexagonal). El store y
los componentes dependen del puerto `STORAGE`, nunca de una implementación
concreta. Cambiar de mecanismo es **una sola línea** en
[`src/app/app.config.ts`](src/app/app.config.ts):

```typescript
// localStorage (por defecto: persiste entre recargas)
{ provide: STORAGE, useClass: LocalStorageAdapter }

// En memoria (no persiste; útil para demos/SSR)
{ provide: STORAGE, useClass: MemoryStorageAdapter }

// Futuro: API REST / IndexedDB (solo implementar StoragePort)
{ provide: STORAGE, useClass: RestApiAdapter }
```

No hay que tocar nada más: ni el `PisosStore` ni los componentes se enteran del
cambio.

## Persistencia en la nube con Supabase (multiusuario)

La app puede sincronizar entre dispositivos usando **Supabase** (Postgres + Auth
+ RLS). Cada usuario solo ve sus datos.

### 1. Crear la tabla

En tu proyecto de Supabase: **SQL Editor → New query** → pega el contenido de
[`supabase/estado.sql`](supabase/estado.sql) → **Run**. Crea la tabla `estado`
(clave-valor por usuario, `valor jsonb`, `user_id` con `default auth.uid()`),
activa **RLS** y añade las políticas `SELECT/INSERT/UPDATE/DELETE` con la regla
`auth.uid() = user_id`.

### 2. Crear usuarios

**Authentication → Users → Add user** (marca **Auto Confirm User** para saltar el
email de confirmación). Repite para cada persona (pensado para grupos pequeños).

### 3. Activar Supabase en la app

En [`src/app/core/config.ts`](src/app/core/config.ts):

```typescript
export const USAR_SUPABASE = true;          // false = localStorage (sin login)
export const SUPABASE_CONFIG = {
  url: 'https://<tu-proyecto>.supabase.co',
  anonKey: '<tu-anon-key>',                  // pública por diseño; RLS protege
};
```

> ⚠️ **Seguridad:** la `anon` key es pública y puede ir en el frontend; la
> seguridad real la dan las **políticas RLS**. **Nunca** pongas la `service_role`
> key en el cliente.

Con `USAR_SUPABASE = true` la app muestra **login** (email + contraseña) y guarda
todo en Supabase mediante el `SupabaseAdapter` (mismo puerto `StoragePort`).

## Estructura

```
src/app/
├── core/persistence/      → puerto StoragePort + adaptadores + token
└── features/pisos/
    ├── models/            → Piso, EstadoPipeline, colores
    ├── data/              → PisosStore (signals), seed, puntuación, toast
    ├── ui/                → mapa, lista, favoritos, agencias, form, card, diálogo
    └── pisos.page.ts      → shell con pestañas inferiores
```
