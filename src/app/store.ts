// Redux store configuration

import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Reservation, Sector, Table } from '../domain/types';
import { seed } from '../domain/seed';
import { generateReservations } from '../domain/generator';

type ReservationsState = {
  byId: Record<string, Reservation>;
  idsByTable: Record<string, string[]>;
};

const initialReservations = [...seed.reservations, ...generateReservations(seed, 5)];

function buildReservationsState(reservations: Reservation[]): ReservationsState {
  const byId: Record<string, Reservation> = {};
  const idsByTable: Record<string, string[]> = {};

  for (const r of reservations) {
    byId[r.id] = r;
    idsByTable[r.tableId] ??= [];
    idsByTable[r.tableId].push(r.id);
  }

  for (const tableId of Object.keys(idsByTable)) {
    idsByTable[tableId].sort((a, b) => byId[a].startTime.localeCompare(byId[b].startTime));
  }

  return { byId, idsByTable };
}

const reservationsSlice = createSlice({
  name: 'reservations',
  initialState: buildReservationsState(initialReservations),
  reducers: {
    upsertReservation(state, action: PayloadAction<Reservation>) {
      const r = action.payload;
      state.byId[r.id] = r;
      state.idsByTable[r.tableId] ??= [];
      if (!state.idsByTable[r.tableId].includes(r.id)) state.idsByTable[r.tableId].push(r.id);
      state.idsByTable[r.tableId].sort((a, b) => state.byId[a].startTime.localeCompare(state.byId[b].startTime));
    },
    deleteReservation(state, action: PayloadAction<{ id: string }>) {
      const { id } = action.payload;
      const r = state.byId[id];
      if (!r) return;
      delete state.byId[id];
      state.idsByTable[r.tableId] = (state.idsByTable[r.tableId] || []).filter((x) => x !== id);
    },
  },
});

type UiState = {
  zoom: number;
  search: string;
  sectorFilter: string[];
  statusFilter: string[];
  selectedReservationIds: string[];
};

const initialUiState: UiState = {
  zoom: 1,
  search: '',
  sectorFilter: [],
  statusFilter: [],
  selectedReservationIds: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUiState,
  reducers: {
    setZoom(state, action: PayloadAction<number>) {
      state.zoom = action.payload;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setSectorFilter(state, action: PayloadAction<string[]>) {
      state.sectorFilter = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<string[]>) {
      state.statusFilter = action.payload;
    },
    setSelection(state, action: PayloadAction<string[]>) {
      state.selectedReservationIds = action.payload;
    },
    clearSelection(state) {
      state.selectedReservationIds = [];
    },
    toggleSelection(state, action: PayloadAction<{ id: string; additive: boolean }>) {
      const { id, additive } = action.payload;

      if (!additive) {
        state.selectedReservationIds = [id];
        return;
      }

      const exists = state.selectedReservationIds.includes(id);
      state.selectedReservationIds = exists
        ? state.selectedReservationIds.filter((x) => x !== id)
        : [...state.selectedReservationIds, id];
    },
  },
});

const staticSlice = createSlice({
  name: 'static',
  initialState: {
    restaurant: seed.restaurant,
    sectors: seed.sectors as Sector[],
    tables: seed.tables as Table[],
  },
  reducers: {},
});

export const { upsertReservation, deleteReservation } = reservationsSlice.actions;
export const { setZoom, setSearch, setSectorFilter, setStatusFilter, setSelection, clearSelection, toggleSelection } = uiSlice.actions;

export const store = configureStore({
  reducer: {
    static: staticSlice.reducer,
    reservations: reservationsSlice.reducer,
    ui: uiSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
