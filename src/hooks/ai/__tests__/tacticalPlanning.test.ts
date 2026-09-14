import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import type { Player } from '@/types/game.types';
import { DEGREES } from '@/data/education';
import { generateActions } from '../actionGenerator';
import { DIFFICULTY_SETTINGS, type CommitmentPlan } from '../types';
import { generateCommitmentPlan, getCommitmentBonus } from '../commitmentPlan';
import { calculateGoalProgress, getBestDungeonFloor } from '../strategy';
import { resetVelocityData } from '../goalVelocityTracker';
import { executeAIAction } from '../actionExecutor';
import { selectAIStoreActions } from '../storeActions';
import { getEssentialReserve } from '../tacticalPlanning';

const goals = { wealth: 2000, happiness: 75, education: 18, career: 50, adventure: 0 };
const hard = { ...DIFFICULTY_SETTINGS.hard, mistakeChance: 0 };

function configure(overrides: Partial<Player> = {}, priceModifier = 1) {
  useGameStore.setState(s => ({
    phase: 'playing', currentPlayerIndex: 1, week: 1, priceModifier, weather: null,
    players: s.players.map((p, i) => i === 1 ? {
      ...p, gold: 500, foodLevel: 80, health: 100, happiness: 60,
      clothingCondition: 90, relaxation: 40, currentLocation: 'academy',
      timeRemaining: 60, weeksSinceRent: 0, ...overrides,
    } : p),
  }));
  return useGameStore.getState().players[1];
}
function decisions(player: Player) {
  const s = useGameStore.getState();
  return generateActions(player, goals, hard, s.week, s.priceModifier, s.stockPrices);
}

describe('production AI tactical decisions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Tom'], true, goals, 'hard');
    resetVelocityData();
  });
  afterEach(() => vi.restoreAllMocks());

  it('buys enough food for next week before a merchant works another shift', () => {
    const p = configure({ id: 'ai-thornwick', currentLocation: 'rusty-tankard', currentJob: 'dishwasher', currentWage: 6, foodLevel: 30 });
    const best = decisions(p)[0];
    expect(best.type).toBe('buy-food');
    expect(executeAIAction(p, best, selectAIStoreActions(useGameStore.getState()))).toBe(true);
    expect(useGameStore.getState().players[1].foodLevel).toBeGreaterThan(35);
  });

  it('does not travel for a class it cannot afford at the current price', () => {
    const p = configure({ currentLocation: 'guild-hall', gold: 5, currentJob: 'floor-sweeper' }, 2);
    expect(decisions(p).some(a => a.type === 'move' && a.location === 'academy')).toBe(false);
  });

  it('never offers inaccessible degree prerequisites at the academy', () => {
    const p = configure({ currentJob: 'floor-sweeper', currentWage: 4, completedDegrees: [] });
    const studies = decisions(p).filter(a => a.type === 'study');
    expect(studies.length).toBeGreaterThan(0);
    for (const action of studies) {
      const degree = DEGREES[action.details!.degreeId as keyof typeof DEGREES];
      expect(degree.prerequisites).toEqual([]);
    }
  });

  it('graduates with study aids at the actual nine-session threshold', () => {
    const p = configure({ durables: { encyclopedia: 1, dictionary: 1, atlas: 1 }, degreeProgress: { 'trade-guild': 9 } });
    const best = decisions(p)[0];
    expect(best.type).toBe('graduate');
    expect(best.details?.degreeId).toBe('trade-guild');
    expect(executeAIAction(p, best, selectAIStoreActions(useGameStore.getState()))).toBe(true);
    expect(useGameStore.getState().players[1].completedDegrees).toContain('trade-guild');
  });

  it('does not head to academy when travel leaves too little time for class', () => {
    const p = configure({ currentLocation: 'cave', timeRemaining: 6 });
    expect(decisions(p).some(a => a.type === 'move' && a.location === 'academy')).toBe(false);
  });

  it('uses a legal short shift instead of attempting a full shift with three hours', () => {
    const p = configure({ currentLocation: 'guild-hall', currentJob: 'floor-sweeper', currentWage: 4, gold: 30, timeRemaining: 3 });
    const best = decisions(p)[0];
    expect(best.type).toBe('work');
    expect(best.details?.mode).toBe('remaining');
    expect(executeAIAction(p, best, selectAIStoreActions(useGameStore.getState()))).toBe(true);
    expect(useGameStore.getState().players[1].timeRemaining).toBe(0);
    expect(useGameStore.getState().players[1].gold).toBeGreaterThan(p.gold);
  });

  it('goes home and closes the happiness goal instead of accumulating more wealth', () => {
    let p = configure({ currentLocation: 'bank', currentJob: 'floor-sweeper', currentWage: 4,
      gold: 2500, dependability: 60, completedDegrees: ['trade-guild', 'junior-academy'], happiness: 65, timeRemaining: 20 });
    const move = decisions(p)[0];
    expect(move.type).toBe('move');
    expect(move.location).toBe('slums');
    expect(executeAIAction(p, move, selectAIStoreActions(useGameStore.getState()))).toBe(true);
    p = useGameStore.getState().players[1];
    expect(decisions(p)[0].type).toBe('end-turn');
    useGameStore.getState().endTurn();
    expect(useGameStore.getState().winner).toBe(p.id);
  });

  it('keeps cash for upcoming rent when depositing at the bank', () => {
    const p = configure({ currentLocation: 'bank', gold: 300, weeksSinceRent: 3, lockedRent: 150 });
    for (const deposit of decisions(p).filter(a => a.type === 'deposit-bank')) {
      expect(p.gold - Number(deposit.details?.amount)).toBeGreaterThanOrEqual(getEssentialReserve(p, 1));
    }
    expect(decisions(p)[0].location).toBe('landlord');
  });

  it('does not generate a new wealth sprint for an already completed goal', () => {
    const p = configure({ gold: 3000, housing: 'noble' });
    const plan = generateCommitmentPlan(p, calculateGoalProgress(p, goals), hard, 1);
    expect(plan?.type).not.toBe('wealth-sprint');
  });

  it('applies degree commitment to that degree, not arbitrary study or travel', () => {
    const plan: CommitmentPlan = { type: 'earn-degree', playerId: 'ai-grimwald', targetId: 'trade-guild',
      description: 'Finish trade degree', startTurn: 1, maxDuration: 4, alignedActions: ['study', 'move'], priorityBonus: 25 };
    expect(getCommitmentBonus(plan, { type: 'study', priority: 1, description: '', details: { degreeId: 'trade-guild' } })).toBe(25);
    expect(getCommitmentBonus(plan, { type: 'study', priority: 1, description: '', details: { degreeId: 'junior-academy' } })).toBe(0);
    expect(getCommitmentBonus(plan, 'move')).toBe(0);
  });

  it('a merchant follows an affordable degree plan instead of grinding the same job forever', () => {
    const p = configure({ id: 'ai-thornwick', currentLocation: 'guild-hall', currentJob: 'floor-sweeper', currentWage: 4 });
    const plan: CommitmentPlan = { type: 'earn-degree', playerId: p.id, targetId: 'junior-academy',
      description: 'Qualify for better work', startTurn: 1, maxDuration: 4, alignedActions: ['study', 'graduate', 'move'], priorityBonus: 25 };
    const best = generateActions(p, goals, hard, 1, 1, {}, plan)[0];
    expect(best.type).toBe('move');
    expect(best.location).toBe('academy');
    expect(best.details?.nextActionDetails).toMatchObject({ degreeId: 'junior-academy' });
  });

  it('planning does not mutate player resources or commit projected travel', () => {
    const p = configure();
    const before = JSON.stringify(useGameStore.getState().players);
    decisions(p);
    expect(JSON.stringify(useGameStore.getState().players)).toBe(before);
  });

  it('does not keep attempting a dungeon after both entries have been used', () => {
    const p = configure({ currentLocation: 'cave', completedDegrees: ['trade-guild'], dungeonFloorsCleared: [1],
      equippedWeapon: 'dagger', dungeonAttemptsThisTurn: 2 });
    expect(getBestDungeonFloor(p, hard)).toBeNull();
    expect(decisions(p).some(a => a.type === 'explore-dungeon')).toBe(false);
  });

  it('executes rival sabotage through the canonical option and price', () => {
    const p = configure({ currentLocation: 'fence' }, 2);
    useGameStore.setState(s => ({ players: s.players.map((r, i) => i === 0
      ? { ...r, gold: 1800, timeRemaining: 60 } : r) }));
    const action = decisions(p).find(a => a.type === 'sabotage-player');
    expect(action?.details).toMatchObject({ optionId: 'pickpocket', cost: 100, hours: 1 });
    expect(executeAIAction(p, action!, selectAIStoreActions(useGameStore.getState()))).toBe(true);
    expect(useGameStore.getState().players[0].gold).toBe(1770);
    expect(useGameStore.getState().players[1].gold).toBe(p.gold - 100);
    expect(useGameStore.getState().players[1].timeRemaining).toBe(p.timeRemaining - 1);
  });
});
