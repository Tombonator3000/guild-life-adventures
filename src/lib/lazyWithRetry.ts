import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Retry wrapper for React.lazy() dynamic imports.
 * When a chunk fails to load (hash mismatch after deploy, network error, stale SW cache),
 * this retries the import once before giving up. On retry failure, it clears all caches
 * and reloads the page, which is the most reliable recovery for stale-cache scenarios.
 *
 * Includes reload loop protection using the same sessionStorage counter as hardRefresh().
 * Without this, persistent chunk failures could cause infinite reloads.
 */
export function lazyWithRetry<T extends { default: ComponentType<unknown> }>(
  factory: () => Promise<T>,
): LazyExoticComponent<T['default']> {
  return lazy(() =>
    factory().catch(() => {
      // First retry — chunk may have failed due to transient network error
      return factory().catch(async () => {
        // Second failure — likely stale cache. Clear everything and reload.
        console.error('[Guild Life] Chunk loading failed twice — clearing cache and reloading');

        // Reload loop protection: if too many reloads recently, don't reload again.
        // Uses the same sessionStorage counter as hardRefresh() and the index.html fallback.
        try {
          const RELOAD_KEY = 'guild-reload-count';
          const d = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || 'null');
          const count = (d && Date.now() - d.ts < 120_000) ? (d.count || 0) : 0;
          if (count >= 3) {
            console.warn('[Guild Life] Reload loop detected — not reloading from lazyWithRetry');
            throw new Error('Chunk loading failed after retries (reload limit reached)');
          }
          // Bump counter
          const next = { ts: d?.ts || Date.now(), count: count + 1 };
          sessionStorage.setItem(RELOAD_KEY, JSON.stringify(next));
        } catch (e) {
          if (e instanceof Error && e.message.includes('reload limit')) throw e;
          // sessionStorage unavailable — proceed with reload anyway
        }

        try {
          if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
          }
          if (navigator.serviceWorker) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
          }
        } catch {
          // Ignore — reload regardless
        }
        // Wait for cleanup to propagate before reloading
        await new Promise(r => setTimeout(r, 500));
        // Cache-busting reload: location.reload() may serve stale cached HTML
        // (GitHub Pages max-age=600). Adding ?_gv= forces fresh network fetch.
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('_gv', String(Date.now()));
          window.location.replace(url.toString());
        } catch {
          window.location.reload();
        }
        // Return a never-resolving promise to prevent React error while reloading
        return new Promise<T>(() => {});
      });
    })
  );
}
