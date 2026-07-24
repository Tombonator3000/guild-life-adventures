import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const peerMockState = vi.hoisted(() => ({
  peers: [] as Array<{
    id: string;
    disconnected: boolean;
    reconnect: ReturnType<typeof vi.fn>;
    createdConnections: Array<{
      peer: string;
      open: boolean;
      emit: (event: string, ...args: unknown[]) => void;
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

    send() {}

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

describe('PeerManager signaling reconnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    peerMockState.peers.length = 0;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('restores host status when PeerJS signaling opens again', async () => {
    const manager = new PeerManager();
    const statuses: string[] = [];
    manager.onStatusChange(status => statuses.push(status));

    const createPromise = manager.createRoom();
    const peer = peerMockState.peers[0];
    peer.emit('open', peer.id);
    await createPromise;

    expect(manager.status).toBe('connected');

    peer.disconnected = true;
    peer.emit('disconnected');
    expect(manager.status).toBe('reconnecting');
    expect(peer.reconnect).toHaveBeenCalledTimes(1);

    peer.emit('open', peer.id);

    expect(manager.status).toBe('connected');
    expect(statuses.at(-1)).toBe('connected');
    manager.destroy();
  });

  it('restores guest status when signaling returns and the host data connection survived', async () => {
    const manager = new PeerManager();
    const statuses: string[] = [];
    manager.onStatusChange(status => statuses.push(status));

    const joinPromise = manager.joinRoom('ROOM');
    const peer = peerMockState.peers[0];
    peer.emit('open', peer.id);
    const hostConnection = peer.createdConnections[0];
    hostConnection.emit('open');
    await joinPromise;

    expect(manager.status).toBe('connected');
    expect(hostConnection.open).toBe(true);

    peer.disconnected = true;
    peer.emit('disconnected');
    expect(manager.status).toBe('reconnecting');

    peer.emit('open', peer.id);

    expect(manager.status).toBe('connected');
    expect(statuses.at(-1)).toBe('connected');
    manager.destroy();
  });
});
