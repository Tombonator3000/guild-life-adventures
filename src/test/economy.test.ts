import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getInitialStockPrices } from '@/data/stocks';

let playerId: string;

function resetAndStart() {
  const store = useGameStore.getState();
  store.startNewGame(['TestPlayer'], false, { wealth: 5000, happiness: 75, education: 5, career: 4 });
  playerId = useGameStore.getState().players[0].id;
}

describe('Banking - depositToBank', () => {
  beforeEach(resetAndStart);

  it('transfers gold to savings', () => {
    useGameStore.getState().depositToBank(playerId, 50);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(50);
    expect(p.savings).toBe(50);
  });

  it('clamps deposit to available gold', () => {
    useGameStore.getState().depositToBank(playerId, 200); // Only has 100
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(0);
    expect(p.savings).toBe(100);
  });

  it('rejects negative amount', () => {
    useGameStore.getState().depositToBank(playerId, -50);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(100);
    expect(p.savings).toBe(0);
  });

  it('rejects zero amount', () => {
    useGameStore.getState().depositToBank(playerId, 0);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(100);
    expect(p.savings).toBe(0);
  });

  it('rejects NaN and Infinity', () => {
    useGameStore.getState().depositToBank(playerId, NaN);
    expect(useGameStore.getState().players[0].gold).toBe(100);

    useGameStore.getState().depositToBank(playerId, Infinity);
    expect(useGameStore.getState().players[0].gold).toBe(100);
  });
});

describe('Banking - withdrawFromBank', () => {
  beforeEach(() => {
    resetAndStart();
    useGameStore.getState().depositToBank(playerId, 80); // gold=20, savings=80
  });

  it('transfers savings to gold', () => {
    useGameStore.getState().withdrawFromBank(playerId, 30);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(50);
    expect(p.savings).toBe(50);
  });

  it('clamps withdrawal to available savings', () => {
    useGameStore.getState().withdrawFromBank(playerId, 200); // Only has 80
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(100);
    expect(p.savings).toBe(0);
  });

  it('rejects negative amount', () => {
    useGameStore.getState().withdrawFromBank(playerId, -50);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(20);
    expect(p.savings).toBe(80);
  });
});

describe('Banking - invest', () => {
  beforeEach(resetAndStart);

  it('transfers gold to investments', () => {
    useGameStore.getState().invest(playerId, 40);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(60);
    expect(p.investments).toBe(40);
  });

  it('clamps to available gold', () => {
    useGameStore.getState().invest(playerId, 999);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(0);
    expect(p.investments).toBe(100);
  });

  it('rejects negative amount', () => {
    useGameStore.getState().invest(playerId, -10);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(100);
    expect(p.investments).toBe(0);
  });
});

describe('Loans - takeLoan', () => {
  beforeEach(resetAndStart);

  it('adds loan amount to gold and sets repayment', () => {
    useGameStore.getState().takeLoan(playerId, 500);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(600);
    expect(p.loanAmount).toBe(500);
    expect(p.loanWeeksRemaining).toBe(8);
  });

  it('rejects second loan when one is outstanding', () => {
    useGameStore.getState().takeLoan(playerId, 500);
    useGameStore.getState().takeLoan(playerId, 300);
    const p = useGameStore.getState().players[0];
    expect(p.loanAmount).toBe(500); // Still only first loan
    expect(p.gold).toBe(600);
  });

  it('rejects loan over 1000', () => {
    useGameStore.getState().takeLoan(playerId, 1001);
    const p = useGameStore.getState().players[0];
    expect(p.loanAmount).toBe(0);
    expect(p.gold).toBe(100);
  });

  it('rejects negative or zero loan', () => {
    useGameStore.getState().takeLoan(playerId, 0);
    expect(useGameStore.getState().players[0].loanAmount).toBe(0);

    useGameStore.getState().takeLoan(playerId, -100);
    expect(useGameStore.getState().players[0].loanAmount).toBe(0);
  });
});

describe('Loans - repayLoan', () => {
  beforeEach(() => {
    resetAndStart();
    useGameStore.getState().takeLoan(playerId, 500); // gold=600, loan=500
  });

  it('reduces loan and gold', () => {
    useGameStore.getState().repayLoan(playerId, 200);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(400);
    expect(p.loanAmount).toBe(300);
    expect(p.loanWeeksRemaining).toBe(8);
  });

  it('clears loanWeeksRemaining when fully repaid', () => {
    useGameStore.getState().repayLoan(playerId, 500);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(100);
    expect(p.loanAmount).toBe(0);
    expect(p.loanWeeksRemaining).toBe(0);
  });

  it('clamps to available gold and loan amount', () => {
    // Set gold low
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, gold: 50 } : p
      ),
    }));
    useGameStore.getState().repayLoan(playerId, 9999);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(0);
    expect(p.loanAmount).toBe(450);
  });

  it('rejects negative repayment', () => {
    useGameStore.getState().repayLoan(playerId, -100);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(600);
    expect(p.loanAmount).toBe(500);
  });

  it('no-ops when no loan outstanding', () => {
    useGameStore.getState().repayLoan(playerId, 500); // Pay off
    useGameStore.getState().repayLoan(playerId, 100); // Should no-op
    expect(useGameStore.getState().players[0].gold).toBe(100);
  });
});

describe('Stocks - buyStock', () => {
  beforeEach(() => {
    resetAndStart();
    useGameStore.getState().modifyGold(playerId, 900); // gold = 1000
  });

  it('buys shares and deducts gold', () => {
    const prices = useGameStore.getState().stockPrices;
    const price = prices['crystal-mine']; // 100
    useGameStore.getState().buyStock(playerId, 'crystal-mine', 3);
    const p = useGameStore.getState().players[0];
    expect(p.stocks['crystal-mine']).toBe(3);
    expect(p.gold).toBe(1000 - price * 3);
  });

  it('rejects if not enough gold', () => {
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, gold: 50 } : p
      ),
    }));
    useGameStore.getState().buyStock(playerId, 'crystal-mine', 1); // Costs 100
    expect(useGameStore.getState().players[0].stocks['crystal-mine']).toBeUndefined();
    expect(useGameStore.getState().players[0].gold).toBe(50);
  });

  it('rejects negative or zero shares', () => {
    useGameStore.getState().buyStock(playerId, 'crystal-mine', 0);
    expect(useGameStore.getState().players[0].stocks['crystal-mine']).toBeUndefined();

    useGameStore.getState().buyStock(playerId, 'crystal-mine', -5);
    expect(useGameStore.getState().players[0].stocks['crystal-mine']).toBeUndefined();
  });

  it('rejects invalid stock id', () => {
    useGameStore.getState().buyStock(playerId, 'nonexistent', 1);
    expect(useGameStore.getState().players[0].gold).toBe(1000);
  });
});

describe('Stocks - sellStock', () => {
  beforeEach(() => {
    resetAndStart();
    useGameStore.getState().modifyGold(playerId, 900); // gold = 1000
    useGameStore.getState().buyStock(playerId, 'crystal-mine', 5); // Buy 5 at 100 each
  });

  it('sells shares and adds gold', () => {
    const goldBefore = useGameStore.getState().players[0].gold;
    useGameStore.getState().sellStock(playerId, 'crystal-mine', 2);
    const p = useGameStore.getState().players[0];
    expect(p.stocks['crystal-mine']).toBe(3);
    expect(p.gold).toBe(goldBefore + 200); // 2 * 100
  });

  it('clamps to owned shares', () => {
    useGameStore.getState().sellStock(playerId, 'crystal-mine', 99);
    const p = useGameStore.getState().players[0];
    expect(p.stocks['crystal-mine']).toBeUndefined(); // Cleaned up
  });

  it('T-bills have 3% sell fee', () => {
    useGameStore.getState().buyStock(playerId, 'crown-bonds', 1); // 100 each
    const goldBefore = useGameStore.getState().players[0].gold;
    useGameStore.getState().sellStock(playerId, 'crown-bonds', 1);
    const p = useGameStore.getState().players[0];
    expect(p.gold).toBe(goldBefore + 97); // 100 - 3% = 97
  });

  it('rejects negative shares', () => {
    const goldBefore = useGameStore.getState().players[0].gold;
    useGameStore.getState().sellStock(playerId, 'crystal-mine', -1);
    expect(useGameStore.getState().players[0].gold).toBe(goldBefore);
  });
});
