// Domain types and interfaces

export type UUID = string;
export type ISODateTime = string; 
export type Minutes = number;
export type SlotIndex = number; 

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SEATED'
  | 'FINISHED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type Priority = 'STANDARD' | 'VIP' | 'LARGE_GROUP';

export interface Sector {
  id: UUID;
  name: string;
  color: string;
  sortOrder: number;
}

export interface Table {
  id: UUID;
  sectorId: UUID;
  name: string;
  capacity: { min: number; max: number };
  sortOrder: number;
}

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface Reservation {
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

export interface TimelineConfig {
  date: string; // "2025-10-15"
  startHour: number; // 11
  endHour: number; // 24 (represent midnight)
  slotMinutes: Minutes; // 15
  viewMode: 'day' | '3-day' | 'week';
  timezone: string;
  cellWidthPx: number; // base width per slot at zoom 1.0 (60)
  rowHeightPx: number; // (60)
}

export type ConflictReason = 'overlap' | 'capacity_exceeded' | 'outside_service_hours';

export interface ConflictCheck {
  hasConflict: boolean;
  conflictingReservationIds: UUID[];
  reason?: ConflictReason;
}

export interface ServiceWindow {
  start: string; // "12:00"
  end: string;   // "16:00" or "00:00"
}

export interface Restaurant {
  id: string;
  name: string;
  timezone: string;
  serviceHours: ServiceWindow[];
}

export interface SeedData {
  date: string;
  restaurant: Restaurant;
  sectors: Sector[];
  tables: Table[];
  reservations: Reservation[];
}
