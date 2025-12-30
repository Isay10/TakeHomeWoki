// Data generator utilities

import { addMinutes, formatISO, getHours, getMinutes } from 'date-fns';
import type { Priority, Reservation, ReservationStatus, SeedData } from './types';
import { dayStartDate, timelineTotalMinutes } from './time';
import { timelineConfig } from './seed';

const FIRST_NAMES = ['Ana', 'Juan', 'Sofía', 'Mateo', 'Lucía', 'Pedro', 'Valen', 'Nico', 'Mili', 'Tomi'];
const LAST_NAMES = ['Gómez', 'Pérez', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Díaz', 'Sánchez'];

const STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'SEATED', 'FINISHED', 'NO_SHOW', 'CANCELLED'];
const PRIORITIES: Priority[] = ['STANDARD', 'VIP', 'LARGE_GROUP'];

const BLOCKED_START_HOUR = 16; 
const BLOCKED_END_HOUR = 20;   
const MIN_SERVICE_HOUR = 8;    

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


function isBlockedTime(date: Date): boolean {
  const hour = getHours(date);
  const minutes = getMinutes(date);
  const timeInMinutes = hour * 60 + minutes;

  if (timeInMinutes < MIN_SERVICE_HOUR * 60) {
    return true;
  }

  if (timeInMinutes >= BLOCKED_START_HOUR * 60 && timeInMinutes < BLOCKED_END_HOUR * 60) {
    return true;
  }

  return false;
}

function overlapsBlockedPeriod(start: Date, end: Date): boolean {
  const startHour = getHours(start);
  const startMinutes = getMinutes(start);
  const endHour = getHours(end);
  const endMinutes = getMinutes(end);

  const startTimeInMinutes = startHour * 60 + startMinutes;
  const endTimeInMinutes = endHour * 60 + endMinutes;

  const blockedStartMinutes = BLOCKED_START_HOUR * 60;
  const blockedEndMinutes = BLOCKED_END_HOUR * 60;

  return startTimeInMinutes < blockedEndMinutes && endTimeInMinutes > blockedStartMinutes;
}

function reservationsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2;
}


function hasOverlapWithExisting(
  tableId: string,
  start: Date,
  end: Date,
  existingReservations: Reservation[]
): boolean {
  return existingReservations.some((r) => {
    if (r.tableId !== tableId) return false;
    const existingStart = new Date(r.startTime);
    const existingEnd = new Date(r.endTime);
    return reservationsOverlap(start, end, existingStart, existingEnd);
  });
}


function getValidTimeSlots(baseDate: Date, totalMinutes: number): { startMinute: number; maxDuration: number }[] {
  const slots: { startMinute: number; maxDuration: number }[] = [];
  const baseHour = baseDate.getHours();

  const firstPeriodEnd = Math.max(0, (BLOCKED_START_HOUR - baseHour) * 60);
  if (firstPeriodEnd > 0) {
    for (let m = 0; m < firstPeriodEnd; m += 15) {
      const maxDuration = firstPeriodEnd - m;
      if (maxDuration >= 30) {
        slots.push({ startMinute: m, maxDuration });
      }
    }
  }

  const secondPeriodStart = Math.max(0, (BLOCKED_END_HOUR - baseHour) * 60);
  if (secondPeriodStart < totalMinutes) {
    for (let m = secondPeriodStart; m < totalMinutes; m += 15) {
      const maxDuration = totalMinutes - m;
      if (maxDuration >= 30) {
        slots.push({ startMinute: m, maxDuration });
      }
    }
  }

  return slots;
}

export function generateReservations(seedData: SeedData, count: number): Reservation[] {
  const baseDate = dayStartDate(timelineConfig);
  const total = timelineTotalMinutes(timelineConfig);

  const tableIds = seedData.tables.map((t) => t.id);
  const validSlots = getValidTimeSlots(baseDate, total);

  if (validSlots.length === 0) {
    console.warn('No valid time slots available for reservations');
    return [];
  }

  const res: Reservation[] = [];
  let attempts = 0;
  const maxAttempts = count * 10; // Prevent infinite loops

  while (res.length < count && attempts < maxAttempts) {
    attempts++;

    const tableId = pick(tableIds);
    const slot = pick(validSlots);

    const duration = pick([30, 45, 60, 75, 90, 105, 120]); 
    const safeDuration = Math.min(duration, slot.maxDuration);

    if (safeDuration < 30) continue; 

    const start = addMinutes(baseDate, slot.startMinute);
    const end = addMinutes(start, safeDuration);

    if (overlapsBlockedPeriod(start, end)) {
      continue;
    }

    if (isBlockedTime(start)) {
      continue;
    }

    if (hasOverlapWithExisting(tableId, start, end, res)) {
      continue;
    }

    const id = `GEN_${String(res.length + 1).padStart(4, '0')}`;

    const status = pick(STATUSES);
    const priority = pick(PRIORITIES);

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

  if (res.length < count) {
    console.warn(`Only generated ${res.length} of ${count} requested reservations due to constraints`);
  }

  return res;
}
