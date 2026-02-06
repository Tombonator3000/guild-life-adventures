// Lightweight network sync hook for GameBoard
// Handles state synchronization during online gameplay
// Features: state sync, action proxying, movement animation, turn timeout, latency

import { useEffect, useRef, useCallback, useState } from 'react';
import { peerManager } from './PeerManager';
import { useGameStore } from '@/store/gameStore';
import { setNetworkActionSender } from './NetworkActionProxy';
import { serializeGameState, applyNetworkState, executeAction } from './networkState';
import { ALLOWED_GUEST_ACTIONS } from './types';
import type { NetworkMessage, GuestMessage, HostMessage } from './types';
import type { LocationId } from '@/types/game.types';

/** Turn timeout: auto-end turn after this many seconds of inactivity (0 = disabled) */
const TURN_TIMEOUT_SECONDS = 120;

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

      // Don't timeout host's own turn (host manages their own time)
      if (store.localPlayerId === currentPlayer.id) return;

      console.log(`[NetworkSync] Turn timeout for player: ${currentPlayer.name}`);

      // Notify all clients about the timeout
      peerManager.broadcast({ type: 'turn-timeout', playerId: currentPlayer.id });

      // Auto-end the player's turn
      store.endTurn();
    }, TURN_TIMEOUT_SECONDS * 1000);
  }, [networkMode, clearTurnTimeout]);

  // Reset turn timeout when currentPlayerIndex changes
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  useEffect(() => {
    if (networkMode === 'host') {
      resetTurnTimeout();
    }
    return () => clearTurnTimeout();
  }, [currentPlayerIndex, networkMode, resetTurnTimeout, clearTurnTimeout]);

  // --- Latency polling (guest only) ---
  useEffect(() => {
    if (networkMode !== 'guest') return;
    const interval = setInterval(() => {
      setLatency(peerManager.latencyToHost);
    }, 3000);
    return () => clearInterval(interval);
  }, [networkMode]);

  useEffect(() => {
    if (networkMode === 'local') return;

    // --- Set up the network action sender for guest mode ---
    if (networkMode === 'guest') {
      setNetworkActionSender((actionName: string, args: unknown[]) => {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
          // Broadcast updated state immediately for responsiveness
          broadcastState();
        } else if (msg.type === 'movement-start') {
          // Guest started a movement animation - re-broadcast to all guests and show locally
          peerManager.broadcast({ type: 'movement-animation', playerId: msg.playerId, path: msg.path });
          setRemoteAnimation({ playerId: msg.playerId, path: msg.path });
          // Reset turn timeout (movement is activity)
          resetTurnTimeout();
        }
        // Note: ping/pong now handled internally by PeerManager heartbeat system
      } else if (networkMode === 'guest') {
        const msg = message as HostMessage;
        if (msg.type === 'state-sync') {
          applyNetworkState(msg.gameState);
        } else if (msg.type === 'action-result') {
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
        }
      }
    });

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
      if (networkMode === 'guest') {
        setNetworkActionSender(null);
      }
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      clearTurnTimeout();
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
  };
}
