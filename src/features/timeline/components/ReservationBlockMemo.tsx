import { memo, useState } from 'react';
import { Tooltip, Tag, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import type { Reservation, ReservationStatus } from '../../../domain/types';
import { timelineConfig } from '../../../domain/seed';
import { minutesFromTimelineStart, parseIso, isoAtSlot } from '../../../domain/time';
import styles from './ReservationBlock.module.scss';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { toggleSelection, deleteReservation, upsertReservation } from '../../../app/store';
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
  reservationId: string;
  zoom: number;
  rowIndex: number;
  isDragging?: boolean;
  staggerIndex?: number; 
  justDropped?: boolean; 
};

function ReservationBlockInner({ 
  reservationId, 
  zoom, 
  rowIndex, 
  isDragging,
  staggerIndex = 0,
  justDropped = false,
}: ReservationBlockProps) {
  const dispatch = useAppDispatch();
  
  const reservation = useAppSelector((s) => s.reservations.byId[reservationId]);
  const isSelected = useAppSelector((s) => s.ui.selectedReservationIds.includes(reservationId));
  
  const { startDrag } = useTimelineInteraction();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (!reservation) return null;

  const startMin = minutesFromTimelineStart(reservation.startTime, timelineConfig);
  const endMin = minutesFromTimelineStart(reservation.endTime, timelineConfig);
  
  const slotPx = 60 * zoom; // BASE_CELL_PX * zoom
  const startSlot = startMin / 15;
  const endSlot = endMin / 15;
  
  const x = startSlot * slotPx;
  const w = Math.max(30, (endSlot - startSlot) * slotPx);
  const top = rowIndex * timelineConfig.rowHeightPx + 6;
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
        const startMin = minutesFromTimelineStart(reservation.startTime, timelineConfig);
        const endMin = minutesFromTimelineStart(reservation.endTime, timelineConfig);
        const durationSlots = (endMin - startMin) / 15;
        const originalEndSlot = endMin / 15;
        
        const newStartSlot = originalEndSlot;
        const newEndSlot = newStartSlot + durationSlots;
        
        const totalSlots = (timelineConfig.endHour - timelineConfig.startHour) * 4;
        
        if (newEndSlot > totalSlots) {
          message.warning('No hay espacio disponible para duplicar esta reserva.');
          return;
        }
        
        const newStartTime = isoAtSlot(timelineConfig.date, timelineConfig.startHour, newStartSlot, 15);
        const newEndTime = isoAtSlot(timelineConfig.date, timelineConfig.startHour, newEndSlot, 15);
        
        const copy: Reservation = {
          ...reservation,
          id: `COPY_${reservation.id}_${Date.now()}`,
          startTime: newStartTime,
          endTime: newEndTime,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dispatch(upsertReservation(copy));
        message.success('Reserva duplicada correctamente.');
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
    justDropped ? styles.justDropped : '',
    staggerIndex > 0 ? styles.staggerEnter : '',
  ].filter(Boolean).join(' ');

  const staggerDelay = staggerIndex > 0 ? `${staggerIndex * 30}ms` : '0ms';

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setTooltipOpen(false);
    dispatch(toggleSelection({ id: reservation.id, additive: e.ctrlKey || e.metaKey }));
    startDrag({ reservationId: reservation.id, pointerEvent: e, mode: 'move' });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTooltipOpen(false);
    dispatch(toggleSelection({ id: reservation.id, additive: e.ctrlKey || e.metaKey }));
  };

  const handleResizeLeft = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setTooltipOpen(false);
    dispatch(toggleSelection({ id: reservation.id, additive: e.ctrlKey || e.metaKey }));
    startDrag({ reservationId: reservation.id, pointerEvent: e, mode: 'resizeLeft' });
  };

  const handleResizeRight = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setTooltipOpen(false);
    dispatch(toggleSelection({ id: reservation.id, additive: e.ctrlKey || e.metaKey }));
    startDrag({ reservationId: reservation.id, pointerEvent: e, mode: 'resizeRight' });
  };

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
            ['--stagger-delay' as string]: staggerDelay,
          }}
          onContextMenu={handleContextMenu}
          onPointerDown={handlePointerDown}
        >
          {/* Left resize handle */}
          <div
            className={styles.resizeHandleLeft}
            data-resize-handle="left"
            onPointerDown={handleResizeLeft}
          />

          {/* Right resize handle */}
          <div
            className={styles.resizeHandleRight}
            data-resize-handle="right"
            onPointerDown={handleResizeRight}
          />

          <div className={styles.header}>
            <div className={styles.name}>{reservation.customer.name}</div>
            <Tag className={styles.priorityTag} color="default">
              {reservation.priority}
            </Tag>
          </div>

          <div className={styles.details}>
            <span>👥 {reservation.partySize}</span>
            <span>
              {hhmm(start)}–{hhmm(end)}
            </span>
          </div>
        </div>
      </Tooltip>
    </Dropdown>
  );
}


export const ReservationBlock = memo(ReservationBlockInner, (prev, next) => {
  return (
    prev.reservationId === next.reservationId &&
    prev.zoom === next.zoom &&
    prev.rowIndex === next.rowIndex &&
    prev.isDragging === next.isDragging &&
    prev.staggerIndex === next.staggerIndex &&
    prev.justDropped === next.justDropped
  );
});
