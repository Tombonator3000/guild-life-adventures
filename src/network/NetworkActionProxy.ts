// Network Action Proxy
// For online guests: intercepts store actions and forwards them to the host
// For online hosts: passes through to real store
// For local games: passes through to real store

import { useGameStore } from '@/store/gameStore';
import { LOCAL_ONLY_ACTIONS, HOST_INTERNAL_ACTIONS } from './types';

type ActionSender = (actionName: string, args: unknown[]) => void;

// Global reference to the network action sender (set by useOnlineGame hook)
let networkActionSender: ActionSender | null = null;

export function setNetworkActionSender(sender: ActionSender | null) {
  networkActionSender = sender;
}

/**
 * Check if the current action should be forwarded to the host.
 * Returns true if the action was forwarded (caller should return early).
 * Returns false if the action should execute locally.
 */
export function shouldForwardAction(actionName: string, args: unknown[]): boolean {
  const state = useGameStore.getState();

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
