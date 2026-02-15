import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const SW_CHECK_INTERVAL_MS = 5 * 60 * 1000;   // SW update check every 5 min
const VERSION_POLL_INTERVAL_MS = 60 * 1000;    // version.json poll every 60 sec

/** Resolve version.json URL relative to the app's base path. */
function getVersionUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}version.json`;
}

/**
 * Nuclear cache clear: unregister all service workers, delete every Cache
 * Storage entry, then hard-reload the page. This guarantees the browser
 * fetches everything fresh from the network (subject only to CDN TTL).
 *
 * Waits for all async cleanup to complete before reloading, preventing
 * the race condition where reload fires while SWs are still registered
 * or caches still exist, causing the stale SW to re-activate on reload.
 */
export async function hardRefresh(): Promise<void> {
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

  // Safety net: if a new service worker takes control (e.g. auto-update
  // via skipWaiting + clientsClaim), force a page reload. Without this
  // listener the old JS keeps running against new SW-served assets,
  // causing React to fail silently and the loading screen to hang.
  useEffect(() => {
    const onControllerChange = () => {
      // Use cache-busting reload instead of location.reload() —
      // GitHub Pages max-age=600 means plain reload may serve stale HTML.
      hardRefresh();
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
