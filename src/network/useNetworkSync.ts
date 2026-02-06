// Lightweight network sync hook for GameBoard
// Handles state synchronization during online gameplay
// Uses the PeerManager singleton — works across component mounts

import { useEffect, useRef, useCallback, useState } from 'react';
import { peerManager } from './PeerManager';
import { useGameStore } from '@/store/gameStore';
import { setNetworkActionSender } from './NetworkActionProxy';
import type { NetworkMessage, GuestMessage, HostMessage, SerializedGameState } from './types';
import type { LocationId } from '@/types/game.types';

/** Extract serializable game state from the store */
function serializeGameState(): SerializedGameState {
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
    aiSpeedMultiplier: s.aiSpeedMultiplier,
    skipAITurn: s.skipAITurn,
    showTutorial: s.showTutorial,
    tutorialStep: s.tutorialStep,
    networkMode: s.networkMode,
    localPlayerId: s.localPlayerId,
    roomCode: s.roomCode,
    selectedLocation: s.selectedLocation,
    shadowfingersEvent: s.shadowfingersEvent,
    applianceBreakageEvent: s.applianceBreakageEvent,
  } as SerializedGameState;
}

/** Apply state from host to local store (guest only) */
function applyNetworkState(state: SerializedGameState) {
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

/** Execute a store action by name (host only) */
function executeAction(name: string, args: unknown[]): boolean {
  const store = useGameStore.getState();
  const action = (store as unknown as Record<string, unknown>)[name];
  if (typeof action !== 'function') {
    console.error(`[NetworkSync] Unknown action: ${name}`);
    return false;
  }
  try {
    (action as (...a: unknown[]) => unknown)(...args);
    return true;
  } catch (err) {
    console.error(`[NetworkSync] Action ${name} failed:`, err);
    return false;
  }
}

/**
 * Hook for network synchronization during gameplay.
 *
 * For HOST: subscribes to store changes and broadcasts to all guests.
 *           Validates guest actions (turn check via peerId → playerId mapping).
 * For GUEST: receives state updates and sets up action forwarding.
 * For LOCAL: no-op.
 */
export function useNetworkSync() {
  const networkMode = useGameStore(s => s.networkMode);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Remote movement animation state — set when another player's movement should be animated
  const [remoteAnimation, setRemoteAnimation] = useState<{ playerId: string; path: LocationId[] } | null>(null);

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

  // Debounced broadcast — coalesces rapid store changes
  const debouncedBroadcast = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(broadcastState, 50);
  }, [broadcastState]);

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
            // Not this player's turn — reject silently (common during turn transitions)
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: 'Not your turn',
            });
            return;
          }

          // Execute the validated action
          const success = executeAction(msg.name, msg.args);
          peerManager.sendTo(fromPeerId, {
            type: 'action-result',
            requestId: msg.requestId,
            success,
            error: success ? undefined : 'Action failed',
          });
          // Broadcast updated state immediately (not debounced) for responsiveness
          broadcastState();
        } else if (msg.type === 'ping') {
          peerManager.sendTo(fromPeerId, {
            type: 'pong',
            timestamp: msg.timestamp,
          });
        } else if (msg.type === 'movement-start') {
          // Guest started a movement animation — re-broadcast to all guests and show locally
          peerManager.broadcast({ type: 'movement-animation', playerId: msg.playerId, path: msg.path });
          setRemoteAnimation({ playerId: msg.playerId, path: msg.path });
        }
      } else if (networkMode === 'guest') {
        const msg = message as HostMessage;
        if (msg.type === 'state-sync') {
          applyNetworkState(msg.gameState);
        } else if (msg.type === 'action-result') {
          if (!msg.success && msg.error !== 'Not your turn') {
            console.warn(`[NetworkSync] Action failed: ${msg.error}`);
          }
        } else if (msg.type === 'movement-animation') {
          // Another player started moving — animate locally if it's not our own movement
          const localId = useGameStore.getState().localPlayerId;
          if (msg.playerId !== localId) {
            setRemoteAnimation({ playerId: msg.playerId, path: msg.path });
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
    };
  }, [networkMode, broadcastState, debouncedBroadcast]);

  return {
    networkMode,
    isOnline: networkMode !== 'local',
    isHost: networkMode === 'host',
    isGuest: networkMode === 'guest',
    broadcastState,
    broadcastMovement,
    remoteAnimation,
    clearRemoteAnimation,
  };
}
