// Network Action Proxy
// For online guests: intercepts store actions and forwards them to the host
// For online hosts: passes through to real store
// For local games: passes through to real store

// IMPORTANT: Do NOT import useGameStore at the top level here.
// gameStore.ts imports forwardIfGuest from this module, creating a circular dependency:
//   gameStore.ts → NetworkActionProxy.ts → gameStore.ts
// This circular import caused "Loading the realm..." freeze because one module
// would get a partially-initialized reference to the other during module evaluation.
//
// Solution: gameStore.ts calls setStoreAccessor() after creating the store,
// providing a function to get the current state without a direct import.
import { LOCAL_ONLY_ACTIONS, HOST_INTERNAL_ACTIONS } from './types';

type ActionSender = (actionName: string, args: unknown[]) => void;

/**
 * Event published to subscribers when a guest action either receives an
 * `action-result` response from the host or exceeds the response timeout.
 * Panels use this to clear a local "pending" lock immediately on rejection
 * instead of waiting up to 10s for a resource-change heuristic.
 */
export interface NetworkActionResultEvent {
  requestId: string;
  actionName: string;
  args: unknown[];
  success: boolean;
  error?: string;
  /** True when the fallback timeout fired without a host response. */
  timedOut: boolean;
}

type ActionResultListener = (event: NetworkActionResultEvent) => void;
const actionResultListeners = new Set<ActionResultListener>();

/** Subscribe to guest action-result notifications. Returns an unsubscribe fn. */
export function subscribeActionResult(listener: ActionResultListener): () => void {
  actionResultListeners.add(listener);
  return () => actionResultListeners.delete(listener);
}

function emitActionResult(event: NetworkActionResultEvent) {
  for (const listener of actionResultListeners) {
    try {
      listener(event);
    } catch (err) {
      console.error('[NetworkProxy] action-result listener threw', err);
    }
  }
}

/** Store accessor — set by gameStore.ts after store creation to break circular dep */
type StoreAccessor = () => { networkMode: string };
let storeAccessor: StoreAccessor | null = null;

/** Called by gameStore.ts after store creation to provide state access */
export function setStoreAccessor(accessor: StoreAccessor) {
  storeAccessor = accessor;
}

// Global reference to the network action sender (set by useOnlineGame hook)
let networkActionSender: ActionSender | null = null;

/** Track pending actions to detect timeouts and match action-result responses. */
interface PendingAction {
  timestamp: number;
  actionName: string;
  args: unknown[];
}
const pendingActions = new Map<string, PendingAction>();
/** Timeout for guest action responses (ms) */
const ACTION_RESPONSE_TIMEOUT = 10000;
/** Interval for checking timed-out actions */
let actionTimeoutChecker: ReturnType<typeof setInterval> | null = null;

/** Start checking for timed-out actions */
function startActionTimeoutChecker() {
  if (actionTimeoutChecker) return;
  actionTimeoutChecker = setInterval(() => {
    const now = Date.now();
    for (const [requestId, pending] of pendingActions) {
      if (now - pending.timestamp > ACTION_RESPONSE_TIMEOUT) {
        console.warn(`[NetworkProxy] Action timed out (no response from host): ${requestId}`);
        pendingActions.delete(requestId);
        emitActionResult({
          requestId,
          actionName: pending.actionName,
          args: pending.args,
          success: false,
          error: 'Host did not respond',
          timedOut: true,
        });
      }
    }
    // Stop checker when no more pending actions
    if (pendingActions.size === 0 && actionTimeoutChecker) {
      clearInterval(actionTimeoutChecker);
      actionTimeoutChecker = null;
    }
  }, 2000);
}

/** Track a sent action for timeout detection and action-result matching */
export function trackPendingAction(requestId: string, actionName = '', args: unknown[] = []) {
  pendingActions.set(requestId, { timestamp: Date.now(), actionName, args });
  startActionTimeoutChecker();
}

/**
 * Mark an action as resolved (response received). Emits a
 * `NetworkActionResultEvent` so subscribers can react to the host's decision.
 */
export function resolveAction(requestId: string, success = true, error?: string) {
  const pending = pendingActions.get(requestId);
  pendingActions.delete(requestId);
  if (!pending) return;
  emitActionResult({
    requestId,
    actionName: pending.actionName,
    args: pending.args,
    success,
    error,
    timedOut: false,
  });
}

/** Clear all pending actions (on disconnect/cleanup) */
export function clearPendingActions() {
  pendingActions.clear();
  if (actionTimeoutChecker) {
    clearInterval(actionTimeoutChecker);
    actionTimeoutChecker = null;
  }
}

export function setNetworkActionSender(sender: ActionSender | null) {
  networkActionSender = sender;
  if (!sender) clearPendingActions();
}

/**
 * Check if the current action should be forwarded to the host.
 * Returns true if the action was forwarded (caller should return early).
 * Returns false if the action should execute locally.
 */
export function shouldForwardAction(actionName: string, args: unknown[]): boolean {
  // If store accessor isn't set yet (during initialization), execute locally
  if (!storeAccessor) return false;

  const state = storeAccessor();

  // Local mode — always execute locally
  if (state.networkMode === 'local') return false;

  // Host mode — always execute locally
  if (state.networkMode === 'host') return false;

  // Guest mode checks:

  // Local-only actions (UI state) — execute locally on guest
  if (LOCAL_ONLY_ACTIONS.has(actionName)) return false;

  // Host-internal actions (startTurn, processWeekEnd, etc.) must NOT run on guest.
  // Return true to block local execution (pretend forwarded, but don't actually send).
  if (HOST_INTERNAL_ACTIONS.has(actionName)) return true;

  // Forward to host
  if (networkActionSender) {
    networkActionSender(actionName, args);
    return true;
  }

  console.warn(`[NetworkProxy] No action sender for guest action: ${actionName}`);
  return false;
}

/**
 * Helper to create a network-aware wrapper for a store action.
 * Used at the top of each store action to intercept guest actions.
 */
export function forwardIfGuest(actionName: string, args: unknown[]): boolean {
  return shouldForwardAction(actionName, args);
}
