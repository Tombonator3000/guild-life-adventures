import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

let playerId: string;

function resetAndStart() {
  const store = useGameStore.getState();
  store.startNewGame(['TestPlayer'], false, { wealth: 5000, happiness: 75, education: 45, career: 4 });
  playerId = useGameStore.getState().players[0].id;
}

// Helper to give player a working Preservation Box
function givePreservationBox() {
  useGameStore.setState((state) => ({
    players: state.players.map(p =>
      p.id === playerId
        ? {
            ...p,
            appliances: {
              ...p.appliances,
              'preservation-box': {
                itemId: 'preservation-box',
                originalPrice: 876,
                source: 'enchanter' as const,
                isBroken: false,
                purchasedFirstTime: true,
              },
            },
          }
        : p
    ),
  }));
}

// Helper to give player a working Frost Chest
function giveFrostChest() {
  useGameStore.setState((state) => ({
    players: state.players.map(p =>
      p.id === playerId
        ? {
            ...p,
            appliances: {
              ...p.appliances,
              'frost-chest': {
                itemId: 'frost-chest',
                originalPrice: 1200,
                source: 'enchanter' as const,
                isBroken: false,
                purchasedFirstTime: true,
              },
            },
          }
        : p
    ),
  }));
}

// Helper to set player's fresh food
function setFreshFood(amount: number) {
  useGameStore.setState((state) => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, freshFood: amount } : p
    ),
  }));
}

// Helper to set player's regular food level
function setFoodLevel(amount: number) {
  useGameStore.setState((state) => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, foodLevel: amount } : p
    ),
  }));
}

// Helper to set player's gold
function setGold(amount: number) {
  useGameStore.setState((state) => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, gold: amount } : p
    ),
  }));
}

describe('Fresh Food - buyFreshFood', () => {
  beforeEach(resetAndStart);

  it('stores fresh food when player has Preservation Box', () => {
    givePreservationBox();
    setGold(500);
    useGameStore.getState().buyFreshFood(playerId, 2, 12);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(2);
    expect(p.gold).toBe(488);
  });

  it('caps fresh food at 6 without Frost Chest', () => {
    givePreservationBox();
    setGold(500);
    useGameStore.getState().buyFreshFood(playerId, 6, 35);
    useGameStore.getState().buyFreshFood(playerId, 3, 20);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(6); // Capped at 6
  });

  it('caps fresh food at 12 with Frost Chest', () => {
    givePreservationBox();
    giveFrostChest();
    setGold(500);
    useGameStore.getState().buyFreshFood(playerId, 6, 35);
    useGameStore.getState().buyFreshFood(playerId, 6, 35);
    useGameStore.getState().buyFreshFood(playerId, 3, 20);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(12); // Capped at 12
  });

  it('rejects purchase without Preservation Box', () => {
    setGold(500);
    useGameStore.getState().buyFreshFood(playerId, 2, 12);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(0);
    expect(p.gold).toBe(500); // Gold not deducted
  });

  it('rejects purchase with broken Preservation Box', () => {
    givePreservationBox();
    // Break the box
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              appliances: {
                ...p.appliances,
                'preservation-box': { ...p.appliances['preservation-box'], isBroken: true },
              },
            }
          : p
      ),
    }));
    setGold(500);
    useGameStore.getState().buyFreshFood(playerId, 2, 12);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(0);
    expect(p.gold).toBe(500);
  });

  it('rejects purchase when not enough gold', () => {
    givePreservationBox();
    setGold(5);
    useGameStore.getState().buyFreshFood(playerId, 2, 12);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(0);
    expect(p.gold).toBe(5);
  });

  it('does not count broken Frost Chest for max storage', () => {
    givePreservationBox();
    giveFrostChest();
    // Break frost chest
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              appliances: {
                ...p.appliances,
                'frost-chest': { ...p.appliances['frost-chest'], isBroken: true },
              },
            }
          : p
      ),
    }));
    setGold(500);
    useGameStore.getState().buyFreshFood(playerId, 6, 35);
    useGameStore.getState().buyFreshFood(playerId, 6, 35);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(6); // Capped at 6, not 12
  });
});

describe('Fresh Food - Starvation Prevention', () => {
  beforeEach(resetAndStart);

  it('consumes 1 fresh food unit when regular food is empty', () => {
    givePreservationBox();
    setFoodLevel(0);
    setFreshFood(4);
    useGameStore.getState().startTurn(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(3);
    expect(p.timeRemaining).toBe(60); // No starvation penalty
  });

  it('does not consume fresh food when regular food exists', () => {
    givePreservationBox();
    setFoodLevel(50);
    setFreshFood(4);
    useGameStore.getState().startTurn(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(4); // Unchanged
  });

  it('starves when no regular food and no fresh food', () => {
    givePreservationBox();
    setFoodLevel(0);
    setFreshFood(0);
    useGameStore.getState().startTurn(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.timeRemaining).toBe(40); // -20 hours starvation
  });

  it('starves when no Preservation Box even with freshFood counter > 0', () => {
    // Edge case: freshFood counter is set but no box (e.g., after eviction+re-read lag)
    setFoodLevel(0);
    setFreshFood(5);
    useGameStore.getState().startTurn(playerId);
    const p = useGameStore.getState().players[0];
    // Food should spoil first, then player starves
    expect(p.freshFood).toBe(0);
    expect(p.timeRemaining).toBe(40); // -20 hours starvation
  });
});

describe('Fresh Food - Spoilage', () => {
  beforeEach(resetAndStart);

  it('spoils all fresh food when no Preservation Box', () => {
    setFreshFood(5);
    setFoodLevel(50); // Has regular food so starvation doesn't interfere
    useGameStore.getState().startTurn(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(0);
  });

  it('spoils all fresh food when Preservation Box is broken', () => {
    givePreservationBox();
    setFreshFood(5);
    setFoodLevel(50);
    // Break the box
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              appliances: {
                ...p.appliances,
                'preservation-box': { ...p.appliances['preservation-box'], isBroken: true },
              },
            }
          : p
      ),
    }));
    useGameStore.getState().startTurn(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(0);
  });

  it('caps excess food to 6 when only Preservation Box (no Frost Chest)', () => {
    givePreservationBox();
    setFreshFood(10);
    setFoodLevel(50);
    useGameStore.getState().startTurn(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(6);
  });

  it('allows up to 12 with Frost Chest', () => {
    givePreservationBox();
    giveFrostChest();
    setFreshFood(10);
    setFoodLevel(50);
    useGameStore.getState().startTurn(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(10); // Under 12 max, no cap
  });

  it('caps excess food to 6 when Frost Chest is broken', () => {
    givePreservationBox();
    giveFrostChest();
    setFreshFood(10);
    setFoodLevel(50);
    // Break frost chest
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              appliances: {
                ...p.appliances,
                'frost-chest': { ...p.appliances['frost-chest'], isBroken: true },
              },
            }
          : p
      ),
    }));
    useGameStore.getState().startTurn(playerId);
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(6); // Capped from 10 to 6
  });
});

describe('Fresh Food - Eviction clears fresh food', () => {
  beforeEach(resetAndStart);

  it('clears freshFood when player is evicted', () => {
    givePreservationBox();
    setFreshFood(6);
    // Set up for eviction (8+ weeks overdue)
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, weeksSinceRent: 8 } : p
      ),
    }));
    useGameStore.getState().processWeekEnd();
    const p = useGameStore.getState().players[0];
    expect(p.freshFood).toBe(0);
    expect(p.housing).toBe('homeless');
    expect(Object.keys(p.appliances)).toHaveLength(0);
  });
});

describe('Fresh Food - Frost Chest requires Preservation Box', () => {
  beforeEach(resetAndStart);

  it('rejects Frost Chest purchase without Preservation Box', () => {
    setGold(2000);
    const result = useGameStore.getState().buyAppliance(playerId, 'frost-chest', 1200, 'enchanter');
    expect(result).toBe(0); // No happiness gain = purchase failed
    const p = useGameStore.getState().players[0];
    expect(p.appliances['frost-chest']).toBeUndefined();
    expect(p.gold).toBe(2000); // Gold not deducted
  });

  it('allows Frost Chest purchase with working Preservation Box', () => {
    givePreservationBox();
    setGold(2000);
    const result = useGameStore.getState().buyAppliance(playerId, 'frost-chest', 1200, 'enchanter');
    expect(result).toBeGreaterThanOrEqual(0); // May be 0 if not first time, but purchase succeeds
    const p = useGameStore.getState().players[0];
    expect(p.appliances['frost-chest']).toBeDefined();
    expect(p.gold).toBe(800); // 2000 - 1200
  });

  it('rejects Frost Chest purchase with broken Preservation Box', () => {
    givePreservationBox();
    // Break it
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              appliances: {
                ...p.appliances,
                'preservation-box': { ...p.appliances['preservation-box'], isBroken: true },
              },
            }
          : p
      ),
    }));
    setGold(2000);
    const result = useGameStore.getState().buyAppliance(playerId, 'frost-chest', 1200, 'enchanter');
    expect(result).toBe(0);
    const p = useGameStore.getState().players[0];
    expect(p.appliances['frost-chest']).toBeUndefined();
    expect(p.gold).toBe(2000);
  });
});
