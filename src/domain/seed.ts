// Seed data

import type { SeedData, TimelineConfig } from './types';

export const timelineConfig: TimelineConfig = {
  date: '2025-10-15',
  startHour: 11,
  endHour: 24,
  slotMinutes: 15,
  viewMode: 'day',
  timezone: 'America/Argentina/Buenos_Aires',
  cellWidthPx: 60,
  rowHeightPx: 60,
};

export const seed: SeedData = {
  date: '2025-10-15',
  restaurant: {
    id: 'R1',
    name: 'Bistro Central',
    timezone: 'America/Argentina/Buenos_Aires',
    serviceHours: [
      { start: '12:00', end: '16:00' },
      { start: '20:00', end: '00:00' },
    ],
  },
  sectors: [
    { id: 'S1', name: 'Main Hall', color: '#3B82F6', sortOrder: 0 },
    { id: 'S2', name: 'Terrace', color: '#10B981', sortOrder: 1 },
  ],
  tables: [
    { id: 'T1', sectorId: 'S1', name: 'Table 1', capacity: { min: 2, max: 2 }, sortOrder: 0 },
    { id: 'T2', sectorId: 'S1', name: 'Table 2', capacity: { min: 2, max: 4 }, sortOrder: 1 },
    { id: 'T3', sectorId: 'S1', name: 'Table 3', capacity: { min: 4, max: 6 }, sortOrder: 2 },
    { id: 'T4', sectorId: 'S2', name: 'Table 4', capacity: { min: 2, max: 4 }, sortOrder: 0 },
    { id: 'T5', sectorId: 'S2', name: 'Table 5', capacity: { min: 4, max: 8 }, sortOrder: 1 },
  ],
  reservations: [
    {
      id: 'RES_001',
      tableId: 'T1',
      customer: { name: 'John Doe', phone: '+54 9 11 5555-1234', email: 'john@example.com' },
      partySize: 2,
      startTime: '2025-10-15T20:00:00-03:00',
      endTime: '2025-10-15T21:30:00-03:00',
      durationMinutes: 90,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      source: 'web',
      createdAt: '2025-10-14T15:30:00-03:00',
      updatedAt: '2025-10-14T15:30:00-03:00',
    },
    {
      id: 'RES_002',
      tableId: 'T3',
      customer: { name: 'Jane Smith', phone: '+54 9 11 5555-5678', email: 'jane@example.com' },
      partySize: 6,
      startTime: '2025-10-15T20:30:00-03:00',
      endTime: '2025-10-15T22:00:00-03:00',
      durationMinutes: 90,
      status: 'SEATED',
      priority: 'VIP',
      notes: 'Birthday celebration',
      source: 'phone',
      createdAt: '2025-10-15T19:45:00-03:00',
      updatedAt: '2025-10-15T20:35:00-03:00',
    },
  ],
};
