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
  // endHour=24 means midnight; total from 11:00 to 24:00 => 13h => 780
  const hours = config.endHour - config.startHour;
  return hours * 60;
}
