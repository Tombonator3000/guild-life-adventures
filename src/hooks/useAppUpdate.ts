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
  if (getReloadCount() >= MAX_RELOADS) {
    console.warn('[Guild Life] Reload loop detected — skipping hardRefresh (', getReloadCount(), 'reloads in 2 min)');
    return;
  }
  bumpReloadCount();

  // Wrap all cleanup in a 5-second timeout to prevent hanging forever
  try {
    await Promise.race([
      (async () => {
        const registrations = await navigator.serviceWorker?.getRegistrations() ?? [];
        await Promise.all(registrations.map(r => r.unregister()));
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
        await new Promise(r => setTimeout(r, 500));
      })(),
      new Promise<void>(resolve => setTimeout(resolve, 5000)),
    ]);
  } catch {
    // Ignore errors — reload regardless
  }

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_gv', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

export function useAppUpdate() {
  const [versionMismatch, setVersionMismatch] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  // SW registration — re-registers a fresh SW after the inline script
  // unregistered any stale ones. On GitHub Pages, skipWaiting and clientsClaim
  // are disabled, so the new SW won't interfere with the current page.
  const {
    needRefresh: [swNeedRefresh],
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      registration.update();
      setInterval(() => registration.update(), SW_CHECK_INTERVAL_MS);
    },
  });

  // version.json polling — the primary update detection method.
  // Bypasses both browser cache (cache:'no-store') and CDN cache
  // (Cache-Control: no-cache header + unique query param).
  // Shows update banner when a new version is detected.
  useEffect(() => {
    const checkVersion = async () => {
      try {
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
          setVersionMismatch(true);
        }
      } catch {
        // Network error — skip this check
      }
    };

    checkVersion();
    pollingRef.current = setInterval(checkVersion, VERSION_POLL_INTERVAL_MS);
    return () => clearInterval(pollingRef.current);
  }, []);

  const needRefresh = swNeedRefresh || versionMismatch;

  const updateApp = useCallback(async () => {
    await hardRefresh();
  }, []);

  const checkForUpdates = useCallback(async () => {
    navigator.serviceWorker?.getRegistration().then(reg => reg?.update());
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
      // ignore
    }
  }, []);

  return { needRefresh, updateApp, checkForUpdates, hardRefresh };
}
