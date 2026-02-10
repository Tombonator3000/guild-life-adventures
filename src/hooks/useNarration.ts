// useNarration — React hooks for Web Speech API narration.
// useNarrationSettings: settings UI binding (volume, rate, voice, enable/disable).
// useNarrationController: drives narration from game events (NPC greetings, events, weekends).

import { useEffect, useRef, useSyncExternalStore, useCallback } from 'react';
import { speechNarrator, type NarrationSettings, type VoiceInfo } from '@/audio/speechNarrator';
import { LOCATION_NPCS } from '@/data/npcs';
import type { GameState, LocationId } from '@/types/game.types';

// --- Settings Hook (for OptionsMenu) ---

const subscribe = (cb: () => void) => speechNarrator.subscribe(cb);
const getSnapshot = () => speechNarrator.getSettings();

export function useNarrationSettings(): NarrationSettings & {
  setEnabled: (v: boolean) => void;
  setVolume: (v: number) => void;
  setRate: (v: number) => void;
  setVoice: (voiceURI: string) => void;
  getEnglishVoices: () => VoiceInfo[];
  isSupported: boolean;
} {
  const settings = useSyncExternalStore(subscribe, getSnapshot);

  return {
    ...settings,
    setEnabled: useCallback((v: boolean) => speechNarrator.setEnabled(v), []),
    setVolume: useCallback((v: number) => speechNarrator.setVolume(v), []),
    setRate: useCallback((v: number) => speechNarrator.setRate(v), []),
    setVoice: useCallback((uri: string) => speechNarrator.setVoice(uri), []),
    getEnglishVoices: useCallback(() => speechNarrator.getEnglishVoices(), []),
    isSupported: speechNarrator.isSupported(),
  };
}

// --- Controller Hook (drives narration from game state) ---

/**
 * Call once at top-level game component (Index.tsx) alongside useMusicController.
 * Narrates NPC greetings on location arrival, event messages, and weekend events.
 */
export function useNarrationController(
  phase: GameState['phase'],
  selectedLocation: LocationId | null,
  eventMessage: string | null,
  weekendEvent: GameState['weekendEvent'],
) {
  const prevLocationRef = useRef<LocationId | null>(null);
  const prevEventRef = useRef<string | null>(null);
  const prevWeekendRef = useRef<string | null>(null);

  // NPC greeting on location arrival
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'event') return;
    if (!selectedLocation || selectedLocation === prevLocationRef.current) return;
    prevLocationRef.current = selectedLocation;

    const npc = LOCATION_NPCS[selectedLocation];
    if (npc?.greeting) {
      speechNarrator.speak(npc.greeting);
    }
  }, [phase, selectedLocation]);

  // Event messages (weather, robbery, etc.)
  useEffect(() => {
    if (!eventMessage || eventMessage === prevEventRef.current) return;
    prevEventRef.current = eventMessage;

    // Strip "Weekend:" prefix and any HTML-like markup for cleaner speech
    const cleanText = eventMessage
      .replace(/^Weekend:\s*/i, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (cleanText) {
      speechNarrator.speak(cleanText);
    }
  }, [eventMessage]);

  // Weekend event narration
  useEffect(() => {
    if (!weekendEvent) return;
    const key = `${weekendEvent.playerName}-${weekendEvent.activity}`;
    if (key === prevWeekendRef.current) return;
    prevWeekendRef.current = key;

    speechNarrator.speak(weekendEvent.activity);
  }, [weekendEvent]);

  // Stop speech when leaving gameplay
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'event') {
      speechNarrator.stop();
      prevLocationRef.current = null;
      prevEventRef.current = null;
      prevWeekendRef.current = null;
    }
  }, [phase]);
}
