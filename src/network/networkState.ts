// Shared network state serialization/deserialization
// Single source of truth — used by both useOnlineGame and useNetworkSync

// IMPORTANT: Do NOT import useGameStore at the top level here.
// gameStore.ts imports markEventDismissed from this module, creating a circular dependency:
//   gameStore.ts → networkState.ts → gameStore.ts
// This circular import causes "Loading the realm..." freeze because one module
// gets a partially-initialized reference to the other during module evaluation.
//
// Solution: gameStore.ts calls setNetworkStateStoreAccessor() after creating the store,
// providing a function to get/set state without a direct import.

import type { SerializedGameState } from './types';

/** Store accessor — set by gameStore.ts after store creation to break circular dep */
type StoreState = Record<string, unknown>;
type StoreAccessor = {
  getState: () => StoreState;
  setState: (update: Record<string, unknown>) => void;
};
let storeAccessor: StoreAccessor | null = null;

/** Called by gameStore.ts after store creation to provide state access */
export function setNetworkStateStoreAccessor(accessor: StoreAccessor) {
  storeAccessor = accessor;
}

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

/** Track the last known currentPlayerIndex to clear dismissed events on turn change */
let lastSyncedPlayerIndex = -1;
/** Track the last known week to clear dismissed events on new week */
let lastSyncedWeek = -1;

/** Reset all network state tracking (call on game end / new game / disconnect) */
export function resetNetworkState() {
  dismissedEvents.clear();
  lastSyncedPlayerIndex = -1;
  lastSyncedWeek = -1;
}

/**
 * Extract serializable game state from the Zustand store.
 * Only includes gameplay-relevant fields — local UI state (selectedLocation,
 * tutorial, AI speed) is excluded.
 */
export function serializeGameState(): SerializedGameState {
  if (!storeAccessor) {
    console.error('[Network] Store accessor not set — cannot serialize state');
    return {} as SerializedGameState;
  }
  const s = storeAccessor.getState();
  return {
    phase: s.phase,
    currentPlayerIndex: s.currentPlayerIndex,
    players: s.players,
    week: s.week,
    priceModifier: s.priceModifier,
    basePriceModifier: s.basePriceModifier,
    economyTrend: s.economyTrend,
    economyCycleWeeksLeft: s.economyCycleWeeksLeft,
    goalSettings: s.goalSettings,
    winner: s.winner,
    eventMessage: s.eventMessage,
    eventSource: s.eventSource,
    rentDueWeek: s.rentDueWeek,
    aiDifficulty: s.aiDifficulty,
    stockPrices: s.stockPrices,
    stockPriceHistory: s.stockPriceHistory,
    weekendEvent: s.weekendEvent,
    weather: s.weather,
    activeFestival: s.activeFestival,
    // Network identity — included for game-start init, not applied on regular sync
    networkMode: s.networkMode,
    localPlayerId: s.localPlayerId,
    roomCode: s.roomCode,
    // Event modals (so guests see robbery/breakage/death events)
    shadowfingersEvent: s.shadowfingersEvent,
    applianceBreakageEvent: s.applianceBreakageEvent,
    deathEvent: s.deathEvent,
    // Excluded: selectedLocation, showTutorial, tutorialStep,
    //   aiSpeedMultiplier, skipAITurn — these are local UI preferences
  } as SerializedGameState;
}

/**
 * Apply state from host to local Zustand store (guest only).
 * Preserves local UI state (selectedLocation, tutorial, AI speed).
 * Skips event fields that the guest has locally dismissed (prevents modal flicker).
 * Auto-clears dismissed events on turn change and new week to prevent stale state.
 */
export function applyNetworkState(state: SerializedGameState) {
  if (!storeAccessor) {
    console.error('[Network] Store accessor not set — cannot apply state');
    return;
  }
  const store = storeAccessor.getState();

  // Clear dismissed events on turn change or new week (prevents persistence bugs)
  if (state.currentPlayerIndex !== lastSyncedPlayerIndex || state.week !== lastSyncedWeek) {
    dismissedEvents.clear();
    lastSyncedPlayerIndex = state.currentPlayerIndex;
    lastSyncedWeek = state.week ?? -1;
  }

  // Build the update object
  const update: Record<string, unknown> = {
    currentPlayerIndex: state.currentPlayerIndex,
    players: state.players,
    week: state.week,
    priceModifier: state.priceModifier,
    basePriceModifier: state.basePriceModifier,
    economyTrend: state.economyTrend,
    economyCycleWeeksLeft: state.economyCycleWeeksLeft,
    goalSettings: state.goalSettings,
    winner: state.winner,
    rentDueWeek: state.rentDueWeek,
    aiDifficulty: state.aiDifficulty,
    stockPrices: state.stockPrices,
    stockPriceHistory: state.stockPriceHistory,
    weather: state.weather,
    activeFestival: state.activeFestival ?? null,
  };

  // Only sync event fields if the guest hasn't locally dismissed them
  // This prevents the "modal reappears after dismiss" flicker bug
  if (!dismissedEvents.has('eventMessage')) {
    update.phase = state.phase;
    update.eventMessage = state.eventMessage;
    update.eventSource = (state as unknown as Record<string, unknown>).eventSource ?? null;
  } else if (state.eventMessage === null) {
    // Host cleared the event — safe to sync and remove dismissal
    update.phase = state.phase;
    update.eventMessage = null;
    update.eventSource = null;
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

  if (!dismissedEvents.has('deathEvent')) {
    update.deathEvent = (state as unknown as Record<string, unknown>).deathEvent ?? null;
  } else if ((state as unknown as Record<string, unknown>).deathEvent == null) {
    update.deathEvent = null;
    dismissedEvents.delete('deathEvent');
  }

  storeAccessor.setState(update);
}

/**
 * Execute a store action by name with args (host-side only).
 * Returns true on success, false on failure.
 */
export function executeAction(name: string, args: unknown[]): boolean {
  if (!storeAccessor) {
    console.error('[Network] Store accessor not set — cannot execute action');
    return false;
  }
  const store = storeAccessor.getState();
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
