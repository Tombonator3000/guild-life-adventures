import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Fixed-size book pages: native column fragmentation keeps live controls/state intact. */
export function LocationPages({ children, pageKey }: { children: ReactNode; pageKey: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [layout, setLayout] = useState({ width: 1, pages: 1 });

  useLayoutEffect(() => { setPage(0); }, [pageKey]);
  useLayoutEffect(() => {
    const box = viewport.current;
    const content = flow.current;
    if (!box || !content) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = box.clientWidth;
        if (!width) return;
        const pages = Math.max(1, Math.ceil((content.scrollWidth + 16) / (width + 16)));
        setLayout(old => old.width === width && old.pages === pages ? old : { width, pages });
        setPage(old => Math.min(old, pages - 1));
      });
    };
    const resize = new ResizeObserver(measure);
    resize.observe(box);
    const mutation = new MutationObserver(records => {
      // Changing an inner service (employer, encounter, purchase details) opens
      // its first page; text-only resource updates keep the reader's place.
      if (records.some(record => record.type === 'childList' && [...record.removedNodes].some(node => node.nodeType === Node.ELEMENT_NODE))) setPage(0);
      measure();
    });
    mutation.observe(content, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['open', 'class', 'src'] });
    content.addEventListener('load', measure, true);
    measure();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect(); content.removeEventListener('load', measure, true); };
  }, []);

  return <div className="location-pages">
    <div className="location-page-viewport" ref={viewport}>
      <div className="location-page-flow" ref={flow} style={{ transform: `translateX(-${page * (layout.width + 16)}px)` }}
        onFocusCapture={event => {
          // Keyboard navigation turns to the page containing the newly focused control.
          const target = event.target as HTMLElement;
          const box = viewport.current;
          if (!box) return;
          const offset = target.getBoundingClientRect().left - box.getBoundingClientRect().left;
          if (offset < 0 || offset >= layout.width) setPage(old => Math.max(0, Math.min(layout.pages - 1, old + Math.round(offset / (layout.width + 16)))));
        }}>{children}</div>
    </div>
    <nav className="location-page-controls" aria-label="Menu pages" data-ui-sound="menu-open">
      <button aria-label="Previous menu page" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft /> Previous</button>
      <span role="status">Page {page + 1} of {layout.pages}</span>
      <button aria-label="Next menu page" disabled={page >= layout.pages - 1} onClick={() => setPage(page + 1)}>Next <ChevronRight /></button>
    </nav>
  </div>;
}
