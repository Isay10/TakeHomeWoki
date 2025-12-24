import { useRef, useState } from 'react';
import { useAppSelector } from '../../app/hooks';
import { Toolbar } from './components/Toolbar';
import { TimeHeader } from './components/TimeHeader';
import { TimelineBody } from './components/TimelineBody';
import { timelineConfig } from '../../domain/seed';
import styles from './timeline.module.scss';

export function TimelinePage() {
  const { sectors, tables } = useAppSelector((s) => s.static);

  const bodyRef = useRef<HTMLDivElement>(null!);
  const [headerScrollLeft, setHeaderScrollLeft] = useState(0);
  const [bodyScrollTop, setBodyScrollTop] = useState(0);

  const sectorsById = new Map(sectors.map((s) => [s.id, s]));

  const tablesSorted = [...tables].sort((a, b) => {
    const sectorA = sectorsById.get(a.sectorId);
    const sectorB = sectorsById.get(b.sectorId);
    if (sectorA?.sortOrder !== sectorB?.sortOrder) {
      return (sectorA?.sortOrder ?? 0) - (sectorB?.sortOrder ?? 0);
    }
    return a.sortOrder - b.sortOrder;
  });

  const handleScrollX = (scrollLeft: number) => setHeaderScrollLeft(scrollLeft);
  const handleScrollY = (scrollTop: number) => setBodyScrollTop(scrollTop);

  return (
    <div className={styles.page}>
      <Toolbar />

      <div className={styles.board}>
        <div className={styles.corner} />
        <div className={styles.header}>
          <TimeHeader scrollLeft={headerScrollLeft} />
        </div>

        <div className={styles.left}>
          <div 
            className={styles.tableLabels}
            style={{ transform: `translateY(-${bodyScrollTop}px)` }}
          >
            {tablesSorted.map((table) => {
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
