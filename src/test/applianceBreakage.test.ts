import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

let playerId: string;

function resetAndStart() {
  const store = useGameStore.getState();
  store.startNewGame(['TestPlayer'], false, { wealth: 5000, happiness: 75, education: 45, career: 4, adventure: 0 });
  playerId = useGameStore.getState().players[0].id;
}

function givePreservationBox(repairedWeek?: number) {
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
                repairedWeek,
              },
            },
          }
        : p
    ),
  }));
}

function setGold(amount: number) {
  useGameStore.setState((state) => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, gold: amount } : p
    ),
  }));
}

describe('Appliance Breakage Cooldown', () => {
  beforeEach(resetAndStart);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does NOT break appliance within 2 weeks of repair (cooldown active)', () => {
    // Force Math.random to always trigger breakage
    vi.spyOn(Math, 'random').mockReturnValue(0.001); // Well below 1/51 threshold
    
    const currentWeek = useGameStore.getState().week; // Week 1
    givePreservationBox(currentWeek); // repairedWeek = current week
    setGold(2000); // Above 500g threshold
    
    // Start turn — breakage check runs
    useGameStore.getState().startTurn(playerId);
    
    const p = useGameStore.getState().players[0];
    // Appliance should NOT be broken — cooldown protects it
    expect(p.appliances['preservation-box'].isBroken).toBe(false);
  });

  it('does NOT break appliance 1 week after repair (still in cooldown)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001);
    
    const currentWeek = useGameStore.getState().week;
    givePreservationBox(currentWeek - 1); // Repaired 1 week ago
    setGold(2000);
    
    useGameStore.getState().startTurn(playerId);
    
    const p = useGameStore.getState().players[0];
    expect(p.appliances['preservation-box'].isBroken).toBe(false);
  });

  it('CAN break appliance 2+ weeks after repair (cooldown expired)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001);
    
    const currentWeek = useGameStore.getState().week;
    givePreservationBox(currentWeek - 2); // Repaired 2 weeks ago — cooldown expired
    setGold(2000);
    
    useGameStore.getState().startTurn(playerId);
    
    const p = useGameStore.getState().players[0];
    // Appliance SHOULD break — cooldown has expired and random is very low
    expect(p.appliances['preservation-box'].isBroken).toBe(true);
  });

  it('CAN break appliance with no repairedWeek set (old appliance)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001);
    
    givePreservationBox(undefined); // No repairedWeek — old format
    setGold(2000);
    
    useGameStore.getState().startTurn(playerId);
    
    const p = useGameStore.getState().players[0];
    expect(p.appliances['preservation-box'].isBroken).toBe(true);
  });

  it('does NOT break appliance when gold <= 500', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001);
    
    givePreservationBox(undefined);
    setGold(400); // Below threshold
    
    useGameStore.getState().startTurn(playerId);
    
    const p = useGameStore.getState().players[0];
    expect(p.appliances['preservation-box'].isBroken).toBe(false);
  });

  it('repair action sets repairedWeek on the appliance', () => {
    givePreservationBox(undefined);
    setGold(2000);
    
    // Break it first
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
    
    // Repair it
    useGameStore.getState().repairAppliance(playerId, 'preservation-box');
    
    const p = useGameStore.getState().players[0];
    expect(p.appliances['preservation-box'].isBroken).toBe(false);
    expect(p.appliances['preservation-box'].repairedWeek).toBe(useGameStore.getState().week);
  });

  it('buying a new appliance sets repairedWeek', () => {
    setGold(2000);
    useGameStore.getState().buyAppliance(playerId, 'preservation-box', 876, 'enchanter');
    
    const p = useGameStore.getState().players[0];
    expect(p.appliances['preservation-box']).toBeDefined();
    expect(p.appliances['preservation-box'].repairedWeek).toBe(useGameStore.getState().week);
  });
});
