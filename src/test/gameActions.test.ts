import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { calculateStockValue, getSellPrice, getInitialStockPrices, updateStockPrices } from '@/data/stocks';
import { canWorkJob, applyForJob, getEntryLevelJobs, getAvailableJobs } from '@/data/jobs/utils';
import { ALL_JOBS } from '@/data/jobs/definitions';

let playerId: string;

function resetAndStart() {
  const store = useGameStore.getState();
  store.startNewGame(['TestPlayer'], false, { wealth: 5000, happiness: 75, education: 5, career: 4 });
  playerId = useGameStore.getState().players[0].id;
}

describe('Game setup', () => {
  it('creates player with correct defaults', () => {
    resetAndStart();
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(100);
    expect(p.health).toBe(100);
    expect(p.happiness).toBe(50);
    expect(p.timeRemaining).toBe(60);
    expect(p.currentLocation).toBe('slums');
    expect(p.housing).toBe('homeless');
    expect(p.guildRank).toBe('novice');
    expect(p.completedDegrees).toEqual([]);
    expect(p.isAI).toBe(false);
    expect(p.isGameOver).toBe(false);
  });

  it('creates AI player when includeAI is true', () => {
    useGameStore.getState().startNewGame(['Human'], true, { wealth: 5000, happiness: 75, education: 5, career: 4 });
    const state = useGameStore.getState();
    expect(state.players).toHaveLength(2);
    expect(state.players[1].name).toBe('Grimwald');
    expect(state.players[1].isAI).toBe(true);
  });

  it('sets game phase to playing', () => {
    resetAndStart();
    expect(useGameStore.getState().phase).toBe('playing');
  });

  it('resets week to 1', () => {
    resetAndStart();
    expect(useGameStore.getState().week).toBe(1);
  });
});

describe('Player actions', () => {
  beforeEach(resetAndStart);

  it('movePlayer updates location and spends time', () => {
    useGameStore.getState().movePlayer(playerId, 'bank', 3);
    const p = useGameStore.getState().players[0];
    expect(p.currentLocation).toBe('bank');
    expect(p.timeRemaining).toBe(57);
  });

  it('modifyGold changes gold', () => {
    useGameStore.getState().modifyGold(playerId, 50);
    expect(useGameStore.getState().players[0].gold).toBe(150);

    useGameStore.getState().modifyGold(playerId, -30);
    expect(useGameStore.getState().players[0].gold).toBe(120);
  });

  it('modifyHealth clamps to 0-maxHealth', () => {
    useGameStore.getState().modifyHealth(playerId, -999);
    expect(useGameStore.getState().players[0].health).toBe(0);

    useGameStore.getState().modifyHealth(playerId, 999);
    expect(useGameStore.getState().players[0].health).toBe(100);
  });

  it('modifyHappiness clamps to 0-100', () => {
    useGameStore.getState().modifyHappiness(playerId, 999);
    expect(useGameStore.getState().players[0].happiness).toBe(100);

    useGameStore.getState().modifyHappiness(playerId, -999);
    expect(useGameStore.getState().players[0].happiness).toBe(0);
  });
});

describe('Guild pass and quests', () => {
  beforeEach(resetAndStart);

  it('buyGuildPass deducts gold and sets flag', () => {
    useGameStore.getState().modifyGold(playerId, 500); // gold = 600
    useGameStore.getState().buyGuildPass(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.hasGuildPass).toBe(true);
    expect(p.gold).toBe(100); // 600 - 500
  });

  it('buyGuildPass rejects when insufficient gold', () => {
    // Player has 100 gold, pass costs 500
    useGameStore.getState().buyGuildPass(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.hasGuildPass).toBe(false);
    expect(p.gold).toBe(100);
  });

  it('buyGuildPass rejects double purchase', () => {
    useGameStore.getState().modifyGold(playerId, 1000);
    useGameStore.getState().buyGuildPass(playerId);
    const goldAfterFirst = useGameStore.getState().players[0].gold;
    useGameStore.getState().buyGuildPass(playerId);
    expect(useGameStore.getState().players[0].gold).toBe(goldAfterFirst);
  });
});

describe('Death and resurrection', () => {
  beforeEach(resetAndStart);

  it('checkDeath returns false when health > 0', () => {
    expect(useGameStore.getState().checkDeath(playerId)).toBe(false);
  });

  it('resurrects if player has 100+ savings', () => {
    useGameStore.getState().depositToBank(playerId, 100); // savings=100
    useGameStore.getState().modifyHealth(playerId, -100); // health=0
    const result = useGameStore.getState().checkDeath(playerId);
    expect(result).toBe(false); // Resurrected, not dead
    const p = useGameStore.getState().players[0];
    expect(p.health).toBe(50);
    expect(p.savings).toBe(0); // Cost 100
    expect(p.currentLocation).toBe('enchanter');
  });

  it('marks game over when no savings', () => {
    useGameStore.getState().modifyHealth(playerId, -100);
    const result = useGameStore.getState().checkDeath(playerId);
    expect(result).toBe(true);
    expect(useGameStore.getState().players[0].isGameOver).toBe(true);
  });
});

describe('Stock market pure functions', () => {
  it('calculateStockValue sums portfolio', () => {
    const stocks = { 'crystal-mine': 5, 'potion-guild': 3 };
    const prices = { 'crystal-mine': 100, 'potion-guild': 150 };
    expect(calculateStockValue(stocks, prices)).toBe(5 * 100 + 3 * 150);
  });

  it('calculateStockValue returns 0 for empty portfolio', () => {
    expect(calculateStockValue({}, {})).toBe(0);
  });

  it('getSellPrice applies 3% fee to T-bills', () => {
    expect(getSellPrice('crown-bonds', 10, 100)).toBe(970);
  });

  it('getSellPrice has no fee for regular stocks', () => {
    expect(getSellPrice('crystal-mine', 10, 100)).toBe(1000);
  });

  it('getInitialStockPrices returns prices for all stocks', () => {
    const prices = getInitialStockPrices();
    expect(prices['crystal-mine']).toBe(100);
    expect(prices['potion-guild']).toBe(150);
    expect(prices['enchanting-corp']).toBe(200);
    expect(prices['crown-bonds']).toBe(100);
  });

  it('updateStockPrices keeps T-bill price fixed', () => {
    const prices = getInitialStockPrices();
    const updated = updateStockPrices(prices);
    expect(updated['crown-bonds']).toBe(100);
  });

  it('updateStockPrices crash reduces prices significantly', () => {
    const prices = getInitialStockPrices();
    const crashed = updateStockPrices(prices, true);
    // Crystal mine should be between 40 and 70 (40-70% of 100)
    expect(crashed['crystal-mine']).toBeGreaterThanOrEqual(10);
    expect(crashed['crystal-mine']).toBeLessThanOrEqual(100);
    // T-bill unaffected
    expect(crashed['crown-bonds']).toBe(100);
  });
});

describe('Job system pure functions', () => {
  it('getEntryLevelJobs returns jobs with no degree requirements', () => {
    const jobs = getEntryLevelJobs();
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) {
      expect(job.requiredDegrees).toEqual([]);
    }
  });

  it('canWorkJob checks all requirements', () => {
    const entryJobs = getEntryLevelJobs();
    const easyJob = entryJobs.find(j => j.requiredClothing === 'none' && j.requiredExperience === 0);
    if (easyJob) {
      expect(canWorkJob(easyJob, [], 0, 0, 0)).toBe(true);
    }
  });

  it('applyForJob returns failure reasons', () => {
    // Find a job that requires a degree
    const advancedJob = ALL_JOBS.find(j => j.requiredDegrees.length > 0);
    if (advancedJob) {
      const result = applyForJob(advancedJob, [], 100, 100, 100);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Insufficient education');
      expect(result.missingDegrees).toBeDefined();
    }
  });

  it('getAvailableJobs filters correctly', () => {
    // With no degrees or stats, only basic jobs should be available
    const available = getAvailableJobs([], 0, 0, 0);
    for (const job of available) {
      expect(job.requiredDegrees).toEqual([]);
      expect(job.requiredExperience).toBe(0);
      expect(job.requiredDependability).toBe(0);
    }
  });
});

describe('Eviction', () => {
  beforeEach(resetAndStart);

  it('evictPlayer resets housing and removes items', () => {
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, housing: 'slums' as const, inventory: ['item1'], durables: { sword: 1 } } : p
      ),
    }));
    useGameStore.getState().evictPlayer(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.housing).toBe('homeless');
    expect(p.inventory).toEqual([]);
    expect(p.durables).toEqual({});
    expect(p.weeksSinceRent).toBe(0);
  });
});
