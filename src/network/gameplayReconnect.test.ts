import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerializedGameState } from './types';
import { handleGameplayReconnect } from './gameplayReconnect';
import {
  clearHostReconnectCredentials,
  issueHostReconnectCredential,
  resolveHostPlayerId,
} from './reconnectCredentials';

const gameState = { phase: 'playing' } as SerializedGameState;

function createRegistry({
  playerId = 'player-1',
  playerName = 'Trusted Player',
}: {
  playerId?: string | null;
  playerName?: string | null;
} = {}) {
  return {
    getPlayerIdForPeer: vi.fn(() => playerId),
    getPeerName: vi.fn(() => playerName),
    sendTo: vi.fn(),
    broadcast: vi.fn(),
  };
}

describe('handleGameplayReconnect', () => {
  beforeEach(() => clearHostReconnectCredentials());

  it('accepts a known peer, clears its disconnected marker and sends authoritative state', () => {
    const registry = createRegistry();
    const disconnectedPeerIds = new Set(['peer-one']);

    const result = handleGameplayReconnect({
      registry,
      fromPeerId: 'peer-one',
      claimedPlayerName: 'Spoofed Name',
      roomCode: 'ROOM',
      gameState,
      disconnectedPeerIds,
    });

    expect(result).toEqual({
      accepted: true,
      playerId: 'player-1',
      playerName: 'Trusted Player',
      oldPeerId: null,
    });
    expect(disconnectedPeerIds.has('peer-one')).toBe(false);
    expect(registry.sendTo).toHaveBeenCalledWith('peer-one', {
      type: 'state-sync',
      gameState,
    });
    expect(registry.broadcast).toHaveBeenCalledWith({
      type: 'player-reconnected',
      playerName: 'Trusted Player',
    });
  });

  it('securely rebinds a new PeerJS id and clears the old zombie marker', () => {
    const registry = createRegistry({ playerId: null, playerName: null });
    const credential = issueHostReconnectCredential({
      roomCode: 'ROOM',
      playerId: 'player-1',
      playerName: 'Trusted Player',
      peerId: 'peer-old',
    });
    const disconnectedPeerIds = new Set(['peer-old', 'peer-new']);

    const result = handleGameplayReconnect({
      registry,
      fromPeerId: 'peer-new',
      claimedPlayerName: 'Spoofed Name',
      requestedPlayerId: 'player-1',
      reconnectToken: credential.reconnectToken,
      roomCode: 'ROOM',
      gameState,
      disconnectedPeerIds,
    });

    expect(result).toEqual({
      accepted: true,
      playerId: 'player-1',
      playerName: 'Trusted Player',
      oldPeerId: 'peer-old',
    });
    expect(disconnectedPeerIds.size).toBe(0);
    expect(resolveHostPlayerId('peer-old', () => 'stale-player')).toBeNull();
    expect(resolveHostPlayerId('peer-new', () => null)).toBe('player-1');
  });

  it('uses the claimed name only when neither credentials nor registry have a trusted name', () => {
    const registry = createRegistry({ playerName: null });

    const result = handleGameplayReconnect({
      registry,
      fromPeerId: 'peer-one',
      claimedPlayerName: 'Fallback Player',
      roomCode: 'ROOM',
      gameState,
      disconnectedPeerIds: new Set(),
    });

    expect(result.playerName).toBe('Fallback Player');
    expect(registry.broadcast).toHaveBeenCalledWith({
      type: 'player-reconnected',
      playerName: 'Fallback Player',
    });
  });

  it('rejects an unknown peer with invalid credentials without leaking state', () => {
    const registry = createRegistry({ playerId: null });
    const disconnectedPeerIds = new Set(['peer-new']);

    const result = handleGameplayReconnect({
      registry,
      fromPeerId: 'peer-new',
      claimedPlayerName: 'Existing Player',
      requestedPlayerId: 'player-1',
      reconnectToken: 'invalid-token',
      roomCode: 'ROOM',
      gameState,
      disconnectedPeerIds,
    });

    expect(result).toEqual({
      accepted: false,
      playerId: null,
      playerName: null,
      oldPeerId: null,
    });
    expect(disconnectedPeerIds.has('peer-new')).toBe(true);
    expect(registry.getPeerName).not.toHaveBeenCalled();
    expect(registry.sendTo).not.toHaveBeenCalled();
    expect(registry.broadcast).not.toHaveBeenCalled();
  });
});
