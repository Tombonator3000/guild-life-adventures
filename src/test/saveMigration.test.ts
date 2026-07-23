import { beforeEach, describe, expect, it } from 'vitest';
import { loadGame, normalizePlayer, normalizeSaveInPlace } from '@/data/saveLoad';
import { useGameStore } from '@/store/gameStore';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('save migration v10', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetForNewGame();
  });

  it('backfills nested player statistics without overwriting valid values', () => {
    const oldPlayer: Record<string, unknown> = {
      id: 'player-0',
      name: 'Old Hero',
      completedQuests: 7,
      gameStats: { totalGoldEarned: 123 },
    };

    normalizePlayer(oldPlayer);

    expect(oldPlayer.weeklySnapshots).toEqual([]);
    expect(oldPlayer.activeCurses).toEqual([]);
    expect(oldPlayer.equipmentDurability).toEqual({});
    expect(oldPlayer.backupOutfit).toBeNull();
    expect(oldPlayer.guildReputation).toBe(7);
    expect(oldPlayer.gameStats).toMatchObject({
      totalGoldEarned: 123,
      totalGoldSpent: 0,
      totalDungeonRuns: 0,
      locationVisits: {},
      deathCount: 0,
    });
  });

  it('normalizes persistent GameState collections', () => {
    const oldState: Record<string, unknown> = {
      players: [{ id: 'player-0', name: 'Old Hero' }],
      priceModifier: 1.1,
    };

    normalizeSaveInPlace(oldState);

    expect(oldState.locationHexes).toEqual([]);
    expect(oldState.weeklyNewsEvents).toEqual([]);
    expect(oldState.stockPriceHistory).toEqual({});
    expect(oldState.basePriceModifier).toBe(1.1);
    expect((oldState.players as Record<string, unknown>[])[0].gameStats).toBeDefined();
  });

  it('migrates a version 9 save to version 10', () => {
    localStorage.setItem('guild-life-save-1', JSON.stringify({
      version: 9,
      timestamp: Date.now(),
      slotName: 'Old Save',
      week: 12,
      playerNames: ['Old Hero'],
      gameState: {
        phase: 'playing',
        players: [{ id: 'player-0', name: 'Old Hero', completedQuests: 2 }],
        priceModifier: 1,
      },
    }));

    const migrated = loadGame(1);

    expect(migrated?.version).toBe(10);
    expect(migrated?.gameState.players[0].weeklySnapshots).toEqual([]);
    expect(migrated?.gameState.players[0].gameStats.totalGoldSpent).toBe(0);
    expect(migrated?.gameState.locationHexes).toEqual([]);
    expect(migrated?.gameState.weeklyNewsEvents).toEqual([]);
  });

  it('restores active location hexes and weekly news through save/load', () => {
    useGameStore.getState().startNewGame(['Tester'], false, goals);
    useGameStore.setState({
      locationHexes: [{
        id: 'hex-test',
        hexId: 'sealed-gate',
        casterId: 'player-0',
        casterName: 'Tester',
        targetLocation: 'bank',
        weeksRemaining: 2,
      }],
      weeklyNewsEvents: [{ type: 'eviction', playerName: 'Tester' }],
    });

    expect(useGameStore.getState().saveToSlot(1, 'Persistence Test')).toBe(true);
    useGameStore.setState({ locationHexes: [], weeklyNewsEvents: [] });

    expect(useGameStore.getState().loadFromSlot(1)).toBe(true);
    expect(useGameStore.getState().locationHexes).toHaveLength(1);
    expect(useGameStore.getState().locationHexes[0].targetLocation).toBe('bank');
    expect(useGameStore.getState().weeklyNewsEvents).toEqual([
      { type: 'eviction', playerName: 'Tester' },
    ]);
  });
});
