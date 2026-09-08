import { useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react';

const DIRECT_MANIPULATION = 'input, textarea, select, [role="slider"], [role="spinbutton"], [contenteditable="true"], [data-no-page-swipe]';

/** Turn one menu page per finger/pen gesture, without converting a drag into a purchase. */
export function useMenuSwipe(flow: RefObject<HTMLDivElement>, turnPage: (direction: number) => void) {
  const gesture = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClickUntil = useRef(0);

  const reset = (event: PointerEvent<HTMLDivElement>) => {
    gesture.current = null;
    flow.current?.style.removeProperty('--page-drag');
    delete event.currentTarget.dataset.dragging;
  };

  return {
    onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (!event.isPrimary) { reset(event); return; }
      suppressClickUntil.current = 0;
      if (!['touch', 'pen'].includes(event.pointerType)
        || (event.target as Element).closest(DIRECT_MANIPULATION)) return;
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const distance = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(distance) < 12) return;
      start.moved = true;
      suppressClickUntil.current = Date.now() + 500;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = 'true';
      flow.current?.style.setProperty('--page-drag', `${Math.max(-64, Math.min(64, distance * .25))}px`);
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const distance = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (start.moved) {
        event.preventDefault();
        suppressClickUntil.current = Date.now() + 500;
        if (Math.abs(distance) >= 36) turnPage(distance < 0 ? 1 : -1);
      }
      reset(event);
    },
    onPointerCancel: reset,
    onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => {
      // Touch starts with implicit capture on a child button. Transferring it
      // to the viewport emits a bubbling lost-capture event from that child.
      if (event.target === event.currentTarget) reset(event);
    },
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (event.detail > 0 && Date.now() < suppressClickUntil.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
