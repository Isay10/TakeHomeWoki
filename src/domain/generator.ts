// Data generator utilities

import { addMinutes, formatISO } from 'date-fns';
import type { Priority, Reservation, ReservationStatus, SeedData } from './types';
import { dayStartDate, timelineTotalMinutes } from './time';
import { timelineConfig } from './seed';

const FIRST_NAMES = ['Ana', 'Juan', 'Sofía', 'Mateo', 'Lucía', 'Pedro', 'Valen', 'Nico', 'Mili', 'Tomi'];
const LAST_NAMES = ['Gómez', 'Pérez', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Díaz', 'Sánchez'];

const STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'SEATED', 'FINISHED', 'NO_SHOW', 'CANCELLED'];
const PRIORITIES: Priority[] = ['STANDARD', 'VIP', 'LARGE_GROUP'];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function randomName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomPhone(): string {
  return `+54 9 11 ${randInt(1000, 9999)}-${randInt(1000, 9999)}`;
}

export function generateReservations(seedData: SeedData, count: number): Reservation[] {
  const baseDate = dayStartDate(timelineConfig);
  const total = timelineTotalMinutes(timelineConfig);

  const tableIds = seedData.tables.map((t) => t.id);

  const res: Reservation[] = [];
  for (let i = 0; i < count; i++) {
    const tableId = pick(tableIds);

    // start between 11:00 and 23:00 (so end can fit)
    const startMinutes = randInt(0, total - 60);
    const duration = pick([30, 45, 60, 75, 90, 105, 120, 150, 180, 240]); // minutes
    const safeDuration = Math.min(duration, total - startMinutes);

    const start = addMinutes(baseDate, startMinutes);
    const end = addMinutes(start, safeDuration);

    const id = `GEN_${String(i + 1).padStart(4, '0')}`;

    const status = pick(STATUSES);
    const priority = pick(PRIORITIES);

    // party size (not capacity-accurate yet; lo validaremos en create)
    const partySize = randInt(1, 8);

    const nowIso = formatISO(new Date());

    res.push({
      id,
      tableId,
      customer: { name: randomName(), phone: randomPhone() },
      partySize,
      startTime: formatISO(start),
      endTime: formatISO(end),
      durationMinutes: safeDuration,
      status,
      priority,
      source: pick(['web', 'phone', 'walkin', 'app']),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }
  return res;
}
