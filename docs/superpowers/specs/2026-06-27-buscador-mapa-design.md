# Spec: Buscador de calles en el mapa

**Fecha:** 2026-06-27
**Estado:** Aprobado

---

## Objetivo

Añadir un buscador de direcciones sobre el mapa que permita localizar una calle/número en Madrid, volar a esa ubicación y opcionalmente añadir un piso desde ahí.

---

## API: Photon (Komoot)

Sin API key, sin registro, diseñado para autocomplete.

```
GET https://photon.komoot.io/api/?q=<texto>&lang=es&limit=5&bbox=-3.9,40.3,-3.5,40.6
```

- `bbox` limita resultados al área de Madrid.
- Responde GeoJSON: `features[].geometry.coordinates` = `[lng, lat]` (invertir para Leaflet).
- `features[].properties` contiene `name`, `street`, `housenumber`, `city`, `district`.
- Debounce: 400ms para no saturar el servicio.

---

## Placement

**Esquina superior izquierda del mapa**, superpuesto con `position: absolute`.

Estado colapsado: botón redondo (`h-10 w-10`) con icono `search`.
Estado expandido: pill que se extiende hacia la derecha con el input + micrófono + X.

En móvil el pill ocupa casi el ancho completo. En desktop se queda en la esquina.
`z-index: 1050` (sobre tiles OSM, bajo los overlays del form/diálogo).

---

## Flujo completo

```
1. Usuario pulsa 🔍 → input aparece (animación expand)
2. Escribe dirección (o dicta con micrófono)
3. Debounce 400ms → llamada a Photon
4. Dropdown con hasta 5 sugerencias (nombre + ciudad)
5. Usuario selecciona una:
   a. Dropdown se cierra
   b. Input se colapsa
   c. Mapa vuela: map.flyTo([lat, lng], 17)
   d. Marcador temporal aparece en el punto (estilo distinto a los de pisos)
   e. Popup del marcador:
      - Dirección formateada
      - Botón "📍 Añadir piso aquí"
6. Si pulsa "Añadir piso aquí" → nuevo.emit({lat, lng}) → flujo existente
7. Marcador temporal se elimina al cerrar popup, al pulsar ESC, o tras 60s
```

---

## Entrada por voz

- Icono de micrófono dentro del input, **visible solo si** `'SpeechRecognition' in window || 'webkitSpeechRecognition' in window`.
- Al pulsar: inicia `SpeechRecognition` con `lang: 'es-ES'`, `continuous: false`.
- Al obtener resultado: rellena el input y lanza búsqueda automáticamente.
- Si el navegador no lo soporta: el icono no aparece (no hay error, no hay aviso).

---

## Arquitectura

### Cambios en `GeocodingService`

Añadir método `buscarDireccion(texto: string): Promise<ResultadoBusqueda[]>`:

```typescript
interface ResultadoBusqueda {
  etiqueta: string;   // "Calle Mayor, 10 · Centro · Madrid"
  lat: number;
  lng: number;
}
```

Construye la etiqueta a partir de `housenumber + street + district + city`.
Invierte coordenadas GeoJSON `[lng, lat]` → `{lat, lng}`.

### Cambios en `MapaView`

Todo inline en el componente existente (no componente nuevo — el template ya está en `mapa-view`):

**Signals nuevos:**
```typescript
readonly buscadorAbierto = signal(false);
readonly textoBusqueda = signal('');
readonly resultadosBusqueda = signal<ResultadoBusqueda[]>([]);
readonly buscando = signal(false);
readonly marcadorBusqueda = signal<{ lat: number; lng: number; etiqueta: string } | null>(null);
```

**Métodos nuevos:**
- `abrirBuscador()` / `cerrarBuscador()`
- `onTextoBusqueda(texto)` — actualiza signal, lanza debounce
- `seleccionarResultado(r)` — flyTo + marcador temporal
- `iniciarVoz()` — SpeechRecognition
- `limpiarMarcadorBusqueda()` — elimina marcador temporal de Leaflet

**Marcador temporal:**
`L.marker([lat, lng])` con `L.divIcon` distinto (punto indigo parpadeante),
popup con dirección + botón HTML que llama a `nuevo.emit({lat, lng})`.
Se guarda en `private marcadorBuscadorLeaflet?: L.Marker` para limpieza.

---

## Diseño visual (Tailwind v4)

### Botón colapsado
```
┌──────────┐
│    🔍    │   h-10 w-10, rounded-full, bg-surface shadow-md
└──────────┘
```

### Pill expandido
```
┌────────────────────────────────── ✕ ─┐
│ 🔍  Buscar calle o dirección...   🎤 │
└───────────────────────────────────────┘
```

### Dropdown
```
┌───────────────────────────────────────┐
│ Gran Vía, 1 · Centro · Madrid        │
│ Gran Vía, 25 · Centro · Madrid       │
│ Gran Vía de Hortaleza · Hortaleza    │
└───────────────────────────────────────┘
```

### Popup del marcador temporal
```
┌──────────────────────────────┐
│ 📍 Gran Vía, 1              │
│    Centro · Madrid           │
│ ┌──────────────────────────┐ │
│ │  Añadir piso aquí        │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

---

## Lo que NO incluye

- Búsqueda fuera de Madrid (bbox limita el área)
- Historial de búsquedas recientes
- Búsqueda de inmobiliarias o POIs (solo calles/direcciones)
- Geocodificación inversa adicional (ya existe en el flujo de nuevo piso)

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `data/geocoding.service.ts` | Añadir `buscarDireccion()` + interfaz `ResultadoBusqueda` |
| `ui/mapa-view/mapa-view.ts` | UI del buscador + lógica + marcador temporal + voz |
