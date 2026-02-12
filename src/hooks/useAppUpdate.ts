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

export function useAppUpdate() {
  const [versionMismatch, setVersionMismatch] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  // Standard SW-based update detection (existing behavior)
  const {
    needRefresh: [swNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Check immediately on registration, then periodically
      registration.update();
      setInterval(() => registration.update(), SW_CHECK_INTERVAL_MS);
    },
  });

  // version.json polling — bypasses both service worker and browser cache
  useEffect(() => {
    const checkVersion = async () => {
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

  const updateApp = useCallback(async () => {
    if (versionMismatch) {
      // version.json confirmed a stale build → nuclear refresh
      await hardRefresh();
    } else {
      // SW detected update → use standard SW skipWaiting + reload
      await updateServiceWorker(true);
    }
  }, [versionMismatch, updateServiceWorker]);

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
