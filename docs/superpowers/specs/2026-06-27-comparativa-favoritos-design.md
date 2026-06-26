# Spec: Comparativa de favoritos

**Fecha:** 2026-06-27
**Estado:** Aprobado

---

## Objetivo

Permitir seleccionar 2-3 pisos favoritos y verlos en una tabla comparativa lado a lado, con las celdas coloreadas en verde (mejor valor) o rojo (peor valor) para facilitar la decisión final.

---

## Fase

Consultiva (solo lectura). Sin acciones desde la tabla — el usuario actúa desde la vista normal tras cerrar.

---

## Ubicación en la app

Dentro de `FavoritosView`. Se añade selección a las cards existentes y un botón fijo "Comparar" que abre el modal.

---

## Selección

- Cada card de favorito tiene un **círculo de selección** en la esquina superior derecha.
- Al pulsar, la card queda marcada (borde de color primario + check en el círculo).
- **Máximo:** 2 pisos en móvil, 3 en desktop (`lg:`).
- Cuando se alcanza el máximo, las demás cards se desactivan visualmente (`opacity-40`, sin pointer).
- Con 2+ seleccionados aparece un **botón fijo** en la parte inferior: `📊 Comparar (2)`.
- El botón desaparece si se deselecciona todo.
- Estado: `seleccionados = signal<Set<string>>(new Set())` — local en `FavoritosView`, no persiste.

---

## Modal comparativa

- Se abre como modal de pantalla completa (estilo idéntico al formulario, `z-[2000]`).
- Cabecera: título `Comparativa` + botón `×` para cerrar.
- Cuerpo: tabla scrollable verticalmente.

### Columnas

- Primera columna: etiqueta del campo (fija, ancho ajustado).
- Columnas siguientes: una por piso seleccionado, con la dirección abreviada como cabecera.
- En móvil: máximo 2 pisos → tabla de 3 columnas (label + 2 pisos).
- En desktop: hasta 3 pisos → tabla de 4 columnas.

### Filas (campos comparados)

| Campo | Lógica de color |
|---|---|
| Dirección | Cabecera, sin color |
| Distrito · Barrio | Sin color (textual) |
| Precio (€) | Verde = menor, Rojo = mayor |
| €/m² | Verde = menor, Rojo = mayor |
| Metros (m²) | Verde = mayor, Rojo = menor |
| Habitaciones | Verde = mayor, Rojo = menor |
| Planta · Ascensor | Sin color (textual) |
| Estado reforma | Verde = Listo entrar, Rojo = Reforma total, neutro = parcial |
| Gastos comunidad (€/mes) | Verde = menor, Rojo = mayor |
| Metro (min) | Verde = menor, Rojo = mayor; sin dato = `—` sin color |
| Bus (min) | Verde = menor, Rojo = mayor; sin dato = `—` sin color |
| Puntuación | Verde = mayor, Rojo = menor |

### Reglas de coloración

- **Solo se colorea si hay al menos 2 valores distintos y válidos** (> 0 o no vacíos).
- Cuando todos los valores son iguales: sin color.
- Cuando un campo no tiene dato (0 o ''): muestra `—` en gris, no participa en la comparación de color.
- Colores: celda con `bg-success/10 text-success` (verde) o `bg-danger/10 text-danger` (rojo).

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `ui/comparativa-modal/comparativa-modal.ts` | **Nuevo** componente |
| `ui/favoritos-view/favoritos-view.ts` | Selección + botón comparar + importar modal |
