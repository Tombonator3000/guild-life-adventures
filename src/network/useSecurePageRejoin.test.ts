import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  game: {
    phase: 'online-lobby',
    networkMode: 'guest',
    roomCode: 'ROOM',
    localPlayerId: 'player-1',
  },
  credential: {
    roomCode: 'ROOM',
    playerId: 'player-1',
    playerName: 'Trusted Player',
    reconnectToken: 'secure-token',
    timestamp: 100,
  } as null | {
    roomCode: string;
    playerId: string;
    playerName: string;
    reconnectToken: string;
    timestamp: number;
  },
  status: 'connected',
  statusHandler: null as null | ((status: string) => void),
  messageHandler: null as null | ((message: unknown, peerId: string) => void),
  sendToHost: vi.fn(),
  applyNetworkState: vi.fn(),
  storeLocalReconnectCredential: vi.fn(),
}));

vi.mock('@/store/gameStore', () => ({
  useGameStore: (selector: (state: typeof testState.game) => unknown) => selector(testState.game),
}));

vi.mock('./PeerManager', () => ({
  peerManager: {
    get status() { return testState.status; },
    sendToHost: testState.sendToHost,
    onStatusChange: (handler: (status: string) => void) => {
      testState.statusHandler = handler;
      return () => { testState.statusHandler = null; };
    },
    onMessage: (handler: (message: unknown, peerId: string) => void) => {
      testState.messageHandler = handler;
      return () => { testState.messageHandler = null; };
    },
  },
}));

vi.mock('./networkState', () => ({
  applyNetworkState: testState.applyNetworkState,
}));

vi.mock('./reconnectCredentials', () => ({
  getLocalReconnectCredential: () => testState.credential,
  storeLocalReconnectCredential: testState.storeLocalReconnectCredential,
}));

import { useSecurePageRejoin } from './useSecurePageRejoin';

describe('useSecurePageRejoin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    testState.game.phase = 'online-lobby';
    testState.game.networkMode = 'guest';
    testState.game.roomCode = 'ROOM';
    testState.game.localPlayerId = 'player-1';
    testState.credential = {
      roomCode: 'ROOM',
      playerId: 'player-1',
      playerName: 'Trusted Player',
      reconnectToken: 'secure-token',
      timestamp: 100,
    };
    testState.status = 'connected';
    testState.statusHandler = null;
    testState.messageHandler = null;
    testState.sendToHost.mockReset();
    testState.applyNetworkState.mockReset();
    testState.storeLocalReconnectCredential.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('sends the room-bound credential while the app is still in the lobby phase', () => {
    renderHook(() => useSecurePageRejoin());

    expect(testState.sendToHost).toHaveBeenCalledWith({
      type: 'reconnect',
      playerName: 'Trusted Player',
      playerId: 'player-1',
      reconnectToken: 'secure-token',
    });
  });

  it('waits for a connected status before sending', () => {
    testState.status = 'reconnecting';
    renderHook(() => useSecurePageRejoin());

    expect(testState.sendToHost).not.toHaveBeenCalled();

    testState.status = 'connected';
    act(() => testState.statusHandler?.('connected'));
    expect(testState.sendToHost).toHaveBeenCalledTimes(1);
  });

  it('applies authoritative state and stores a refreshed credential', () => {
    renderHook(() => useSecurePageRejoin());
    const gameState = { phase: 'playing' };
    const refreshedCredential = {
      type: 'reconnect-credential',
      roomCode: 'ROOM',
      playerId: 'player-1',
      playerName: 'Trusted Player',
      reconnectToken: 'rotated-token',
      timestamp: 200,
    };

    act(() => {
      testState.messageHandler?.(refreshedCredential, 'host-peer');
      testState.messageHandler?.({ type: 'state-sync', gameState }, 'host-peer');
    });

    expect(testState.storeLocalReconnectCredential).toHaveBeenCalledWith(refreshedCredential);
    expect(testState.applyNetworkState).toHaveBeenCalledWith(gameState);
  });

  it('retries a dropped reconnect message but caps the attempt count', () => {
    renderHook(() => useSecurePageRejoin());

    act(() => vi.advanceTimersByTime(30_000));
    expect(testState.sendToHost).toHaveBeenCalledTimes(10);
  });

  it('does nothing without a matching credential', () => {
    testState.credential = null;
    renderHook(() => useSecurePageRejoin());

    act(() => vi.advanceTimersByTime(10_000));
    expect(testState.sendToHost).not.toHaveBeenCalled();
    expect(testState.messageHandler).toBeNull();
  });
});
