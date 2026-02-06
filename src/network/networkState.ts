// Shared network state serialization/deserialization
// Single source of truth — used by both useOnlineGame and useNetworkSync

import { useGameStore } from '@/store/gameStore';
import type { SerializedGameState } from './types';

/**
 * Extract serializable game state from the Zustand store.
 * Only includes gameplay-relevant fields — local UI state (selectedLocation,
 * tutorial, AI speed, network identity) is excluded.
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
    // Network identity (guests need these to initialize)
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
 */
export function applyNetworkState(state: SerializedGameState) {
  const store = useGameStore.getState();
  useGameStore.setState({
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    players: state.players,
    week: state.week,
    priceModifier: state.priceModifier,
    economyTrend: state.economyTrend,
    economyCycleWeeksLeft: state.economyCycleWeeksLeft,
    goalSettings: state.goalSettings,
    winner: state.winner,
    eventMessage: state.eventMessage,
    rentDueWeek: state.rentDueWeek,
    aiDifficulty: state.aiDifficulty,
    stockPrices: state.stockPrices,
    weekendEvent: state.weekendEvent,
    // Sync event modals so guest sees robbery/breakage events
    shadowfingersEvent: state.shadowfingersEvent as typeof store.shadowfingersEvent,
    applianceBreakageEvent: state.applianceBreakageEvent as typeof store.applianceBreakageEvent,
  });
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
