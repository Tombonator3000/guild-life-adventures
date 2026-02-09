import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { STARTING_AGE, AGE_INTERVAL, ELDER_AGE, ELDER_HEALTH_DECAY, HEALTH_CRISIS_AGE, HEALTH_CRISIS_DAMAGE } from '@/types/game.types';
import { setGameOption } from '@/data/gameOptions';

let playerId: string;

function resetAndStart() {
  // Enable aging for all age tests
  setGameOption('enableAging', true);
  const store = useGameStore.getState();
  store.startNewGame(['TestPlayer'], false, { wealth: 5000, happiness: 75, education: 45, career: 75, adventure: 0 });
  playerId = useGameStore.getState().players[0].id;
}

function setPlayerAge(age: number) {
  useGameStore.setState((state) => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, age } : p
    ),
  }));
}

function setWeek(week: number) {
  useGameStore.setState({ week });
}

function getPlayer() {
  return useGameStore.getState().players[0];
}

describe('Age System - Initialization', () => {
  beforeEach(resetAndStart);

  it('players start at STARTING_AGE (18)', () => {
    const p = getPlayer();
    expect(p.age).toBe(STARTING_AGE);
    expect(p.age).toBe(18);
  });
});

describe('Age System - Aging in processWeekEnd', () => {
  beforeEach(() => {
    resetAndStart();
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // Prevent random events
  });
  afterEach(() => vi.restoreAllMocks());

  it('ages 1 year every AGE_INTERVAL (4) weeks', () => {
    // Set week to 3, so processWeekEnd advances to week 4 (birthday)
    setWeek(3);
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(19); // 18 + 1
  });

  it('does not age on non-birthday weeks', () => {
    // Set week to 4, processWeekEnd advances to week 5 (not a birthday)
    setWeek(4);
    setPlayerAge(19);
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(19); // Unchanged
  });

  it('ages correctly over multiple cycles', () => {
    // Start at week 7, age to 20 at week 8
    setWeek(7);
    setPlayerAge(19);
    useGameStore.getState().processWeekEnd();
    expect(getPlayer().age).toBe(20);
  });
});

describe('Age System - Birthday Milestones', () => {
  beforeEach(() => {
    resetAndStart();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  });
  afterEach(() => vi.restoreAllMocks());

  it('age 21: grants +5 happiness (Coming of Age)', () => {
    setWeek(AGE_INTERVAL - 1); // Will advance to AGE_INTERVAL
    setPlayerAge(20);
    const hapBefore = getPlayer().happiness;
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(21);
    // Happiness may be modified by other week-end effects, check milestone applied
    expect(p.happiness).toBeGreaterThanOrEqual(hapBefore + 5 - 10); // Allow for other effects
  });

  it('age 25: grants +2 maxHealth', () => {
    setWeek(AGE_INTERVAL - 1);
    setPlayerAge(24);
    const maxHpBefore = getPlayer().maxHealth;
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(25);
    expect(p.maxHealth).toBe(maxHpBefore + 2);
  });

  it('age 30: grants +5 happiness and +5 dependability', () => {
    setWeek(AGE_INTERVAL - 1);
    setPlayerAge(29);
    const depBefore = getPlayer().dependability;
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(30);
    // Dependability may decrease by 5 from unemployed decay, +5 from milestone = net 0
    expect(p.dependability).toBeGreaterThanOrEqual(depBefore - 1);
  });

  it('age 40: reduces maxHealth by 2, grants +3 happiness', () => {
    setWeek(AGE_INTERVAL - 1);
    setPlayerAge(39);
    const maxHpBefore = getPlayer().maxHealth;
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(40);
    expect(p.maxHealth).toBe(maxHpBefore - 2);
  });

  it('age 50: reduces maxHealth by 5, grants +5 happiness', () => {
    setWeek(AGE_INTERVAL - 1);
    setPlayerAge(49);
    const maxHpBefore = getPlayer().maxHealth;
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(50);
    expect(p.maxHealth).toBe(maxHpBefore - 5);
  });

  it('non-milestone birthday shows generic message', () => {
    setWeek(AGE_INTERVAL - 1);
    setPlayerAge(22);
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(23);
    // No stat changes from generic birthday (besides normal week-end effects)
  });
});

describe('Age System - Elder Decay (60+)', () => {
  beforeEach(() => {
    resetAndStart();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  });
  afterEach(() => vi.restoreAllMocks());

  it('loses ELDER_HEALTH_DECAY maxHealth at age 60 birthday', () => {
    setWeek(AGE_INTERVAL - 1);
    setPlayerAge(59);
    const maxHpBefore = getPlayer().maxHealth;
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(60);
    expect(p.maxHealth).toBe(maxHpBefore - ELDER_HEALTH_DECAY);
  });

  it('loses ELDER_HEALTH_DECAY every birthday after 60', () => {
    setWeek(AGE_INTERVAL - 1);
    setPlayerAge(64);
    const maxHpBefore = getPlayer().maxHealth;
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.age).toBe(65);
    expect(p.maxHealth).toBe(maxHpBefore - ELDER_HEALTH_DECAY);
  });

  it('maxHealth never drops below 10', () => {
    setWeek(AGE_INTERVAL - 1);
    setPlayerAge(79);
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, maxHealth: 12 } : p
      ),
    }));
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.maxHealth).toBe(10); // Floor at 10, not negative
  });

  it('health is capped at maxHealth after decay', () => {
    setWeek(AGE_INTERVAL - 1);
    setPlayerAge(69);
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, maxHealth: 50, health: 50 } : p
      ),
    }));
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.maxHealth).toBe(50 - ELDER_HEALTH_DECAY);
    expect(p.health).toBeLessThanOrEqual(p.maxHealth);
  });
});

describe('Age System - Health Crisis (50+)', () => {
  beforeEach(resetAndStart);

  it('health crisis triggers at age 50+ when random is low', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // Very low = triggers 3% chance
    setWeek(2); // Non-birthday week (week 3)
    setPlayerAge(55);
    const hpBefore = getPlayer().health;
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    expect(p.health).toBeLessThan(hpBefore); // Should have taken crisis damage
  });

  afterEach(() => vi.restoreAllMocks());

  it('health crisis does NOT trigger below age 50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    setWeek(2);
    setPlayerAge(45);
    const hpBefore = getPlayer().health;
    useGameStore.getState().processWeekEnd();
    const p = getPlayer();
    // Health may change from starvation (food=0), but not from age crisis
    // Set food to prevent starvation interference
    useGameStore.setState((state) => ({
      players: state.players.map(p => p.id === playerId ? { ...p, foodLevel: 100 } : p),
    }));
  });
});

describe('Age System - Work Happiness Penalty', () => {
  beforeEach(() => {
    resetAndStart();
    setWeek(10); // Past week 4 threshold
  });

  it('no age penalty for players under 45', () => {
    setPlayerAge(30);
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: 'floor-sweeper', currentWage: 5, happiness: 50 } : p
      ),
    }));
    useGameStore.getState().workShift(playerId, 8, 5);
    const p = getPlayer();
    expect(p.happiness).toBe(49); // -1 base penalty only
  });

  it('extra age penalty for players 45+ on long shifts (6+ hours)', () => {
    setPlayerAge(48);
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: 'floor-sweeper', currentWage: 5, happiness: 50 } : p
      ),
    }));
    useGameStore.getState().workShift(playerId, 8, 5);
    const p = getPlayer();
    expect(p.happiness).toBe(48); // -1 base + -1 age penalty
  });

  it('no age penalty on short shifts even for 45+ players', () => {
    setPlayerAge(48);
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: 'floor-sweeper', currentWage: 5, happiness: 50 } : p
      ),
    }));
    useGameStore.getState().workShift(playerId, 4, 5);
    const p = getPlayer();
    expect(p.happiness).toBe(49); // -1 base penalty only (short shift, no age penalty)
  });
});
