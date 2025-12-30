import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Alert, message } from 'antd';

import styles from './TimelineBody.module.scss';

import type { Reservation, ReservationStatus, Priority } from '../../../domain/types';
import { timelineConfig } from '../../../domain/seed';
import { minutesFromTimelineStart, parseIso, isoAtSlot } from '../../../domain/time';

import { checkConflict, normalizeRange, clamp, SLOT_MINUTES } from '../../../domain/scheduler';
import { slotFromPointer, rowFromPointer, BASE_CELL_PX } from '../utils/coords';

import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { upsertReservation } from '../../../app/store';
import { 
  selectVisibleTables, 
  selectVisibleReservationIds,
  selectTablesById,
  selectAllReservations
} from '../../../app/selectors';

import { ReservationBlock } from './ReservationBlockMemo';
import { CapacityWave } from './CapacityWave';
import { TimelineInteractionContext } from './interaction/TimelineInteractionContext';
import type { DragStartPayload, DragMode } from './interaction/TimelineInteractionContext';

type CreateDraft = {
  tableId: string;
  startSlot: number;
  endSlot: number;
  hasConflict: boolean;
  conflictReason?: string;
};

type MoveDraft = {
  reservationId: string;
  tableId: string;
  startSlot: number;
  endSlot: number;
  hasConflict: boolean;
  conflictReason?: string;
};

type TimelineBodyProps = {
  className?: string;
  gridClassName?: string;
  scrollerRef?: React.RefObject<HTMLDivElement>;
  onScrollX?: (scrollLeft: number) => void;
  onScrollY?: (scrollTop: number) => void;
};

const TOTAL_SLOTS = 52;
const MIN_CREATE_SLOTS = 2;
const DEFAULT_CREATE_SLOTS = 6;

const SERVICE_WINDOWS = [
  { startSlot: 4, endSlot: 20 },
  { startSlot: 36, endSlot: 52 },
] as const;

function hhmmFromIso(iso: string) {
  const d = parseIso(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TimelineBody({ className, gridClassName, scrollerRef, onScrollX, onScrollY }: TimelineBodyProps) {
  const dispatch = useAppDispatch();
  const zoom = useAppSelector((s) => s.ui.zoom);

  const reservationsById = useAppSelector((s) => s.reservations.byId as Record<string, Reservation>);
  const allReservations = useAppSelector(selectAllReservations);
  const visibleReservationIds = useAppSelector(selectVisibleReservationIds);
  const visibleTables = useAppSelector(selectVisibleTables);
  const tablesById = useAppSelector(selectTablesById);

  const tables = visibleTables;

  const localScrollerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);

  // Create drag state
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ tableId: string; startSlot: number; endSlot: number } | null>(null);
  const [form] = Form.useForm();

  const createDragRef = useRef<{
    active: boolean;
    pointerId: number;
    tableId: string;
    anchorSlot: number;
  } | null>(null);

  // Move drag state
  const [moveDraft, setMoveDraft] = useState<MoveDraft | null>(null);
  const moveDragRef = useRef<{
    active: boolean;
    mode: DragMode;
    pointerId: number;
    reservationId: string;
    originTableId: string;
    originStartSlot: number;
    originEndSlot: number;
    grabOffsetSlots: number;
    partySize: number;
  } | null>(null);

  const lastMoveRef = useRef<PointerEvent | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const getScrollerEl = useCallback(() => scrollerRef?.current ?? localScrollerRef.current, [scrollerRef]);
  const slotPx = BASE_CELL_PX * zoom;

  useEffect(() => {
    const el = getScrollerEl();
    if (!el) return;
    if (!onScrollX && !onScrollY) return;

    const onScroll = () => {
      if (onScrollX) onScrollX(el.scrollLeft);
      if (onScrollY) onScrollY(el.scrollTop);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll as EventListener);
  }, [getScrollerEl, onScrollX, onScrollY]);

  const existingForTable = useCallback((tableId: string, excludeId?: string) => {
    return allReservations
      .filter((r) => r.tableId === tableId && r.id !== excludeId)
      .map((r) => {
        const startMin = minutesFromTimelineStart(r.startTime, timelineConfig);
        const endMin = minutesFromTimelineStart(r.endTime, timelineConfig);
        const startSlot = Math.round(startMin / SLOT_MINUTES);
        const endSlot = Math.round(endMin / SLOT_MINUTES);
        return { id: r.id, tableId: r.tableId, startSlot, endSlot, partySize: r.partySize };
      });
  }, [allReservations]);

  const tableCapacityMax = useCallback((tableId: string) => {
    return tablesById.get(tableId)?.capacity.max ?? 1;
  }, [tablesById]);

  const computeConflict = useCallback((args: { tableId: string; startSlot: number; endSlot: number; partySize: number; id?: string }) => {
    return checkConflict({
      candidate: args,
      existingSameTable: existingForTable(args.tableId, args.id),
      tableCapacityMax: tableCapacityMax(args.tableId),
      totalSlots: TOTAL_SLOTS,
      serviceWindows: SERVICE_WINDOWS,
    });
  }, [existingForTable, tableCapacityMax]);

  const resetCreateDrag = () => {
    createDragRef.current = null;
    setCreateDraft(null);
  };

  const resetMoveDrag = () => {
    moveDragRef.current = null;
    setMoveDraft(null);
  };

  const resetAllDrag = () => {
    resetCreateDrag();
    resetMoveDrag();
    lastMoveRef.current = null;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const startDrag = useCallback((payload: DragStartPayload) => {
    const { reservationId, pointerEvent, mode } = payload;
    const reservation = reservationsById[reservationId];
    if (!reservation) return;

    const scrollerEl = getScrollerEl();
    if (!scrollerEl || !gridRef.current) return;

    const gridRect = gridRef.current.getBoundingClientRect();

    const startMin = minutesFromTimelineStart(reservation.startTime, timelineConfig);
    const endMin = minutesFromTimelineStart(reservation.endTime, timelineConfig);
    const originStartSlot = Math.round(startMin / SLOT_MINUTES);
    const originEndSlot = Math.round(endMin / SLOT_MINUTES);

    const pointerSlot = slotFromPointer({
      clientX: pointerEvent.clientX,
      gridLeft: gridRect.left,
      scrollLeft: scrollerEl.scrollLeft,
      zoom,
      totalSlots: TOTAL_SLOTS,
    });

    const grabOffsetSlots = pointerSlot - originStartSlot;

    moveDragRef.current = {
      active: true,
      mode,
      pointerId: pointerEvent.pointerId,
      reservationId,
      originTableId: reservation.tableId,
      originStartSlot,
      originEndSlot,
      grabOffsetSlots,
      partySize: reservation.partySize,
    };

    setMoveDraft({
      reservationId,
      tableId: reservation.tableId,
      startSlot: originStartSlot,
      endSlot: originEndSlot,
      hasConflict: false,
    });

    gridRef.current.setPointerCapture(pointerEvent.pointerId);
  }, [reservationsById, getScrollerEl, zoom]);

  const isDraggingId = moveDraft?.reservationId;

  const onGridPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.button !== 0) return;
    if (moveDragRef.current?.active) return;

    const scrollerEl = getScrollerEl();
    if (!scrollerEl || !gridRef.current) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-reservation-id]')) return;
    
    if (target.closest('.ant-dropdown') || target.closest('.ant-dropdown-menu')) return;

    const bodyRect = scrollerEl.getBoundingClientRect();
    const gridRect = gridRef.current.getBoundingClientRect();

    const row = rowFromPointer({
      clientY: e.clientY,
      bodyTop: bodyRect.top,
      scrollTop: scrollerEl.scrollTop,
      rowHeightPx: timelineConfig.rowHeightPx,
      rowCount: tables.length,
    });

    const tableId = tables[row]?.id;
    if (!tableId) return;

    const startSlot = slotFromPointer({
      clientX: e.clientX,
      gridLeft: gridRect.left,
      scrollLeft: scrollerEl.scrollLeft,
      zoom,
      totalSlots: TOTAL_SLOTS,
    });

    const endSlot = clamp(startSlot + DEFAULT_CREATE_SLOTS, 0, TOTAL_SLOTS);

    const conflict = computeConflict({ tableId, startSlot, endSlot, partySize: 2 });

    createDragRef.current = {
      active: true,
      pointerId: e.pointerId,
      tableId,
      anchorSlot: startSlot,
    };

    setCreateDraft({
      tableId,
      startSlot,
      endSlot,
      hasConflict: conflict.hasConflict,
      conflictReason: conflict.reason,
    });

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onGridPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const scrollerEl = getScrollerEl();
    if (!scrollerEl || !gridRef.current) return;

    const isCreating = createDragRef.current?.active;
    const isMoving = moveDragRef.current?.active;
    if (!isCreating && !isMoving) return;

    lastMoveRef.current = e.nativeEvent;

    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      const ev = lastMoveRef.current;
      if (!ev) return;

      const scrollerElInner = getScrollerEl();
      if (!scrollerElInner || !gridRef.current) return;

      const gridRect = gridRef.current.getBoundingClientRect();
      const bodyRect = scrollerElInner.getBoundingClientRect();

      const pointerSlot = slotFromPointer({
        clientX: ev.clientX,
        gridLeft: gridRect.left,
        scrollLeft: scrollerElInner.scrollLeft,
        zoom,
        totalSlots: TOTAL_SLOTS,
      });

      if (createDragRef.current?.active) {
        const drag = createDragRef.current;
        const nr = normalizeRange(drag.anchorSlot, pointerSlot);
        const startSlot = nr.startSlot;
        const endSlot = clamp(nr.endSlot, startSlot + MIN_CREATE_SLOTS, TOTAL_SLOTS);

        const conflict = computeConflict({ tableId: drag.tableId, startSlot, endSlot, partySize: 2 });

        setCreateDraft((prev) => {
          const next: CreateDraft = {
            tableId: drag.tableId,
            startSlot,
            endSlot,
            hasConflict: conflict.hasConflict,
            conflictReason: conflict.reason,
          };
          if (
            prev &&
            prev.tableId === next.tableId &&
            prev.startSlot === next.startSlot &&
            prev.endSlot === next.endSlot &&
            prev.hasConflict === next.hasConflict
          ) {
            return prev;
          }
          return next;
        });
      }

      // Handle MOVE drag
      if (moveDragRef.current?.active) {
        const drag = moveDragRef.current;
        const durationSlots = drag.originEndSlot - drag.originStartSlot;

        const row = rowFromPointer({
          clientY: ev.clientY,
          bodyTop: bodyRect.top,
          scrollTop: scrollerElInner.scrollTop,
          rowHeightPx: timelineConfig.rowHeightPx,
          rowCount: tables.length,
        });

        const nextTableId = tables[row]?.id ?? drag.originTableId;

        let nextStartSlot: number;
        let nextEndSlot: number;

        if (drag.mode === 'move') {
          nextStartSlot = clamp(pointerSlot - drag.grabOffsetSlots, 0, TOTAL_SLOTS - durationSlots);
          nextEndSlot = nextStartSlot + durationSlots;
        } else if (drag.mode === 'resizeLeft') {
          nextStartSlot = clamp(pointerSlot, 0, drag.originEndSlot - MIN_CREATE_SLOTS);
          nextEndSlot = drag.originEndSlot;
        } else {
          nextStartSlot = drag.originStartSlot;
          nextEndSlot = clamp(pointerSlot, drag.originStartSlot + MIN_CREATE_SLOTS, TOTAL_SLOTS);
        }

        const conflict = computeConflict({
          tableId: nextTableId,
          startSlot: nextStartSlot,
          endSlot: nextEndSlot,
          partySize: drag.partySize,
          id: drag.reservationId,
        });

        setMoveDraft((prev) => {
          const next: MoveDraft = {
            reservationId: drag.reservationId,
            tableId: nextTableId,
            startSlot: nextStartSlot,
            endSlot: nextEndSlot,
            hasConflict: conflict.hasConflict,
            conflictReason: conflict.reason,
          };
          if (
            prev &&
            prev.tableId === next.tableId &&
            prev.startSlot === next.startSlot &&
            prev.endSlot === next.endSlot &&
            prev.hasConflict === next.hasConflict
          ) {
            return prev;
          }
          return next;
        });
      }
    });
  };

  const onGridPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (createDragRef.current?.active && createDraft) {
      if (createDraft.hasConflict) {
        const conflictMsg =
          createDraft.conflictReason === 'overlap'
            ? 'Se superpone con una reserva existente en esta mesa.'
            : createDraft.conflictReason === 'capacity_exceeded'
              ? 'El tamaño del grupo excede la capacidad de la mesa.'
              : createDraft.conflictReason === 'outside_service_hours'
                ? 'Fuera del horario de servicio (12:00–16:00, 20:00–00:00).'
                : 'No se puede crear aquí: conflicto.';
        message.warning(conflictMsg);
      } else {
        setPrefill({ tableId: createDraft.tableId, startSlot: createDraft.startSlot, endSlot: createDraft.endSlot });
        setCreateOpen(true);

        const durationMin = (createDraft.endSlot - createDraft.startSlot) * 15;
        form.setFieldsValue({
          customerName: '',
          phone: '',
          partySize: 2,
          durationMinutes: durationMin,
          status: 'CONFIRMED',
          priority: 'STANDARD',
          notes: '',
        });
      }
    }

    if (moveDragRef.current?.active && moveDraft) {
      if (moveDraft.hasConflict) {
        const conflictMsg =
          moveDraft.conflictReason === 'overlap'
            ? 'Se superpone con una reserva existente en esta mesa.'
            : moveDraft.conflictReason === 'capacity_exceeded'
              ? 'El tamaño del grupo excede la capacidad de la mesa.'
              : moveDraft.conflictReason === 'outside_service_hours'
                ? 'Fuera del horario de servicio (12:00–16:00, 20:00–00:00).'
                : 'No se puede mover aquí: conflicto.';
        message.warning(conflictMsg);
      } else {
        const reservation = reservationsById[moveDraft.reservationId];
        if (reservation) {
          const startTime = isoAtSlot(timelineConfig.date, timelineConfig.startHour, moveDraft.startSlot, 15);
          const endTime = isoAtSlot(timelineConfig.date, timelineConfig.startHour, moveDraft.endSlot, 15);
          const durationMinutes = (moveDraft.endSlot - moveDraft.startSlot) * 15;

          setJustDroppedId(moveDraft.reservationId);
          setTimeout(() => setJustDroppedId(null), 400);

          dispatch(upsertReservation({
            ...reservation,
            tableId: moveDraft.tableId,
            startTime,
            endTime,
            durationMinutes,
            updatedAt: new Date().toISOString(),
          }));
        }
      }
    }

    resetAllDrag();

    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // noop
    }
  };

  const onGridPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
    resetAllDrag();
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // noop
    }
  };

  const handleCreateOk = async () => {
    if (!prefill) return;
    const values = await form.validateFields();

    const tableId = prefill.tableId;
    const startSlot = prefill.startSlot;

    const durationMinutes = Number(values.durationMinutes);
    const durationSlots = Math.round(durationMinutes / 15);
    const endSlot = clamp(startSlot + durationSlots, 0, TOTAL_SLOTS);

    const partySize = Number(values.partySize);

    const conflict = computeConflict({ tableId, startSlot, endSlot, partySize });
    if (conflict.hasConflict) {
      if (conflict.reason === 'capacity_exceeded') {
        form.setFields([{ name: 'partySize', errors: ['El tamaño del grupo excede la capacidad de la mesa.'] }]);
      } else if (conflict.reason === 'overlap') {
        form.setFields([{ name: 'durationMinutes', errors: ['Se superpone con una reserva existente en esta mesa.'] }]);
      } else {
        form.setFields([{ name: 'durationMinutes', errors: ['Fuera del horario de servicio (12:00–16:00, 20:00–00:00).'] }]);
      }
      return;
    }

    const id = `RES_${Date.now()}`;

    const startTime = isoAtSlot(timelineConfig.date, timelineConfig.startHour, startSlot, 15);
    const endTime = isoAtSlot(timelineConfig.date, timelineConfig.startHour, endSlot, 15);

    const newRes: Reservation = {
      id,
      tableId,
      customer: { name: values.customerName, phone: values.phone },
      partySize,
      startTime,
      endTime,
      durationMinutes,
      status: values.status as ReservationStatus,
      priority: values.priority as Priority,
      notes: values.notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch(upsertReservation(newRes));
    setCreateOpen(false);
    setPrefill(null);
    form.resetFields();
  };

  const ghostRowIndex = createDraft ? tables.findIndex((t) => t.id === createDraft.tableId) : -1;
  const moveGhostRowIndex = moveDraft ? tables.findIndex((t) => t.id === moveDraft.tableId) : -1;

  const prefillStartIso = prefill ? isoAtSlot(timelineConfig.date, timelineConfig.startHour, prefill.startSlot, 15) : '';
  const prefillEndIso = prefill ? isoAtSlot(timelineConfig.date, timelineConfig.startHour, prefill.endSlot, 15) : '';

  const prefillLabel = prefill
    ? `${tablesById.get(prefill.tableId)?.name ?? prefill.tableId} · ${hhmmFromIso(prefillStartIso)}–${hhmmFromIso(
      prefillEndIso
    )}`
    : '';

  const contextValue = useMemo(() => ({ startDrag, isDraggingId }), [startDrag, isDraggingId]);

  return (
    <TimelineInteractionContext.Provider value={contextValue}>
      <div
        ref={scrollerRef ? undefined : localScrollerRef}
        className={scrollerRef ? className : [styles.body, className].filter(Boolean).join(' ')}
      >
        <div
          ref={gridRef}
          className={[styles.grid, gridClassName].filter(Boolean).join(' ')}
          style={{
            minWidth: `calc(var(--cell) * ${TOTAL_SLOTS})`,
            minHeight: `max(${tables.length * timelineConfig.rowHeightPx}px, 100%)`,
            ['--cell' as string]: `${slotPx}px`,
            ['--row' as string]: `${timelineConfig.rowHeightPx}px`,
          }}
          onPointerDown={onGridPointerDown}
          onPointerMove={onGridPointerMove}
          onPointerUp={onGridPointerUp}
          onPointerCancel={onGridPointerCancel}
        >

          {tables.map((table, rowIndex) => (
            <CapacityWave
              key={`capacity-${table.id}`}
              tableId={table.id}
              tableCapacity={table.capacity.max}
              rowIndex={rowIndex}
              zoom={zoom}
            />
          ))}

          {visibleReservationIds.map((resId, idx) => {
            const reservation = reservationsById[resId];
            if (!reservation) return null;
            const rowIndex = tables.findIndex((t) => t.id === reservation.tableId);
            if (rowIndex < 0) return null; // Table not visible
            const isDragging = isDraggingId === resId;
            const isJustDropped = justDroppedId === resId;
            
            return (
              <ReservationBlock
                key={resId}
                reservationId={resId}
                zoom={zoom}
                rowIndex={rowIndex}
                isDragging={isDragging}
                staggerIndex={idx}
                justDropped={isJustDropped}
              />
            );
          })}

          {createDraft && ghostRowIndex >= 0 && (
            <div
              className={`${styles.ghost} ${createDraft.hasConflict ? styles['ghost--conflict'] : styles['ghost--valid']}`}
              style={{
                top: ghostRowIndex * timelineConfig.rowHeightPx + 6,
                left: createDraft.startSlot * slotPx,
                width: Math.max(2, createDraft.endSlot - createDraft.startSlot) * slotPx,
                height: timelineConfig.rowHeightPx - 12,
              }}
            />
          )}

          {moveDraft && moveGhostRowIndex >= 0 && (
            <div
              className={`${styles.ghost} ${moveDraft.hasConflict ? styles['ghost--conflict'] : styles['ghost--valid']}`}
              style={{
                top: moveGhostRowIndex * timelineConfig.rowHeightPx + 6,
                left: moveDraft.startSlot * slotPx,
                width: Math.max(2, moveDraft.endSlot - moveDraft.startSlot) * slotPx,
                height: timelineConfig.rowHeightPx - 12,
              }}
            />
          )}
        </div>

        <Modal
          title="Crear reserva"
          open={createOpen}
          onOk={handleCreateOk}
          onCancel={() => {
            setCreateOpen(false);
            setPrefill(null);
            form.resetFields();
          }}
          okText="Guardar"
          cancelText="Cancelar"
        >
          {prefillLabel && (
            <Alert className={styles.prefillAlert} type="info" showIcon message="Datos prellenados" description={prefillLabel} />
          )}

          <Form form={form} layout="vertical">
            <Form.Item label="Nombre del cliente" name="customerName" rules={[{ required: true, message: 'Requerido' }]}>
              <Input />
            </Form.Item>

            <Form.Item label="Teléfono" name="phone" rules={[{ required: true, message: 'Requerido' }]}>
              <Input />
            </Form.Item>

            <Form.Item label="Cantidad de personas" name="partySize" rules={[{ required: true, message: 'Requerido' }]}>
              <InputNumber min={1} className={styles.fullWidth} />
            </Form.Item>

            <Form.Item
              label="Duración (minutos)"
              name="durationMinutes"
              rules={[
                { required: true, message: 'Requerido' },
                { type: 'number', min: 30, max: 360, message: 'Mínimo 30, máximo 360' },
              ]}
            >
              <InputNumber step={15} className={styles.fullWidth} />
            </Form.Item>

            <Form.Item label="Estado" name="status">
              <Select
                options={[
                  { value: 'PENDING', label: 'Pendiente' },
                  { value: 'CONFIRMED', label: 'Confirmada' },
                  { value: 'SEATED', label: 'Sentados' },
                  { value: 'FINISHED', label: 'Finalizada' },
                  { value: 'NO_SHOW', label: 'No se presentó' },
                  { value: 'CANCELLED', label: 'Cancelada' },
                ]}
              />
            </Form.Item>

            <Form.Item label="Prioridad" name="priority">
              <Select
                options={[
                  { value: 'STANDARD', label: 'Estándar' },
                  { value: 'VIP', label: 'VIP' },
                  { value: 'LARGE_GROUP', label: 'Grupo grande' },
                ]}
              />
            </Form.Item>

            <Form.Item label="Notas" name="notes">
              <Input.TextArea rows={3} />
            </Form.Item>

            <div className={styles.serviceHoursNote}>
              Horario de servicio: 12:00–16:00 y 20:00–00:00 (no se permite crear en el intervalo de 16:00–20:00).
            </div>
          </Form>
        </Modal>
      </div>
    </TimelineInteractionContext.Provider>
  );
}
