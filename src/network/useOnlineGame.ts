// React hook for online multiplayer game management
// Handles lobby phase: creating/joining rooms, player management, game start
// During gameplay, useNetworkSync handles state sync (this hook only handles lobby messages)

import { useState, useEffect, useCallback, useRef } from 'react';
import { peerManager } from './PeerManager';
import { useGameStore } from '@/store/gameStore';
import { serializeGameState, applyNetworkState } from './networkState';
import type {
  LobbyPlayer,
  LobbyState,
  OnlineGameSettings,
  NetworkMessage,
  HostMessage,
  GuestMessage,
  ConnectionStatus,
} from './types';
import { PLAYER_COLORS } from '@/types/game.types';

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

    // Set peerId → playerId mapping on PeerManager for turn validation
    // Host uses 'host' as peerId in lobby, but host actions execute locally (not via network)
    const peerMap = new Map<string, string>();
    lobbyPlayers.forEach(p => {
      if (p.peerId !== 'host') {
        // Only map actual remote peers (not the host itself)
        peerMap.set(p.peerId, `player-${p.slot}`);
      }
    });
    peerManager.setPeerPlayerMap(peerMap);

    // Broadcast initial game state + lobby data to all guests
    const gameState = serializeGameState();
    const lobby: LobbyState = {
      roomCode,
      hostName: localPlayerName,
      players: lobbyPlayers,
      settings,
    };
    peerManager.broadcast({ type: 'game-start', gameState, lobby });
  }, [isHost, lobbyPlayers, settings, roomCode, localPlayerName]);

  // --- Message Handling ---
  // Use refs to avoid stale closures — handlers reference current lobbyPlayers etc.
  const handleHostMessageRef = useRef<((msg: GuestMessage, from: string) => void) | null>(null);
  const handleGuestMessageRef = useRef<((msg: HostMessage) => void) | null>(null);
  const handlePlayerDisconnectRef = useRef<((peerId: string) => void) | null>(null);

  useEffect(() => {
    // Status change handler
    const unsubStatus = peerManager.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Message handler — uses refs to always call current version
    // Only handles LOBBY messages here. Game-phase messages (action, state-sync, movement)
    // are handled by useNetworkSync to avoid duplicate processing.
    const unsubMessage = peerManager.onMessage((message: NetworkMessage, fromPeerId: string) => {
      const gamePhase = useGameStore.getState().phase;
      if (isHost) {
        // Host: handle lobby messages (join, ready, leave) always
        // Game actions (action, ping, movement-start) handled by useNetworkSync
        const msg = message as GuestMessage;
        if (msg.type === 'join' || msg.type === 'ready' || msg.type === 'leave') {
          handleHostMessageRef.current?.(msg, fromPeerId);
        }
        // Don't handle 'action', 'ping', 'movement-start' — those go to useNetworkSync
      } else {
        // Guest: handle lobby messages (lobby-update, game-start, kicked, player-disconnected)
        // State-sync, action-result, movement-animation handled by useNetworkSync
        const msg = message as HostMessage;
        if (msg.type === 'lobby-update' || msg.type === 'game-start' ||
            msg.type === 'kicked' || msg.type === 'player-disconnected') {
          handleGuestMessageRef.current?.(msg);
        }
        // Don't handle 'state-sync', 'action-result', 'movement-animation' — those go to useNetworkSync
      }
    });

    // Disconnect handler
    const unsubDisconnect = peerManager.onPeerDisconnect((peerId: string) => {
      if (isHost) {
        handlePlayerDisconnectRef.current?.(peerId);
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
  // Only re-register handlers when isHost changes (refs handle callback updates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Host: Handle lobby messages from guests
  const handleHostMessage = useCallback((message: GuestMessage, fromPeerId: string) => {
    switch (message.type) {
      case 'join': {
        // Add new player to lobby
        setLobbyPlayers(prev => {
          if (prev.length >= 4) return prev; // Max 4 human players
          // Prevent duplicate names
          const existingName = prev.find(p => p.name === message.playerName);
          const displayName = existingName
            ? `${message.playerName} (${prev.length})`
            : message.playerName;
          const slot = prev.length;
          const newPlayer: LobbyPlayer = {
            peerId: fromPeerId,
            name: displayName,
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

      case 'leave': {
        handlePlayerDisconnect(fromPeerId);
        break;
      }
    }
  }, [roomCode, localPlayerName, settings]);

  // Guest: Handle lobby messages from host
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
        // Find our player ID from lobby data (included in game-start message)
        // Use peerId matching first (reliable), fall back to name matching
        const myLobbyPlayer = message.lobby?.players?.find((p: LobbyPlayer) => p.name === localPlayerName)
          || lobbyPlayers.find(p => p.name === localPlayerName);
        const mySlot = myLobbyPlayer?.slot ?? -1;
        const myPlayerId = mySlot >= 0 ? `player-${mySlot}` : null;

        useGameStore.setState({
          networkMode: 'guest' as const,
          localPlayerId: myPlayerId,
          roomCode: roomCode,
        });
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

  // Keep message handler refs current (avoids stale closures in the PeerManager listener)
  handleHostMessageRef.current = handleHostMessage;
  handleGuestMessageRef.current = handleGuestMessage;
  handlePlayerDisconnectRef.current = handlePlayerDisconnect;

  // NOTE: Store subscription for state broadcasting is handled by useNetworkSync only.
  // This hook no longer subscribes to avoid duplicate broadcasts.

  // --- Settings Update (host only, lobby phase only) ---

  const updateSettings = useCallback((newSettings: Partial<OnlineGameSettings>) => {
    if (!isHost) return;
    // Only allow settings changes in lobby/setup phase
    const phase = useGameStore.getState().phase;
    if (phase === 'playing' || phase === 'victory') return;

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
    updateSettings,
    disconnect,
    setLocalPlayerName,
  };
}
