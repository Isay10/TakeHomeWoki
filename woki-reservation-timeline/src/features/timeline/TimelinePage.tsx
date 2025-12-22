// Timeline Page component

import { timelineConfig } from '../../domain/seed';
import { useAppSelector } from '../../app/hooks';
import { Toolbar } from './components/Toolbar';
import { TimeHeader } from './components/TimeHeader';
import { TableRow } from './components/TableRow';
import { CurrentTimeMarker } from './components/CurrentTimeMarker';
import styles from './timeline.module.scss';

export function TimelinePage() {
  const { sectors, tables } = useAppSelector((s) => s.static);
  const zoom = useAppSelector((s) => s.ui.zoom);

  // orden por sector + sortOrder
  const sectorsSorted = [...sectors].sort((a, b) => a.sortOrder - b.sortOrder);
  const tablesSorted = [...tables].sort((a, b) => {
    if (a.sectorId !== b.sectorId) return a.sectorId.localeCompare(b.sectorId);
    return a.sortOrder - b.sortOrder;
  });

  const cellWidth = timelineConfig.cellWidthPx * zoom;

  return (
    <div className={styles.page}>
      <Toolbar />

      <div className={styles.board}>
        <div className={styles.corner} />
        <div className={styles.header}>
          <TimeHeader />
        </div>

        <div className={styles.left}>
          {sectorsSorted.map((sec) => (
            <div key={sec.id} className={styles.sectorLabel}>
              <span className={styles.sectorDot} style={{ background: sec.color }} />
              {sec.name}
            </div>
          ))}
        </div>

        <div className={styles.body}>
          <div
            className={styles.grid}
            style={{
              // background grid based on slot width
              ['--cell' as any]: `${cellWidth}px`,
              ['--row' as any]: `${timelineConfig.rowHeightPx}px`,
            }}
          >
            <CurrentTimeMarker />
            {tablesSorted.map((t) => (
              <TableRow key={t.id} table={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
