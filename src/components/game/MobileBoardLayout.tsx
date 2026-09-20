import { useRef, type ReactNode } from 'react';
import './playability.css';

type CenterPanel = { top: number; left: number; width: number; height: number };

export function MobileBoardLayout({ children, menu, centerPanel }: { children: ReactNode; menu: ReactNode; centerPanel: CenterPanel }) {
  const viewport = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  return <div className="mobile-board-layout">
    <div className="mobile-map-region">
      <div ref={viewport} className="mobile-map-viewport" aria-label="Guildholm board"
        onPointerDownCapture={event => { pointer.current = { x: event.clientX, y: event.clientY }; }}
        onPointerCancel={() => { pointer.current = null; }}
        onClickCapture={event => {
          const start = pointer.current;
          pointer.current = null;
          if (event.detail !== 0 && start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
            event.preventDefault(); event.stopPropagation();
          }
        }}>
        <div className="mobile-map-surface">{children}</div>
      </div>
    </div>
    <div
      className="mobile-center-region"
      style={{ top: `${centerPanel.top}%`, left: `${centerPanel.left}%`, width: `${centerPanel.width}%`, height: `${centerPanel.height}%` }}
      data-fx-protect
    >
      <div id="mobile-guide-slot" className="mobile-guide-slot" data-fx-protect />
      <div className="mobile-action-region" data-fx-protect>{menu}</div>
    </div>
  </div>;
}
