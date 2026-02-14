import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const SW_CHECK_INTERVAL_MS = 5 * 60 * 1000;   // SW update check every 5 min
const VERSION_POLL_INTERVAL_MS = 60 * 1000;    // version.json poll every 60 sec
const AUTO_RELOAD_KEY = 'guild-life-auto-reload-ts';

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
  try {
    // 1. Unregister all service workers
    const registrations = await navigator.serviceWorker?.getRegistrations() ?? [];
    await Promise.all(registrations.map(r => r.unregister()));

    // 2. Delete all Cache Storage caches
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map(k => caches.delete(k)));

    // 3. Verify cleanup actually completed — SWs should be gone
    const remainingRegs = await navigator.serviceWorker?.getRegistrations() ?? [];
    if (remainingRegs.length > 0) {
      // Retry unregistration
      await Promise.all(remainingRegs.map(r => r.unregister()));
    }

    // 4. Wait for async operations to fully propagate.
    // 100ms was too short in some cases — browser needs time to finalize
    // SW unregistration before the next page load avoids re-activation.
    await new Promise(r => setTimeout(r, 500));
  } catch {
    // Ignore errors — reload regardless
  }

  // 5. Cache-busting reload: use a URL query parameter to bypass the browser's
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

/**
 * Check if we can auto-reload. Prevents infinite reload loops by tracking
 * reload count within a session window. Allows up to 2 reloads per 60s.
 * This is more robust than the previous 30s time-based check because it
 * lets a stale build attempt recovery twice (once to clear SW, once to
 * fetch fresh content) before giving up and showing the manual button.
 */
function canAutoReload(): boolean {
  try {
    const raw = sessionStorage.getItem(AUTO_RELOAD_KEY);
    if (!raw) return true;
    const data = JSON.parse(raw);
    // Reset counter if window has expired
    if (Date.now() - data.firstReloadTs > 60_000) return true;
    // Allow up to 2 auto-reloads within the window
    return data.count < 2;
  } catch {
    return true;
  }
}

function markAutoReload(): void {
  try {
    const raw = sessionStorage.getItem(AUTO_RELOAD_KEY);
    let data = raw ? JSON.parse(raw) : null;
    if (!data || Date.now() - data.firstReloadTs > 60_000) {
      data = { firstReloadTs: Date.now(), count: 0 };
    }
    data.count++;
    sessionStorage.setItem(AUTO_RELOAD_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable — allow reload anyway
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
      if (canAutoReload()) {
        markAutoReload();
        window.location.reload();
      }
    };
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  // version.json polling — bypasses both service worker and browser cache.
  // On initial mount, if a version mismatch is detected AND we haven't
  // auto-reloaded recently, do a hard refresh immediately. This prevents
  // the infinite loading issue where stale cached JS never mounts properly.
  useEffect(() => {
    let isFirstCheck = true;

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
          if (isFirstCheck && canAutoReload()) {
            // First check after mount detected stale build — auto-reload
            // to pick up the new version without user intervention.
            markAutoReload();
            await hardRefresh();
            return; // hardRefresh reloads the page
          }
          // Subsequent checks or already reloaded once — show banner
          setVersionMismatch(true);
        }
      } catch {
        // Network error — skip this check
      }
      isFirstCheck = false;
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
