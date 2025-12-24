// Memoized selectors for filtering and performance

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './store';
import type { Reservation, Table } from '../domain/types';

const selectReservationsById = (state: RootState) => state.reservations.byId;
const selectTables = (state: RootState) => state.static.tables;
const selectSectors = (state: RootState) => state.static.sectors;
const selectSectorFilter = (state: RootState) => state.ui.sectorFilter;
const selectStatusFilter = (state: RootState) => state.ui.statusFilter;
const selectSearch = (state: RootState) => state.ui.search;

export const selectSortedTables = createSelector(
  [selectTables],
  (tables): Table[] => [...tables].sort((a, b) => a.sortOrder - b.sortOrder)
);

export const selectVisibleTables = createSelector(
  [selectSortedTables, selectSectorFilter],
  (tables, sectorFilter): Table[] => {
    if (sectorFilter.length === 0) return tables;
    return tables.filter((t) => sectorFilter.includes(t.sectorId));
  }
);

export const selectTablesById = createSelector(
  [selectSortedTables],
  (tables): Map<string, Table> => new Map(tables.map((t) => [t.id, t]))
);

export const selectVisibleTableIds = createSelector(
  [selectVisibleTables],
  (tables): Set<string> => new Set(tables.map((t) => t.id))
);

export const selectAllReservations = createSelector(
  [selectReservationsById],
  (byId): Reservation[] => Object.values(byId)
);

export const selectVisibleReservations = createSelector(
  [selectAllReservations, selectVisibleTableIds, selectStatusFilter, selectSearch],
  (reservations, visibleTableIds, statusFilter, search): Reservation[] => {
    let result = reservations;

    if (visibleTableIds.size > 0) {
      result = result.filter((r) => visibleTableIds.has(r.tableId));
    }

    if (statusFilter.length > 0) {
      result = result.filter((r) => statusFilter.includes(r.status));
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      result = result.filter((r) => {
        const name = r.customer.name.toLowerCase();
        const phone = r.customer.phone.toLowerCase();
        return name.includes(searchLower) || phone.includes(searchLower);
      });
    }

    return result;
  }
);

export const selectVisibleReservationIds = createSelector(
  [selectVisibleReservations],
  (reservations): string[] => reservations.map((r) => r.id)
);

export const makeSelectReservationById = (id: string) =>
  (state: RootState): Reservation | undefined => state.reservations.byId[id];

export const selectSectorsForFilter = createSelector(
  [selectSectors],
  (sectors) => sectors.map((s) => ({ value: s.id, label: s.name, color: s.color }))
);

export const STATUS_OPTIONS_FOR_FILTER = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'SEATED', label: 'Sentados' },
  { value: 'FINISHED', label: 'Finalizada' },
  { value: 'NO_SHOW', label: 'No show' },
  { value: 'CANCELLED', label: 'Cancelada' },
] as const;
