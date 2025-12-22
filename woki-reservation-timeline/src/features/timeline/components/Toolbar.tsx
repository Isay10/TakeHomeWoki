import { Input, Button, Segmented, Tooltip } from 'antd';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { setSearch, setZoom } from '../../../app/store';
import styles from './toolbar.module.scss';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5] as const;

function toPercent(z: number) {
  return `${Math.round(z * 100)}%`;
}

export function Toolbar() {
  const dispatch = useAppDispatch();
  const zoom = useAppSelector((s) => s.ui.zoom);
  const search = useAppSelector((s) => s.ui.search);

  const currentIndex = Math.max(0, ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]));

  const setZoomSafe = (next: number) => {
    // aseguramos que siempre sea uno de los presets
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
      <div className={styles.searchWrapper}>
        <Input
          placeholder="Search by name/phone…"
          value={search}
          onChange={(e) => dispatch(setSearch(e.target.value))}
          allowClear
        />
      </div>

      <div className={styles.zoomWrapper}>
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
