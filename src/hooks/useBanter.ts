// useBanter hook - Manages NPC banter state and cooldowns
// Uses banterStore for shared state between LocationShell (trigger) and GameBoard (display)

import { useCallback, useRef } from 'react';
import type { LocationId } from '@/types/game.types';
import type { Player } from '@/types/game.types';
import { LOCATION_NPCS } from '@/data/npcs';
import {
  getRandomBanter,
  getContextBanter,
  shouldTriggerBanter,
  BANTER_COOLDOWN,
} from '@/data/banter';
import { useBanterStore } from '@/store/banterStore';

export function useBanter() {
  const { activeBanter, locationId: banterLocationId, npcName, setBanter, clearBanter } = useBanterStore();

  // Track cooldowns per location
  const cooldownsRef = useRef<Map<LocationId, number>>(new Map());

  // Try to trigger banter for a location
  const tryTriggerBanter = useCallback((
    locationId: LocationId,
    player?: Player,
    allPlayers?: Player[],
  ) => {
    // Check cooldown
    const lastBanter = cooldownsRef.current.get(locationId) || 0;
    const now = Date.now();
    if (now - lastBanter < BANTER_COOLDOWN) {
      return; // Still on cooldown
    }

    // Check if banter should trigger
    if (!shouldTriggerBanter()) {
      return; // Didn't roll high enough
    }

    // 40% chance for context-aware banter if player data is available
    let banter = null;
    if (player && allPlayers && Math.random() < 0.4) {
      banter = getContextBanter(locationId, player, allPlayers);
    }

    // Fallback to static random banter
    if (!banter) {
      banter = getRandomBanter(locationId);
    }
    if (!banter) return;

    // Get NPC name for display
    const npc = LOCATION_NPCS[locationId];
    const name = npc?.name || 'Someone';

    // Set cooldown and show banter via shared store
    cooldownsRef.current.set(locationId, now);
    setBanter(banter, locationId, name);
  }, [setBanter]);

  // Dismiss current banter
  const dismissBanter = useCallback(() => {
    clearBanter();
  }, [clearBanter]);

  return {
    activeBanter,
    banterLocationId,
    npcName,
    tryTriggerBanter,
    dismissBanter,
  };
}
