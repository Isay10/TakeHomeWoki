// TableRow component

import type { Table } from '../../../domain/types';
import { useAppSelector } from '../../../app/hooks';
import { ReservationBlock } from './ReservationBlock';
import styles from './TableRow.module.scss';

export function TableRow({ table }: { table: Table }) {
  const { byId, idsByTable } = useAppSelector((s) => s.reservations);
  const zoom = useAppSelector((s) => s.ui.zoom);
  const search = useAppSelector((s) => s.ui.search.trim().toLowerCase());

  const ids = idsByTable[table.id] ?? [];
  const reservations = ids.map((id) => byId[id]).filter((r) => {
    if (!search) return true;
    return (
      r.customer.name.toLowerCase().includes(search) ||
      r.customer.phone.toLowerCase().includes(search)
    );
  });

  return (
    <div className={styles.row}>
      {/* etiqueta de mesa "en el rail" (si querés, luego la hacemos sticky dentro del body) */}
      <div className={styles.label}>
        {table.name} <span className={styles.capacity}>({table.capacity.min}-{table.capacity.max})</span>
      </div>

      {reservations.map((r) => (
        <ReservationBlock key={r.id} reservation={r} zoom={zoom} />
      ))}
    </div>
  );
}
