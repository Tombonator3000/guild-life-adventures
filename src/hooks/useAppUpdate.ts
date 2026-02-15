import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const SW_CHECK_INTERVAL_MS = 5 * 60 * 1000;   // SW update check every 5 min
const VERSION_POLL_INTERVAL_MS = 60 * 1000;    // version.json poll every 60 sec

/** Resolve version.json URL relative to the app's base path. */
function getVersionUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}version.json`;
}

const RELOAD_KEY = 'guild-reload-count';
const MAX_RELOADS = 3;
const RELOAD_WINDOW_MS = 120_000; // 2 minutes

/** Check how many programmatic reloads have happened recently. */
function getReloadCount(): number {
  try {
    const d = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || 'null');
    if (!d || Date.now() - d.ts > RELOAD_WINDOW_MS) return 0;
    return d.count || 0;
  } catch { return 0; }
}

/** Increment the reload counter in sessionStorage. */
function bumpReloadCount(): void {
  try {
    let d = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || 'null');
    if (!d || Date.now() - d.ts > RELOAD_WINDOW_MS) d = { ts: Date.now(), count: 0 };
    d.count++;
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(d));
  } catch { /* ignore */ }
}

/**
 * Nuclear cache clear: unregister all service workers, delete every Cache
 * Storage entry, then hard-reload the page. This guarantees the browser
 * fetches everything fresh from the network (subject only to CDN TTL).
 *
 * Includes reload loop protection: if more than 3 reloads happen within
 * 2 minutes, the reload is skipped to prevent infinite loops.
 */
export async function hardRefresh(): Promise<void> {
  // Reload loop protection: don't reload if we've already reloaded too many times.
  // Without this, programmatic callers (e.g. controllerchange, lazyWithRetry)
  // can create infinite reload loops that make the game permanently unloadable.
  if (getReloadCount() >= MAX_RELOADS) {
    console.warn('[Guild Life] Reload loop detected — skipping hardRefresh (', getReloadCount(), 'reloads in 2 min)');
    return;
  }
  bumpReloadCount();

  // Wrap all cleanup in a 5-second timeout to prevent hanging forever
  // if browser APIs (SW unregister, cache delete) don't resolve.
  try {
    await Promise.race([
      (async () => {
        // 1. Unregister all service workers
        const registrations = await navigator.serviceWorker?.getRegistrations() ?? [];
        await Promise.all(registrations.map(r => r.unregister()));

        // 2. Delete all Cache Storage caches
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));

        // 3. Wait for async operations to fully propagate.
        await new Promise(r => setTimeout(r, 500));
      })(),
      new Promise<void>(resolve => setTimeout(resolve, 5000)), // 5s timeout
    ]);
  } catch {
    // Ignore errors — reload regardless
  }

  // 4. Cache-busting reload: use a URL query parameter to bypass the browser's
  // HTTP cache. GitHub Pages sends Cache-Control: max-age=600 (10 minutes), and
  // location.reload() may still serve the stale cached HTML within that window.
  // The <meta http-equiv="Cache-Control"> tags are ignored by modern browsers.
  // Adding ?_gv=<timestamp> forces the browser to treat it as a new URL.
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_gv', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    // Fallback: regular reload if URL manipulation fails
    window.location.reload();
  }
}

export function useAppUpdate() {
  const [versionMismatch, setVersionMismatch] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  // SW registration — we still register for caching benefits, but all
  // user-triggered updates go through hardRefresh() to avoid the race
  // condition where skipWaiting + clientsClaim activates a new SW but
  // the page never reloads (old JS + new SW = silent failure).
  const {
    needRefresh: [swNeedRefresh],
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Check immediately on registration, then periodically
      registration.update();
      setInterval(() => registration.update(), SW_CHECK_INTERVAL_MS);
    },
  });

  // When a new SW takes control mid-session (e.g. auto-update via
  // skipWaiting + clientsClaim), show the update banner instead of reloading.
  //
  // CRITICAL FIX (2026-02-15): The previous version called hardRefresh() here,
  // which caused an INFINITE RELOAD LOOP:
  //   1. hardRefresh() unregisters SW and reloads
  //   2. On reload, useRegisterSW registers a NEW SW
  //   3. New SW installs → skipWaiting → clientsClaim → controllerchange fires
  //   4. hardRefresh() fires again → GOTO step 1
  // This happened because controllerchange fires whenever the controller
  // changes from null to a new SW (not just SW-to-SW swaps).
  // Showing the banner instead lets the user decide when to reload.
  useEffect(() => {
    const onControllerChange = () => {
      console.log('[Guild Life] Service worker controller changed — showing update banner');
      setVersionMismatch(true);
    };
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  // version.json polling — bypasses both service worker and browser cache.
  // Detects new deployments while the app is running and shows an update
  // banner. Does NOT auto-reload — the user clicks the banner to update.
  // (Auto-reload on first mount was removed because the inline script in
  // index.html already handles stale-build detection with hot-swap.
  // Having auto-reload here too caused reload loops when both systems
  // detected staleness simultaneously.)
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Cache-busting query param defeats CDN/proxy caches that ignore no-store
        const url = `${getVersionUrl()}?_=${Date.now()}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.buildTime && data.buildTime !== __BUILD_TIME__) {
          // Show update banner — user decides when to reload
          setVersionMismatch(true);
        }
      } catch {
        // Network error — skip this check
      }
    };

    // Check on mount, then every 60s
    checkVersion();
    pollingRef.current = setInterval(checkVersion, VERSION_POLL_INTERVAL_MS);
    return () => clearInterval(pollingRef.current);
  }, []);

  // Either detection method triggers the banner
  const needRefresh = swNeedRefresh || versionMismatch;

  // Always use hardRefresh for user-triggered updates. The previous
  // implementation used updateServiceWorker(true) for the SW path which
  // only sent a skipWaiting message without reloading the page — causing
  // the infinite loading bug. hardRefresh is reliable: unregister SW,
  // clear caches, reload from network.
  const updateApp = useCallback(async () => {
    await hardRefresh();
  }, []);

  const checkForUpdates = useCallback(async () => {
    // Trigger both detection methods simultaneously
    navigator.serviceWorker?.getRegistration().then(reg => reg?.update());

    // Also check version.json immediately (cache-busting param)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`${getVersionUrl()}?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.buildTime && data.buildTime !== __BUILD_TIME__) {
        setVersionMismatch(true);
      }
    } catch {
      // ignore (network error or timeout)
    }
  }, []);

  return { needRefresh, updateApp, checkForUpdates, hardRefresh };
}
