import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const peerMockState = vi.hoisted(() => ({
  peers: [] as Array<{
    id: string;
    disconnected: boolean;
    reconnect: ReturnType<typeof vi.fn>;
    createdConnections: Array<{
      peer: string;
      open: boolean;
      sentMessages: unknown[];
      emit: (event: string, ...args: unknown[]) => void;
      close: () => void;
    }>;
    emit: (event: string, ...args: unknown[]) => void;
  }>,
}));

vi.mock('./roomCodes', () => ({
  generateRoomCode: () => 'TEST',
  roomCodeToPeerId: (code: string) => `peer-${code}`,
}));

vi.mock('peerjs', () => {
  class MockConnection {
    peer: string;
    open = false;
    sentMessages: unknown[] = [];
    private handlers = new Map<string, Set<(...args: unknown[]) => void>>();

    constructor(peerId: string) {
      this.peer = peerId;
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      const handlers = this.handlers.get(event) ?? new Set();
      handlers.add(handler);
      this.handlers.set(event, handlers);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      if (event === 'open') this.open = true;
      if (event === 'close') this.open = false;
      this.handlers.get(event)?.forEach(handler => handler(...args));
    }

    send(message: unknown) {
      this.sentMessages.push(message);
    }

    close() {
      if (!this.open) return;
      this.open = false;
      this.emit('close');
    }
  }

  class MockPeer {
    id: string;
    disconnected = false;
    createdConnections: MockConnection[] = [];
    private handlers = new Map<string, Set<(...args: unknown[]) => void>>();

    reconnect = vi.fn(() => {
      this.disconnected = false;
    });

    destroy = vi.fn();

    constructor(idOrConfig?: string | object) {
      this.id = typeof idOrConfig === 'string' ? idOrConfig : 'guest-peer';
      peerMockState.peers.push(this);
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      const handlers = this.handlers.get(event) ?? new Set();
      handlers.add(handler);
      this.handlers.set(event, handlers);
      return this;
    }

    off(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.get(event)?.delete(handler);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      this.handlers.get(event)?.forEach(handler => handler(...args));
    }

    connect(peerId: string) {
      const connection = new MockConnection(peerId);
      this.createdConnections.push(connection);
      return connection;
    }
  }

  return { default: MockPeer };
});

import { PeerManager } from './PeerManager';

async function createConnectedGuest() {
  const manager = new PeerManager();
  manager.setReconnectPlayerName('Reconnecting Player');
  const joinPromise = manager.joinRoom('ROOM');
  const peer = peerMockState.peers[0];
  peer.emit('open', peer.id);
  const initialConnection = peer.createdConnections[0];
  initialConnection.emit('open');
  await joinPromise;
  return { manager, peer, initialConnection };
}

describe('PeerManager data connection reconnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    peerMockState.peers.length = 0;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('starts a replacement connection immediately when the guest data connection closes', async () => {
    const { manager, peer, initialConnection } = await createConnectedGuest();

    initialConnection.emit('close');

    expect(manager.status).toBe('reconnecting');
    expect(peer.createdConnections).toHaveLength(2);

    const replacement = peer.createdConnections[1];
    replacement.emit('open');

    expect(manager.status).toBe('connected');
    expect(manager.peerCount).toBe(1);
    expect(replacement.sentMessages).toContainEqual({
      type: 'reconnect',
      playerName: 'Reconnecting Player',
    });
    manager.destroy();
  });

  it('manual reconnect closes the old connection without recursively starting extra attempts', async () => {
    const { manager, peer } = await createConnectedGuest();

    expect(manager.attemptReconnect()).toBe(true);

    expect(manager.status).toBe('reconnecting');
    expect(peer.createdConnections).toHaveLength(2);

    const replacement = peer.createdConnections[1];
    replacement.emit('open');

    expect(manager.status).toBe('connected');
    expect(peer.createdConnections).toHaveLength(2);
    manager.destroy();
  });

  it('coalesces repeated retry triggers while a replacement connection is pending', async () => {
    const { manager, peer } = await createConnectedGuest();

    expect(manager.attemptReconnect()).toBe(true);
    expect(manager.attemptReconnect()).toBe(true);
    expect(manager.attemptReconnect()).toBe(true);

    expect(manager.status).toBe('reconnecting');
    expect(peer.createdConnections).toHaveLength(2);

    peer.createdConnections[1].emit('open');
    expect(manager.status).toBe('connected');
    expect(peer.createdConnections).toHaveLength(2);
    manager.destroy();
  });

  it('releases the reconnect guard after a failed replacement so Retry can start again', async () => {
    const { manager, peer } = await createConnectedGuest();

    expect(manager.attemptReconnect()).toBe(true);
    const failedReplacement = peer.createdConnections[1];
    failedReplacement.emit('error', new Error('replacement failed'));

    expect(manager.status).toBe('error');
    expect(manager.attemptReconnect()).toBe(true);
    expect(peer.createdConnections).toHaveLength(3);

    peer.createdConnections[2].emit('open');
    expect(manager.status).toBe('connected');
    manager.destroy();
  });

  it('coalesces Retry while PeerJS signaling reconnection is still pending', async () => {
    const { manager, peer } = await createConnectedGuest();
    peer.disconnected = true;

    expect(manager.attemptReconnect()).toBe(true);
    expect(manager.attemptReconnect()).toBe(true);

    expect(peer.reconnect).toHaveBeenCalledTimes(1);
    expect(peer.createdConnections).toHaveLength(1);

    peer.emit('open', peer.id);
    expect(peer.createdConnections).toHaveLength(2);

    peer.createdConnections[1].emit('open');
    expect(manager.status).toBe('connected');
    manager.destroy();
  });
});
