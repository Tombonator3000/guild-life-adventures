import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 1024;

/**
 * Returns true when viewport width is below the mobile breakpoint (1024px).
 * Samsung S24 landscape ≈ 780px, so this catches all phones and small tablets.
 */
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
