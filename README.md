# 🍽️ Woki Reservation Timeline

Sistema de gestión de reservas para restaurantes con una interfaz de línea de tiempo interactiva. Desarrollado como prueba técnica (Take Home) para Woki.

🌐 **[Ver Demo en Vivo](https://agent-694c0194fe3f1--iridescent-alfajores-d7c937.netlify.app/)**

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2.11-764ABC?logo=redux)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite)
![Ant Design](https://img.shields.io/badge/Ant_Design-6.1-0170FE?logo=antdesign)

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías y Justificaciones](#-tecnologías-y-justificaciones)
- [Decisiones de Arquitectura](#-decisiones-de-arquitectura)
- [Algoritmo de Detección de Conflictos](#-algoritmo-de-detección-de-conflictos)
- [Instalación](#-instalación)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Funcionalidades Detalladas](#-funcionalidades-detalladas)
- [Modelo de Datos](#-modelo-de-datos)
- [Limitaciones Conocidas](#-limitaciones-conocidas)

## ✨ Características

### Gestión de Reservas
- **Crear reservas**: Click y drag en el timeline para seleccionar horario
- **Mover reservas**: Drag & drop para cambiar mesa y/o horario
- **Redimensionar**: Handles en los bordes para ajustar duración
- **Duplicar/Eliminar**: Menú contextual (click derecho)
- **Cambiar estado**: Menú contextual con estados disponibles

### Timeline Interactivo
- **Vista por día**: Timeline de 11:00 a 00:00 (13 horas)
- **Slots de 15 minutos**: Granularidad precisa para reservas
- **Zoom dinámico**: Ajustar nivel de detalle (50% - 200%)
- **Scroll sincronizado**: Header y body se mueven juntos
- **Scrubber**: Navegación rápida por el timeline

### Filtros y Búsqueda
- **Filtrar por sector**: Main Hall, Terrace, etc.
- **Filtrar por estado**: PENDING, CONFIRMED, SEATED, etc.
- **Búsqueda en tiempo real**: Por nombre o teléfono del cliente

### Validaciones y Conflictos
- **Detección de overlap**: No permite superposición de reservas
- **Validación de capacidad**: Tamaño del grupo vs capacidad de mesa
- **Horarios de servicio**: Almuerzo (12:00-16:00) y Cena (20:00-00:00)
- **Feedback visual**: Bloques rojos pulsantes para conflictos

### Animaciones Avanzadas
- **Spring physics**: Efecto rebote al soltar bloques
- **Fade in**: Aparición suave de nuevas reservas
- **Stagger animations**: Entrada escalonada al filtrar
- **Conflict pulse**: Parpadeo rojo en conflictos
- **Capacity wave**: Indicador de ocupación por mesa

### Rendimiento
- **200+ reservas sin lag**: Optimizado para grandes volúmenes
- **Memoización**: Selectores con `createSelector`
- **React.memo**: Componentes memorizados
- **RequestAnimationFrame**: Drag suave a 60fps

## 🛠️ Tecnologías y Justificaciones

| Categoría | Tecnología | Versión | Justificación |
|-----------|------------|---------|---------------|
| **Framework** | React | 19.2 | Ecosistema maduro, componentes declarativos, excelente para UIs interactivas con actualizaciones frecuentes |
| **Lenguaje** | TypeScript | 5.9 | Tipado estático previene errores en tiempo de desarrollo, mejor autocompletado y refactoring seguro |
| **Estado** | Redux Toolkit | 2.11 | Estado global predecible, DevTools para debugging, `createSelector` para memoización eficiente |
| **UI Components** | Ant Design | 6.1 | Componentes enterprise-ready (Modal, Form, Dropdown), ahorra tiempo en UI básica |
| **Estilos** | SCSS Modules | - | Estilos encapsulados por componente, variables y mixins para consistencia, sin conflictos de nombres |
| **Build Tool** | Vite | 7.2 | HMR instantáneo, builds rápidos con esbuild, mejor DX que webpack |
| **Fechas** | date-fns | 4.1 | API funcional e inmutable, tree-shakeable (solo importas lo que usas), mejor que moment.js |
| **Testing** | Vitest | 4.0 | Compatible con Vite, API similar a Jest, ejecución rápida |

### ¿Por qué Redux Toolkit sobre otras alternativas?

- **Zustand**: Más simple pero menos estructura para apps complejas
- **Context API**: Causa re-renders innecesarios sin memoización manual
- **Redux Toolkit**: Ofrece `createSlice` (reduce boilerplate), `createSelector` (memoización), y DevTools integradas. Plus, es la herramienta con la que trabajo a diario por cual puedo agilizar el desarrollo sin tener que aprender otro state management.

### ¿Por qué SCSS Modules sobre CSS-in-JS?

- **Styled-components/Emotion**: Añaden overhead en runtime y bundle size
- **Tailwind**: Excelente para prototipado pero clases largas dificultan legibilidad en componentes complejos
- **SCSS Modules**: Zero runtime, estilos compilados, variables nativas, excelente performance

## 🏗️ Decisiones de Arquitectura

### Diagrama General

```
┌─────────────────────────────────────────────────────────────┐
│                        TimelinePage                         │
├─────────────┬─────────────────────────────────┬─────────────┤
│   Toolbar   │         TimeHeader              │             │
│  (filters)  │    (hours + scrubber)           │             │
├─────────────┼─────────────────────────────────┤             │
│   Table     │                                 │             │
│   Labels    │        TimelineBody             │   Redux     │
│             │   (grid + reservations)         │   Store     │
│             │                                 │             │
│             │  ┌─────────────────────────┐    │             │
│             │  │  ReservationBlockMemo   │    │             │
│             │  │  (memoized blocks)      │    │             │
│             │  └─────────────────────────┘    │             │
│             │  ┌─────────────────────────┐    │             │
│             │  │     CapacityWave        │    │             │
│             │  │  (capacity indicators)  │    │             │
│             │  └─────────────────────────┘    │             │
└─────────────┴─────────────────────────────────┴─────────────┘
```

### 1. Estrategia de Renderizado

#### Problema
Con 200+ reservas, renderizar todos los bloques en cada cambio de estado causa lag notable.

#### Solución: Memoización Multinivel

```typescript
// Nivel 1: Selectores memoizados con createSelector
export const selectVisibleReservations = createSelector(
  [selectAllReservations, selectFilters],
  (reservations, filters) => reservations.filter(r => matchesFilters(r, filters))
);

// Nivel 2: Componentes memoizados con React.memo
export const ReservationBlock = memo(ReservationBlockInner, (prev, next) => {
  return prev.reservationId === next.reservationId &&
         prev.zoom === next.zoom &&
         prev.isDragging === next.isDragging;
});

// Nivel 3: Cada bloque tiene su propio selector interno
const reservation = useAppSelector(s => s.reservations.byId[reservationId]);
```

**Resultado**: Solo se re-renderizan los bloques afectados, no toda la lista.

### 2. Gestión de Estado

#### Estado Global (Redux)
- **Reservas**: `byId` (normalizado) + `allIds` (orden)
- **Mesas y Sectores**: Datos estáticos del restaurante
- **UI**: Zoom, filtros activos, IDs seleccionados

#### Estado Local (useState/useRef)
- **Drafts de drag**: Posición temporal durante arrastre
- **Pointer capture**: Referencias a elementos del DOM
- **Animaciones**: Estados transitorios (justDropped, staggerIndex)

#### ¿Por qué esta separación?
- El estado de drag cambia a 60fps → Redux sería muy lento
- Usamos `useRef` para datos de alta frecuencia
- Solo hacemos `dispatch` al **commit** (soltar el bloque)

```
Drag Start → useRef (posición local) → onPointerMove (RAF) → Commit → dispatch(upsertReservation)
```

### 3. Implementación de Drag & Drop

#### ¿Por qué Pointer Events nativos en lugar de librerías?

| Opción | Problema |
|--------|----------|
| react-dnd | Overhead innecesario, API compleja para nuestro caso |
| react-beautiful-dnd | Diseñado para listas, no para grids 2D |
| @dnd-kit | Buena opción pero añade dependencia externa |
| **Pointer Events** | Control total, zero overhead, soporte táctil nativo |

#### Arquitectura del Drag

```typescript
// Context provee funciones de drag a todos los bloques
const TimelineInteractionContext = createContext<{
  startDrag: (payload: DragStartPayload) => void;
}>(...);

// Tres modos de drag unificados
type DragMode = 'move' | 'resizeLeft' | 'resizeRight';

// El grid captura todos los pointer events
<div
  onPointerDown={onGridPointerDown}   // Inicia CREATE drag
  onPointerMove={onGridPointerMove}   // Actualiza posición (throttled con RAF)
  onPointerUp={onGridPointerUp}       // Commit o revert
>
```

#### Flujo de Drag Detallado

1. **PointerDown en bloque**: Activa modo move/resize, captura pointer
2. **PointerMove**: Calcula nuevo slot con snap a 15min, detecta conflictos
3. **PointerUp**: 
   - Si hay conflicto → muestra warning, revierte
   - Si es válido → dispatch al store, trigger animación spring

#### Snap a Grid
```typescript
function slotFromPointer({ clientX, gridLeft, scrollLeft, zoom }) {
  const relativeX = clientX - gridLeft + scrollLeft;
  const slotPx = BASE_CELL_PX * zoom;
  return Math.round(relativeX / slotPx); // Snap automático
}
```

### 4. Flujo de Datos

```
User Action → Dispatch → Redux Reducer → Selector → Component Re-render
     │                                       │
     └── Drag Events ──► Context ──► Local State (drafts) ──► Commit ──┘
```

## � Algoritmo de Detección de Conflictos

El sistema detecta tres tipos de conflictos en tiempo real durante el drag:

### Tipos de Conflicto

| Tipo | Descripción | Validación |
|------|-------------|------------|
| `overlap` | Superposición con otra reserva | Rangos de tiempo se intersectan en la misma mesa |
| `capacity_exceeded` | Grupo muy grande para la mesa | `partySize > table.capacity.max` |
| `outside_service_hours` | Fuera del horario de servicio | No está en ventanas 12:00-16:00 o 20:00-00:00 |

### Implementación

```typescript
function computeConflict({ tableId, startSlot, endSlot, partySize, excludeId }) {
  // 1. Verificar capacidad de la mesa
  const table = tablesById[tableId];
  if (partySize > table.capacity.max) {
    return { hasConflict: true, reason: 'capacity_exceeded' };
  }

  // 2. Verificar horarios de servicio
  const SERVICE_WINDOWS = [
    { startSlot: 4, endSlot: 20 },   // 12:00-16:00 (almuerzo)
    { startSlot: 36, endSlot: 52 },  // 20:00-00:00 (cena)
  ];
  
  const inServiceWindow = SERVICE_WINDOWS.some(
    w => startSlot >= w.startSlot && endSlot <= w.endSlot
  );
  
  if (!inServiceWindow) {
    return { hasConflict: true, reason: 'outside_service_hours' };
  }

  // 3. Verificar overlap con otras reservas
  const tableReservations = allReservations.filter(
    r => r.tableId === tableId && r.id !== excludeId
  );
  
  for (const existing of tableReservations) {
    const existingStart = slotFromTime(existing.startTime);
    const existingEnd = slotFromTime(existing.endTime);
    
    // Overlap si: newStart < existingEnd AND newEnd > existingStart
    if (startSlot < existingEnd && endSlot > existingStart) {
      return { hasConflict: true, reason: 'overlap' };
    }
  }

  return { hasConflict: false };
}
```

### Visualización de Conflictos

Cuando se detecta un conflicto durante el drag:

1. **Ghost rojo**: El fantasma de la reserva cambia a rojo con animación de pulso
2. **Mensaje al soltar**: Se muestra un toast con el motivo específico del conflicto
3. **Revert automático**: La reserva vuelve a su posición original

```scss
// Animación de conflicto
@keyframes conflictPulse {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.02); }
}

.ghost--conflict {
  background: rgba(239, 68, 68, 0.4);
  border: 2px dashed #ef4444;
  animation: conflictPulse 0.6s ease-in-out infinite;
}
```

### Complejidad del Algoritmo

- **Tiempo**: O(n) donde n = reservas en la mesa objetivo
- **Espacio**: O(1) constante
- **Optimización**: Solo filtra reservas de la mesa actual, no todas

## �🚀 Instalación

### Prerrequisitos

- **Node.js** >= 18.x
- **pnpm** >= 8.x (recomendado) o npm/yarn

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd TakeHomeWoki
   ```

2. **Instalar dependencias**
   ```bash
   pnpm install
   ```

3. **Iniciar servidor de desarrollo**
   ```bash
   pnpm run dev
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:5173
   ```

## 📜 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm run dev` | Inicia servidor de desarrollo con HMR |
| `pnpm run build` | Compila TypeScript y genera build de producción |
| `pnpm run preview` | Previsualiza el build de producción |
| `pnpm run lint` | Ejecuta ESLint para verificar código |

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Configuración global
│   ├── hooks.ts           # Hooks tipados de Redux
│   ├── selectors.ts       # Selectores memoizados
│   └── store.ts           # Configuración del store
│
├── domain/                 # Lógica de negocio
│   ├── types.ts           # Tipos e interfaces TypeScript
│   ├── seed.ts            # Datos iniciales (mock)
│   ├── generator.ts       # Generador de reservas aleatorias
│   ├── scheduler.ts       # Lógica de scheduling y conflictos
│   ├── conflicts.ts       # Detección de conflictos
│   └── time.ts            # Utilidades de tiempo
│
├── features/
│   └── timeline/          # Feature principal
│       ├── TimelinePage.tsx
│       ├── timeline.module.scss
│       ├── components/
│       │   ├── Toolbar.tsx           # Filtros y zoom
│       │   ├── TimeHeader.tsx        # Cabecera con horas
│       │   ├── TimelineBody.tsx      # Grid principal
│       │   ├── TimelineScrubber.tsx  # Navegador del timeline
│       │   ├── ReservationBlock.tsx  # Bloque de reserva base
│       │   ├── ReservationBlockMemo.tsx  # Versión memoizada
│       │   ├── CapacityWave.tsx      # Indicador de capacidad
│       │   ├── CurrentTimeMarker.tsx # Línea de hora actual
│       │   ├── StatusLegend.tsx      # Leyenda de estados
│       │   ├── TableRow.tsx          # Fila de mesa
│       │   └── interaction/
│       │       └── TimelineInteractionContext.tsx
│       └── utils/
│           └── coords.ts             # Cálculos de coordenadas
│
└── styles/
    ├── _variables.scss    # Variables SCSS
    └── colors.ts          # Paleta de colores
```

## 🎯 Funcionalidades Detalladas

### Crear Reserva
1. Click y arrastra en un espacio vacío del timeline
2. El ghost (fantasma) muestra la selección
3. Si hay conflicto, se muestra en rojo
4. Al soltar, se abre modal con formulario
5. Completar datos del cliente y confirmar

### Mover Reserva
1. Click y arrastra sobre un bloque existente
2. Mueve horizontal (tiempo) y vertical (mesa)
3. Feedback visual de conflictos en tiempo real
4. Al soltar, se aplica el cambio (con animación spring)

### Redimensionar Reserva
1. Hover sobre un bloque para ver handles
2. Arrastra el handle izquierdo o derecho
3. Mínimo: 15 minutos (1 slot)
4. Respeta límites del timeline

### Estados de Reserva

| Estado | Color | Descripción |
|--------|-------|-------------|
| `PENDING` | 🟡 Amarillo | Esperando confirmación |
| `CONFIRMED` | 🔵 Azul | Reserva confirmada |
| `SEATED` | 🟢 Verde | Cliente sentado |
| `FINISHED` | ⚫ Gris | Reserva finalizada |
| `NO_SHOW` | 🟠 Naranja | Cliente no se presentó |
| `CANCELLED` | 🔴 Rojo rayado | Reserva cancelada |

### Prioridades

| Prioridad | Descripción |
|-----------|-------------|
| `STANDARD` | Reserva normal |
| `VIP` | Cliente preferencial |
| `LARGE_GROUP` | Grupo grande (6+ personas) |

## 📊 Modelo de Datos

### Reservation
```typescript
interface Reservation {
  id: UUID;
  tableId: UUID;
  customer: Customer;
  partySize: number;
  startTime: ISODateTime;
  endTime: ISODateTime;
  durationMinutes: Minutes;
  status: ReservationStatus;
  priority: Priority;
  notes?: string;
  source?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

### Table
```typescript
interface Table {
  id: UUID;
  sectorId: UUID;
  name: string;
  capacity: { min: number; max: number };
  sortOrder: number;
}
```

### Sector
```typescript
interface Sector {
  id: UUID;
  name: string;
  color: string;
  sortOrder: number;
}
```

## ⚙️ Configuración del Timeline

```typescript
const timelineConfig = {
  date: '2025-10-15',
  startHour: 11,        // 11:00
  endHour: 24,          // 00:00 (medianoche)
  slotMinutes: 15,      // Granularidad
  viewMode: 'day',
  timezone: 'America/Argentina/Buenos_Aires',
  cellWidthPx: 60,      // Ancho base por slot
  rowHeightPx: 60,      // Alto de fila
};
```

## 🎨 Personalización

### Colores de Estado
Editar `src/styles/colors.ts`:
```typescript
export const STATUS_COLORS: Record<ReservationStatus, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  SEATED: '#10B981',
  FINISHED: '#6B7280',
  NO_SHOW: '#EF4444',
  CANCELLED: '#DC2626',
};
```

### Horarios de Servicio
Editar `src/features/timeline/components/TimelineBody.tsx`:
```typescript
const SERVICE_WINDOWS = [
  { startSlot: 4, endSlot: 20 },   // 12:00-16:00 (almuerzo)
  { startSlot: 36, endSlot: 52 },  // 20:00-00:00 (cena)
];
```

## 📝 Licencia

Este proyecto fue desarrollado como prueba técnica para Woki.

## ⚠️ Limitaciones Conocidas

### Funcionales

| Limitación | Descripción | Posible Mejora |
|------------|-------------|----------------|
| **Sin persistencia** | Los datos se pierden al recargar la página | Integrar con backend/localStorage |
| **Vista única** | Solo vista de día, no semanal/mensual | Implementar viewMode 'week' y '3-day' |
| **Sin autenticación** | No hay sistema de usuarios/roles | Agregar auth con JWT |
| **Timezone fijo** | Usa timezone de Argentina hardcodeado | Hacer configurable por restaurante |
| **Sin undo/redo** | No se pueden deshacer cambios | Implementar history stack |

### Técnicas

| Limitación | Descripción | Posible Mejora |
|------------|-------------|----------------|
| **Datos mock** | Usa generador de datos aleatorios | Conectar a API REST real |
| **Sin tests E2E** | Faltan tests unitarios básicos | Agregar Playwright/Cypress |
| **Sin PWA** | No funciona offline | Agregar Service Worker |
| **Sin virtualización** | Renderiza todas las filas visibles | Usar react-window para 100+ mesas |
| **Sin WebSockets** | No hay actualizaciones en tiempo real | Implementar socket.io para sync |

### UX

| Limitación | Descripción | Posible Mejora |
|------------|-------------|----------------|
| **Sin keyboard shortcuts** | Solo interacción con mouse | Agregar atajos (Esc, Delete, Ctrl+Z) |
| **Sin accesibilidad completa** | Falta soporte screen reader | Agregar ARIA labels y roles |
| **Sin responsive mobile** | Diseñado para desktop | Adaptar UI para touch/móvil |
| **Sin dark mode** | Solo tema claro | Implementar toggle de tema |

### Conocidas por Resolver

1. **Click en menú contextual**: Al seleccionar opciones del menú contextual sobre una reserva, ocasionalmente puede disparar el modal de crear nueva reserva si el click atraviesa al grid.

2. **Duplicar reserva**: La función duplicar crea la copia en el mismo slot, generando conflicto inmediato. Debería desplazar automáticamente al siguiente slot disponible.

3. **Animaciones en Safari**: Algunas animaciones CSS pueden no renderizar correctamente en Safari < 15.

---

Desarrollado con ❤️ usando React + TypeScript
