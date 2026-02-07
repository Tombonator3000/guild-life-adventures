// Shared network state serialization/deserialization
// Single source of truth — used by both useOnlineGame and useNetworkSync

import { useGameStore } from '@/store/gameStore';
import type { SerializedGameState } from './types';

/** Track which event IDs the guest has locally dismissed (prevents re-show on sync) */
const dismissedEvents = new Set<string>();

/** Mark an event as dismissed locally (guest-side) */
export function markEventDismissed(eventKey: string) {
  dismissedEvents.add(eventKey);
}

/** Clear dismissed events (e.g., on new turn) */
export function clearDismissedEvents() {
  dismissedEvents.clear();
}

/**
 * Extract serializable game state from the Zustand store.
 * Only includes gameplay-relevant fields — local UI state (selectedLocation,
 * tutorial, AI speed) is excluded.
 */
export function serializeGameState(): SerializedGameState {
  const s = useGameStore.getState();
  return {
    phase: s.phase,
    currentPlayerIndex: s.currentPlayerIndex,
    players: s.players,
    week: s.week,
    priceModifier: s.priceModifier,
    economyTrend: s.economyTrend,
    economyCycleWeeksLeft: s.economyCycleWeeksLeft,
    goalSettings: s.goalSettings,
    winner: s.winner,
    eventMessage: s.eventMessage,
    rentDueWeek: s.rentDueWeek,
    aiDifficulty: s.aiDifficulty,
    stockPrices: s.stockPrices,
    weekendEvent: s.weekendEvent,
    // Network identity — included for game-start init, not applied on regular sync
    networkMode: s.networkMode,
    localPlayerId: s.localPlayerId,
    roomCode: s.roomCode,
    // Event modals (so guests see robbery/breakage events)
    shadowfingersEvent: s.shadowfingersEvent,
    applianceBreakageEvent: s.applianceBreakageEvent,
    // Excluded: selectedLocation, showTutorial, tutorialStep,
    //   aiSpeedMultiplier, skipAITurn — these are local UI preferences
  } as SerializedGameState;
}

/**
 * Apply state from host to local Zustand store (guest only).
 * Preserves local UI state (selectedLocation, tutorial, AI speed).
 * Skips event fields that the guest has locally dismissed (prevents modal flicker).
 */
export function applyNetworkState(state: SerializedGameState) {
  const store = useGameStore.getState();

  // Build the update object
  const update: Record<string, unknown> = {
    currentPlayerIndex: state.currentPlayerIndex,
    players: state.players,
    week: state.week,
    priceModifier: state.priceModifier,
    economyTrend: state.economyTrend,
    economyCycleWeeksLeft: state.economyCycleWeeksLeft,
    goalSettings: state.goalSettings,
    winner: state.winner,
    rentDueWeek: state.rentDueWeek,
    aiDifficulty: state.aiDifficulty,
    stockPrices: state.stockPrices,
  };

  // Only sync event fields if the guest hasn't locally dismissed them
  // This prevents the "modal reappears after dismiss" flicker bug
  if (!dismissedEvents.has('eventMessage')) {
    update.phase = state.phase;
    update.eventMessage = state.eventMessage;
  } else if (state.eventMessage === null) {
    // Host cleared the event — safe to sync and remove dismissal
    update.phase = state.phase;
    update.eventMessage = null;
    dismissedEvents.delete('eventMessage');
  } else {
    // Keep guest's local phase (they dismissed the event)
    // but sync phase if it's not an event phase (e.g., victory, playing)
    if (state.phase !== 'event') {
      update.phase = state.phase;
    }
  }

  if (!dismissedEvents.has('shadowfingersEvent')) {
    update.shadowfingersEvent = state.shadowfingersEvent as typeof store.shadowfingersEvent;
  } else if (state.shadowfingersEvent == null) {
    update.shadowfingersEvent = null;
    dismissedEvents.delete('shadowfingersEvent');
  }

  if (!dismissedEvents.has('applianceBreakageEvent')) {
    update.applianceBreakageEvent = state.applianceBreakageEvent as typeof store.applianceBreakageEvent;
  } else if (state.applianceBreakageEvent == null) {
    update.applianceBreakageEvent = null;
    dismissedEvents.delete('applianceBreakageEvent');
  }

  if (!dismissedEvents.has('weekendEvent')) {
    update.weekendEvent = state.weekendEvent;
  } else if (state.weekendEvent == null) {
    update.weekendEvent = null;
    dismissedEvents.delete('weekendEvent');
  }

  useGameStore.setState(update);
}

/**
 * Execute a store action by name with args (host-side only).
 * Returns true on success, false on failure.
 */
export function executeAction(name: string, args: unknown[]): boolean {
  const store = useGameStore.getState();
  const action = (store as unknown as Record<string, unknown>)[name];
  if (typeof action !== 'function') {
    console.error(`[Network] Unknown action: ${name}`);
    return false;
  }
  try {
    (action as (...a: unknown[]) => unknown)(...args);
    return true;
  } catch (err) {
    console.error(`[Network] Action ${name} failed:`, err);
    return false;
  }
}
