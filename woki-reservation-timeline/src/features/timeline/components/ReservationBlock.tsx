// ReservationBlock component

import { Tooltip, Tag } from 'antd';
import type { Reservation } from '../../../domain/types';
import { timelineConfig } from '../../../domain/seed';
import { minutesFromTimelineStart, minutesToPx, parseIso } from '../../../domain/time';
import styles from './ReservationBlock.module.scss';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FCD34D',
  CONFIRMED: '#3B82F6',
  SEATED: '#10B981',
  FINISHED: '#9CA3AF',
  NO_SHOW: '#EF4444',
  CANCELLED: '#6B7280',
};



export function ReservationBlock({ reservation, zoom }: { reservation: Reservation; zoom: number }) {
  const startMin = minutesFromTimelineStart(reservation.startTime, timelineConfig);
  const endMin = minutesFromTimelineStart(reservation.endTime, timelineConfig);
  const x = minutesToPx(startMin, timelineConfig, zoom);
  const w = Math.max(30, minutesToPx(endMin - startMin, timelineConfig, zoom));
  const color = STATUS_COLORS[reservation.status] ?? '#3B82F6';



  const start = parseIso(reservation.startTime);
  const end = parseIso(reservation.endTime);
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const tooltip = (
    <div className={styles.tooltip}>
      <div><b>{reservation.customer.name}</b> · {reservation.customer.phone}</div>
      <div>{hhmm(start)}–{hhmm(end)} · {reservation.partySize}p</div>
      <div>Status: {reservation.status} · Priority: {reservation.priority}</div>
      {reservation.notes ? <div className={styles.notes}>{reservation.notes}</div> : null}
    </div>
  );

  const isCancelled = reservation.status === 'CANCELLED';

  return (
    <Tooltip title={tooltip} mouseEnterDelay={0.2}>
      <div
        className={`${styles.block} ${isCancelled ? styles.cancelled : ''}`}
        style={{
          left: x,
          height: timelineConfig.rowHeightPx - 12,
          width: w,
          backgroundColor: isCancelled ? undefined : color,
        }}
      >
        <div className={styles.header}>
          <div className={styles.name}>
            {reservation.customer.name}
          </div>
          <Tag className={styles.priorityTag} color="default">
            {reservation.priority}
          </Tag>
        </div>

        <div className={styles.details}>
          <span>👥 {reservation.partySize}</span>
          <span>{hhmm(start)}–{hhmm(end)}</span>
        </div>
      </div>
    </Tooltip>
  );
}
