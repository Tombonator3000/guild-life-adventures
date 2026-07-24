import { describe, expect, it, vi } from 'vitest';
import type { SerializedGameState } from './types';
import { handleGameplayReconnect } from './gameplayReconnect';

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
  it('accepts a known peer, clears its disconnected marker and sends authoritative state', () => {
    const registry = createRegistry();
    const disconnectedPeerIds = new Set(['peer-one']);

    const result = handleGameplayReconnect({
      registry,
      fromPeerId: 'peer-one',
      claimedPlayerName: 'Spoofed Name',
      gameState,
      disconnectedPeerIds,
    });

    expect(result).toEqual({
      accepted: true,
      playerId: 'player-1',
      playerName: 'Trusted Player',
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

  it('uses the claimed name only when the registry has no trusted display name', () => {
    const registry = createRegistry({ playerName: null });

    const result = handleGameplayReconnect({
      registry,
      fromPeerId: 'peer-one',
      claimedPlayerName: 'Fallback Player',
      gameState,
      disconnectedPeerIds: new Set(),
    });

    expect(result.playerName).toBe('Fallback Player');
    expect(registry.broadcast).toHaveBeenCalledWith({
      type: 'player-reconnected',
      playerName: 'Fallback Player',
    });
  });

  it('rejects an unknown peer without leaking state or trusting the claimed name', () => {
    const registry = createRegistry({ playerId: null });
    const disconnectedPeerIds = new Set(['peer-new']);

    const result = handleGameplayReconnect({
      registry,
      fromPeerId: 'peer-new',
      claimedPlayerName: 'Existing Player',
      gameState,
      disconnectedPeerIds,
    });

    expect(result).toEqual({ accepted: false, playerId: null, playerName: null });
    expect(disconnectedPeerIds.has('peer-new')).toBe(true);
    expect(registry.getPeerName).not.toHaveBeenCalled();
    expect(registry.sendTo).not.toHaveBeenCalled();
    expect(registry.broadcast).not.toHaveBeenCalled();
  });
});
