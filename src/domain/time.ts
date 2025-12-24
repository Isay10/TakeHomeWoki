// Time utilities

import { addMinutes, differenceInMinutes, parseISO, set } from 'date-fns';
import type { ISODateTime, Minutes, TimelineConfig } from './types';

export function parseIso(iso: ISODateTime): Date {
  return parseISO(iso);
}

export function dayStartDate(config: TimelineConfig): Date {
  // config.date = "YYYY-MM-DD"
  const [y, m, d] = config.date.split('-').map(Number);
  return set(new Date(), { year: y, month: m - 1, date: d, hours: config.startHour, minutes: 0, seconds: 0, milliseconds: 0 });
}

export function minutesFromTimelineStart(iso: ISODateTime, config: TimelineConfig): Minutes {
  const start = dayStartDate(config);
  const t = parseIso(iso);
  return differenceInMinutes(t, start);
}

export function minutesToPx(minutes: Minutes, config: TimelineConfig, zoom: number): number {
  const cellWidth = config.cellWidthPx * zoom;
  return (minutes / config.slotMinutes) * cellWidth;
}

export function pxToSnappedMinutes(px: number, config: TimelineConfig, zoom: number): Minutes {
  const cellWidth = config.cellWidthPx * zoom;
  const slots = Math.round(px / cellWidth);
  return slots * config.slotMinutes;
}

export function addMinutesToTimelineStart(minutes: Minutes, config: TimelineConfig): Date {
  return addMinutes(dayStartDate(config), minutes);
}

export function formatHHMM(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function timelineTotalMinutes(config: TimelineConfig): Minutes {
  const hours = config.endHour - config.startHour;
  return hours * 60;
}

function tzOffsetForDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const sample = new Date(y, m - 1, d, 12, 0, 0);
  const offsetMin = sample.getTimezoneOffset();
  const sign = offsetMin <= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const hh = String(Math.floor(absMin / 60)).padStart(2, '0');
  const mm = String(absMin % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

export function isoAtSlot(dateStr: string, startHour: number, slot: number, slotMinutes = 15): ISODateTime {
  const totalMin = startHour * 60 + slot * slotMinutes;
  const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const mm = String(totalMin % 60).padStart(2, '0');
  return `${dateStr}T${hh}:${mm}:00${tzOffsetForDate(dateStr)}` as ISODateTime;
}
