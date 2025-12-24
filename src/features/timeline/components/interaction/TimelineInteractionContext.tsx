import React, { createContext, useContext } from 'react';

export type DragMode = 'move' | 'resizeLeft' | 'resizeRight';

export type DragStartPayload = {
  reservationId: string;
  pointerEvent: React.PointerEvent;
  mode: DragMode;
};

type TimelineInteractionContextValue = {
  startDrag: (payload: DragStartPayload) => void;
  isDraggingId?: string;
};

export const TimelineInteractionContext = createContext<TimelineInteractionContextValue | null>(null);

export function useTimelineInteraction() {
  const ctx = useContext(TimelineInteractionContext);
  if (!ctx) {
    throw new Error('useTimelineInteraction must be used within TimelineInteractionContext.Provider');
  }
  return ctx;
}
