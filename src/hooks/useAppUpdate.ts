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
 */
export async function hardRefresh(): Promise<void> {
  try {
    // 1. Unregister all service workers
    const registrations = await navigator.serviceWorker?.getRegistrations() ?? [];
    await Promise.all(registrations.map(r => r.unregister()));

    // 2. Delete all Cache Storage caches
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map(k => caches.delete(k)));
  } catch {
    // Ignore errors — reload regardless
  }

  // 3. Force full reload from network
  window.location.reload();
}

/**
 * Check if we already auto-reloaded recently (within 30s) to prevent
 * reload loops when CDN serves stale content.
 */
function canAutoReload(): boolean {
  try {
    const last = sessionStorage.getItem(AUTO_RELOAD_KEY);
    if (!last) return true;
    return Date.now() - Number(last) > 30_000;
  } catch {
    return true;
  }
}

function markAutoReload(): void {
  try {
    sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
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
        const resp = await fetch(getVersionUrl(), {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        });
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

    // Also check version.json immediately
    try {
      const resp = await fetch(getVersionUrl(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
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
