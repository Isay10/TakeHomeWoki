# ARCHITECTURE — Reservation Timeline (Woki Take-Home)

Este documento explica cómo está organizada la app, qué responsabilidades tiene cada capa y cuál es el flujo de datos para **render**, **drag & drop** y **validación de conflictos**.

> Objetivo: que cualquier dev (o Copilot) pueda hacer cambios con confianza, sin romper dominio/performance.

---

## 1) High-level: capas

```
┌─────────────────────────────────────────────────────────────┐
│ UI (React)                                                  │
│ - TimelinePage / Grid / Rows / Blocks / Modals              │
│ - Manejo de eventos (pointer/mouse/keyboard)                │
└───────────────▲───────────────────────────┬─────────────────┘
                │                           │
                │ selectors / dispatch      │ preview local
                │                           │ (dragState)
┌───────────────┴───────────────────────────▼─────────────────┐
│ Store (Redux Toolkit)                                       │
│ - reservationSlice (state normalizado)                      │
│ - selectors memoizados (por table/sector/rango)             │
└───────────────▲───────────────────────────┬─────────────────┘
                │                           │
                │ usa reglas puras          │ helpers de conversión
┌───────────────┴───────────────────────────▼─────────────────┐
│ Domain (puro, sin React)                                    │
│ - time.ts: slot <-> minutes <-> px                          │
│ - conflict.ts: overlap + validaciones (capacity, bounds)    │
│ - types.ts: tipos del dominio                               │
└─────────────────────────────────────────────────────────────┘
```

**Regla de oro:** `domain/*` no importa nada de UI/store.  
UI y store **solo consumen** funciones del dominio.

---

## 2) Estado (shape recomendado)

### 2.1 Reservas normalizadas

- `byId`: acceso O(1) por reserva.
- `idsByTable`: lista ordenada para render rápido por mesa y validaciones.

Ejemplo:

```ts
type ReservationsState = {
  byId: Record<string, Reservation>;
  idsByTable: Record<string, string[]>; // ordenado por startSlot/startTime
};
```

**Invariante:** `idsByTable[tableId]` siempre está ordenado por `startTime` (o `startSlot`).

### 2.2 UI state (efímero)

Durante drag, evitar escribir “preview” en Redux (porque rerenderiza demasiado).  
Mantener un estado local (en el grid o en un hook):

```ts
type DragState =
  | { status: 'idle' }
  | {
      status: 'dragging';
      mode: 'create' | 'move' | 'resize-left' | 'resize-right';
      activeReservationId?: string;
      preview: { tableId: string; startSlot: number; endSlot: number };
      isValid: boolean;
      reason?: string; // opcional (overlap/capacity/out-of-hours)
    };
```

---

## 3) Coordinate system

### 3.1 Unidades oficiales

- **Slot**: unidad oficial para lógica.
- **Pixels**: solo para rendering y lectura de puntero.
- **Time ISO**: persistencia/serialización.

### 3.2 Conversión (single source of truth)

Implementar funciones puras en `domain/time.ts`:

- `xToSnappedSlot(x, zoom)` (puntero → slot)
- `slotToX(slot, zoom)` (slot → posición)
- `timeToSlotIndex(iso)` y `slotIndexToTime(slot)`

**Norma:** toda interacción de DnD opera en **slots enteros**.

---

## 4) Render pipeline

### 4.1 Selectors

Selectors memoizados por:
- `tableId` (reservas por mesa)
- filtros activos (sector/status/search)
- rango visible (si agregás viewport/virtualization)

Ejemplo conceptual:

- `selectReservationsForTable(tableId)` → `Reservation[]` ordenadas
- `selectVisibleTables(sectorFilter)` → `Table[]`

### 4.2 Componentes (responsabilidades)

- `TimelinePage`
  - setea filtros + layout general
- `TimelineGrid`
  - scroll containers + “engine” de DnD + marker hora actual
- `SectorGroup`
  - renderiza grupo colapsable de mesas
- `TableRow`
  - posiciona reservas en Y fijo, X según slot
- `ReservationBlock`
  - UI del bloque + handles resize + foco/tooltip
- `ReservationCreateModal` / `ReservationEditModal`
  - captura datos (customer, size, status) y confirma cambios

---

## 5) Drag & Drop: flujo completo

### 5.1 Diagrama (move/resize)

```
PointerDown on Block
  -> init dragState (mode, activeId, origin slots/table)
PointerMove (RAF)
  -> compute candidateSlot + candidateTable
  -> snap + clamp
  -> validate (domain/conflict)
  -> set dragState.preview + isValid
PointerUp
  -> if valid: dispatch(commitReservationChange(preview))
  -> else: discard preview (no-op)
  -> reset dragState
```

### 5.2 Create (desde espacio vacío)

```
PointerDown on empty cell
  -> dragState = creating(startSlot = snapped(x), tableId from y)
PointerMove (RAF)
  -> endSlot = snapped(x)
  -> normalize (start=min, end=max) + minDuration
  -> validate
PointerUp
  -> open create modal with (tableId, startSlot, endSlot)
Confirm modal
  -> dispatch(addReservation(...))
```

### 5.3 Validación durante drag (en caliente)

Validar en cada tick de RAF, pero **solo contra la mesa target**:

- Obtener `idsByTable[targetTableId]`
- Resolver overlap por slots (O(k), k=reservas en esa mesa)
- Verificar bounds y capacity

---

## 6) Conflict detection (domain/conflict.ts)

### 6.1 Overlap (misma mesa)

Dos reservas solapan si:

- `startA < endB && startB < endA`

> Trabajar en slots hace que sea determinista y rápido.

### 6.2 Validaciones adicionales

- `outOfHours`: start < 0 o end > SLOTS_PER_DAY
- `capacityExceeded`: partySize > table.capacity.max
- `duration`: min 2 slots (30m), max según modo

### 6.3 API recomendada (pura)

```ts
type ValidationResult =
  | { ok: true }
  | { ok: false; reason: 'OVERLAP' | 'OUT_OF_HOURS' | 'CAPACITY' | 'DURATION' };

function validatePlacement(args: {
  tableId: string;
  startSlot: number;
  endSlot: number;
  reservationsInTable: Array<{ id: string; startSlot: number; endSlot: number }>;
  ignoreReservationId?: string;
  tableCapacityMax: number;
  partySize: number;
}): ValidationResult;
```

---

## 7) Escrituras al store (commit)

Las únicas escrituras esperadas:
- `addReservation`
- `updateReservationTimeAndTable` (move)
- `updateReservationTime` (resize)
- `updateReservationMeta` (status/name/partySize)
- `removeReservation` (opcional)

**Regla:** cada reducer mantiene el invariante de orden en `idsByTable`.

---

## 8) Performance: decisiones clave

1. **Preview local** (no Redux) durante drag.
2. `requestAnimationFrame` para pointermove.
3. `React.memo` en `TableRow` y `ReservationBlock` si reciben props estables.
4. Selectors memoizados, sin recalcular listas gigantes.
5. Grid lines con CSS (background) o canvas, evitando miles de nodos.

---

## 9) Extensibilidad (qué cambiar sin dolor)

- Cambiar slot size: tocar solo `domain/time.ts` + CSS variables.
- Cambiar rango horario: tocar config + `SLOTS_PER_DAY`.
- Agregar virtualización: envolver `SectorGroup/TableRow` con windowing (ej. react-window).
- Agregar “auto-resolve conflicts”: implementar un modo opcional en domain (buscar nearest free slot) sin tocar UI.

---

## 10) Checklist antes de merge

- [ ] Domain puro (sin dependencias React).
- [ ] 5 tests mínimos (create/move/conflict/resize/filter).
- [ ] No hay setState por mousemove sin RAF.
- [ ] `idsByTable` siempre ordenado.
- [ ] README actualizado con decisiones (DnD + conflicto + performance).
