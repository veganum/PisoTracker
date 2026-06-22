# Spec: "Mi tablero" — vista Kanban de pisos

**Fecha:** 2026-06-22
**Estado:** Aprobado

---

## Objetivo

Añadir una vista tipo tablero (acordeón vertical en móvil, columnas en desktop) que muestre todos los pisos agrupados por su estado cronológico, para tener de un vistazo en qué punto del proceso de compra está cada piso.

---

## Ubicación en la app

Nuevo segmento dentro de `YoView`. El segmentado pasa de 2 a 3 opciones:

```
📅 Citas  |  📊 Mi tablero  |  📝 Guion
```

Tipo `Segmento` actualizado: `'citas' | 'tablero' | 'guion'`.

---

## Componente nuevo

`src/app/features/pisos/ui/kanban-view/kanban-view.ts`

- Standalone, `ChangeDetectionStrategy.OnPush`
- Inyecta `PisosStore`
- Emite `editar: OutputEmitterRef<Piso>`

---

## Estados mostrados

Solo los 4 del flujo lineal, en orden fijo:

| Estado | Color marcador |
|---|---|
| Interesado | `#3b82f6` |
| Contactado | `#f97316` |
| Agendado | `#eab308` |
| Visitado | `#a855f7` |

`Favorito` y `Pendiente condiciones` se excluyen (son estados laterales sin cronología).

---

## Lógica interna

```typescript
// Computed que agrupa pisos por estado
readonly columnas = computed(() => {
  const pisos = this.store.pisos();
  return ESTADOS_FLUJO.map(estado => ({
    estado,
    color: colorEstado(estado),
    pisos: pisos.filter(p => p.estado === estado),
  }));
});

// Qué secciones están expandidas (por defecto: las que tienen pisos)
readonly expandidos = signal<Set<EstadoPipeline>>(new Set());
// Se inicializa en el constructor con los estados que tienen pisos
```

Al inicializar el componente, `expandidos` se rellena con los estados que ya tienen pisos. Los estados vacíos arrancan colapsados. Tocar la cabecera hace toggle del estado en el `Set`.

---

## Diseño móvil — Acordeón vertical

Cada sección:

```
┌─────────────────────────────────────────────┐
│ ● Contactado                            3 ▼ │  ← cabecera, color del punto = estado
├─────────────────────────────────────────────┤
│▌ Calle Gran Vía 12, 3ºA                     │  ← card
│  245.000 €  ·  Engel & Völkers              │
├─────────────────────────────────────────────┤
│▌ Paseo de la Castellana 45, 2ºB             │
│  310.000 €  ·  Particular                   │
└─────────────────────────────────────────────┘
```

**Cabecera:**
- Dot de color del estado (12px, `rounded-full`, `bg-[color]`)
- Nombre del estado (`font-semibold text-text`)
- Badge contador (`rounded-full bg-surface-2 text-muted text-xs`)
- Chevron animado (▼/▲) indicando expandido/colapsado
- Estado vacío: badge `0`, cabecera colapsada, tono más apagado

**Card:**
- Fondo: `.tarjeta` (clase existente)
- Borde izquierdo 3px con color del estado: `border-l-[3px]`
- Línea 1: `direccion` truncada a 1 línea (`truncate font-semibold text-text`)
- Línea 2: precio formateado + `·` + nombre inmobiliaria (o `Particular`) en `text-muted text-xs`
- Tap en cualquier punto → `editar.emit(piso)` (abre formulario de edición)
- Sin botones de acción dentro de la card (mantiene compacidad)

**Estado vacío global** (ningún piso en ningún estado):
- Mensaje centrado con emoji y texto orientativo (igual que otras vistas)

---

## Diseño desktop (`lg:`)

Las 4 secciones pasan a un `grid grid-cols-4 gap-4`:

- Cabecera de columna siempre visible (no colapsable en desktop)
- Cards apiladas verticalmente dentro de la columna
- `max-h-[calc(100vh-220px)] overflow-y-auto` en cada columna si hay muchos pisos
- Mismo diseño de card que en móvil

---

## Lo que NO incluye

- Drag & drop (sin plan de añadirlo)
- Filtro de distrito (ya existe en Lista)
- Acciones de borrar en la card (se borran desde Lista o Favoritos)
- Estados laterales: Favorito, Pendiente condiciones

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `ui/kanban-view/kanban-view.ts` | **Nuevo** componente |
| `ui/yo-view/yo-view.ts` | Añadir segmento `tablero`, importar `KanbanView` |
