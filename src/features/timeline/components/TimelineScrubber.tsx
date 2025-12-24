// Timeline Scrubber - drag to scrub through time
import { useState, useRef, useCallback } from 'react';
import { addMinutes, format } from 'date-fns';
import { useAppSelector } from '../../../app/hooks';
import { timelineConfig } from '../../../domain/seed';
import { dayStartDate } from '../../../domain/time';
import styles from './TimelineScrubber.module.scss';

const TOTAL_SLOTS = 52;

type TimelineScrubberProps = {
  scrollLeft: number;
  onScrub?: (slot: number) => void;
};

export function TimelineScrubber({ scrollLeft, onScrub }: TimelineScrubberProps) {
  const zoom = useAppSelector((s) => s.ui.zoom);
  const [scrubSlot, setScrubSlot] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const slotPx = timelineConfig.cellWidthPx * zoom;
  const totalWidth = TOTAL_SLOTS * slotPx;

  const slotToTime = useCallback((slot: number) => {
    const base = dayStartDate(timelineConfig);
    return addMinutes(base, slot * timelineConfig.slotMinutes);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const slot = Math.floor(x / slotPx);
    const clampedSlot = Math.max(0, Math.min(TOTAL_SLOTS - 1, slot));
    
    setScrubSlot(clampedSlot);
    setIsDragging(true);
    onScrub?.(clampedSlot);
    
    trackRef.current.setPointerCapture(e.pointerId);
  }, [slotPx, scrollLeft, onScrub]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const slot = Math.floor(x / slotPx);
    const clampedSlot = Math.max(0, Math.min(TOTAL_SLOTS - 1, slot));
    
    setScrubSlot(clampedSlot);
    onScrub?.(clampedSlot);
  }, [isDragging, slotPx, scrollLeft, onScrub]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    
    setTimeout(() => {
      if (!isDragging) setScrubSlot(null);
    }, 1500);
    
    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // noop
    }
  }, [isDragging]);

  const scrubTime = scrubSlot !== null ? slotToTime(scrubSlot) : null;

  return (
    <div 
      ref={trackRef}
      className={styles.scrubberTrack}
      style={{ 
        width: totalWidth,
        transform: `translateX(-${scrollLeft}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {scrubSlot !== null && (
        <>
          <div 
            className={`${styles.scrubberLine} ${isDragging ? styles.active : ''}`}
            style={{ left: scrubSlot * slotPx }}
          />
          <div 
            className={`${styles.scrubberTooltip} ${isDragging ? styles.active : ''}`}
            style={{ left: scrubSlot * slotPx }}
          >
            {scrubTime && format(scrubTime, 'HH:mm')}
          </div>
        </>
      )}
    </div>
  );
}
