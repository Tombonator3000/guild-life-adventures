// React hook for online multiplayer game management
// Handles lobby phase: creating/joining rooms, player management, game start
// Features: reconnection support, peer name tracking, host migration
// During gameplay, useNetworkSync handles state sync (this hook only handles lobby messages)

import { useState, useEffect, useCallback, useRef } from 'react';
import { peerManager } from './PeerManager';
import { useGameStore } from '@/store/gameStore';
import { serializeGameState, applyNetworkState, resetNetworkState } from './networkState';
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
import { PLAYER_COLORS } from '@/types/game.types';

/** Time to wait for host reconnection before triggering host migration (ms) */
const HOST_MIGRATION_TIMEOUT = 10000;

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
  // Track disconnected players that may reconnect (for UI display)
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<string[]>([]);

  // Track if we're in online game mode
  const isOnlineRef = useRef(false);

  // Store lobby data for host migration (all peer IDs and slots)
  const storedLobbyRef = useRef<LobbyPlayer[]>([]);
  // Host migration timeout timer
  const hostMigrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if host migration is in progress
  const [isMigrating, setIsMigrating] = useState(false);

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

      // Store name for reconnection and send join message to host
      peerManager.setReconnectPlayerName(playerName);
      peerManager.sendToHost({ type: 'join', playerName });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to join room';
      setError(msg);
      throw err;
    }
  }, []);

  // --- Guest: Attempt Reconnection ---

  const attemptReconnect = useCallback(() => {
    if (isHost) return;
    setError(null);
    setConnectionStatus('reconnecting');
    const success = peerManager.attemptReconnect();
    if (!success) {
      setError('Cannot reconnect - no active session');
      setConnectionStatus('error');
    }
  }, [isHost]);

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

    // Store lobby data for potential host migration
    storedLobbyRef.current = lobbyPlayers;

    // Set peerId -> playerId mapping on PeerManager for turn validation
    // Also store peer names for reconnection identification
    const peerMap = new Map<string, string>();
    lobbyPlayers.forEach(p => {
      if (p.peerId !== 'host') {
        peerMap.set(p.peerId, `player-${p.slot}`);
        peerManager.setPeerName(p.peerId, p.name);
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
  // Use refs to avoid stale closures
  const handleHostMessageRef = useRef<((msg: GuestMessage, from: string) => void) | null>(null);
  const handleGuestMessageRef = useRef<((msg: HostMessage) => void) | null>(null);
  const handlePlayerDisconnectRef = useRef<((peerId: string) => void) | null>(null);
  const handlePlayerReconnectRef = useRef<((peerId: string) => void) | null>(null);
  const performHostMigrationRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Status change handler
    const unsubStatus = peerManager.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Message handler - only handles LOBBY messages
    const unsubMessage = peerManager.onMessage((message: NetworkMessage, fromPeerId: string) => {
      if (isHost) {
        const msg = message as GuestMessage;
        if (msg.type === 'join' || msg.type === 'ready' || msg.type === 'leave' || msg.type === 'reconnect') {
          handleHostMessageRef.current?.(msg, fromPeerId);
        }
      } else {
        const msg = message as HostMessage;
        if (msg.type === 'lobby-update' || msg.type === 'game-start' ||
            msg.type === 'kicked' || msg.type === 'player-disconnected' ||
            msg.type === 'player-reconnected' || msg.type === 'host-migrated') {
          handleGuestMessageRef.current?.(msg);
        }
      }
    });

    // Disconnect handler
    const unsubDisconnect = peerManager.onPeerDisconnect((peerId: string) => {
      if (isHost) {
        handlePlayerDisconnectRef.current?.(peerId);
      } else {
        // Host disconnected - try to reconnect first
        setConnectionStatus('reconnecting');
        setError('Connection lost - attempting to reconnect...');
        // Auto-attempt reconnection after a brief delay
        setTimeout(() => {
          if (peerManager.status !== 'connected') {
            peerManager.attemptReconnect();
          }
        }, 2000);

        // Start host migration timer: if still not connected after timeout, migrate
        if (hostMigrationTimerRef.current) clearTimeout(hostMigrationTimerRef.current);
        hostMigrationTimerRef.current = setTimeout(() => {
          if (peerManager.status !== 'connected') {
            performHostMigrationRef.current?.();
          }
        }, HOST_MIGRATION_TIMEOUT);
      }
    });

    // Reconnect handler (host only - fired when a guest reconnects)
    const unsubReconnect = peerManager.onPeerReconnect((peerId: string) => {
      if (isHost) {
        handlePlayerReconnectRef.current?.(peerId);
      }
    });

    return () => {
      unsubStatus();
      unsubMessage();
      unsubDisconnect();
      unsubReconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Host: Handle lobby messages from guests
  const handleHostMessage = useCallback((message: GuestMessage, fromPeerId: string) => {
    switch (message.type) {
      case 'join': {
        setLobbyPlayers(prev => {
          if (prev.length >= 4) {
            // Room is full — notify the rejected guest
            peerManager.sendTo(fromPeerId, { type: 'kicked', reason: 'Room is full (max 4 players)' });
            return prev;
          }
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
            isReady: true,
            slot,
          };
          const updated = [...prev, newPlayer];
          // Store peer name for reconnection
          peerManager.setPeerName(fromPeerId, displayName);
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

      case 'reconnect': {
        // Guest is reconnecting during an active game
        // Re-send them the current game state
        const gameState = serializeGameState();
        peerManager.sendTo(fromPeerId, { type: 'state-sync', gameState });
        // Notify all clients that the player reconnected
        const playerName = peerManager.getPeerName(fromPeerId) ?? message.playerName;
        peerManager.broadcast({ type: 'player-reconnected', playerName });
        // Remove from disconnected list
        setDisconnectedPlayers(prev => prev.filter(n => n !== playerName));
        console.log(`[OnlineGame] Player reconnected: ${playerName}`);
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
        // Set networkMode FIRST so that any store actions triggered during
        // applyNetworkState are correctly forwarded instead of executing locally
        const myPeerId = peerManager.peerId;
        // Find our slot by peerId (reliable), fall back to name matching
        const myLobbyPlayer = message.lobby?.players?.find((p: LobbyPlayer) => p.peerId === myPeerId)
          || message.lobby?.players?.find((p: LobbyPlayer) => p.name === localPlayerName);
        const mySlot = myLobbyPlayer?.slot ?? -1;
        const myPlayerId = mySlot >= 0 ? `player-${mySlot}` : null;

        // Store lobby data for host migration (need all peer IDs and slots)
        storedLobbyRef.current = message.lobby?.players ?? [];

        useGameStore.setState({
          networkMode: 'guest' as const,
          localPlayerId: myPlayerId,
          roomCode: roomCode,
        });

        // Apply the full game state from host AFTER networkMode is set
        applyNetworkState(message.gameState);
        break;
      }

      case 'host-migrated': {
        // A new host has taken over — connect to them
        const migMsg = message as { type: 'host-migrated'; newHostPeerId: string; gameState: SerializedGameState };
        console.log(`[OnlineGame] Host migrated to peer: ${migMsg.newHostPeerId}`);
        setIsMigrating(false);
        setError(null);
        // Apply the game state from the new host
        applyNetworkState(migMsg.gameState);
        setConnectionStatus('connected');
        break;
      }

      case 'player-disconnected': {
        const isTemporary = message.temporary ?? false;
        if (isTemporary) {
          console.log(`[Network] Player temporarily disconnected: ${message.playerName} (may reconnect)`);
        } else {
          console.log(`[Network] Player disconnected: ${message.playerName}`);
        }
        break;
      }

      case 'player-reconnected': {
        console.log(`[Network] Player reconnected: ${message.playerName}`);
        setError(null); // Clear any reconnection error
        break;
      }

      case 'kicked': {
        setError(`Kicked from room: ${message.reason}`);
        disconnect();
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPlayerName, roomCode]);

  // Host: Handle player disconnect
  const handlePlayerDisconnect = useCallback((peerId: string) => {
    const phase = useGameStore.getState().phase;
    const isInGame = phase === 'playing' || phase === 'event' || phase === 'victory';

    if (isInGame && peerManager.isReconnecting(peerId)) {
      // During active game: peer is in reconnection window, don't remove from lobby
      const playerName = peerManager.getPeerName(peerId) ?? 'Unknown';
      setDisconnectedPlayers(prev => [...prev, playerName]);
      peerManager.broadcast({
        type: 'player-disconnected',
        playerName,
        temporary: true,
      });
      console.log(`[OnlineGame] Player dropped (reconnecting): ${playerName}`);
    } else {
      // In lobby or reconnection window expired: remove player
      setLobbyPlayers(prev => {
        const disconnected = prev.find(p => p.peerId === peerId);
        if (disconnected) {
          peerManager.broadcast({
            type: 'player-disconnected',
            playerName: disconnected.name,
          });
          setDisconnectedPlayers(p => p.filter(n => n !== disconnected.name));
        }
        const filtered = prev.filter(p => p.peerId !== peerId);
        // Reassign slots sequentially so player IDs stay correct at game start
        const updated = filtered.map((p, i) => ({
          ...p,
          slot: i,
          color: PLAYER_COLORS[i]?.value || '#888888',
        }));
        const lobby: LobbyState = {
          roomCode,
          hostName: localPlayerName,
          players: updated,
          settings,
        };
        peerManager.broadcast({ type: 'lobby-update', lobby });
        return updated;
      });
    }
  }, [roomCode, localPlayerName, settings]);

  // Host: Handle player reconnection
  const handlePlayerReconnect = useCallback((peerId: string) => {
    const playerName = peerManager.getPeerName(peerId) ?? 'Unknown';
    setDisconnectedPlayers(prev => prev.filter(n => n !== playerName));
    // Re-send current game state to the reconnected peer
    const gameState = serializeGameState();
    peerManager.sendTo(peerId, { type: 'state-sync', gameState });
    peerManager.broadcast({ type: 'player-reconnected', playerName });
    console.log(`[OnlineGame] Player reconnected: ${playerName}`);
  }, []);

  // --- Host Migration ---
  // When the original host disconnects and can't reconnect, elect a new host.
  // The guest with the lowest slot number (excluding host slot 0) becomes the new host.
  // Other guests connect to the new host's existing PeerJS peerId.
  const performHostMigration = useCallback(() => {
    const myPeerId = peerManager.peerId;
    const lobby = storedLobbyRef.current;
    if (!myPeerId || lobby.length === 0) {
      setError('Host migration failed — no lobby data');
      return;
    }

    // Find non-host lobby players, sorted by slot (lowest first)
    const candidates = lobby
      .filter(p => p.peerId !== 'host')
      .sort((a, b) => a.slot - b.slot);

    if (candidates.length === 0) {
      setError('Host migration failed — no other players');
      return;
    }

    const successor = candidates[0];
    const amISuccessor = successor.peerId === myPeerId;

    setIsMigrating(true);
    console.log(`[OnlineGame] Host migration: successor is ${successor.name} (${successor.peerId}), I am ${amISuccessor ? 'the successor' : 'a follower'}`);

    if (amISuccessor) {
      // I am the new host — promote myself
      const promoted = peerManager.promoteToHost();
      if (!promoted) {
        setError('Host migration failed — could not promote to host');
        setIsMigrating(false);
        return;
      }

      setIsHost(true);
      setError(null);
      setIsMigrating(false);

      // Set up peer→player mapping for the new host (excluding old host, excluding myself)
      const peerMap = new Map<string, string>();
      lobby.forEach(p => {
        if (p.peerId !== 'host' && p.peerId !== myPeerId) {
          peerMap.set(p.peerId, `player-${p.slot}`);
          peerManager.setPeerName(p.peerId, p.name);
        }
      });
      peerManager.setPeerPlayerMap(peerMap);

      // Update store to host mode (keep current game state as authoritative)
      const myPlayerId = useGameStore.getState().localPlayerId;
      useGameStore.setState({
        networkMode: 'host' as const,
        localPlayerId: myPlayerId,
      });

      console.log(`[OnlineGame] Promoted to host. Waiting for ${candidates.length - 1} guests to reconnect.`);

      // The other guests will reconnect to our peerId via the reconnect message handler
      // (already handled by handleHostMessage 'reconnect' case)
    } else {
      // I am not the successor — connect to the new host
      const newHostPeerId = successor.peerId;
      console.log(`[OnlineGame] Connecting to new host: ${newHostPeerId}`);

      // Wait a moment for the successor to set up, then connect
      setTimeout(async () => {
        try {
          await peerManager.connectToNewHost(newHostPeerId);
          setIsMigrating(false);
          setError(null);
          setConnectionStatus('connected');
          console.log(`[OnlineGame] Connected to new host: ${successor.name}`);
        } catch (err) {
          console.error('[OnlineGame] Failed to connect to new host:', err);
          setError('Failed to connect to new host');
          setIsMigrating(false);
          setConnectionStatus('error');
        }
      }, 3000); // Give the successor time to promote
    }
  }, []);

  // Keep message handler refs current
  handleHostMessageRef.current = handleHostMessage;
  handleGuestMessageRef.current = handleGuestMessage;
  handlePlayerDisconnectRef.current = handlePlayerDisconnect;
  handlePlayerReconnectRef.current = handlePlayerReconnect;
  performHostMigrationRef.current = performHostMigration;

  // --- Settings Update (host only, lobby phase only) ---

  const updateSettings = useCallback((newSettings: Partial<OnlineGameSettings>) => {
    if (!isHost) return;
    const phase = useGameStore.getState().phase;
    if (phase === 'playing' || phase === 'victory') return;

    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
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
    // Clear any pending host migration
    if (hostMigrationTimerRef.current) {
      clearTimeout(hostMigrationTimerRef.current);
      hostMigrationTimerRef.current = null;
    }
    // Notify peers before destroying
    if (peerManager.isHost) {
      peerManager.broadcast({ type: 'kicked', reason: 'Host closed the room' });
    } else {
      peerManager.sendToHost({ type: 'leave' });
    }
    isOnlineRef.current = false;
    // Clean up network state tracking (dismissed events, sync indices)
    resetNetworkState();
    // Brief delay to allow messages to flush before destroying
    setTimeout(() => peerManager.destroy(), 50);
    setIsHost(false);
    setRoomCode('');
    setConnectionStatus('disconnected');
    setLobbyPlayers([]);
    setDisconnectedPlayers([]);
    setError(null);
    useGameStore.setState({
      networkMode: 'local' as const,
      localPlayerId: null,
      roomCode: null,
    });
  }, []);

  // Cleanup on unmount — only destroy if we're actually leaving online mode
  // (NOT when transitioning from lobby to gameplay, which also unmounts this component)
  useEffect(() => {
    return () => {
      const state = useGameStore.getState();
      const isActiveGame = state.networkMode === 'host' || state.networkMode === 'guest';
      if (isOnlineRef.current && !isActiveGame) {
        resetNetworkState();
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
    disconnectedPlayers,
    isMigrating,

    // Actions
    createRoom,
    joinRoom,
    startOnlineGame,
    updateSettings,
    disconnect,
    setLocalPlayerName,
    attemptReconnect,
  };
}
