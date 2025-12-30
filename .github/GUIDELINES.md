# Project Guidelines — Reservation Timeline (Woki Take-Home)

Estos guidelines están pensados para:
- Mantener consistencia técnica/UX durante el desarrollo.
- Darle **contexto operativo** a Copilot/IA (arquitectura, decisiones, constraints).
- Evitar regresiones de performance y bugs de scheduling (overlaps, snapping, timezone).

---

## 1) Objetivo del producto

Implementar una **timeline interactiva** para gestión de reservas de restaurante:
- Eje X: tiempo (slots).
- Eje Y: mesas (agrupadas por sector).
- Reservas como bloques movibles/redimensionables con **drag & drop**.
- **Detección de conflictos en tiempo real** (overlaps + validaciones).
- UX fluida (**60fps**) con 200+ reservas.

---

## 2) Restricciones del dominio (NO negociables)

### Time grid
- **Slot**: 15 minutos (granularidad mínima).
- **Rango**: 11:00 → 00:00 (13h = **52 slots**).
- Duración default: **90 min (6 slots)**.
- Snap: toda interacción (create/move/resize) **snapea** a boundaries de 15min.
- Timezone: local del restaurant (configurable), usar ISO con offset.

### Layout base
- **1 slot = 60px** a zoom 100% (zoomable).
- Altura fila mesa: **60px**.
- Header sticky (tiempos) + columna sticky (nombres mesas) + scroll horizontal/vertical.

---

## 3) Principios de implementación

1. **Separación estricta**:
   - `domain/` (modelos + reglas) NO depende de React.
   - `ui/` (componentes) no implementa reglas complejas de negocio inline.
2. **Coordinate system primero**:
   Conversión determinista tiempo↔px y mesa↔y. Todo DnD se apoya en eso.
3. **Estado normalizado**:
   Lookups rápidos por `tableId` + orden por `startTime`.
4. **Performance como feature**:
   - Minimizar re-renders durante drag.
   - Virtualizar filas de mesas si crece el dataset.
5. **UX clara ante conflictos**:
   Warn visual inmediato + no permitir drop inválido (por defecto).

---

## 4) Data model y tipado

> Mantener el tipado estricto y preferir `type`/`interface` claros para el dominio.

- Usar `ISODateTime` con offset (`2025-10-15T20:00:00-03:00`).
- `SlotIndex` 0-based (cada slot = 15min).

Recomendación: evitar “Date” suelto en el store; guardar string ISO y parsear en bordes (UI/Utils).

---

## 5) Arquitectura sugerida (carpetas)

Una estructura simple y escalable:

```
src/
  domain/
    types.ts
    time.ts               # conversions y helpers puros
    conflict.ts           # algoritmo de conflictos + validaciones
    generator.ts          # seed / random data
  store/
    reservationSlice.ts
    selectors.ts
  ui/
    timeline/
      TimelinePage.tsx
      TimelineToolbar.tsx
      TimelineGrid.tsx
      TimeHeader.tsx
      SectorGroup.tsx
      TableRow.tsx
      ReservationBlock.tsx
      CurrentTimeMarker.tsx
    modals/
      ReservationCreateModal.tsx
      ReservationEditModal.tsx
  styles/
    globals.css
```

Regla: `domain/*` no importa nada de `ui/*`.

---

## 6) Time & pixel conversions (fuente única de verdad)

Crear utilidades puras y testeadas. **No duplicar lógica** en componentes.

### Constantes
- `SLOT_MINUTES = 15`
- `DAY_START_HOUR = 11`
- `DAY_END_HOUR = 24` (00:00)
- `SLOTS_PER_DAY = 52`
- `BASE_SLOT_PX = 60`
- `ROW_HEIGHT_PX = 60`

### Funciones mínimas esperadas
- `minutesToSlots(minutes): number`
- `slotsToMinutes(slots): number`
- `timeToSlotIndex(iso, config): SlotIndex`
- `slotIndexToTime(slot, config): ISODateTime`
- `slotToX(slot, zoom): number`
- `xToSnappedSlot(x, zoom): SlotIndex`
- `clampSlot(slot): SlotIndex` dentro de [0..51]
- `snapSlot(slot): SlotIndex` (ya suele venir entero, pero útil para robustez)

> Guideline: **todo drag/move/resize** opera en slots enteros, no en minutos ni en px.

---

## 7) Rendering del grid

### Reglas
- Time header: labels cada 15m, líneas fuertes cada 30m y cada 60m.
- Sector headers: agrupación de mesas colapsable/expandible.
- Reservas: render sobre la grilla (layer superior).

### Tip de performance
- Evitar renderizar “cada celda” si no hace falta.
- Renderizar:
  - grid lines por CSS (background / repeating-linear-gradient) o canvas,
  - y los bloques encima.

---

## 8) Reservas (UI/UX)

### Contenido mínimo del bloque
- Customer name
- Party size
- Time range
- Priority badge (VIP/LARGE_GROUP)
- Status color

### Colores por status (sugeridos)
- PENDING: `#FCD34D`
- CONFIRMED: `#3B82F6`
- SEATED: `#10B981`
- FINISHED: `#9CA3AF`
- NO_SHOW: `#EF4444`
- CANCELLED: gris con patrón (striped)

### Accesibilidad mínima
- Bloques focuseables (tabIndex) y `aria-label` con detalles clave.
- Tooltip accesible (no solo hover).

---

## 9) Drag & Drop: diseño recomendado

### Golden rule
Durante drag: **estado efímero local** (o store liviano) para evitar re-render masivo.

- Mantener `dragState` como:
  - `activeReservationId`
  - `preview: { tableId, startSlot, endSlot }`
  - `mode: 'create' | 'move' | 'resize-left' | 'resize-right'`

### Interacciones

#### Create
- mousedown en espacio vacío → `creating = true`
- drag horizontal → calcular `startSlot` y `endSlot` (snapped)
- mouseup → abrir modal con table + rango precargado

#### Move
- drag de bloque:
  - Δx → Δslots
  - Δy → table target
- mostrar ghost preview
- si hay conflicto: borde rojo + tooltip

#### Resize
- handles izquierdo/derecho:
  - left: cambia startSlot (y duración)
  - right: cambia endSlot
- min: 30m (2 slots)
- max: 4h (16 slots)

### Implementación
- `requestAnimationFrame` para actualizar preview en drag.
- Evitar setState en cada `mousemove` sin throttle/RAF.

---

## 10) Conflict detection & validation (dominio)

### Conflicto principal: overlap en misma mesa
Dos reservas se solapan si:
- `startA < endB && startB < endA` (en slots)

### Validaciones obligatorias
- Outside service hours → inválido (slot fuera de rango)
- Capacity exceeded → inválido si `partySize` > `table.capacity.max`
- Duration bounds:
  - Create: 30m → 6h
  - Resize: 30m → 4h (según spec)

### Comportamiento ante conflicto
- Default: **no permitir drop**.
- UI: warning visual inmediato (borde rojo, icono, tooltip).

> Importante: la función de conflicto debe ser **pura** y testeada.

---

## 11) Estado y selectors

### Normalización recomendada
- `byId: Record<id, Reservation>`
- `idsByTable: Record<tableId, string[]>` (ordenadas por startTime)

Reglas:
- Mantener `idsByTable[tableId]` siempre ordenado por `startTime` (slot/time).
- Selectors memoizados para:
  - reservas visibles por sector
  - reservas por tabla en rango
  - resultados filtrados por status/search

### Evitar
- Guardar “arrays gigantes” sin memo en componentes padres.
- Recalcular conflictos globales en cada render (hacerlo por tabla afectada).

---

## 12) Filtros y búsqueda

Toolbar mínima:
- Date picker
- Sector filter (multi)
- Status filter
- Search (customer name / phone)
- Zoom (75–150)

Regla:
- Search y filtros con debounce (~300ms) si afectan listas grandes.

---

## 13) Performance checklist (antes de entregar)

- [ ] Drag se siente “pegado al cursor” (sin lag).
- [ ] 200 reservas: scroll horizontal/vertical fluido.
- [ ] Reservas y tablas renderizan solo lo necesario (memo + virtualization si aplica).
- [ ] No hay renders por `mousemove` sin RAF/throttle.
- [ ] Selectors memoizados (si usás Redux Toolkit, reselect).
- [ ] Evitar pasar props inline recreadas (handlers/objects) a listas grandes.

---

## 14) Testing (mínimo)

Usar Vitest + Testing Library.

Tests mínimos sugeridos:
1. Create reservation (drag vacío → modal → save → aparece bloque).
2. Move reservation a slot libre (actualiza start/end).
3. Move a conflicto (bloquea drop + warning).
4. Resize (respeta min/max).
5. Filtering (sector/status/search).

Además:
- unit tests en `domain/time.ts` y `domain/conflict.ts`.

---

## 15) Estilo de código (para Copilot + equipo)

- TypeScript strict: no `any` salvo casos justificados.
- Funciones puras en `domain/` sin side effects.
- Nombres:
  - `ReservationBlock`, `TableRow`, `SectorGroup`
  - `timeToSlotIndex`, `slotToX`
- Preferir `const` y early returns.
- No mezclar lógica de conflicto dentro del componente visual: llamar helpers.

---

## 16) Documentación en el repo

Mantener actualizado:
- `README.md`: setup + decisiones (DND, rendering, state, conflict algo).
- `docs/GUIDELINES.md`: este archivo.
- `docs/ARCHITECTURE.md` (opcional): diagrama simple de flujo drag → preview → validate → commit.

---

## 17) “No hagas esto” (anti-patterns)

- ❌ Convertir px↔time en múltiples lugares (duplicación = bugs).
- ❌ Calcular conflictos recorriendo TODAS las reservas en cada mousemove.
- ❌ Guardar `Date` objects mutables en store global.
- ❌ Renderizar una grilla de 52 * N celdas como DOM nodes si no hace falta.
- ❌ SetState por cada evento de mouse sin RAF/throttle.

---

## 18) Definición de terminado (DoD)

- CORE funcionando: grid + create/move/resize + conflictos + filtros.
- 5+ tests pasando.
- Sin warnings críticos en consola.
- README con decisiones y limitaciones.
- Demo data + generator 100–200 reservas.
