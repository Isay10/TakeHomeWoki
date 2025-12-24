import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Alert, message } from 'antd';

import styles from './TimelineBody.module.scss';

import type { Reservation, ReservationStatus, Priority } from '../../../domain/types';
import { seed, timelineConfig } from '../../../domain/seed';
import { minutesFromTimelineStart, parseIso } from '../../../domain/time';

import { checkConflict, normalizeRange, clamp, SLOT_MINUTES } from '../../../domain/scheduler';
import { slotFromPointer, rowFromPointer, BASE_CELL_PX } from '../utils/coords';

import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { upsertReservation } from '../../../app/store';

import { ReservationBlock } from './ReservationBlock';

type CreateDraft = {
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

function tzOffsetForDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

function isoAtSlot(dateStr: string, startHour: number, slot: number, slotMinutes = 15) {
  const totalMin = startHour * 60 + slot * slotMinutes;
  const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const mm = String(totalMin % 60).padStart(2, '0');
  return `${dateStr}T${hh}:${mm}:00${tzOffsetForDate(dateStr)}`;
}

function hhmmFromIso(iso: string) {
  const d = parseIso(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TimelineBody({ className, gridClassName, scrollerRef, onScrollX, onScrollY }: TimelineBodyProps) {
  const dispatch = useAppDispatch();
  const zoom = useAppSelector((s) => s.ui.zoom);

  const reservationsById = useAppSelector((s) => s.reservations.byId as Record<string, Reservation>);
  const reservations = useMemo(() => Object.values(reservationsById), [reservationsById]);

  const tables = useMemo(() => [...seed.tables].sort((a, b) => a.sortOrder - b.sortOrder), []);
  const tablesById = useMemo(() => new Map(tables.map((t) => [t.id, t])), [tables]);

  const localScrollerRef = useRef<HTMLDivElement | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);

  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ tableId: string; startSlot: number; endSlot: number } | null>(null);
  const [form] = Form.useForm();

  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    tableId: string;
    anchorSlot: number;
  } | null>(null);

  const lastMoveRef = useRef<PointerEvent | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const getScrollerEl = () => scrollerRef?.current ?? localScrollerRef.current;

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
  }, [scrollerRef, onScrollX, onScrollY]);

  const existingForTable = (tableId: string) => {
    return reservations
      .filter((r) => r.tableId === tableId)
      .map((r) => {
        const startMin = minutesFromTimelineStart(r.startTime, timelineConfig);
        const endMin = minutesFromTimelineStart(r.endTime, timelineConfig);
        const startSlot = Math.round(startMin / SLOT_MINUTES);
        const endSlot = Math.round(endMin / SLOT_MINUTES);
        return { id: r.id, tableId: r.tableId, startSlot, endSlot, partySize: r.partySize };
      });
  };

  const tableCapacityMax = (tableId: string) => {
    return tablesById.get(tableId)?.capacity.max ?? 1;
  };

  const computeConflict = (args: { tableId: string; startSlot: number; endSlot: number; partySize: number; id?: string }) => {
    return checkConflict({
      candidate: args,
      existingSameTable: existingForTable(args.tableId),
      tableCapacityMax: tableCapacityMax(args.tableId),
      totalSlots: TOTAL_SLOTS,
      serviceWindows: SERVICE_WINDOWS,
    });
  };

  const resetDrag = () => {
    dragRef.current = null;
    lastMoveRef.current = null;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setCreateDraft(null);
  };

  const onGridPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.button !== 0) return;
    const scrollerEl = getScrollerEl();
    if (!scrollerEl || !gridRef.current) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-reservation-id]')) return;

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

    dragRef.current = {
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
    if (!dragRef.current?.active) return;

    lastMoveRef.current = e.nativeEvent;

    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      const drag = dragRef.current;
      const ev = lastMoveRef.current;
      if (!drag || !ev || !drag.active) return;

      const gridRect = gridRef.current!.getBoundingClientRect();

      const slot = slotFromPointer({
        clientX: ev.clientX,
        gridLeft: gridRect.left,
        scrollLeft: scrollerEl.scrollLeft,
        zoom,
        totalSlots: TOTAL_SLOTS,
      });

      const nr = normalizeRange(drag.anchorSlot, slot);
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
          prev.hasConflict === next.hasConflict &&
          prev.conflictReason === next.conflictReason
        ) {
          return prev;
        }

        return next;
      });
    });
  };

  const onGridPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!createDraft) {
      resetDrag();
      return;
    }

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
      resetDrag();
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        // noop
      }
      return;
    }

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

    resetDrag();

    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // noop
    }
  };

  const onGridPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
    resetDrag();
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
  const slotPx = BASE_CELL_PX * zoom;

  const prefillStartIso = prefill ? isoAtSlot(timelineConfig.date, timelineConfig.startHour, prefill.startSlot, 15) : '';
  const prefillEndIso = prefill ? isoAtSlot(timelineConfig.date, timelineConfig.startHour, prefill.endSlot, 15) : '';

  const prefillLabel = prefill
    ? `${tablesById.get(prefill.tableId)?.name ?? prefill.tableId} · ${hhmmFromIso(prefillStartIso)}–${hhmmFromIso(
      prefillEndIso
    )}`
    : '';

  return (
    <div

      ref={scrollerRef ? undefined : localScrollerRef}
      className={scrollerRef ? className : [styles.body, className].filter(Boolean).join(' ')}
    >
      <div
        ref={gridRef}
        className={[styles.grid, gridClassName].filter(Boolean).join(' ')}
        style={{
          minWidth: `calc(var(--cell) * ${TOTAL_SLOTS})`,
          minHeight: tables.length * timelineConfig.rowHeightPx,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ['--cell' as any]: `${slotPx}px`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ['--row' as any]: `${timelineConfig.rowHeightPx}px`,
        }}
        onPointerDown={onGridPointerDown}
        onPointerMove={onGridPointerMove}
        onPointerUp={onGridPointerUp}
        onPointerCancel={onGridPointerCancel}
      >
        {reservations.map((r) => {
          const rowIndex = tables.findIndex((t) => t.id === r.tableId);
          return <ReservationBlock key={r.id} reservation={r} zoom={zoom} rowIndex={rowIndex} />;
        })}

        {createDraft && ghostRowIndex >= 0 ? (
          <div
            className={`${styles.ghost} ${createDraft.hasConflict ? styles['ghost--conflict'] : styles['ghost--valid']}`}
            style={{
              top: ghostRowIndex * timelineConfig.rowHeightPx + 6,
              left: createDraft.startSlot * slotPx,
              width: Math.max(2, createDraft.endSlot - createDraft.startSlot) * slotPx,
              height: timelineConfig.rowHeightPx - 12,
            }}
          />
        ) : null}
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
        {prefillLabel ? (
          <Alert className={styles.prefillAlert} type="info" showIcon message="Datos prellenados" description={prefillLabel} />
        ) : null}

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
  );
}
