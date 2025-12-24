# 🍽️ Woki Reservation Timeline

Sistema de gestión de reservas para restaurantes con una interfaz de línea de tiempo interactiva. Desarrollado como prueba técnica (Take Home) para Woki.

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2.11-764ABC?logo=redux)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite)
![Ant Design](https://img.shields.io/badge/Ant_Design-6.1-0170FE?logo=antdesign)

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Funcionalidades Detalladas](#-funcionalidades-detalladas)
- [Modelo de Datos](#-modelo-de-datos)

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

## 🛠️ Tecnologías

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| **Framework** | React | 19.2 |
| **Lenguaje** | TypeScript | 5.9 |
| **Estado** | Redux Toolkit | 2.11 |
| **UI Components** | Ant Design | 6.1 |
| **Estilos** | SCSS Modules | - |
| **Build Tool** | Vite | 7.2 |
| **Fechas** | date-fns | 4.1 |
| **Testing** | Vitest + Testing Library | 4.0 |
| **Linting** | ESLint | 9.39 |

## 🏗️ Arquitectura

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

### Flujo de Datos

```
User Action → Dispatch → Redux Reducer → Selector → Component Re-render
     │                                       │
     └── Drag Events ──► Context ──► Local State (drafts) ──► Commit ──┘
```

## 🚀 Instalación

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

---

Desarrollado con ❤️ usando React + TypeScript
