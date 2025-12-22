// TimeHeader component

import { addMinutes } from 'date-fns';
import { timelineConfig } from '../../../domain/seed';
import { dayStartDate, formatHHMM } from '../../../domain/time';
import { useAppSelector } from '../../../app/hooks';

export function TimeHeader() {
  const zoom = useAppSelector((s) => s.ui.zoom);
  const start = dayStartDate(timelineConfig);
  const slots = (timelineConfig.endHour - timelineConfig.startHour) * (60 / timelineConfig.slotMinutes); // 52
  const cell = timelineConfig.cellWidthPx * zoom;

  return (
    <div style={{ display: 'flex' }}>
      {Array.from({ length: slots }).map((_, i) => {
        const labelDate = addMinutes(start, i * timelineConfig.slotMinutes);
        const isHour = labelDate.getMinutes() === 0;
        return (
          <div
            key={i}
            style={{
              width: cell,
              padding: '10px 6px',
              fontSize: 12,
              fontWeight: isHour ? 700 : 500,
              opacity: isHour ? 1 : 0.75,
              borderRight: '1px solid rgba(255,255,255,0.06)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatHHMM(labelDate)}
          </div>
        );
      })}
    </div>
  );
}
