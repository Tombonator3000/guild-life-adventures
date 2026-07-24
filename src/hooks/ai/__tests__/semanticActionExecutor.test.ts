import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeAIAction, type StoreActions } from '../actionExecutor';
import type { AIAction } from '../types';
import { useGameStore } from '@/store/gameStore';
import { getJob } from '@/data/jobs';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

function preparePlayer(overrides: Record<string, unknown> = {}) {
  localStorage.clear();
  useGameStore.setState({ networkMode: 'local' });
  useGameStore.getState().resetForNewGame();
  useGameStore.getState().startNewGame(['Semantic AI'], false, goals);
  useGameStore.setState(state => ({
    players: state.players.map(player => ({ ...player, isAI: true, ...overrides })),
  }));
  return useGameStore.getState().players[0];
}

function execute(action: AIAction): boolean {
  const player = useGameStore.getState().players[0];
  return executeAIAction(player, action, useGameStore.getState() as unknown as StoreActions);
}

describe('AI semantic action execution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    preparePlayer();
  });

  it('uses canonical home relaxation instead of AI-provided time and effects', () => {
    preparePlayer({
      housing: 'slums',
      currentLocation: 'slums',
      timeRemaining: 20,
      happiness: 50,
      relaxation: 30,
    });

    const success = execute({
      type: 'rest',
      priority: 100,
      description: 'Manipulated rest',
      details: { hours: 1, happinessGain: 99, relaxGain: 99 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.timeRemaining).toBe(12);
    expect(player.happiness).toBe(53);
    expect(player.relaxation).toBe(35);
  });

  it('uses the canonical Minor Healing catalogue and host price modifier', () => {
    preparePlayer({
      currentLocation: 'enchanter',
      gold: 100,
      health: 50,
      maxHealth: 100,
      timeRemaining: 20,
    });
    useGameStore.setState({ priceModifier: 1.2 });

    const success = execute({
      type: 'heal',
      priority: 100,
      description: 'Manipulated healing',
      details: { cost: 1, healAmount: 99 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(70);
    expect(player.health).toBe(75);
    expect(player.timeRemaining).toBe(19);
  });

  it('uses the canonical cure service', () => {
    preparePlayer({
      currentLocation: 'enchanter',
      gold: 100,
      timeRemaining: 20,
      isSick: true,
    });

    const success = execute({
      type: 'cure-sickness',
      priority: 100,
      description: 'Cure illness',
      details: { cost: 1 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.isSick).toBe(false);
    expect(player.gold).toBe(25);
    expect(player.timeRemaining).toBe(18);
  });

  it('resolves work duration and wage from the host job state', () => {
    const job = getJob('shop-clerk');
    expect(job).toBeDefined();
    preparePlayer({
      currentJob: 'shop-clerk',
      currentWage: 7,
      currentLocation: 'general-store',
      clothingCondition: 100,
      gold: 0,
      timeRemaining: 60,
    });

    const success = execute({
      type: 'work',
      priority: 100,
      description: 'Manipulated shift',
      details: { hours: 1, wage: 999 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.timeRemaining).toBe(60 - job!.hoursPerShift);
    expect(player.gold).toBe(Math.floor(job!.hoursPerShift * 7 * 1.15));
  });

  it('resolves study price and duration from the host degree catalogue', () => {
    preparePlayer({
      currentLocation: 'academy',
      gold: 100,
      timeRemaining: 60,
    });
    useGameStore.setState({ priceModifier: 2 });

    const success = execute({
      type: 'study',
      priority: 100,
      description: 'Manipulated class',
      details: { degreeId: 'trade-guild', cost: 1, hours: 1 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(90);
    expect(player.timeRemaining).toBe(54);
    expect(player.degreeProgress['trade-guild']).toBe(1);
  });

  it('uses canonical graduation validation', () => {
    preparePlayer({
      currentLocation: 'academy',
      degreeProgress: { 'trade-guild': 10 },
    });

    const success = execute({
      type: 'graduate',
      priority: 100,
      description: 'Graduate',
      details: { degreeId: 'trade-guild' },
    });

    expect(success).toBe(true);
    expect(useGameStore.getState().players[0].completedDegrees).toContain('trade-guild');
  });

  it('preserves the AI raise attempt cost while validating the workplace', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    preparePlayer({
      currentJob: 'shop-clerk',
      currentWage: 7,
      currentLocation: 'general-store',
      shiftsWorkedSinceHire: 3,
      dependability: 100,
      timeRemaining: 10,
    });

    const success = execute({
      type: 'request-raise',
      priority: 100,
      description: 'Request raise',
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.timeRemaining).toBe(9);
    expect(player.currentWage).toBeGreaterThan(7);
    expect(player.raiseAttemptedThisTurn).toBe(true);
  });

  it('does not charge raise time away from the canonical workplace', () => {
    preparePlayer({
      currentJob: 'shop-clerk',
      currentWage: 7,
      currentLocation: 'academy',
      shiftsWorkedSinceHire: 3,
      dependability: 100,
      timeRemaining: 10,
    });

    const success = execute({
      type: 'request-raise',
      priority: 100,
      description: 'Request raise from wrong location',
    });

    expect(success).toBe(false);
    expect(useGameStore.getState().players[0].timeRemaining).toBe(10);
  });
});
