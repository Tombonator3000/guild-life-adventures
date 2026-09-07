import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};

/** Ambient motion follows both the operating system and tab visibility. */
export function useEnvironmentActivity() {
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(query).matches, () => true);
  const visible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => false);
  return { reducedMotion, visible };
}
