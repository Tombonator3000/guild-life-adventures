import { registerSW } from 'virtual:pwa-register';
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { createUpdateMonitor } from './appUpdateMonitor';

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


const listeners = new Set<() => void>();
const monitor = createUpdateMonitor(__BUILD_TIME__, `${import.meta.env.BASE_URL || '/'}version.json`, () => listeners.forEach(listener => listener()));
let registered = false;
let registration: ServiceWorkerRegistration | undefined;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  monitor.start();
  if (!registered) {
    registered = true;
    registerSW({ onNeedRefresh: monitor.markAvailable, onRegisteredSW(_url, value) { registration = value; }, onRegisterError() { /* version polling remains active */ } });
  }
  return () => { listeners.delete(listener); if (!listeners.size) monitor.stop(); };
};

async function checkForUpdates() {
  await Promise.allSettled([monitor.check(), registration?.update()]);
}

async function updateApp() {
  // Keep the current local game, including an in-progress cave session, before reload.
  const [{ useGameStore }, { saveGame }] = await Promise.all([import('@/store/gameStore'), import('@/data/saveLoad')]);
  const state = useGameStore.getState();
  if (state.networkMode !== 'local') {
    toast.info('Finish or leave the online session before updating.');
    return;
  }
  if (state.players.length && state.phase !== 'title' && state.phase !== 'setup') {
    if (!saveGame(state)) { toast.error('Could not save your game. Free some browser storage and try again.'); return; }
  }
  await hardRefresh();
}

export function useAppUpdate() {
  const needRefresh = useSyncExternalStore(subscribe, monitor.getSnapshot);
  return { needRefresh, updateApp, checkForUpdates, hardRefresh };
}
