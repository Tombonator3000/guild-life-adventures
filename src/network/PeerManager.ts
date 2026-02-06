// PeerJS connection manager for online multiplayer
// Uses WebRTC P2P via PeerJS cloud signaling (no server needed)

import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { HostMessage, GuestMessage, NetworkMessage, ConnectionStatus } from './types';
import { generateRoomCode, roomCodeToPeerId, peerIdToRoomCode } from './roomCodes';

export type MessageHandler = (message: NetworkMessage, fromPeerId: string) => void;
export type StatusHandler = (status: ConnectionStatus) => void;
export type DisconnectHandler = (peerId: string) => void;

export class PeerManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private _isHost = false;
  private _roomCode = '';
  private _status: ConnectionStatus = 'disconnected';
  private pingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  /** Maps peerId → playerId (e.g. "7c8995df..." → "player-1") for turn validation */
  private peerPlayerMap: Map<string, string> = new Map();

  get isHost(): boolean { return this._isHost; }
  get roomCode(): string { return this._roomCode; }
  get status(): ConnectionStatus { return this._status; }
  get connectedPeerIds(): string[] { return Array.from(this.connections.keys()); }

  /** Set the peerId → playerId mapping (called when host starts game) */
  setPeerPlayerMap(map: Map<string, string>) {
    this.peerPlayerMap = new Map(map);
  }

  /** Look up which playerId a peer controls (returns null if unknown) */
  getPlayerIdForPeer(peerId: string): string | null {
    return this.peerPlayerMap.get(peerId) ?? null;
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

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.statusHandlers.forEach(h => h(status));
  }

  private emitMessage(message: NetworkMessage, fromPeerId: string) {
    this.messageHandlers.forEach(h => h(message, fromPeerId));
  }

  // --- Host: Create Room ---

  async createRoom(): Promise<string> {
    this._isHost = true;
    this._roomCode = generateRoomCode();
    const peerId = roomCodeToPeerId(this._roomCode);

    return new Promise((resolve, reject) => {
      this.setStatus('connecting');

      this.peer = new Peer(peerId, {
        debug: import.meta.env.DEV ? 2 : 0,
      });

      this.peer.on('open', () => {
        this.setStatus('connected');
        console.log(`[PeerManager] Host room created: ${this._roomCode}`);
        resolve(this._roomCode);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[PeerManager] Host error:', err);
        if (err.type === 'unavailable-id') {
          // Room code collision — retry with new code
          this.peer?.destroy();
          this._roomCode = generateRoomCode();
          const newPeerId = roomCodeToPeerId(this._roomCode);
          this.peer = new Peer(newPeerId, {
            debug: import.meta.env.DEV ? 2 : 0,
          });
          this.peer.on('open', () => {
            this.setStatus('connected');
            resolve(this._roomCode);
          });
          this.peer.on('connection', (conn) => {
            this.handleIncomingConnection(conn);
          });
          this.peer.on('error', (retryErr) => {
            this.setStatus('error');
            reject(retryErr);
          });
        } else {
          this.setStatus('error');
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        this.setStatus('reconnecting');
        // Auto-reconnect
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

      this.peer = new Peer({
        debug: import.meta.env.DEV ? 2 : 0,
      });

      this.peer.on('open', () => {
        const conn = this.peer!.connect(hostPeerId, {
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
          console.log(`[PeerManager] Connected to host: ${roomCode}`);
          resolve();
        });

        conn.on('error', (err) => {
          if (settled) return;
          settled = true;
          console.error('[PeerManager] Connection error:', err);
          this.setStatus('error');
          reject(err);
        });

        // Timeout if connection doesn't open — guarded against race with open/error
        setTimeout(() => {
          if (!settled) {
            settled = true;
            this.setStatus('error');
            reject(new Error('Connection timeout — room not found'));
          }
        }, 10000);
      });

      this.peer.on('error', (err) => {
        console.error('[PeerManager] Guest error:', err);
        this.setStatus('error');
        reject(err);
      });
    });
  }

  // --- Connection Management ---

  private handleIncomingConnection(conn: DataConnection) {
    conn.on('open', () => {
      const peerId = conn.peer;
      this.connections.set(peerId, conn);
      this.setupConnectionHandlers(conn, peerId);
      console.log(`[PeerManager] Peer connected: ${peerId}`);
    });
  }

  private setupConnectionHandlers(conn: DataConnection, peerId: string) {
    conn.on('data', (data) => {
      try {
        const message = data as NetworkMessage;
        this.emitMessage(message, peerId);
      } catch (err) {
        console.error('[PeerManager] Invalid message from', peerId, err);
      }
    });

    conn.on('close', () => {
      this.connections.delete(peerId);
      this.clearPingInterval(peerId);
      this.disconnectHandlers.forEach(h => h(peerId));
      console.log(`[PeerManager] Peer disconnected: ${peerId}`);
    });

    conn.on('error', (err) => {
      console.error(`[PeerManager] Connection error with ${peerId}:`, err);
    });
  }

  // --- Sending Messages ---

  /** Host: broadcast to all connected guests */
  broadcast(message: HostMessage) {
    if (!this._isHost) {
      // Silently ignore — this can happen during component transitions
      return;
    }
    const data = message;
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }

  /** Guest: send to host */
  sendToHost(message: GuestMessage) {
    if (this._isHost) {
      console.warn('[PeerManager] Host cannot sendToHost');
      return;
    }
    // Guest has one connection — to the host
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

  // --- Ping/Latency ---

  startPingInterval(peerId: string, intervalMs = 5000) {
    this.clearPingInterval(peerId);
    const id = setInterval(() => {
      if (this._isHost) {
        // Host doesn't ping guests (guests ping host)
      } else {
        this.sendToHost({ type: 'ping', timestamp: Date.now() });
      }
    }, intervalMs);
    this.pingIntervals.set(peerId, id);
  }

  private clearPingInterval(peerId: string) {
    const id = this.pingIntervals.get(peerId);
    if (id) {
      clearInterval(id);
      this.pingIntervals.delete(peerId);
    }
  }

  // --- Cleanup ---

  destroy() {
    this.pingIntervals.forEach((id) => clearInterval(id));
    this.pingIntervals.clear();
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.peer?.destroy();
    this.peer = null;
    this.messageHandlers.clear();
    this.statusHandlers.clear();
    this.disconnectHandlers.clear();
    this.peerPlayerMap.clear();
    this._isHost = false;
    this._roomCode = '';
    this.setStatus('disconnected');
  }

  /** Get number of connected peers */
  get peerCount(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const peerManager = new PeerManager();
