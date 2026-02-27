// Lightweight network sync hook for GameBoard
// Handles state synchronization during online gameplay
// Features: state sync, action proxying, movement animation, turn timeout, latency

import { useEffect, useRef, useCallback, useState } from 'react';
import { peerManager } from './PeerManager';
import { useGameStore } from '@/store/gameStore';
import { setNetworkActionSender, trackPendingAction, resolveAction } from './NetworkActionProxy';
import { serializeGameState, applyNetworkState, executeAction } from './networkState';
import { ALLOWED_GUEST_ACTIONS } from './types';
import type { NetworkMessage, GuestMessage, HostMessage, ChatMessage, ConnectionStatus } from './types';
import type { LocationId } from '@/types/game.types';

/**
 * Server-side argument validation for dangerous guest actions.
 * Prevents a malicious guest from sending crafted messages to exploit raw
 * stat modifiers (modifyGold, modifyHealth, etc.) that are in the whitelist
 * because UI components call them directly.
 *
 * Returns an error string if invalid, or null if OK.
 */

/** Validate that args[index] is a finite number within [min, max]. Returns error string or null. */
function validateNumArg(args: unknown[], index: number, min: number, max: number, label: string): string | null {
  const val = args[index];
  if (typeof val !== 'number' || !isFinite(val)) return `Invalid ${label}`;
  if (val < min || val > max) return `${label} out of range`;
  return null;
}

/** Stat modifier validation rules: action name → { argIndex, maxAbsValue, label, oneSided? }
 *  For modifyGold, negative amounts (spending) are unlimited — only cap positive (oneSided). */
const STAT_MODIFIER_RULES: Record<string, { argIndex: number; max: number; label: string; positiveOnly?: boolean }> = {
  modifyGold:       { argIndex: 1, max: 500, label: 'Gold',       positiveOnly: true },
  modifyHealth:     { argIndex: 1, max: 100, label: 'Health' },
  modifyHappiness:  { argIndex: 1, max: 50,  label: 'Happiness' },
  modifyFood:       { argIndex: 1, max: 100, label: 'Food' },
  modifyClothing:   { argIndex: 1, max: 100, label: 'Clothing' },
  modifyMaxHealth:  { argIndex: 1, max: 25,  label: 'MaxHealth' },
  modifyRelaxation: { argIndex: 1, max: 20,  label: 'Relaxation' },
};

/** Cost validation rules: action name → { argIndex, min, max, label } */
const COST_VALIDATION_RULES: Record<string, { argIndex: number; min: number; max: number; label: string }> = {
  temperEquipment:        { argIndex: 3, min: 0, max: 1000, label: 'temper cost' },
  salvageEquipment:       { argIndex: 3, min: 0, max: 2000, label: 'salvage value' },
  buyHexScroll:           { argIndex: 2, min: 1, max: 2000, label: 'hex scroll cost' },
  buyProtectiveAmulet:    { argIndex: 1, min: 1, max: 5000, label: 'cost' },
  cleanseCurse:           { argIndex: 1, min: 1, max: 5000, label: 'cost' },
  performDarkRitual:      { argIndex: 1, min: 1, max: 5000, label: 'cost' },
  dispelLocationHex:      { argIndex: 1, min: 1, max: 5000, label: 'cost' },
  attemptCurseReflection: { argIndex: 1, min: 1, max: 5000, label: 'cost' },
};

function validateActionArgs(name: string, args: unknown[], store: ReturnType<typeof useGameStore.getState>): string | null {
  // Stat modifier actions: validate amount is finite and within bounds
  const statRule = STAT_MODIFIER_RULES[name];
  if (statRule) {
    const amount = args[statRule.argIndex];
    if (typeof amount !== 'number' || !isFinite(amount)) return `Invalid amount`;
    if (statRule.positiveOnly) {
      if (amount > statRule.max) return `${statRule.label} amount too large`;
    } else {
      if (Math.abs(amount) > statRule.max) return `${statRule.label} amount too large`;
    }
    return null;
  }

  // Cost/value-based actions: validate finite number within [min, max]
  const costRule = COST_VALIDATION_RULES[name];
  if (costRule) {
    return validateNumArg(args, costRule.argIndex, costRule.min, costRule.max, `Invalid ${costRule.label}`);
  }

  // Actions with custom validation logic
  switch (name) {
    case 'setJob': {
      const wage = args[2];
      if (typeof wage === 'number' && (wage < 0 || wage > 100 || !isFinite(wage))) return 'Invalid wage';
      return null;
    }
    case 'workShift': {
      const playerId = typeof args[0] === 'string' ? args[0] : null;
      const player = playerId ? store.players.find(p => p.id === playerId) : null;
      const hoursErr = validateNumArg(args, 1, 0, 60, 'hours');
      if (hoursErr) return hoursErr;
      const wageErr = validateNumArg(args, 2, 0, 100, 'wage');
      if (wageErr) return wageErr;
      const wage = args[2] as number;
      if (player && player.currentWage > 0 && wage > player.currentWage * 1.5) {
        return 'Wage exceeds player current wage';
      }
      return null;
    }
    default:
      return null;
  }
}

/** Turn timeout: auto-end turn after this many seconds of inactivity (0 = disabled) */
const TURN_TIMEOUT_SECONDS = 120;

/** Max guest actions per second (rate limiting) */
const GUEST_ACTION_RATE_LIMIT = 10;
/** Rate limit window in ms */
const RATE_LIMIT_WINDOW = 1000;

/** Per-peer rate limiter: tracks action timestamps within the sliding window */
const peerActionTimestamps = new Map<string, number[]>();

/** Check if a peer has exceeded the rate limit. Returns true if action should be blocked. */
function isRateLimited(peerId: string): boolean {
  const now = Date.now();
  let timestamps = peerActionTimestamps.get(peerId);
  if (!timestamps) {
    timestamps = [];
    peerActionTimestamps.set(peerId, timestamps);
  }
  // Remove timestamps outside the window
  const cutoff = now - RATE_LIMIT_WINDOW;
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }
  if (timestamps.length >= GUEST_ACTION_RATE_LIMIT) {
    return true;
  }
  timestamps.push(now);
  return false;
}

/** Clear rate limit tracking for a peer (on disconnect) */
export function clearRateLimit(peerId: string) {
  peerActionTimestamps.delete(peerId);
}

/** Clear all rate limit tracking */
export function clearAllRateLimits() {
  peerActionTimestamps.clear();
}

/**
 * Hook for network synchronization during gameplay.
 *
 * For HOST: subscribes to store changes and broadcasts to all guests.
 *           Validates guest actions (turn check via peerId -> playerId mapping).
 *           Enforces turn timeout for AFK players.
 * For GUEST: receives state updates and sets up action forwarding.
 * For LOCAL: no-op.
 */
export function useNetworkSync() {
  const networkMode = useGameStore(s => s.networkMode);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Remote movement animation state
  const [remoteAnimation, setRemoteAnimation] = useState<{ playerId: string; path: LocationId[] } | null>(null);

  // Latency display (guest only, in ms)
  const [latency, setLatency] = useState(0);

  // In-game chat messages (online mode only, not persisted)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Connection status tracking for in-game reconnect UI
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const attemptReconnect = useCallback(() => { peerManager.attemptReconnect(); }, []);

  const sendChatMessage = useCallback((text: string, senderName: string, senderColor: string) => {
    if (networkMode === 'local') return;
    const message: ChatMessage = { senderName, senderColor, text, timestamp: Date.now() };
    if (networkMode === 'host') {
      // Show immediately and broadcast to all guests
      setChatMessages(prev => [...prev, message].slice(-100));
      peerManager.broadcast({ type: 'chat-message', message });
    } else if (networkMode === 'guest') {
      // Send to host (host will broadcast back to everyone)
      peerManager.sendToHost({ type: 'chat-message', message });
    }
  }, [networkMode]);

  // Turn timeout tracking (host only)
  const turnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRemoteAnimation = useCallback(() => setRemoteAnimation(null), []);

  // Broadcast movement animation to other players
  const broadcastMovement = useCallback((playerId: string, path: LocationId[]) => {
    if (networkMode === 'host') {
      peerManager.broadcast({ type: 'movement-animation', playerId, path });
    } else if (networkMode === 'guest') {
      peerManager.sendToHost({ type: 'movement-start', playerId, path });
    }
  }, [networkMode]);

  // Broadcast current state to all guests (host only)
  const broadcastState = useCallback(() => {
    if (networkMode !== 'host') return;
    const state = serializeGameState();
    peerManager.broadcast({ type: 'state-sync', gameState: state });
  }, [networkMode]);

  // Debounced broadcast
  const debouncedBroadcast = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(broadcastState, 50);
  }, [broadcastState]);

  // --- Turn Timeout (Host only) ---

  const clearTurnTimeout = useCallback(() => {
    if (turnTimeoutRef.current) {
      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = null;
    }
  }, []);

  const resetTurnTimeout = useCallback(() => {
    if (networkMode !== 'host' || TURN_TIMEOUT_SECONDS <= 0) return;

    clearTurnTimeout();
    turnTimeoutRef.current = setTimeout(() => {
      const store = useGameStore.getState();
      const currentPlayer = store.players[store.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.isAI) return;

      // Don't timeout during non-playing phases (event modals, victory screen)
      if (store.phase !== 'playing') return;

      // Don't timeout host's own turn (host manages their own time)
      if (store.localPlayerId === currentPlayer.id) return;

      console.log(`[NetworkSync] Turn timeout for player: ${currentPlayer.name}`);

      // Notify all clients about the timeout
      peerManager.broadcast({ type: 'turn-timeout', playerId: currentPlayer.id });

      // Auto-end the player's turn
      store.endTurn();
    }, TURN_TIMEOUT_SECONDS * 1000);
  }, [networkMode, clearTurnTimeout]);

  // Track disconnected peer IDs (for zombie player detection)
  const disconnectedPeersRef = useRef(new Set<string>());

  // Check if the current player is a disconnected zombie
  const skipZombieTurn = useCallback(() => {
    if (networkMode !== 'host') return;
    const store = useGameStore.getState();
    const currentPlayer = store.players[store.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isAI) return;
    if (store.phase !== 'playing') return;
    // Host's own turn is never a zombie
    if (store.localPlayerId === currentPlayer.id) return;

    const currentPlayerId = currentPlayer.id;

    // Check if any connected peer maps to this player
    let peerFound = false;
    for (const peerId of peerManager.connectedPeerIds) {
      if (peerManager.getPlayerIdForPeer(peerId) === currentPlayerId) {
        peerFound = true;
        break;
      }
    }

    // Check if this player's peer is in the disconnected set
    let isZombie = false;
    for (const peerId of disconnectedPeersRef.current) {
      if (peerManager.getPlayerIdForPeer(peerId) === currentPlayerId) {
        isZombie = true;
        break;
      }
    }

    if (!peerFound || isZombie) {
      console.log(`[NetworkSync] Zombie turn detected for ${currentPlayer.name} — auto-skipping`);
      peerManager.broadcast({ type: 'turn-timeout', playerId: currentPlayer.id });
      store.endTurn();
    }
  }, [networkMode]);

  // Reset turn timeout when currentPlayerIndex changes
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  useEffect(() => {
    if (networkMode === 'host') {
      // Check for zombie turns first (auto-skip disconnected players)
      // Use a small delay to let state settle after endTurn
      const zombieCheck = setTimeout(() => skipZombieTurn(), 100);
      resetTurnTimeout();
      return () => {
        clearTimeout(zombieCheck);
        clearTurnTimeout();
      };
    }
    return () => clearTurnTimeout();
  }, [currentPlayerIndex, networkMode, resetTurnTimeout, clearTurnTimeout, skipZombieTurn]);

  // --- Latency polling (guest only) ---
  useEffect(() => {
    if (networkMode !== 'guest') return;
    const interval = setInterval(() => {
      setLatency(prev => {
        const current = peerManager.latencyToHost;
        return current === prev ? prev : current;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [networkMode]);

  useEffect(() => {
    if (networkMode === 'local') return;

    // --- Set up the network action sender for guest mode ---
    if (networkMode === 'guest') {
      setNetworkActionSender((actionName: string, args: unknown[]) => {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        trackPendingAction(requestId);
        peerManager.sendToHost({
          type: 'action',
          requestId,
          name: actionName,
          args,
        });
      });
    }

    // --- Message handler ---
    const unsubMessage = peerManager.onMessage((message: NetworkMessage, fromPeerId: string) => {
      if (networkMode === 'host') {
        const msg = message as GuestMessage;
        if (msg.type === 'action') {
          // Validate: identify the sender and check if it's their turn
          const store = useGameStore.getState();
          const currentPlayer = store.players[store.currentPlayerIndex];
          const senderPlayerId = peerManager.getPlayerIdForPeer(fromPeerId);

          if (!senderPlayerId) {
            console.warn(`[NetworkSync] Unknown peer tried to act: ${fromPeerId}`);
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: 'Unknown player',
            });
            return;
          }

          // Rate limiting: block rapid-fire actions
          if (isRateLimited(fromPeerId)) {
            console.warn(`[NetworkSync] Rate limited peer: ${fromPeerId}`);
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: 'Rate limited — too many actions',
            });
            return;
          }

          if (!currentPlayer || currentPlayer.id !== senderPlayerId) {
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: 'Not your turn',
            });
            return;
          }

          // Validate action is in the allowed whitelist
          if (!ALLOWED_GUEST_ACTIONS.has(msg.name)) {
            console.warn(`[NetworkSync] Blocked disallowed guest action: ${msg.name}`);
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: 'Action not allowed',
            });
            return;
          }

          // Validate that the FIRST player-id argument (args[0]) matches the sender
          // (prevents a guest from impersonating another player).
          // BUG FIX: Actions like castPersonalCurse legitimately target OTHER players
          // at args[2], so we only validate args[0] (the actor) matches the sender.
          // Cross-player targeting actions are validated by the store logic itself.
          if (Array.isArray(msg.args) && msg.args.length > 0) {
            const actorId = msg.args[0];
            if (typeof actorId === 'string' && actorId.startsWith('player-') && actorId !== senderPlayerId) {
              console.warn(`[NetworkSync] Blocked impersonation: ${msg.name} from ${senderPlayerId} acting as ${actorId}`);
              peerManager.sendTo(fromPeerId, {
                type: 'action-result',
                requestId: msg.requestId,
                success: false,
                error: 'Cannot act as another player',
              });
              return;
            }
          }

          // Validate action arguments (prevents abuse of raw stat modifiers)
          const argError = validateActionArgs(msg.name, msg.args, store);
          if (argError) {
            console.warn(`[NetworkSync] Blocked invalid action args: ${msg.name} — ${argError}`);
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: argError,
            });
            return;
          }

          // Reset turn timeout on any valid action (player is not AFK)
          resetTurnTimeout();

          // Execute the validated action
          const success = executeAction(msg.name, msg.args);
          peerManager.sendTo(fromPeerId, {
            type: 'action-result',
            requestId: msg.requestId,
            success,
            error: success ? undefined : 'Action failed',
          });
          // State broadcast is handled by the debounced store subscription (50ms)
          // No need for an immediate duplicate broadcast here
        } else if (msg.type === 'movement-start') {
          // Validate sender matches the playerId in the message
          const moveSenderId = peerManager.getPlayerIdForPeer(fromPeerId);
          if (moveSenderId && msg.playerId === moveSenderId) {
            // Validate path: must be a reasonable length (max 14 locations in ring, half = 7 steps)
            // Allow a small buffer for edge cases, but block absurd paths
            const MAX_PATH_LENGTH = 16;
            if (!Array.isArray(msg.path) || msg.path.length === 0 || msg.path.length > MAX_PATH_LENGTH) {
              console.warn(`[NetworkSync] Invalid movement path length from ${fromPeerId}: ${msg.path?.length}`);
            } else {
              // Guest started a movement animation - re-broadcast to all guests and show locally
              peerManager.broadcast({ type: 'movement-animation', playerId: msg.playerId, path: msg.path });
              setRemoteAnimation({ playerId: msg.playerId, path: msg.path });
              // Reset turn timeout (movement is activity)
              resetTurnTimeout();
            }
          }
        } else if (msg.type === 'chat-message') {
          // Rebroadcast to all guests and show locally
          peerManager.broadcast({ type: 'chat-message', message: msg.message });
          setChatMessages(prev => [...prev, msg.message].slice(-100));
        }
        // Note: ping/pong now handled internally by PeerManager heartbeat system
      } else if (networkMode === 'guest') {
        const msg = message as HostMessage;
        if (msg.type === 'state-sync') {
          applyNetworkState(msg.gameState);
        } else if (msg.type === 'action-result') {
          resolveAction(msg.requestId);
          if (!msg.success && msg.error !== 'Not your turn') {
            console.warn(`[NetworkSync] Action failed: ${msg.error}`);
          }
        } else if (msg.type === 'movement-animation') {
          // Another player started moving - animate locally if it's not our own movement
          const localId = useGameStore.getState().localPlayerId;
          if (localId && msg.playerId !== localId) {
            setRemoteAnimation({ playerId: msg.playerId, path: msg.path });
          } else if (!localId) {
            // localPlayerId not set yet (shouldn't happen) - show animation anyway
            setRemoteAnimation({ playerId: msg.playerId, path: msg.path });
          }
        } else if (msg.type === 'turn-timeout') {
          const store = useGameStore.getState();
          const player = store.players.find(p => p.id === msg.playerId);
          if (player) {
            console.log(`[NetworkSync] Turn timeout for: ${player.name}`);
          }
        } else if (msg.type === 'chat-message') {
          setChatMessages(prev => [...prev, msg.message].slice(-100));
        }
      }
    });

    // --- Host: track peer disconnects for zombie detection ---
    let unsubDisconnect: (() => void) | undefined;
    let unsubReconnect: (() => void) | undefined;
    if (networkMode === 'host') {
      unsubDisconnect = peerManager.onPeerDisconnect((peerId: string) => {
        disconnectedPeersRef.current.add(peerId);
        clearRateLimit(peerId);
        // Check if it's the disconnected player's turn — auto-skip
        const disconnectedPlayerId = peerManager.getPlayerIdForPeer(peerId);
        const storeSnapshot = useGameStore.getState();
        const currentPlayer = storeSnapshot.players[storeSnapshot.currentPlayerIndex];
        if (currentPlayer && currentPlayer.id === disconnectedPlayerId && storeSnapshot.phase === 'playing') {
          // Give a brief window for reconnection before skipping
          setTimeout(() => {
            // BUG FIX: Re-check current state to avoid ending the wrong player's turn
            const freshStore = useGameStore.getState();
            const freshCurrentPlayer = freshStore.players[freshStore.currentPlayerIndex];
            if (disconnectedPeersRef.current.has(peerId) &&
                freshCurrentPlayer && freshCurrentPlayer.id === disconnectedPlayerId &&
                freshStore.phase === 'playing') {
              console.log(`[NetworkSync] Disconnected player's turn — auto-skipping ${freshCurrentPlayer.name}`);
              peerManager.broadcast({ type: 'turn-timeout', playerId: freshCurrentPlayer.id });
              freshStore.endTurn();
            }
          }, 5000); // 5 second grace period
        }
      });

      unsubReconnect = peerManager.onPeerReconnect((peerId: string) => {
        disconnectedPeersRef.current.delete(peerId);
      });
    }

    // --- Host: subscribe to store changes for broadcasting ---
    let unsubStore: (() => void) | undefined;
    if (networkMode === 'host') {
      unsubStore = useGameStore.subscribe(() => {
        const state = useGameStore.getState();
        if (state.phase === 'playing' || state.phase === 'event' || state.phase === 'victory') {
          debouncedBroadcast();
        }
      });
    }

    return () => {
      unsubMessage();
      unsubStore?.();
      unsubDisconnect?.();
      unsubReconnect?.();
      if (networkMode === 'guest') {
        setNetworkActionSender(null);
      }
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      clearTurnTimeout();
      clearAllRateLimits();
    };
  }, [networkMode, broadcastState, debouncedBroadcast, resetTurnTimeout, clearTurnTimeout]);

  return {
    networkMode,
    isOnline: networkMode !== 'local',
    isHost: networkMode === 'host',
    isGuest: networkMode === 'guest',
    broadcastState,
    broadcastMovement,
    remoteAnimation,
    clearRemoteAnimation,
    latency,
    chatMessages,
    sendChatMessage,
  };
}
