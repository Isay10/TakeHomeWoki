// src/domain/scheduler.ts

export type ConflictReason = 'overlap' | 'capacity_exceeded' | 'outside_service_hours';

export type SlotRange = {
  startSlot: number;
  endSlot: number;
};

export type ServiceWindow = {
  startSlot: number;
  endSlot: number;
};

export type Candidate = {
  id?: string;
  tableId: string;
  startSlot: number;
  endSlot: number;
  partySize: number;
};

export type Existing = {
  id: string;
  tableId: string;
  startSlot: number;
  endSlot: number;
  partySize: number;
};

export type ConflictCheck = {
  hasConflict: boolean;
  conflictingReservationIds: string[];
  reason?: ConflictReason;
};

export const SLOT_MINUTES = 15;

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function normalizeRange(a: number, b: number): SlotRange {
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  return { startSlot: start, endSlot: end };
}

export function rangesOverlap(a: SlotRange, b: SlotRange) {
  return a.startSlot < b.endSlot && b.startSlot < a.endSlot;
}

export function isWithinServiceWindows(
  candidate: { startSlot: number; endSlot: number },
  windows: readonly ServiceWindow[],
) {
  return windows.some((w) => candidate.startSlot >= w.startSlot && candidate.endSlot <= w.endSlot);
}


export function checkConflict(args: {
  candidate: Candidate;
  existingSameTable: Existing[];
  tableCapacityMax: number;
  totalSlots: number;
  serviceWindows?: readonly ServiceWindow[];
}): ConflictCheck {
  const { candidate, existingSameTable, tableCapacityMax, totalSlots, serviceWindows } = args;

  if (
    !Number.isFinite(candidate.startSlot) ||
    !Number.isFinite(candidate.endSlot) ||
    candidate.startSlot < 0 ||
    candidate.endSlot > totalSlots ||
    candidate.startSlot >= candidate.endSlot
  ) {
    return { hasConflict: true, conflictingReservationIds: [], reason: 'outside_service_hours' };
  }

  // Service windows rule (blocks gap like 16-20)
  if (serviceWindows && serviceWindows.length > 0) {
    if (!isWithinServiceWindows(candidate, serviceWindows)) {
      return { hasConflict: true, conflictingReservationIds: [], reason: 'outside_service_hours' };
    }
  }

  // Capacity
  if (candidate.partySize > tableCapacityMax) {
    return { hasConflict: true, conflictingReservationIds: [], reason: 'capacity_exceeded' };
  }

  // Overlap (same table)
  const candRange: SlotRange = { startSlot: candidate.startSlot, endSlot: candidate.endSlot };
  const conflicts: string[] = [];

  for (const r of existingSameTable) {
    if (candidate.id && r.id === candidate.id) continue;
    const rRange: SlotRange = { startSlot: r.startSlot, endSlot: r.endSlot };
    if (rangesOverlap(candRange, rRange)) conflicts.push(r.id);
  }

  if (conflicts.length > 0) {
    return { hasConflict: true, conflictingReservationIds: conflicts, reason: 'overlap' };
  }

  return { hasConflict: false, conflictingReservationIds: [] };
}
