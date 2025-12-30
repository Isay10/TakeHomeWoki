import { Tooltip, Tag, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { Reservation, ReservationStatus } from '../../../domain/types';
import { timelineConfig } from '../../../domain/seed';
import { minutesFromTimelineStart, minutesToPx, parseIso } from '../../../domain/time';
import styles from './ReservationBlock.module.scss';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { toggleSelection, deleteReservation, upsertReservation } from '../../../app/store';
import { useState } from 'react';
import {
  STATUS_COLORS,
  SELECTION,
  getSelectedBoxShadow,
  getBlockBoxShadow,
} from '../../../styles/colors';
import { useTimelineInteraction } from './interaction/TimelineInteractionContext';

const STATUS_OPTIONS: ReservationStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SEATED',
  'FINISHED',
  'NO_SHOW',
  'CANCELLED',
];

type ReservationBlockProps = {
  reservation: Reservation;
  zoom: number;
  rowIndex?: number;
  isDragging?: boolean;
};

export function ReservationBlock({ reservation, zoom, rowIndex, isDragging }: ReservationBlockProps) {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector((s) => s.ui.selectedReservationIds);
  const isSelected = selectedIds.includes(reservation.id);
  const { startDrag } = useTimelineInteraction();

  const [tooltipOpen, setTooltipOpen] = useState(false);

  const startMin = minutesFromTimelineStart(reservation.startTime, timelineConfig);
  const endMin = minutesFromTimelineStart(reservation.endTime, timelineConfig);
  const x = minutesToPx(startMin, timelineConfig, zoom);
  const w = Math.max(30, minutesToPx(endMin - startMin, timelineConfig, zoom));
  const top = rowIndex != null ? rowIndex * timelineConfig.rowHeightPx + 6 : 6;
  const color = STATUS_COLORS[reservation.status] ?? '#3B82F6';

  const start = parseIso(reservation.startTime);
  const end = parseIso(reservation.endTime);
  const hhmm = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const tooltip = (
    <div className={styles.tooltip}>
      <div>
        <b>{reservation.customer.name}</b> · {reservation.customer.phone}
      </div>
      <div>
        {hhmm(start)}–{hhmm(end)} · {reservation.partySize}p
      </div>
      <div>
        Status: {reservation.status} · Priority: {reservation.priority}
      </div>
      {reservation.notes ? <div className={styles.notes}>{reservation.notes}</div> : null}
    </div>
  );

  const isCancelled = reservation.status === 'CANCELLED';

  const menu: MenuProps = {
    items: [
      { key: 'edit', label: 'Edit details' },
      {
        key: 'status',
        label: 'Change status',
        children: STATUS_OPTIONS.map((st) => ({ key: `status:${st}`, label: st })),
      },
      { type: 'divider' },
      { key: 'duplicate', label: 'Duplicate' },
      { key: 'delete', label: 'Delete', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'delete') {
        dispatch(deleteReservation({ id: reservation.id }));
        return;
      }

      if (key === 'duplicate') {
        const copy: Reservation = {
          ...reservation,
          id: `COPY_${reservation.id}_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dispatch(upsertReservation(copy));
        return;
      }

      if (key.startsWith('status:')) {
        const nextStatus = key.split(':')[1] as ReservationStatus;
        dispatch(
          upsertReservation({
            ...reservation,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          }),
        );
        return;
      }

      if (key === 'edit') {
        console.log('Edit reservation', reservation.id);
      }
    },
  };

  const blockClasses = [
    styles.block,
    isCancelled ? styles.cancelled : '',
    isDragging ? styles.dragging : '',
  ].filter(Boolean).join(' ');

  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      <Tooltip
        title={tooltip}
        mouseEnterDelay={0.2}
        open={tooltipOpen}
        onOpenChange={setTooltipOpen}
      >
        <div
          data-reservation-id={reservation.id}
          className={blockClasses}
          style={{
            left: x,
            top,
            height: timelineConfig.rowHeightPx - 12,
            width: w,
            backgroundColor: isCancelled ? undefined : color,
            outline: isSelected ? `3px solid ${SELECTION.outline}` : 'none',
            boxShadow: isSelected ? getSelectedBoxShadow() : getBlockBoxShadow(),
          }}
          onContextMenu={(e) => {
            e.stopPropagation();
            setTooltipOpen(false);
            dispatch(toggleSelection({ id: reservation.id, additive: e.ctrlKey || e.metaKey }));
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            setTooltipOpen(false);
            dispatch(toggleSelection({ id: reservation.id, additive: e.ctrlKey || e.metaKey }));
            startDrag({ reservationId: reservation.id, pointerEvent: e, mode: 'move' });
          }}
        >
          {/* Left resize handle */}
          <div
            className={styles.resizeHandleLeft}
            data-resize-handle="left"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              setTooltipOpen(false);
              dispatch(toggleSelection({ id: reservation.id, additive: e.ctrlKey || e.metaKey }));
              startDrag({ reservationId: reservation.id, pointerEvent: e, mode: 'resizeLeft' });
            }}
          />

          {/* Right resize handle */}
          <div
            className={styles.resizeHandleRight}
            data-resize-handle="right"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              setTooltipOpen(false);
              dispatch(toggleSelection({ id: reservation.id, additive: e.ctrlKey || e.metaKey }));
              startDrag({ reservationId: reservation.id, pointerEvent: e, mode: 'resizeRight' });
            }}
          />

          <div className={styles.content}>
            <div className={styles.header}>
              <div className={styles.name}>{reservation.customer.name}</div>
              <Tag className={styles.priorityTag} color="default">
                {reservation.priority}
              </Tag>
            </div>

            <div className={styles.details}>
              <span>👥 {reservation.partySize}</span>
              <span>{hhmm(start)}–{hhmm(end)}</span>
            </div>
          </div>
        </div>
      </Tooltip>
    </Dropdown>
  );
}
