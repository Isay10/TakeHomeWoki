// Conflict detection logic

import { parseISO } from 'date-fns';
import type { ConflictCheck, Reservation, ServiceWindow, Table } from './types';

function toMinutesOfDay(hhmm: string): number {
  const [hh, mm] = hhmm.split(':').map(Number);
  // "00:00" => 24:00 for comparisons at end of day
  const hours = hh === 0 ? 24 : hh;
  return hours * 60 + mm;
}

export function overlaps(a: Reservation, b: Reservation): boolean {
  const aStart = parseISO(a.startTime).getTime();
  const aEnd = parseISO(a.endTime).getTime();
  const bStart = parseISO(b.startTime).getTime();
  const bEnd = parseISO(b.endTime).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function checkCapacity(table: Table, partySize: number): ConflictCheck {
  const ok = partySize >= table.capacity.min && partySize <= table.capacity.max;
  return ok
    ? { hasConflict: false, conflictingReservationIds: [] }
    : { hasConflict: true, conflictingReservationIds: [], reason: 'capacity_exceeded' };
}

export function isWithinServiceHours(serviceHours: ServiceWindow[], startHHMM: string, endHHMM: string): boolean {
  const start = toMinutesOfDay(startHHMM);
  const end = toMinutesOfDay(endHHMM);

  return serviceHours.some((w) => {
    const ws = toMinutesOfDay(w.start);
    const we = toMinutesOfDay(w.end);
    return start >= ws && end <= we;
  });
}

export function checkOverlapOnTable(
  candidate: Reservation,
  existingOnSameTable: Reservation[],
): ConflictCheck {
  const conflictingIds: string[] = [];
  for (const r of existingOnSameTable) {
    if (r.id === candidate.id) continue;
    if (overlaps(candidate, r)) conflictingIds.push(r.id);
  }
  return conflictingIds.length
    ? { hasConflict: true, conflictingReservationIds: conflictingIds, reason: 'overlap' }
    : { hasConflict: false, conflictingReservationIds: [] };
}
