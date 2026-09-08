import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import './playability.css';

// Original art coordinates. Every hit zone, token and FX layer lives in this surface.
export const BOARD_ASPECT = 5056 / 3392;

export function MobileBoardLayout({ children, menu }: { children: ReactNode; menu: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(false);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => {
      const width = Math.min(element.clientWidth, element.clientHeight * BOARD_ASPECT);
      setSize({ width, height: width / BOARD_ASPECT });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    return () => observer.disconnect();
  }, []);
  const scale = zoom ? 1.8 : 1;
  return <div className="mobile-board-layout">
    <div className="mobile-map-region">
      <div ref={viewport} className="mobile-map-viewport" data-zoom={zoom} aria-label="Guildholm board"
        onPointerDownCapture={event => { pointer.current = { x: event.clientX, y: event.clientY }; }}
        onPointerCancel={() => { pointer.current = null; }}
        onClickCapture={event => {
          const start = pointer.current;
          pointer.current = null;
          if (event.detail !== 0 && start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
            event.preventDefault(); event.stopPropagation();
          }
        }}>
        <div className="mobile-map-surface" style={{ width: size.width * scale, height: size.height * scale }}>{children}</div>
      </div>
      <button data-fx-protect className="mobile-map-zoom" aria-pressed={zoom} onClick={() => {
        setZoom(!zoom);
        viewport.current?.scrollTo({ left: 0, top: 0 });
      }}>{zoom ? 'Fit map' : 'Zoom map'}</button>
    </div>
    <div className="mobile-action-region" data-fx-protect>{menu}</div>
  </div>;
}
