// React hook for online multiplayer game management
// Connects PeerManager to the Zustand game store

import { useState, useEffect, useCallback, useRef } from 'react';
import { peerManager } from './PeerManager';
import { useGameStore } from '@/store/gameStore';
import type {
  LobbyPlayer,
  LobbyState,
  OnlineGameSettings,
  NetworkMessage,
  HostMessage,
  GuestMessage,
  ConnectionStatus,
  SerializedGameState,
} from './types';
import { LOCAL_ONLY_ACTIONS, HOST_INTERNAL_ACTIONS } from './types';
import type { GoalSettings, AIDifficulty, GameState } from '@/types/game.types';
import { PLAYER_COLORS, AI_COLOR } from '@/types/game.types';

// --- State Serialization ---

/** Extract serializable game state (data only, no functions) */
function serializeGameState(store: ReturnType<typeof useGameStore.getState>): SerializedGameState {
  const {
    phase, currentPlayerIndex, players, week, priceModifier, economyTrend, economyCycleWeeksLeft,
    goalSettings, winner, eventMessage, rentDueWeek, aiDifficulty, stockPrices, weekendEvent,
    aiSpeedMultiplier, skipAITurn, showTutorial, tutorialStep,
    selectedLocation, shadowfingersEvent, applianceBreakageEvent,
    networkMode, localPlayerId, roomCode,
  } = store;
  return {
    phase, currentPlayerIndex, players, week, priceModifier, economyTrend, economyCycleWeeksLeft,
    goalSettings, winner, eventMessage, rentDueWeek, aiDifficulty, stockPrices, weekendEvent,
    aiSpeedMultiplier, skipAITurn, showTutorial, tutorialStep,
    selectedLocation, shadowfingersEvent, applianceBreakageEvent,
    networkMode, localPlayerId, roomCode,
  } as SerializedGameState;
}

/** Apply serialized state to the store */
function applyNetworkState(state: SerializedGameState) {
  const store = useGameStore.getState();
  // Only apply game-relevant state, preserve local UI state
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
    shadowfingersEvent: state.shadowfingersEvent as typeof store.shadowfingersEvent,
    applianceBreakageEvent: state.applianceBreakageEvent as typeof store.applianceBreakageEvent,
  });
}

// --- Execute Action on Host ---

/** Execute a store action by name with args (host-side) */
function executeAction(name: string, args: unknown[]): boolean {
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

// --- Lobby Management ---

interface OnlineLobbyState {
  lobbyPlayers: LobbyPlayer[];
  settings: OnlineGameSettings;
}

// --- Main Hook ---

export function useOnlineGame() {
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [localPlayerName, setLocalPlayerName] = useState('');
  const [settings, setSettings] = useState<OnlineGameSettings>({
    goals: { wealth: 5000, happiness: 100, education: 45, career: 4 },
    includeAI: false,
    aiDifficulty: 'medium',
  });
  const [error, setError] = useState<string | null>(null);

  // Track local peer ID
  const localPeerIdRef = useRef<string>('');
  // Track state sync debounce
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if we're in online game mode
  const isOnlineRef = useRef(false);

  // --- Host: Create Room ---

  const createRoom = useCallback(async (playerName: string) => {
    try {
      setError(null);
      setLocalPlayerName(playerName);
      const code = await peerManager.createRoom();
      setRoomCode(code);
      setIsHost(true);
      isOnlineRef.current = true;

      // Add host as first player
      const hostPlayer: LobbyPlayer = {
        peerId: 'host',
        name: playerName,
        color: PLAYER_COLORS[0].value,
        isReady: true,
        slot: 0,
      };
      setLobbyPlayers([hostPlayer]);

      return code;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create room';
      setError(msg);
      throw err;
    }
  }, []);

  // --- Guest: Join Room ---

  const joinRoom = useCallback(async (code: string, playerName: string) => {
    try {
      setError(null);
      setLocalPlayerName(playerName);
      await peerManager.joinRoom(code);
      setRoomCode(code.toUpperCase());
      setIsHost(false);
      isOnlineRef.current = true;

      // Send join message to host
      peerManager.sendToHost({ type: 'join', playerName });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to join room';
      setError(msg);
      throw err;
    }
  }, []);

  // --- Host: Start Game ---

  const startOnlineGame = useCallback(() => {
    if (!isHost) return;

    const store = useGameStore.getState();
    const playerNames = lobbyPlayers.map(p => p.name);

    // Create the game using the existing startNewGame action
    store.startNewGame(
      playerNames,
      settings.includeAI,
      settings.goals,
      settings.aiDifficulty,
    );

    // Set network state on the store
    useGameStore.setState({
      networkMode: 'host' as const,
      localPlayerId: 'player-0',
      roomCode,
    });

    // Broadcast initial game state to all guests
    const gameState = serializeGameState(useGameStore.getState());
    peerManager.broadcast({ type: 'game-start', gameState });
  }, [isHost, lobbyPlayers, settings, roomCode]);

  // --- Guest: Send Action to Host ---

  const sendAction = useCallback((actionName: string, args: unknown[]) => {
    if (isHost) return; // Host executes locally

    // Don't forward local-only or host-internal actions
    if (LOCAL_ONLY_ACTIONS.has(actionName) || HOST_INTERNAL_ACTIONS.has(actionName)) return;

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    peerManager.sendToHost({
      type: 'action',
      requestId,
      name: actionName,
      args,
    });
  }, [isHost]);

  // --- Host: Broadcast State ---

  const broadcastState = useCallback(() => {
    if (!isHost || !isOnlineRef.current) return;
    const gameState = serializeGameState(useGameStore.getState());
    peerManager.broadcast({ type: 'state-sync', gameState });
  }, [isHost]);

  // Debounced broadcast: coalesce rapid state changes
  const debouncedBroadcast = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      broadcastState();
    }, 50); // 50ms debounce — fast enough for turn-based
  }, [broadcastState]);

  // --- Message Handling ---

  useEffect(() => {
    // Status change handler
    const unsubStatus = peerManager.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Message handler
    const unsubMessage = peerManager.onMessage((message: NetworkMessage, fromPeerId: string) => {
      if (isHost) {
        handleHostMessage(message as GuestMessage, fromPeerId);
      } else {
        handleGuestMessage(message as HostMessage);
      }
    });

    // Disconnect handler
    const unsubDisconnect = peerManager.onPeerDisconnect((peerId: string) => {
      if (isHost) {
        handlePlayerDisconnect(peerId);
      } else {
        // Host disconnected
        setConnectionStatus('error');
        setError('Host disconnected');
      }
    });

    return () => {
      unsubStatus();
      unsubMessage();
      unsubDisconnect();
    };
  // We intentionally only set up handlers once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Host: Handle messages from guests
  const handleHostMessage = useCallback((message: GuestMessage, fromPeerId: string) => {
    switch (message.type) {
      case 'join': {
        // Add new player to lobby
        setLobbyPlayers(prev => {
          if (prev.length >= 4) return prev; // Max 4 human players
          const slot = prev.length;
          const newPlayer: LobbyPlayer = {
            peerId: fromPeerId,
            name: message.playerName,
            color: PLAYER_COLORS[slot]?.value || '#888888',
            isReady: false,
            slot,
          };
          const updated = [...prev, newPlayer];
          // Broadcast lobby update
          const lobby: LobbyState = {
            roomCode,
            hostName: localPlayerName,
            players: updated,
            settings,
          };
          peerManager.broadcast({ type: 'lobby-update', lobby });
          return updated;
        });
        break;
      }

      case 'ready': {
        setLobbyPlayers(prev => {
          const updated = prev.map(p =>
            p.peerId === fromPeerId ? { ...p, isReady: message.isReady } : p
          );
          const lobby: LobbyState = {
            roomCode,
            hostName: localPlayerName,
            players: updated,
            settings,
          };
          peerManager.broadcast({ type: 'lobby-update', lobby });
          return updated;
        });
        break;
      }

      case 'action': {
        // Validate: only allow actions from the current player
        const store = useGameStore.getState();
        const currentPlayer = store.players[store.currentPlayerIndex];
        const senderPlayer = lobbyPlayers.find(p => p.peerId === fromPeerId);

        if (!senderPlayer || !currentPlayer) {
          peerManager.sendTo(fromPeerId, {
            type: 'action-result',
            requestId: message.requestId,
            success: false,
            error: 'Invalid player',
          });
          break;
        }

        // Check if it's this player's turn
        const senderPlayerId = `player-${senderPlayer.slot}`;
        if (currentPlayer.id !== senderPlayerId) {
          peerManager.sendTo(fromPeerId, {
            type: 'action-result',
            requestId: message.requestId,
            success: false,
            error: 'Not your turn',
          });
          break;
        }

        // Execute the action
        const success = executeAction(message.name, message.args);
        peerManager.sendTo(fromPeerId, {
          type: 'action-result',
          requestId: message.requestId,
          success,
          error: success ? undefined : 'Action failed',
        });

        // Broadcast updated state
        broadcastState();
        break;
      }

      case 'ping': {
        peerManager.sendTo(fromPeerId, {
          type: 'pong',
          timestamp: message.timestamp,
        });
        break;
      }

      case 'leave': {
        handlePlayerDisconnect(fromPeerId);
        break;
      }
    }
  }, [roomCode, localPlayerName, settings, lobbyPlayers, broadcastState]);

  // Guest: Handle messages from host
  const handleGuestMessage = useCallback((message: HostMessage) => {
    switch (message.type) {
      case 'lobby-update': {
        setLobbyPlayers(message.lobby.players);
        setSettings(message.lobby.settings);
        break;
      }

      case 'game-start': {
        // Apply the full game state from host
        applyNetworkState(message.gameState);
        // Find our player ID based on lobby position
        const gameStartMessage = message as { type: 'game-start'; gameState: SerializedGameState; lobby?: LobbyState };
        const myLobbyPlayer = lobbyPlayers.find(p => p.name === localPlayerName)
          || gameStartMessage.lobby?.players?.find((p: LobbyPlayer) => p.name === localPlayerName);
        const mySlot = myLobbyPlayer?.slot ?? -1;
        const myPlayerId = mySlot >= 0 ? `player-${mySlot}` : null;

        useGameStore.setState({
          networkMode: 'guest' as const,
          localPlayerId: myPlayerId,
          roomCode: roomCode,
        });
        break;
      }

      case 'state-sync': {
        applyNetworkState(message.gameState);
        break;
      }

      case 'action-result': {
        if (!message.success) {
          console.warn(`[Network] Action failed: ${message.error}`);
        }
        break;
      }

      case 'player-disconnected': {
        console.log(`[Network] Player disconnected: ${message.playerName}`);
        break;
      }

      case 'kicked': {
        setError(`Kicked from room: ${message.reason}`);
        disconnect();
        break;
      }
    }
  // lobbyPlayers is used to find our slot in game-start
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPlayerName, roomCode]);

  // Host: Handle player disconnect
  const handlePlayerDisconnect = useCallback((peerId: string) => {
    setLobbyPlayers(prev => {
      const disconnected = prev.find(p => p.peerId === peerId);
      if (disconnected) {
        peerManager.broadcast({
          type: 'player-disconnected',
          playerName: disconnected.name,
        });
      }
      const updated = prev.filter(p => p.peerId !== peerId);
      // Broadcast updated lobby
      const lobby: LobbyState = {
        roomCode,
        hostName: localPlayerName,
        players: updated,
        settings,
      };
      peerManager.broadcast({ type: 'lobby-update', lobby });
      return updated;
    });
  }, [roomCode, localPlayerName, settings]);

  // --- Host: Subscribe to store changes for broadcasting ---

  useEffect(() => {
    if (!isHost || !isOnlineRef.current) return;

    const unsub = useGameStore.subscribe(() => {
      const state = useGameStore.getState();
      // Only broadcast when in playing/event phase
      if (state.phase === 'playing' || state.phase === 'event' || state.phase === 'victory') {
        debouncedBroadcast();
      }
    });

    return unsub;
  }, [isHost, debouncedBroadcast]);

  // --- Settings Update (host only) ---

  const updateSettings = useCallback((newSettings: Partial<OnlineGameSettings>) => {
    if (!isHost) return;
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      // Broadcast to guests
      const lobby: LobbyState = {
        roomCode,
        hostName: localPlayerName,
        players: lobbyPlayers,
        settings: updated,
      };
      peerManager.broadcast({ type: 'lobby-update', lobby });
      return updated;
    });
  }, [isHost, roomCode, localPlayerName, lobbyPlayers]);

  // --- Disconnect ---

  const disconnect = useCallback(() => {
    isOnlineRef.current = false;
    peerManager.destroy();
    setIsHost(false);
    setRoomCode('');
    setConnectionStatus('disconnected');
    setLobbyPlayers([]);
    setError(null);
    useGameStore.setState({
      networkMode: 'local' as const,
      localPlayerId: null,
      roomCode: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isOnlineRef.current) {
        peerManager.destroy();
      }
    };
  }, []);

  return {
    // State
    isHost,
    roomCode,
    connectionStatus,
    lobbyPlayers,
    localPlayerName,
    settings,
    error,

    // Actions
    createRoom,
    joinRoom,
    startOnlineGame,
    sendAction,
    updateSettings,
    disconnect,
    setLocalPlayerName,
    broadcastState,
  };
}
