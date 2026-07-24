// Lightweight network sync hook for GameBoard
// Handles state synchronization during online gameplay
// Features: state sync, action proxying, movement animation, turn timeout, latency

import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { peerManager } from './PeerManager';
import { useGameStore } from '@/store/gameStore';
import { setNetworkActionSender, trackPendingAction, resolveAction } from './NetworkActionProxy';
import { serializeGameState, applyNetworkState, executeAction } from './networkState';
import type { NetworkMessage, GuestMessage, HostMessage, ChatMessage, ConnectionStatus } from './types';
import type { LocationId } from '@/types/game.types';
import { processGuestActionRequest } from './actionValidation';
import { handleGameplayReconnect } from './gameplayReconnect';

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

    // Track connection status for in-game reconnect UI
    const unsubStatus = peerManager.onStatusChange(setConnectionStatus);

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
        if (msg.type === 'reconnect') {
          const reconnectResult = handleGameplayReconnect({
            registry: peerManager,
            fromPeerId,
            claimedPlayerName: msg.playerName,
            gameState: serializeGameState(),
            disconnectedPeerIds: disconnectedPeersRef.current,
          });

          if (!reconnectResult.accepted) {
            console.warn(`[NetworkSync] Reconnect rejected for unknown peer: ${fromPeerId}`);
            return;
          }

          clearRateLimit(fromPeerId);
          resetTurnTimeout();
          console.log(`[NetworkSync] Gameplay peer reconnected: ${reconnectResult.playerName} (${reconnectResult.playerId})`);
        } else if (msg.type === 'action') {
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

          const result = processGuestActionRequest(
            msg.name,
            msg.args,
            senderPlayerId,
            currentPlayer?.id,
            store,
            executeAction,
          );

          if (!result.validated) {
            console.warn(`[NetworkSync] Blocked guest action ${msg.name}: ${result.error}`);
          } else {
            // A fully validated request counts as activity even when the
            // authoritative store action rejects it for gameplay reasons.
            resetTurnTimeout();
          }

          peerManager.sendTo(fromPeerId, {
            type: 'action-result',
            requestId: msg.requestId,
            success: result.success,
            error: result.error,
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
            toast.error(msg.error ?? 'Action rejected by host');
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
      unsubStatus();
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
    connectionStatus,
    attemptReconnect,
  };
}
