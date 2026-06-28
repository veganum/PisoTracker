# PisoTracker 🏠

Aplicación web **mobile-first** para el seguimiento personal de pisos en venta en
Madrid durante un proceso de búsqueda de vivienda.

Construida con **Angular 22** (standalone + **zoneless** + **signals**),
**Tailwind CSS v4** y **Leaflet** (OpenStreetMap, sin API key).

## Funcionalidades

- 🗺️ **Mapa** — marcadores coloreados por estado, buscador de calles (Photon/OSM,
  sin API key, con voz), capa de distritos interactiva, controles liquid glass.
- 📋 **Lista** — filtros persistentes (barrio, estado, contacto, reforma),
  toggle Activos / Descartados.
- ⭐ **Favoritos** — puntuación automática con ranking, comparativa de 2-3 pisos
  en tabla paralela.
- 📊 **Mi tablero** — kanban de los 4 estados del flujo. Tap en una card avanza
  el estado. Al llegar a Visitado aparece un sheet de decisión.
- 👤 **Yo** — agenda de citas próximas y guion de preguntas por etapa.
- 🏢 **Inmobiliarias / Financieras** — condiciones reales (TIN, diferencial, TAE,
  plazo, comisiones). Pisos asociados por inmobiliaria.
- 💰 **Calculadora de coste real** — desde cualquier piso: ITP, notaría, registro,
  tasación y cuota hipotecaria, todo editable.
- 🗑️ **Descartar** — estado reversible: archiva el piso sin borrarlo. Restaura
  automáticamente al estado previo al descarte.
- 📜 **Historial de estados** — registro automático de cada cambio de estado con
  fecha, visible en el formulario de edición.

## Estados del pipeline

| Estado | Color | Tipo |
| --- | --- | --- |
| Interesado | 🔵 azul | Flujo |
| Contactado | 🟠 naranja | Flujo |
| Agendado | 🟢 verde | Flujo |
| Visitado | 🟣 morado | Flujo |
| Favorito | 🌟 dorado | Lateral |
| Pendiente condiciones | 🩵 teal | Lateral |
| Descartado | ⚪ gris | Archivo reversible |

## Cómo arrancar

```bash
npm install
npm start          # → http://localhost:4200
```

```bash
npm run build      # compilación de producción
npm run watch      # build en modo watch
```

> **Nota sobre Node.js:** Angular 22 requiere Node `v22.22.3+`, `v24.15.0+` o `v26.0.0+`.

## Persistencia

La persistencia sigue el patrón **puerto + adaptador** (hexagonal). Cambiar de
mecanismo es una sola línea en `app.config.ts`:

```typescript
{ provide: STORAGE, useClass: LocalStorageAdapter }   // por defecto
{ provide: STORAGE, useClass: MemoryStorageAdapter }  // sin persistencia
```

### Supabase (sincronización en la nube)

En `src/app/core/config.ts`:

```typescript
export const USAR_SUPABASE = true;
export const SUPABASE_CONFIG = {
  url: 'https://<tu-proyecto>.supabase.co',
  anonKey: '<tu-anon-key>',
};
```

Ejecuta `supabase/estado.sql` en tu proyecto para crear la tabla y las políticas
RLS. Con `USAR_SUPABASE = true` la app requiere login (email + contraseña) y
sincroniza entre dispositivos en tiempo real.

> ⚠️ La `anon` key es pública y puede ir en el frontend; la seguridad la dan las
> políticas **RLS**. Nunca pongas la `service_role` key en el cliente.

## Estructura

```text
src/app/
├── core/
│   ├── persistence/    → StoragePort + adaptadores (local/memoria/supabase)
│   ├── auth/           → AuthService + pantalla de login
│   └── supabase/       → cliente + Realtime
└── features/pisos/
    ├── models/         → Piso, EstadoPipeline, Contacto, Guion
    ├── data/           → PisosStore, GuionStore, geocoding, puntuación…
    ├── ui/             → mapa, lista, favoritos, kanban, yo, inmobiliarias,
    │                     form, card, comparativa-modal, contacto-card
    └── pisos.page.ts   → shell (pestañas móvil + sidebar desktop)
```
