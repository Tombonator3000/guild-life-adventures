// useBanter hook - Manages NPC banter state and cooldowns

import { useState, useCallback, useRef } from 'react';
import type { LocationId } from '@/types/game.types';
import { 
  getRandomBanter, 
  shouldTriggerBanter, 
  BANTER_COOLDOWN,
  type BanterLine 
} from '@/data/banter';

interface BanterState {
  activeBanter: BanterLine | null;
  locationId: LocationId | null;
}

export function useBanter() {
  const [banterState, setBanterState] = useState<BanterState>({
    activeBanter: null,
    locationId: null,
  });
  
  // Track cooldowns per location
  const cooldownsRef = useRef<Map<LocationId, number>>(new Map());

  // Try to trigger banter for a location
  const tryTriggerBanter = useCallback((locationId: LocationId) => {
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

    // Get random banter line
    const banter = getRandomBanter(locationId);
    if (!banter) return;

    // Set cooldown and show banter
    cooldownsRef.current.set(locationId, now);
    setBanterState({
      activeBanter: banter,
      locationId,
    });
  }, []);

  // Dismiss current banter
  const dismissBanter = useCallback(() => {
    setBanterState({
      activeBanter: null,
      locationId: null,
    });
  }, []);

  return {
    activeBanter: banterState.activeBanter,
    banterLocationId: banterState.locationId,
    tryTriggerBanter,
    dismissBanter,
  };
}
