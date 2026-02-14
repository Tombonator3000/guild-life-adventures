// AudioController — thin wrapper that drives all audio from game state.
// Lazy-loaded in Index.tsx so that audio module failures don't block React mount.
// If this component fails to load, the game works silently (no music/ambient/narration).

import { useMusicController } from '@/hooks/useMusic';
import { useAmbientController } from '@/hooks/useAmbient';
import { useNarrationController } from '@/hooks/useNarration';
import type { GameState, LocationId } from '@/types/game.types';

interface AudioControllerProps {
  phase: GameState['phase'];
  playerLocation: LocationId | null;
  selectedLocation: LocationId | null;
  eventMessage: string | null;
  weekendEvent: GameState['weekendEvent'];
}

export function AudioController({
  phase,
  playerLocation,
  selectedLocation,
  eventMessage,
  weekendEvent,
}: AudioControllerProps) {
  useMusicController(phase, playerLocation, eventMessage);
  useAmbientController(phase, playerLocation);
  useNarrationController(phase, selectedLocation, eventMessage, weekendEvent);
  return null; // Renders nothing — only drives audio via hooks
}
