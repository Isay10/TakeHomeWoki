// Capacity Wave indicator - shows animated capacity fill for each table row
import { useMemo } from 'react';
import { useAppSelector } from '../../../app/hooks';
import { selectAllReservations } from '../../../app/selectors';
import { timelineConfig } from '../../../domain/seed';
import { minutesFromTimelineStart } from '../../../domain/time';
import styles from './CapacityWave.module.scss';

const TOTAL_SLOTS = 52;
const SLOT_MINUTES = 15;

type CapacityWaveProps = {
  tableId: string;
  tableCapacity: number;
  rowIndex: number;
  zoom: number;
};

export function CapacityWave({ tableId, tableCapacity, rowIndex, zoom }: CapacityWaveProps) {
  const reservations = useAppSelector(selectAllReservations);
  
  const slotPx = timelineConfig.cellWidthPx * zoom;
  const rowHeight = timelineConfig.rowHeightPx;

  const capacityBars = useMemo(() => {
    const tableReservations = reservations.filter(r => r.tableId === tableId);
    
    const slotOccupancy: number[] = new Array(TOTAL_SLOTS).fill(0);
    
    for (const r of tableReservations) {
      const startMin = minutesFromTimelineStart(r.startTime, timelineConfig);
      const endMin = minutesFromTimelineStart(r.endTime, timelineConfig);
      const startSlot = Math.floor(startMin / SLOT_MINUTES);
      const endSlot = Math.ceil(endMin / SLOT_MINUTES);
      
      for (let s = startSlot; s < endSlot && s < TOTAL_SLOTS; s++) {
        if (s >= 0) {
          slotOccupancy[s] += r.partySize;
        }
      }
    }
    
    const bars: { startSlot: number; endSlot: number; level: 'low' | 'medium' | 'high' }[] = [];
    let currentBar: typeof bars[0] | null = null;
    
    for (let s = 0; s < TOTAL_SLOTS; s++) {
      const occupancy = slotOccupancy[s];
      const ratio = occupancy / tableCapacity;
      
      let level: 'low' | 'medium' | 'high' | null = null;
      if (ratio > 0.8) level = 'high';
      else if (ratio > 0.5) level = 'medium';
      else if (ratio > 0) level = 'low';
      
      if (level) {
        if (currentBar && currentBar.level === level) {
          currentBar.endSlot = s + 1;
        } else {
          if (currentBar) bars.push(currentBar);
          currentBar = { startSlot: s, endSlot: s + 1, level };
        }
      } else {
        if (currentBar) {
          bars.push(currentBar);
          currentBar = null;
        }
      }
    }
    if (currentBar) bars.push(currentBar);
    
    return bars;
  }, [reservations, tableId, tableCapacity]);

  return (
    <>
      {capacityBars.map((bar, i) => (
        <div
          key={`${bar.startSlot}-${bar.level}`}
          className={`${styles.capacityBar} ${styles[bar.level]}`}
          style={{
            left: bar.startSlot * slotPx,
            width: (bar.endSlot - bar.startSlot) * slotPx,
            top: rowIndex * rowHeight + rowHeight - 4,
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </>
  );
}
