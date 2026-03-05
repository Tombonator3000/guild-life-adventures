// Dev mode gate — activated by secret interaction on TitleScreen.
// Session-only: resets when the browser tab is closed.

let devModeActive = false;
const listeners = new Set<() => void>();

export function isDevMode(): boolean {
  return devModeActive;
}

export function activateDevMode(): void {
  devModeActive = true;
  listeners.forEach(fn => fn());
}

// React hook for reactivity
import { useSyncExternalStore } from 'react';

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return devModeActive;
}

export function useDevMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
