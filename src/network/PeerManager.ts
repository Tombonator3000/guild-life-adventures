// PeerJS connection manager for online multiplayer
// Uses WebRTC P2P via PeerJS cloud signaling
// Features: heartbeat/keepalive, reconnection window, TURN fallback, latency tracking

import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { HostMessage, GuestMessage, NetworkMessage, ConnectionStatus } from './types';
import { generateRoomCode, roomCodeToPeerId } from './roomCodes';

export type MessageHandler = (message: NetworkMessage, fromPeerId: string) => void;
export type StatusHandler = (status: ConnectionStatus) => void;
export type DisconnectHandler = (peerId: string) => void;
export type ReconnectHandler = (peerId: string) => void;

// --- Configuration ---

/** How often to send heartbeat pings (ms) */
const HEARTBEAT_INTERVAL = 5000;
/** If no heartbeat received within this window, consider peer dead (ms) */
const HEARTBEAT_TIMEOUT = 15000;
/** How long to wait for a dropped guest to reconnect before removing them (ms) */
const RECONNECT_WINDOW = 30000;

/** Free TURN servers for NAT traversal fallback */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class PeerManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private reconnectHandlers: Set<ReconnectHandler> = new Set();
  private _isHost = false;
  private _roomCode = '';
  private _status: ConnectionStatus = 'disconnected';

  /** Maps peerId -> playerId (e.g. "7c8995df..." -> "player-1") for turn validation */
  private peerPlayerMap: Map<string, string> = new Map();

  /** Heartbeat: tracks last pong received from each peer (peerId -> timestamp) */
  private lastPongReceived: Map<string, number> = new Map();
  /** Heartbeat interval timer per peer */
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  /** Heartbeat check timer (host only) */
  private heartbeatCheckInterval: ReturnType<typeof setInterval> | null = null;

  /** Latency per peer in ms (peerId -> latency) */
  private _peerLatency: Map<string, number> = new Map();

  /** Peers in reconnection window (peerId -> timeout timer) */
  private reconnectingPeers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  /** Stored player names for reconnecting peers */
  private peerNames: Map<string, string> = new Map();
  /** Guest's own player name for reconnection identification */
  private _reconnectPlayerName: string | null = null;
  /** Guest-side heartbeat timeout timer */
  private guestHeartbeatTimeout: ReturnType<typeof setTimeout> | null = null;

  get isHost(): boolean { return this._isHost; }
  get roomCode(): string { return this._roomCode; }
  get status(): ConnectionStatus { return this._status; }
  get connectedPeerIds(): string[] { return Array.from(this.connections.keys()); }
  /** Get this peer's own PeerJS ID (available after peer.on('open')) */
  get peerId(): string | null { return this.peer?.id ?? null; }

  /** Get latency for a specific peer in ms (0 if unknown) */
  getLatency(peerId: string): number { return this._peerLatency.get(peerId) ?? 0; }

  /** Get all peer latencies */
  get peerLatencies(): Map<string, number> { return new Map(this._peerLatency); }

  /** Check if a peer is in the reconnection window (disconnected but may come back) */
  isReconnecting(peerId: string): boolean { return this.reconnectingPeers.has(peerId); }

  /** Set the peerId -> playerId mapping (called when host starts game) */
  setPeerPlayerMap(map: Map<string, string>) {
    this.peerPlayerMap = new Map(map);
  }

  /** Look up which playerId a peer controls (returns null if unknown) */
  getPlayerIdForPeer(peerId: string): string | null {
    return this.peerPlayerMap.get(peerId) ?? null;
  }

  /** Store a peer's player name (for reconnection identification) */
  setPeerName(peerId: string, name: string) {
    this.peerNames.set(peerId, name);
  }

  /** Get a peer's stored player name */
  getPeerName(peerId: string): string | null {
    return this.peerNames.get(peerId) ?? null;
  }

  /** Store this guest's own player name (for reconnection identification) */
  setReconnectPlayerName(name: string) {
    this._reconnectPlayerName = name;
  }

  // --- Event Handlers ---

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  onPeerDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  onPeerReconnect(handler: ReconnectHandler): () => void {
    this.reconnectHandlers.add(handler);
    return () => this.reconnectHandlers.delete(handler);
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.statusHandlers.forEach(h => h(status));
  }

  private emitMessage(message: NetworkMessage, fromPeerId: string) {
    this.messageHandlers.forEach(h => h(message, fromPeerId));
  }

  // --- PeerJS Config ---

  private getPeerConfig(): { debug: number; config: { iceServers: typeof ICE_SERVERS } } {
    return {
      debug: import.meta.env.DEV ? 2 : 0,
      config: { iceServers: ICE_SERVERS },
    };
  }

  // --- Host: Create Room ---

  async createRoom(): Promise<string> {
    this._isHost = true;
    this._roomCode = generateRoomCode();
    const peerId = roomCodeToPeerId(this._roomCode);

    return new Promise((resolve, reject) => {
      this.setStatus('connecting');

      this.peer = new Peer(peerId, this.getPeerConfig());

      this.peer.on('open', () => {
        this.setStatus('connected');
        this.startHeartbeatCheck();
        console.log(`[PeerManager] Host room created: ${this._roomCode}`);
        resolve(this._roomCode);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[PeerManager] Host error:', err);
        if (err.type === 'unavailable-id') {
          // Room code collision - retry with new code
          this.peer?.destroy();
          this._roomCode = generateRoomCode();
          const newPeerId = roomCodeToPeerId(this._roomCode);
          this.peer = new Peer(newPeerId, this.getPeerConfig());
          this.setupHostPeerHandlers(resolve, reject);
        } else {
          this.setStatus('error');
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        this.setStatus('reconnecting');
        // Auto-reconnect to signaling server
        this.peer?.reconnect();
      });
    });
  }

  // --- Guest: Join Room ---

  async joinRoom(roomCode: string): Promise<void> {
    this._isHost = false;
    this._roomCode = roomCode.toUpperCase();
    const hostPeerId = roomCodeToPeerId(this._roomCode);

    return new Promise((resolve, reject) => {
      this.setStatus('connecting');

      this.peer = new Peer(this.getPeerConfig());

      this.peer.on('open', () => {
        this.connectToHost(hostPeerId, resolve, reject);
      });

      this.peer.on('error', (err) => {
        console.error('[PeerManager] Guest error:', err);
        this.setStatus('error');
        reject(err);
      });

      this.peer.on('disconnected', () => {
        this.setStatus('reconnecting');
        this.peer?.reconnect();
      });
    });
  }

  /** Guest: connect (or reconnect) to host */
  private connectToHost(
    hostPeerId: string,
    resolve?: () => void,
    reject?: (err: Error) => void,
  ): void {
    if (!this.peer) {
      reject?.(new Error('No peer instance'));
      return;
    }

    const conn = this.peer.connect(hostPeerId, {
      reliable: true,
      serialization: 'json',
    });

    let settled = false;

    conn.on('open', () => {
      if (settled) return;
      settled = true;
      this.connections.set(hostPeerId, conn);
      this.setupConnectionHandlers(conn, hostPeerId);
      this.setStatus('connected');
      this.startHeartbeat(hostPeerId);
      console.log(`[PeerManager] Connected to host: ${this._roomCode}`);
      resolve?.();
    });

    conn.on('error', (err) => {
      if (settled) return;
      settled = true;
      console.error('[PeerManager] Connection error:', err);
      this.setStatus('error');
      reject?.(err);
    });

    // Timeout if connection doesn't open
    setTimeout(() => {
      if (!settled) {
        settled = true;
        this.setStatus('error');
        reject?.(new Error('Connection timeout - room not found'));
      }
    }, 10000);
  }

  /** Guest: attempt to reconnect to host after connection drop */
  attemptReconnect(): boolean {
    if (this._isHost || !this.peer || !this._roomCode) return false;
    const hostPeerId = roomCodeToPeerId(this._roomCode);

    // Clean up old connection
    const oldConn = this.connections.get(hostPeerId);
    if (oldConn) {
      try { oldConn.close(); } catch { /* ignore */ }
      this.connections.delete(hostPeerId);
    }

    this.setStatus('reconnecting');
    console.log('[PeerManager] Attempting reconnection to host...');

    const doReconnect = () => {
      this.connectToHost(hostPeerId, () => {
        // After reconnecting, send a reconnect message so host re-syncs state
        const storedName = this._reconnectPlayerName ?? 'Unknown';
        this.sendToHost({ type: 'reconnect', playerName: storedName });
      });
    };

    // If signaling server connection was lost, reconnect that first
    if (this.peer.disconnected) {
      this.peer.reconnect();
      // Timeout for signaling server reconnection
      let signalingResolved = false;
      const onOpen = () => {
        if (signalingResolved) return;
        signalingResolved = true;
        this.peer?.off('open', onOpen);
        doReconnect();
      };
      this.peer.on('open', onOpen);
      // Timeout: if signaling server doesn't reconnect in 15 seconds, give up
      setTimeout(() => {
        if (!signalingResolved) {
          signalingResolved = true;
          this.peer?.off('open', onOpen);
          this.setStatus('error');
          console.error('[PeerManager] Signaling server reconnection timed out');
        }
      }, 15000);
    } else {
      doReconnect();
    }

    return true;
  }

  /** Shared event handler setup for host peer (used by createRoom and retry path) */
  private setupHostPeerHandlers(
    resolve: (code: string) => void,
    reject: (err: Error) => void,
  ) {
    if (!this.peer) return;
    this.peer.on('open', () => {
      this.setStatus('connected');
      this.startHeartbeatCheck();
      resolve(this._roomCode);
    });
    this.peer.on('connection', (conn) => {
      this.handleIncomingConnection(conn);
    });
    this.peer.on('error', (retryErr) => {
      this.setStatus('error');
      reject(retryErr);
    });
    this.peer.on('disconnected', () => {
      this.setStatus('reconnecting');
      this.peer?.reconnect();
    });
  }

  // --- Connection Management ---

  private handleIncomingConnection(conn: DataConnection) {
    conn.on('open', () => {
      const peerId = conn.peer;

      // Check if this is a reconnecting peer
      const reconnectTimer = this.reconnectingPeers.get(peerId);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        this.reconnectingPeers.delete(peerId);
        console.log(`[PeerManager] Peer reconnected: ${peerId}`);
      }

      this.connections.set(peerId, conn);
      this.setupConnectionHandlers(conn, peerId);
      this.lastPongReceived.set(peerId, Date.now());

      // If this peer was previously known (reconnection), emit reconnect event
      if (reconnectTimer) {
        this.reconnectHandlers.forEach(h => h(peerId));
      }

      console.log(`[PeerManager] Peer connected: ${peerId}`);
    });
  }

  private setupConnectionHandlers(conn: DataConnection, peerId: string) {
    conn.on('data', (data) => {
      try {
        const message = data as NetworkMessage;

        // Handle heartbeat messages internally (don't propagate to game logic)
        if (this.handleHeartbeatMessage(message, peerId)) return;

        this.emitMessage(message, peerId);
      } catch (err) {
        console.error('[PeerManager] Invalid message from', peerId, err);
      }
    });

    conn.on('close', () => {
      // Only clean up if this is still the active connection for this peer
      // (prevents race condition where old close handler deletes a new reconnected connection)
      if (this.connections.get(peerId) !== conn) return;

      this.connections.delete(peerId);
      this.clearHeartbeat(peerId);
      this._peerLatency.delete(peerId);

      if (this._isHost) {
        // Host: start reconnection window instead of immediate disconnect
        const playerName = this.peerNames.get(peerId) ?? 'Unknown';
        console.log(`[PeerManager] Peer dropped, waiting for reconnect: ${peerId} (${playerName})`);

        const timer = setTimeout(() => {
          // Reconnection window expired - truly disconnected
          this.reconnectingPeers.delete(peerId);
          this.disconnectHandlers.forEach(h => h(peerId));
          console.log(`[PeerManager] Reconnection window expired for: ${peerId}`);
        }, RECONNECT_WINDOW);

        this.reconnectingPeers.set(peerId, timer);
        // Notify game about temporary disconnect (for UI)
        this.disconnectHandlers.forEach(h => h(peerId));
      } else {
        // Guest: host connection lost
        this.disconnectHandlers.forEach(h => h(peerId));
        console.log(`[PeerManager] Host connection lost: ${peerId}`);
      }
    });

    conn.on('error', (err) => {
      console.error(`[PeerManager] Connection error with ${peerId}:`, err);
    });
  }

  // --- Sending Messages ---

  /** Host: broadcast to all connected guests */
  broadcast(message: HostMessage) {
    if (!this._isHost) return;
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  /** Guest: send to host */
  sendToHost(message: GuestMessage) {
    if (this._isHost) {
      console.warn('[PeerManager] Host cannot sendToHost');
      return;
    }
    const hostConn = this.connections.values().next().value;
    if (hostConn && hostConn.open) {
      hostConn.send(message);
    } else {
      console.error('[PeerManager] No connection to host');
    }
  }

  /** Send to a specific peer */
  sendTo(peerId: string, message: HostMessage) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(message);
    }
  }

  // --- Heartbeat / Keepalive ---

  /** Start sending heartbeat pings to a peer (guest sends to host) */
  private startHeartbeat(peerId: string) {
    this.clearHeartbeat(peerId);
    this.lastPongReceived.set(peerId, Date.now());

    const id = setInterval(() => {
      if (!this._isHost) {
        // Guest pings host
        this.sendToHost({ type: 'ping', timestamp: Date.now() });
      }
    }, HEARTBEAT_INTERVAL);
    this.heartbeatIntervals.set(peerId, id);
    // Start guest-side heartbeat timeout on first connection
    if (!this._isHost) {
      this.resetGuestHeartbeatTimeout();
    }
  }

  /** Host: periodically check if all peers are still alive */
  private startHeartbeatCheck() {
    this.stopHeartbeatCheck();
    this.heartbeatCheckInterval = setInterval(() => {
      const now = Date.now();
      this.lastPongReceived.forEach((lastTime, peerId) => {
        if (now - lastTime > HEARTBEAT_TIMEOUT && this.connections.has(peerId)) {
          console.warn(`[PeerManager] Heartbeat timeout for peer: ${peerId}`);
          // Force-close the stale connection (will trigger 'close' handler)
          const conn = this.connections.get(peerId);
          if (conn) {
            conn.close();
          }
        }
      });
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeatCheck() {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
  }

  private clearHeartbeat(peerId: string) {
    const id = this.heartbeatIntervals.get(peerId);
    if (id) {
      clearInterval(id);
      this.heartbeatIntervals.delete(peerId);
    }
    this.lastPongReceived.delete(peerId);
  }

  /**
   * Handle heartbeat ping/pong messages internally.
   * Returns true if the message was a heartbeat (consumed), false otherwise.
   */
  private handleHeartbeatMessage(message: NetworkMessage, fromPeerId: string): boolean {
    if (this._isHost && 'type' in message && message.type === 'ping') {
      // Host received ping from guest -> send pong + update last-seen
      this.lastPongReceived.set(fromPeerId, Date.now());
      this.sendTo(fromPeerId, {
        type: 'pong',
        timestamp: (message as { timestamp: number }).timestamp,
      });
      return true;
    }

    if (!this._isHost && 'type' in message && message.type === 'pong') {
      // Guest received pong from host -> calculate latency and reset heartbeat timeout
      const sent = (message as { timestamp: number }).timestamp;
      const latency = Date.now() - sent;
      this._peerLatency.set(fromPeerId, latency);
      // Update host entry for general latency queries
      const hostPeerId = roomCodeToPeerId(this._roomCode);
      this._peerLatency.set(hostPeerId, latency);
      // Reset guest-side heartbeat timeout (host is responsive)
      this.resetGuestHeartbeatTimeout();
      return true;
    }

    return false;
  }

  /** Guest-side: reset the heartbeat timeout (called when pong received) */
  private resetGuestHeartbeatTimeout() {
    if (this._isHost) return;
    if (this.guestHeartbeatTimeout) clearTimeout(this.guestHeartbeatTimeout);
    this.guestHeartbeatTimeout = setTimeout(() => {
      if (this._isHost || this._status !== 'connected') return;
      console.warn('[PeerManager] Host heartbeat timeout — no pong received');
      this.setStatus('reconnecting');
      // Attempt reconnection
      this.attemptReconnect();
    }, HEARTBEAT_TIMEOUT);
  }

  /** Get guest's latency to host (guest-side only, in ms) */
  get latencyToHost(): number {
    if (this._isHost) return 0;
    const hostPeerId = roomCodeToPeerId(this._roomCode);
    return this._peerLatency.get(hostPeerId) ?? 0;
  }

  // --- Cleanup ---

  destroy() {
    // Stop heartbeat
    this.heartbeatIntervals.forEach((id) => clearInterval(id));
    this.heartbeatIntervals.clear();
    this.stopHeartbeatCheck();
    this.lastPongReceived.clear();
    this._peerLatency.clear();
    if (this.guestHeartbeatTimeout) {
      clearTimeout(this.guestHeartbeatTimeout);
      this.guestHeartbeatTimeout = null;
    }

    // Clear reconnection timers
    this.reconnectingPeers.forEach((timer) => clearTimeout(timer));
    this.reconnectingPeers.clear();
    this.peerNames.clear();

    // Close connections
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();

    // Destroy PeerJS instance
    this.peer?.destroy();
    this.peer = null;

    // Clear handlers
    this.messageHandlers.clear();
    this.statusHandlers.clear();
    this.disconnectHandlers.clear();
    this.reconnectHandlers.clear();
    this.peerPlayerMap.clear();

    this._isHost = false;
    this._roomCode = '';
    this._status = 'disconnected';
    // Don't call setStatus here - handlers already cleared
  }

  /** Get number of connected peers */
  get peerCount(): number {
    return this.connections.size;
  }

  /** Get number of peers in reconnection window */
  get reconnectingPeerCount(): number {
    return this.reconnectingPeers.size;
  }
}

// Singleton instance
export const peerManager = new PeerManager();
