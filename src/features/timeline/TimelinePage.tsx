import { useRef, useState, useCallback } from 'react';
import { useAppSelector } from '../../app/hooks';
import { selectVisibleTables } from '../../app/selectors';
import { Toolbar } from './components/Toolbar';
import { TimeHeader } from './components/TimeHeader';
import { TimelineBody } from './components/TimelineBody';
import { TimelineScrubber } from './components/TimelineScrubber';
import { timelineConfig } from '../../domain/seed';
import styles from './timeline.module.scss';

export function TimelinePage() {
  const sectors = useAppSelector((s) => s.static.sectors);
  const visibleTables = useAppSelector(selectVisibleTables);
  const zoom = useAppSelector((s) => s.ui.zoom);

  const bodyRef = useRef<HTMLDivElement>(null!);
  const [headerScrollLeft, setHeaderScrollLeft] = useState(0);
  const [bodyScrollTop, setBodyScrollTop] = useState(0);

  const sectorsById = new Map(sectors.map((s) => [s.id, s]));

  const handleScrollX = (scrollLeft: number) => setHeaderScrollLeft(scrollLeft);
  const handleScrollY = (scrollTop: number) => setBodyScrollTop(scrollTop);

  // Scroll to slot when scrubbing
  const handleScrub = useCallback((slot: number) => {
    if (!bodyRef.current) return;
    const slotPx = timelineConfig.cellWidthPx * zoom;
    const targetScroll = slot * slotPx - bodyRef.current.clientWidth / 2;
    bodyRef.current.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }, [zoom]);

  return (
    <div className={styles.page}>
      <Toolbar />

      <div className={styles.board}>
        <div className={styles.corner} />
        <div className={styles.header}>
          <TimeHeader scrollLeft={headerScrollLeft} />
          <TimelineScrubber scrollLeft={headerScrollLeft} onScrub={handleScrub} />
        </div>

        <div className={styles.left}>
          <div 
            className={styles.tableLabels}
            style={{ transform: `translateY(-${bodyScrollTop}px)` }}
          >
            {visibleTables.map((table) => {
              const sector = sectorsById.get(table.sectorId);
              return (
                <div 
                  key={table.id} 
                  className={styles.tableLabel}
                  style={{ height: timelineConfig.rowHeightPx }}
                >
                  <span className={styles.sectorDot} style={{ background: sector?.color }} />
                  <span className={styles.tableName}>{table.name}</span>              
                </div>
              );
            })}
          </div>
        </div>

        <div ref={bodyRef} className={styles.body}>
          <TimelineBody
            scrollerRef={bodyRef}
            onScrollX={handleScrollX}
            onScrollY={handleScrollY}
            gridClassName={styles.grid}
          />
        </div>
      </div>
    </div>
  );
}
