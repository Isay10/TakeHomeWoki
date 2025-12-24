// CurrentTimeMarker component

import { isSameDay } from 'date-fns';
import { timelineConfig } from '../../../domain/seed';
import { minutesToPx } from '../../../domain/time';
import { useAppSelector } from '../../../app/hooks';
import styles from './CurrentTimeMarker.module.scss';

export function CurrentTimeMarker() {
  const zoom = useAppSelector((s) => s.ui.zoom);

  const now = new Date();
  // Solo mostrar si es el mismo día que timelineConfig.date
  const configDate = new Date(`${timelineConfig.date}T00:00:00`);
  if (!isSameDay(now, configDate)) return null;

  const minutesFromStart = (now.getHours() - timelineConfig.startHour) * 60 + now.getMinutes();
  if (minutesFromStart < 0) return null;

  const x = minutesToPx(minutesFromStart, timelineConfig, zoom);

  return <div className={styles.marker} style={{ left: x }} />;
}
