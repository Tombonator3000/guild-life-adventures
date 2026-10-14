import { useEffect } from 'react';

type Loader = () => Promise<unknown>;

/** Skip prefetching when the browser asks to save data. */
function saveDataRequested(): boolean {
  try {
    return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  } catch {
    return false;
  }
}

/**
 * Loads the code for the screens a player is likely to open next, in idle time,
 * so they appear without a loading pause. `key` changes when the set changes.
 */
export function useIdlePrefetch(key: string | null, loaders: readonly Loader[]) {
  useEffect(() => {
    if (!key || loaders.length === 0 || saveDataRequested()) return;
    const run = () => {
      for (const load of loaders) load().catch(() => { /* the real navigation retries */ });
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
    // The loaders belong to the key; a new key means a new set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
