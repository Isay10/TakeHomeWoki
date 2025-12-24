import { Input, Button, Segmented, Tooltip, Select } from 'antd';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { setSearch, setZoom, setSectorFilter, setStatusFilter } from '../../../app/store';
import { selectSectorsForFilter, STATUS_OPTIONS_FOR_FILTER } from '../../../app/selectors';
import { StatusLegend } from './StatusLegend';
import styles from './toolbar.module.scss';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5] as const;

function toPercent(z: number) {
  return `${Math.round(z * 100)}%`;
}

export function Toolbar() {
  const dispatch = useAppDispatch();
  const zoom = useAppSelector((s) => s.ui.zoom);
  const search = useAppSelector((s) => s.ui.search);
  const sectorFilter = useAppSelector((s) => s.ui.sectorFilter);
  const statusFilter = useAppSelector((s) => s.ui.statusFilter);
  const sectorsForFilter = useAppSelector(selectSectorsForFilter);

  const currentIndex = Math.max(0, ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]));

  const setZoomSafe = (next: number) => {
    const closest = ZOOM_LEVELS.reduce((prev, curr) =>
      Math.abs(curr - next) < Math.abs(prev - next) ? curr : prev
    );
    dispatch(setZoom(closest));
  };

  const decZoom = () => {
    const next = ZOOM_LEVELS[Math.max(0, currentIndex - 1)];
    dispatch(setZoom(next));
  };

  const incZoom = () => {
    const next = ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, currentIndex + 1)];
    dispatch(setZoom(next));
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.filtersWrapper}>
        <Input
          className={styles.searchInput}
          placeholder="Buscar nombre/teléfono…"
          value={search}
          onChange={(e) => dispatch(setSearch(e.target.value))}
          allowClear
        />

        <Select
          className={styles.filterSelect}
          mode="multiple"
          allowClear
          placeholder="Filtrar por sector"
          value={sectorFilter}
          onChange={(value) => dispatch(setSectorFilter(value))}
          options={sectorsForFilter}
          maxTagCount={1}
          maxTagPlaceholder={(omitted) => `+${omitted.length}`}
        />

        <Select
          className={styles.filterSelect}
          mode="multiple"
          allowClear
          placeholder="Filtrar por estado"
          value={statusFilter}
          onChange={(value) => dispatch(setStatusFilter(value))}
          options={STATUS_OPTIONS_FOR_FILTER.map((s) => ({ value: s.value, label: s.label }))}
          maxTagCount={1}
          maxTagPlaceholder={(omitted) => `+${omitted.length}`}
        />
      </div>

      <div className={styles.zoomWrapper}>
        <StatusLegend />
        <span className={styles.zoomLabel}>Zoom</span>

        <Tooltip title="Zoom out">
          <Button onClick={decZoom} disabled={currentIndex === 0}>
            -
          </Button>
        </Tooltip>

        <Segmented
          value={zoom}
          onChange={(v) => setZoomSafe(Number(v))}
          options={ZOOM_LEVELS.map((z) => ({ label: toPercent(z), value: z }))}
        />

        <Tooltip title="Zoom in">
          <Button onClick={incZoom} disabled={currentIndex === ZOOM_LEVELS.length - 1}>
            +
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
