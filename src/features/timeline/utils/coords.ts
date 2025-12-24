// src/features/timeline/utils/coords.ts

import { clamp } from '../../../domain/scheduler';

export const BASE_CELL_PX = 60; 


export function slotFromPointer(args: {
  clientX: number;
  gridLeft: number;
  scrollLeft: number;
  zoom: number;
  totalSlots: number; // 52
}) {
  const { clientX, gridLeft, scrollLeft, zoom, totalSlots } = args;

  const x = (clientX - gridLeft) + scrollLeft;

  const slotPx = BASE_CELL_PX * zoom;
  const slot = Math.round(x / slotPx);

  return clamp(slot, 0, totalSlots);
}


export function rowFromPointer(args: {
  clientY: number;
  bodyTop: number;
  scrollTop: number;
  rowHeightPx: number;
  rowCount: number;
}) {
  const { clientY, bodyTop, scrollTop, rowHeightPx, rowCount } = args;

  const y = (clientY - bodyTop) + scrollTop;
  const row = Math.floor(y / rowHeightPx);

  return clamp(row, 0, Math.max(0, rowCount - 1));
}
