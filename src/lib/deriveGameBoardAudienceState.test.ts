import { describe, expect, it } from 'vitest';
import type { Player } from '@/types/game.types';
import { deriveGameBoardAudienceState } from './deriveGameBoardAudienceState';

const createPlayer = (
  id: string,
  { isAI = false, isGameOver = false }: { isAI?: boolean; isGameOver?: boolean } = {},
) => ({ id, isAI, isGameOver } as Player);

describe('deriveGameBoardAudienceState', () => {
  it('treats the current player as local in an offline game', () => {
    const currentPlayer = createPlayer('local-player');

    expect(deriveGameBoardAudienceState({
      players: [currentPlayer],
      currentPlayer,
      localPlayerId: null,
      isOnline: false,
      phase: 'playing',
    })).toEqual({
      isLocalPlayerTurn: true,
      isWaitingForOtherPlayer: false,
      localPlayer: currentPlayer,
      isPureSpectator: false,
      isSpectating: false,
    });
  });

  it('recognizes the local online player and their turn', () => {
    const localPlayer = createPlayer('local-player');
    const otherPlayer = createPlayer('other-player');

    const result = deriveGameBoardAudienceState({
      players: [localPlayer, otherPlayer],
      currentPlayer: localPlayer,
      localPlayerId: localPlayer.id,
      isOnline: true,
      phase: 'playing',
    });

    expect(result.isLocalPlayerTurn).toBe(true);
    expect(result.isWaitingForOtherPlayer).toBe(false);
    expect(result.localPlayer).toBe(localPlayer);
  });

  it('waits for another online human but not for an AI turn', () => {
    const localPlayer = createPlayer('local-player');
    const remoteHuman = createPlayer('remote-human');
    const remoteAI = createPlayer('remote-ai', { isAI: true });

    expect(deriveGameBoardAudienceState({
      players: [localPlayer, remoteHuman, remoteAI],
      currentPlayer: remoteHuman,
      localPlayerId: localPlayer.id,
      isOnline: true,
      phase: 'playing',
    }).isWaitingForOtherPlayer).toBe(true);

    expect(deriveGameBoardAudienceState({
      players: [localPlayer, remoteHuman, remoteAI],
      currentPlayer: remoteAI,
      localPlayerId: localPlayer.id,
      isOnline: true,
      phase: 'playing',
    }).isWaitingForOtherPlayer).toBe(false);
  });

  it('marks an online client without a player id as a pure spectator', () => {
    const currentPlayer = createPlayer('remote-human');

    const result = deriveGameBoardAudienceState({
      players: [currentPlayer],
      currentPlayer,
      localPlayerId: null,
      isOnline: true,
      phase: 'playing',
    });

    expect(result.localPlayer).toBeUndefined();
    expect(result.isPureSpectator).toBe(true);
    expect(result.isSpectating).toBe(true);
  });

  it('moves an eliminated local player into spectator mode while someone survives', () => {
    const eliminatedLocal = createPlayer('local-player', { isGameOver: true });
    const survivor = createPlayer('survivor');

    expect(deriveGameBoardAudienceState({
      players: [eliminatedLocal, survivor],
      currentPlayer: survivor,
      localPlayerId: eliminatedLocal.id,
      isOnline: true,
      phase: 'playing',
    }).isSpectating).toBe(true);
  });

  it('does not mark an eliminated player as spectating outside active play', () => {
    const eliminatedLocal = createPlayer('local-player', { isGameOver: true });
    const survivor = createPlayer('survivor');

    expect(deriveGameBoardAudienceState({
      players: [eliminatedLocal, survivor],
      currentPlayer: survivor,
      localPlayerId: eliminatedLocal.id,
      isOnline: true,
      phase: 'victory',
    }).isSpectating).toBe(false);
  });

  it('does not use eliminated-player spectator mode when everyone is out', () => {
    const eliminatedLocal = createPlayer('local-player', { isGameOver: true });
    const eliminatedOther = createPlayer('other-player', { isGameOver: true });

    expect(deriveGameBoardAudienceState({
      players: [eliminatedLocal, eliminatedOther],
      currentPlayer: eliminatedOther,
      localPlayerId: eliminatedLocal.id,
      isOnline: true,
      phase: 'playing',
    }).isSpectating).toBe(false);
  });
});
