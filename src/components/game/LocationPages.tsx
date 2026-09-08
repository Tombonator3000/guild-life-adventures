import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { LocationScrollResetContext as ScrollReset } from '@/hooks/useLocationContentReset';
import { useScrollDragGuard } from '@/hooks/useScrollDragGuard';

const ActionDock = createContext<HTMLDivElement | null | undefined>(undefined);
/** Keep encounter choices visible while the story scrolls. */
export function LocationActions({ children }: { children: ReactNode }) {
  const dock = useContext(ActionDock);
  if (dock === undefined) return <>{children}</>;
  return dock ? createPortal(children, dock) : null;
}

/** One vertical native scroller, with screen-at-a-time navigation. */
export function LocationPages({ children, pageKey }: { children: ReactNode; pageKey: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({ page: 1, pages: 1, atStart: true, atEnd: true });
  const guard = useScrollDragGuard();
  const update = useCallback(() => {
    const box = viewport.current;
    if (!box?.clientHeight) return;
    const pages = Math.max(1, Math.ceil(box.scrollHeight / box.clientHeight));
    const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
    const next = { page: atEnd ? pages : Math.min(pages, Math.floor((box.scrollTop + 2) / box.clientHeight) + 1), pages, atStart: box.scrollTop < 2, atEnd };
    setLayout(old => old.page === next.page && old.pages === next.pages && old.atStart === next.atStart && old.atEnd === next.atEnd ? old : next);
  }, []);
  const reset = useCallback(() => { if (viewport.current) viewport.current.scrollTop = 0; update(); }, [update]);

  useLayoutEffect(reset, [pageKey, reset]);
  useLayoutEffect(() => {
    const box = viewport.current, content = flow.current;
    if (!box || !content) return;
    const resize = new ResizeObserver(update);
    resize.observe(box);
    resize.observe(content);
    update();
    return () => resize.disconnect();
  }, [update]);

  const turn = (direction: number) => {
    const box = viewport.current;
    if (box) box.scrollBy({ top: direction * box.clientHeight, behavior: 'instant' });
  };

  return <ActionDock.Provider value={dock}><ScrollReset.Provider value={reset}><div className="location-pages">
    <div className="location-page-viewport" ref={viewport} onScroll={update} {...guard} tabIndex={0} aria-label="Menu content">
      <div className="location-page-flow" ref={flow}>{children}</div>
    </div>
    <div className="location-action-dock" ref={setDock} />
    <nav className="location-page-controls" aria-label="Menu pages" data-ui-sound="menu-open">
      <button aria-label="Previous menu page" disabled={layout.atStart} onClick={() => turn(-1)}><ChevronUp /> Previous</button>
      <span role="status">Page {layout.page} of {layout.pages}{layout.pages > 1 && <small className="menu-swipe-hint">Scroll up or down</small>}</span>
      <button aria-label="Next menu page" disabled={layout.atEnd} onClick={() => turn(1)}>Next <ChevronDown /></button>
    </nav>
  </div></ScrollReset.Provider></ActionDock.Provider>;
}
