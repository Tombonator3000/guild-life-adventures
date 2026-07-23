import { beforeEach, describe, expect, it } from 'vitest';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';
import { useGameStore } from '@/store/gameStore';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

function preparePlayer(overrides: Record<string, unknown> = {}) {
  useGameStore.setState(state => ({
    stockPrices: {
      ...state.stockPrices,
      'crystal-mine': 125,
      'crown-bonds': 100,
    },
    players: state.players.map(player => ({
      ...player,
      currentLocation: 'bank',
      gold: 5000,
      savings: 500,
      investments: 500,
      stocks: {},
      loanAmount: 0,
      loanWeeksRemaining: 0,
      totalShiftsWorked: 10,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('host-authoritative finance services', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Finance Tester'], false, goals);
  });

  it('transfers exact whole-number amounts only at the Bank', () => {
    const playerId = preparePlayer();
    expect(useGameStore.getState().transferBankFunds(playerId, 'deposit', 200)?.success).toBe(true);
    let player = useGameStore.getState().players[0];
    expect(player.gold).toBe(4800);
    expect(player.savings).toBe(700);

    expect(useGameStore.getState().transferBankFunds(playerId, 'withdraw', 100)?.success).toBe(true);
    player = useGameStore.getState().players[0];
    expect(player.gold).toBe(4900);
    expect(player.savings).toBe(600);
  });

  it('rejects decimals, overdrafts and remote bank transfers', () => {
    let playerId = preparePlayer();
    expect(useGameStore.getState().transferBankFunds(playerId, 'deposit', 1.5)?.success).toBe(false);
    expect(useGameStore.getState().transferBankFunds(playerId, 'deposit', 9999)?.success).toBe(false);
    expect(useGameStore.getState().transferBankFunds(playerId, 'withdraw', 9999)?.success).toBe(false);

    playerId = preparePlayer({ currentLocation: 'guild-hall' });
    expect(useGameStore.getState().transferBankFunds(playerId, 'deposit', 50)?.success).toBe(false);
  });

  it('invests and withdraws using the canonical 10 percent penalty', () => {
    const playerId = preparePlayer();
    expect(useGameStore.getState().manageInvestment(playerId, 'invest', 200)?.success).toBe(true);
    let player = useGameStore.getState().players[0];
    expect(player.gold).toBe(4800);
    expect(player.investments).toBe(700);

    expect(useGameStore.getState().manageInvestment(playerId, 'withdraw', 100)?.success).toBe(true);
    player = useGameStore.getState().players[0];
    expect(player.gold).toBe(4890);
    expect(player.investments).toBe(600);
  });

  it('buys stocks using the live host price', () => {
    const playerId = preparePlayer();
    const result = useGameStore.getState().tradeStock(playerId, 'buy', 'crystal-mine', 3);
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(4625);
    expect(player.stocks['crystal-mine']).toBe(3);
  });

  it('validates stock identity, integer shares, affordability and ownership', () => {
    const playerId = preparePlayer({ gold: 100, stocks: { 'crystal-mine': 1 } });
    expect(useGameStore.getState().tradeStock(playerId, 'buy', 'missing-stock', 1)?.success).toBe(false);
    expect(useGameStore.getState().tradeStock(playerId, 'buy', 'crystal-mine', 1.5)?.success).toBe(false);
    expect(useGameStore.getState().tradeStock(playerId, 'buy', 'crystal-mine', 1)?.success).toBe(false);
    expect(useGameStore.getState().tradeStock(playerId, 'sell', 'crystal-mine', 2)?.success).toBe(false);
  });

  it('applies the canonical Crown Bond sell fee', () => {
    const playerId = preparePlayer({ gold: 0, stocks: { 'crown-bonds': 2 } });
    expect(useGameStore.getState().tradeStock(playerId, 'sell', 'crown-bonds', 2)?.success).toBe(true);
    const player = useGameStore.getState().players[0];

    expect(player.gold).toBe(194);
    expect(player.stocks['crown-bonds']).toBeUndefined();
  });

  it('offers only canonical loan products and enforces job history', () => {
    let playerId = preparePlayer();
    expect(useGameStore.getState().manageLoan(playerId, 'borrow', 300)?.success).toBe(false);
    expect(useGameStore.getState().manageLoan(playerId, 'borrow', 500)?.success).toBe(true);
    const player = useGameStore.getState().players[0];
    expect(player.gold).toBe(5500);
    expect(player.loanAmount).toBe(500);
    expect(player.loanWeeksRemaining).toBe(8);
    expect(useGameStore.getState().manageLoan(playerId, 'borrow', 100)?.success).toBe(false);

    playerId = preparePlayer({ totalShiftsWorked: 0 });
    expect(useGameStore.getState().manageLoan(playerId, 'borrow', 100)?.success).toBe(false);
  });

  it('repays exact amounts or all debt without silently clamping', () => {
    const playerId = preparePlayer({ gold: 600, loanAmount: 500, loanWeeksRemaining: 4 });
    expect(useGameStore.getState().manageLoan(playerId, 'repay', 200)?.success).toBe(true);
    let player = useGameStore.getState().players[0];
    expect(player.gold).toBe(400);
    expect(player.loanAmount).toBe(300);
    expect(useGameStore.getState().manageLoan(playerId, 'repay', 500)?.success).toBe(false);

    expect(useGameStore.getState().manageLoan(playerId, 'repay', 'all')?.success).toBe(true);
    player = useGameStore.getState().players[0];
    expect(player.gold).toBe(100);
    expect(player.loanAmount).toBe(0);
    expect(player.loanWeeksRemaining).toBe(0);
  });

  it('allows semantic finance actions and blocks legacy numeric actions for guests', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('transferBankFunds')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('manageInvestment')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('tradeStock')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('manageLoan')).toBe(true);

    for (const legacy of [
      'depositToBank', 'withdrawFromBank', 'invest', 'withdrawInvestment',
      'buyStock', 'sellStock', 'takeLoan', 'repayLoan',
    ]) {
      expect(ALLOWED_GUEST_ACTIONS.has(legacy)).toBe(false);
    }
  });
});
