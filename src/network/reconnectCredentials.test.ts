import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearHostReconnectCredentials,
  clearLocalReconnectCredential,
  getHostPlayerName,
  getLocalReconnectCredential,
  issueHostReconnectCredential,
  resolveHostPlayerId,
  storeLocalReconnectCredential,
  validateAndRebindHostCredential,
} from './reconnectCredentials';

describe('reconnect credentials', () => {
  beforeEach(() => {
    clearHostReconnectCredentials();
    clearLocalReconnectCredential();
    vi.restoreAllMocks();
  });

  it('issues a random room-bound credential and resolves the original peer', () => {
    const credential = issueHostReconnectCredential({
      roomCode: 'ROOM',
      playerId: 'player-1',
      playerName: 'Trusted Player',
      peerId: 'peer-old',
    });

    expect(credential.reconnectToken).toMatch(/^[a-f0-9]{48}$/);
    expect(resolveHostPlayerId('peer-old', () => null)).toBe('player-1');
    expect(getHostPlayerName('player-1')).toBe('Trusted Player');
  });

  it('rebinds a valid credential to a new peer and revokes the old peer', () => {
    const credential = issueHostReconnectCredential({
      roomCode: 'ROOM',
      playerId: 'player-1',
      playerName: 'Trusted Player',
      peerId: 'peer-old',
    });

    expect(validateAndRebindHostCredential({
      roomCode: 'ROOM',
      playerId: 'player-1',
      reconnectToken: credential.reconnectToken,
      newPeerId: 'peer-new',
    })).toEqual({
      accepted: true,
      oldPeerId: 'peer-old',
      playerId: 'player-1',
      playerName: 'Trusted Player',
    });

    expect(resolveHostPlayerId('peer-old', () => 'fallback-player')).toBeNull();
    expect(resolveHostPlayerId('peer-new', () => null)).toBe('player-1');
  });

  it('rejects the wrong room, player or token without changing the current binding', () => {
    const credential = issueHostReconnectCredential({
      roomCode: 'ROOM',
      playerId: 'player-1',
      playerName: 'Trusted Player',
      peerId: 'peer-old',
    });

    const invalidAttempts = [
      { roomCode: 'OTHER', playerId: 'player-1', reconnectToken: credential.reconnectToken },
      { roomCode: 'ROOM', playerId: 'player-2', reconnectToken: credential.reconnectToken },
      { roomCode: 'ROOM', playerId: 'player-1', reconnectToken: 'wrong-token' },
    ];

    invalidAttempts.forEach(attempt => {
      expect(validateAndRebindHostCredential({
        ...attempt,
        newPeerId: 'peer-attacker',
      }).accepted).toBe(false);
    });

    expect(resolveHostPlayerId('peer-old', () => null)).toBe('player-1');
    expect(resolveHostPlayerId('peer-attacker', () => null)).toBeNull();
  });

  it('persists the local credential only for its room and expires stale storage', () => {
    const credential = issueHostReconnectCredential({
      roomCode: 'ROOM',
      playerId: 'player-1',
      playerName: 'Trusted Player',
      peerId: 'peer-old',
    });
    storeLocalReconnectCredential(credential);

    expect(getLocalReconnectCredential('ROOM')).toEqual(credential);
    expect(getLocalReconnectCredential('OTHER')).toBeNull();

    storeLocalReconnectCredential({
      ...credential,
      timestamp: Date.now() - 31 * 60 * 1000,
    });
    expect(getLocalReconnectCredential('ROOM')).toBeNull();
  });
});
