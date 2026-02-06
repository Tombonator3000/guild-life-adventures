// useMusic — React hook that drives the AudioManager based on game state.
// Automatically plays the right track for the current screen/location.

import { useEffect, useSyncExternalStore, useCallback } from 'react';
import { audioManager, type AudioSettings } from '@/audio/audioManager';
import {
  SCREEN_MUSIC,
  LOCATION_MUSIC,
  DEFAULT_GAME_TRACK,
} from '@/audio/musicConfig';
import type { GameState, LocationId } from '@/types/game.types';

/** Subscribe to audioManager settings changes and return current settings. */
export function useAudioSettings(): AudioSettings & {
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setMuted: (m: boolean) => void;
} {
  const settings = useSyncExternalStore(
    (cb) => audioManager.subscribe(cb),
    () => audioManager.getSettings(),
  );

  return {
    ...settings,
    setVolume: useCallback((v: number) => audioManager.setVolume(v), []),
    toggleMute: useCallback(() => audioManager.toggleMute(), []),
    setMuted: useCallback((m: boolean) => audioManager.setMuted(m), []),
  };
}

/**
 * Drive music based on game phase and player location.
 * Call this once at the top-level game component.
 */
export function useMusicController(
  phase: GameState['phase'],
  playerLocation: LocationId | null,
) {
  useEffect(() => {
    // Determine which track to play
    let trackId: string | undefined;

    if (phase === 'playing' || phase === 'event') {
      // In-game: use location-specific track or default
      if (playerLocation) {
        trackId = LOCATION_MUSIC[playerLocation] ?? DEFAULT_GAME_TRACK;
      } else {
        trackId = DEFAULT_GAME_TRACK;
      }
    } else {
      // Menu screens (title, setup, victory)
      trackId = SCREEN_MUSIC[phase];
    }

    if (trackId) {
      audioManager.play(trackId);
    }
  }, [phase, playerLocation]);
}

/** Play a specific one-off track (e.g. weekend event). */
export function playTrack(trackId: string) {
  audioManager.play(trackId);
}

/** Stop music. */
export function stopMusic() {
  audioManager.stop();
}
