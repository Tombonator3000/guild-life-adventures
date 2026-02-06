// useSFX — React hook for sound effects settings and playback.

import { useSyncExternalStore, useCallback } from 'react';
import { sfxManager, playSFX, type SFXSettings, type SFXId } from '@/audio/sfxManager';

// Stable references for useSyncExternalStore
const subscribe = (cb: () => void) => sfxManager.subscribe(cb);
const getSnapshot = () => sfxManager.getSettings();

/** Subscribe to SFX settings changes and return current settings with controls. */
export function useSFXSettings(): SFXSettings & {
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setMuted: (m: boolean) => void;
  play: (sfxId: SFXId) => void;
} {
  const settings = useSyncExternalStore(subscribe, getSnapshot);

  return {
    ...settings,
    setVolume: useCallback((v: number) => sfxManager.setVolume(v), []),
    toggleMute: useCallback(() => sfxManager.toggleMute(), []),
    setMuted: useCallback((m: boolean) => sfxManager.setMuted(m), []),
    play: useCallback((sfxId: SFXId) => sfxManager.play(sfxId), []),
  };
}

// Re-export for convenience
export { playSFX };
export type { SFXId };
