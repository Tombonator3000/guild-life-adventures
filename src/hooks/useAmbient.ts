// useAmbient — React hook that drives ambient sounds based on game state.
// Plays location-specific environmental audio underneath the music.

import { useEffect, useSyncExternalStore, useCallback } from 'react';
import { ambientManager, type AmbientSettings } from '@/audio/ambientManager';
import {
  LOCATION_AMBIENT,
  DEFAULT_AMBIENT,
} from '@/audio/ambientConfig';
import type { GameState, LocationId } from '@/types/game.types';

// Stable references for useSyncExternalStore
const subscribe = (cb: () => void) => ambientManager.subscribe(cb);
const getSnapshot = () => ambientManager.getSettings();

/** Subscribe to ambient settings changes and return current settings with controls. */
export function useAmbientSettings(): AmbientSettings & {
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setMuted: (m: boolean) => void;
} {
  const settings = useSyncExternalStore(subscribe, getSnapshot);

  return {
    ...settings,
    setVolume: useCallback((v: number) => ambientManager.setVolume(v), []),
    toggleMute: useCallback(() => ambientManager.toggleMute(), []),
    setMuted: useCallback((m: boolean) => ambientManager.setMuted(m), []),
  };
}

/**
 * Drive ambient sounds based on game phase and player location.
 * Call this once at the top-level game component alongside useMusicController.
 */
export function useAmbientController(
  phase: GameState['phase'],
  playerLocation: LocationId | null,
) {
  useEffect(() => {
    if (phase === 'playing' || phase === 'event') {
      if (playerLocation) {
        const ambientId = LOCATION_AMBIENT[playerLocation] ?? DEFAULT_AMBIENT;
        ambientManager.play(ambientId);
      } else {
        ambientManager.play(DEFAULT_AMBIENT);
      }
    } else {
      // Stop ambient on menu screens (title, setup, victory)
      ambientManager.stop();
    }
  }, [phase, playerLocation]);
}
