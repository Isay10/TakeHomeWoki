import { Popover, Button } from 'antd';
import {
  STATUS_COLORS,
  BORDERS,
  getStripedPattern,
} from '../../../styles/colors';

type LegendItem = {
  key: string;
  label: string;
  color: string;
  striped?: boolean;
};

const STATUS_LEGEND: LegendItem[] = [
  { key: 'PENDING', label: 'Pending', color: STATUS_COLORS.PENDING, striped: false },
  { key: 'CONFIRMED', label: 'Confirmed', color: STATUS_COLORS.CONFIRMED, striped: false },
  { key: 'SEATED', label: 'Seated', color: STATUS_COLORS.SEATED, striped: false },
  { key: 'FINISHED', label: 'Finished', color: STATUS_COLORS.FINISHED, striped: false },
  { key: 'NO_SHOW', label: 'No-show', color: STATUS_COLORS.NO_SHOW, striped: false },
  { key: 'CANCELLED', label: 'Cancelled', color: STATUS_COLORS.CANCELLED, striped: true },
] as const;

export function StatusLegend() {
  return (
    <Popover
      placement="bottomRight"
      trigger="click"
      content={
        <div style={{ display: 'grid', gap: 8, minWidth: 220 }}>
          {STATUS_LEGEND.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                aria-hidden
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  backgroundColor: s.color,
                  backgroundImage: s.striped ? getStripedPattern() : undefined,
                  border: `1px solid ${BORDERS.dark}`,
                }}
              />
              <span style={{ fontSize: 12 }}>{s.label}</span>
            </div>
          ))}
        </div>
      }
      title="Status colors"
    >
      <Button size="middle">Referencias</Button>
    </Popover>
  );
}
