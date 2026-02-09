import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCallback } from 'react';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check for updates every 5 minutes

export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Check immediately on registration
      registration.update();
      // Periodic update check
      setInterval(() => {
        registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  const updateApp = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const checkForUpdates = useCallback(() => {
    navigator.serviceWorker?.getRegistration().then((reg) => {
      reg?.update();
    });
  }, []);

  return { needRefresh, updateApp, checkForUpdates };
}
