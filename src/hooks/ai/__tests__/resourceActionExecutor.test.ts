import { beforeEach, describe, expect, it } from 'vitest';
import { executeAIAction, type StoreActions } from '../actionExecutor';
import type { AIAction } from '../types';
import { useGameStore } from '@/store/gameStore';

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
  useGameStore.getState().startNewGame(['Resource AI'], false, goals);
  useGameStore.setState(state => ({
    priceModifier: 1,
    players: state.players.map(player => ({
      ...player,
      isAI: true,
      gold: 500,
      timeRemaining: 20,
      foodLevel: 20,
      clothingCondition: 10,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0];
}

function execute(action: AIAction): boolean {
  return executeAIAction(
    useGameStore.getState().players[0],
    action,
    useGameStore.getState() as unknown as StoreActions,
  );
}

describe('AI canonical resource purchases', () => {
  beforeEach(() => {
    preparePlayer();
  });

  it('buys General Store cheese at the host price and ignores fake food effects', () => {
    preparePlayer({ currentLocation: 'general-store', foodLevel: 20, gold: 100, timeRemaining: 10 });
    useGameStore.setState({ priceModifier: 1.2 });

    const success = execute({
      type: 'buy-food',
      priority: 100,
      description: 'Manipulated store food',
      details: { vendor: 'general-store', itemId: 'cheese', cost: 1, foodGain: 99 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(82);
    expect(player.foodLevel).toBe(35);
    expect(player.timeRemaining).toBe(9);
  });

  it('uses the Tavern stew catalogue and preserves one-hour AI shopping time', () => {
    preparePlayer({ currentLocation: 'rusty-tankard', foodLevel: 20, gold: 100, timeRemaining: 10 });

    const success = execute({
      type: 'buy-food',
      priority: 100,
      description: 'Buy tavern food',
      details: { cost: 1, foodGain: 99 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(88);
    expect(player.foodLevel).toBe(35);
    expect(player.timeRemaining).toBe(9);
  });

  it('uses the Shadow Market discount and canonical mystery-meat effect', () => {
    preparePlayer({ currentLocation: 'shadow-market', foodLevel: 20, gold: 100, timeRemaining: 10 });

    const success = execute({
      type: 'buy-food',
      priority: 100,
      description: 'Buy market food',
      details: { vendor: 'shadow-market', itemId: 'mystery-meat', cost: 99, foodGain: 99 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(96); // round(6 * 0.7)
    expect(player.foodLevel).toBe(30);
    expect(player.timeRemaining).toBe(9);
  });

  it('buys clothing only from the Armory catalogue', () => {
    preparePlayer({ currentLocation: 'armory', clothingCondition: 10, gold: 100, timeRemaining: 10 });
    useGameStore.setState({ priceModifier: 1.5 });

    const success = execute({
      type: 'buy-clothing',
      priority: 100,
      description: 'Buy manipulated clothing',
      details: { cost: 1, clothingGain: 35 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(82);
    expect(player.clothingCondition).toBe(35);
    expect(player.timeRemaining).toBe(9);
  });

  it('uses the canonical fresh-food item and storage rules', () => {
    preparePlayer({
      currentLocation: 'general-store',
      gold: 100,
      timeRemaining: 10,
      freshFood: 0,
      appliances: {
        'preservation-box': {
          itemId: 'preservation-box',
          originalPrice: 876,
          source: 'enchanter',
          isBroken: false,
          purchasedFirstTime: true,
        },
      },
    });

    const success = execute({
      type: 'buy-fresh-food',
      priority: 100,
      description: 'Buy fresh food',
      details: { itemId: 'fresh-vegetables', cost: 1, units: 99 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(88);
    expect(player.freshFood).toBe(2);
    expect(player.timeRemaining).toBe(9);
  });

  it('uses canonical ticket and lottery catalogues', () => {
    preparePlayer({ currentLocation: 'shadow-market', gold: 100, timeRemaining: 10, tickets: [], lotteryTickets: 0 });

    expect(execute({
      type: 'buy-ticket',
      priority: 100,
      description: 'Buy cheap fake bard ticket',
      details: { ticketType: 'bard-concert', cost: 1 },
    })).toBe(true);

    let player = useGameStore.getState().players[0];
    expect(player.gold).toBe(65); // round(50 * 0.7)
    expect(player.tickets).toContain('bard-concert');
    expect(player.timeRemaining).toBe(9);

    expect(execute({
      type: 'buy-lottery-ticket',
      priority: 50,
      description: 'Buy lottery ticket',
      details: { cost: 1 },
    })).toBe(true);

    player = useGameStore.getState().players[0];
    expect(player.gold).toBe(58); // round(10 * 0.7)
    expect(player.lotteryTickets).toBe(1);
    expect(player.timeRemaining).toBe(8);
  });

  it('does not charge shopping time when the canonical catalogue rejects the request', () => {
    preparePlayer({ currentLocation: 'general-store', gold: 100, timeRemaining: 10 });

    const success = execute({
      type: 'buy-clothing',
      priority: 100,
      description: 'Try to buy Armory clothing at General Store',
      details: { cost: 1, clothingGain: 90 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(false);
    expect(player.gold).toBe(100);
    expect(player.timeRemaining).toBe(10);
  });
});
