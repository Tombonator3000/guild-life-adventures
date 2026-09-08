import { useRef, type MouseEvent, type PointerEvent } from 'react';

/** Native scrolling owns touch gestures. Only suppress clicks after a drag. */
export function useScrollDragGuard() {
  const start = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressUntil = useRef(0);
  return {
    onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
      start.current = null;
      suppressUntil.current = 0;
      if (!event.isPrimary || !['touch', 'pen'].includes(event.pointerType)
        || (event.target as Element).closest('input, textarea, select, [role="slider"], [contenteditable="true"]')) return;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    },
    onPointerMoveCapture: (event: PointerEvent<HTMLDivElement>) => {
      const point = start.current;
      if (point?.id === event.pointerId && Math.hypot(event.clientX - point.x, event.clientY - point.y) > 10) {
        point.moved = true;
        suppressUntil.current = Date.now() + 500;
      }
    },
    onPointerUpCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (start.current?.id === event.pointerId && start.current.moved) {
        suppressUntil.current = Date.now() + 500;
        event.preventDefault();
      }
      start.current = null;
    },
    onPointerCancel: () => { start.current = null; },
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (event.detail > 0 && Date.now() < suppressUntil.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
