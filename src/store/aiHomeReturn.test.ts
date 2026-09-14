import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './gameStore';

const goals = { wealth: 5000, happiness: 100, education: 45, career: 75, adventure: 0 };

describe('finished opponents return home', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Tom'], true, goals);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(['slums', 'noble', 'homeless'] as const)('returns the last AI to %s home on week rollover, even with zero hours', housing => {
    useGameStore.setState(s => ({ currentPlayerIndex: 1, phase: 'playing',
      players: s.players.map((p, i) => i === 1 ? { ...p, currentLocation: 'academy', housing, gold: 1000, foodLevel: 100,
        timeRemaining: 0, weeksSinceRent: 0, rentPrepaidWeeks: 4 } : p) }));
    useGameStore.getState().endTurn();
    const s = useGameStore.getState();
    expect(s.week).toBe(2);
    expect(s.currentPlayerIndex).toBe(0);
    expect(s.players[1].currentLocation).toBe(housing === 'noble' ? 'noble-heights' : 'slums');
  });

  it('settles remaining work at the workplace before returning home', () => {
    useGameStore.setState(s => ({ phase: 'playing', currentPlayerIndex: 0,
      players: s.players.map((p, i) => i === 0 ? { ...p, isAI: true, currentLocation: 'guild-hall',
        currentJob: 'floor-sweeper', currentWage: 4, clothingCondition: 80, gold: 100, timeRemaining: 3 } : p) }));
    const before = useGameStore.getState().players;
    useGameStore.getState().performWorkShift(before[0].id, 'remaining');
    const expectedGold = useGameStore.getState().players[0].gold;
    useGameStore.setState({ players: before });
    useGameStore.getState().endTurn();
    const p = useGameStore.getState().players[0];
    expect(p.currentLocation).toBe('slums');
    expect(p.gold).toBe(expectedGold);
    expect(p.gold).toBeGreaterThan(100);
    expect(p.timeRemaining).toBe(0);
  });
});
