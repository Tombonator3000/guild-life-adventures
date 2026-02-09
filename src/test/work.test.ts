import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

let playerId: string;

function resetAndStart() {
  const store = useGameStore.getState();
  store.startNewGame(['TestPlayer'], false, { wealth: 5000, happiness: 75, education: 45, career: 4, adventure: 0 });
  playerId = useGameStore.getState().players[0].id;
}

describe('workShift', () => {
  beforeEach(resetAndStart);

  it('adds earnings and spends time', () => {
    useGameStore.getState().workShift(playerId, 6, 10);
    const p = useGameStore.getState().players[0];
    // 6 hours at 10/hr with 15% bonus: floor(6 * 10 * 1.15) = floor(69) = 69
    expect(p.gold).toBe(100 + 69);
    expect(p.timeRemaining).toBe(54); // 60 - 6
  });

  it('applies 15% efficiency bonus to all shifts equally', () => {
    useGameStore.getState().workShift(playerId, 6, 10);
    const p = useGameStore.getState().players[0];
    // floor(6 * 10 * 1.15) = 69
    expect(p.gold).toBe(169);
  });

  it('applies 15% bonus to short shifts too (no threshold)', () => {
    useGameStore.getState().workShift(playerId, 4, 10);
    const p = useGameStore.getState().players[0];
    // floor(4 * 10 * 1.15) = floor(46) = 46
    expect(p.gold).toBe(146);
  });

  it('applies 15% bonus to 8-hour shifts fairly', () => {
    useGameStore.getState().workShift(playerId, 8, 10);
    const p = useGameStore.getState().players[0];
    // floor(8 * 10 * 1.15) = floor(92) = 92
    expect(p.gold).toBe(192);
  });

  it('uses currentWage when player has a job', () => {
    useGameStore.getState().setJob(playerId, 'floor-sweeper', 5);
    useGameStore.getState().workShift(playerId, 6, 999); // wage param should be ignored
    const p = useGameStore.getState().players[0];
    // effectiveWage = currentWage (5), floor(6 * 5 * 1.15) = floor(34.5) = 34
    expect(p.gold).toBe(134);
  });

  it('increases dependability by 2 (capped at max)', () => {
    const p0 = useGameStore.getState().players[0];
    expect(p0.dependability).toBe(50);
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].dependability).toBe(52);
  });

  it('increases experience by hours worked (capped at max)', () => {
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].experience).toBe(6);
  });

  it('no happiness penalty in weeks 1-4', () => {
    // week is 1 by default
    const hapBefore = useGameStore.getState().players[0].happiness;
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].happiness).toBe(hapBefore);
  });

  it('no happiness penalty in week 4', () => {
    useGameStore.setState({ week: 4 });
    const hapBefore = useGameStore.getState().players[0].happiness;
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].happiness).toBe(hapBefore);
  });

  it('-1 happiness penalty in weeks 5+', () => {
    useGameStore.setState({ week: 10 });
    const hapBefore = useGameStore.getState().players[0].happiness;
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].happiness).toBe(hapBefore - 1);
  });

  it('applies permanentGoldBonus', () => {
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, permanentGoldBonus: 0.1 } : p
      ),
    }));
    useGameStore.getState().workShift(playerId, 6, 10);
    const p = useGameStore.getState().players[0];
    // floor(6 * 10 * 1.15) = 69, with 10% bonus = floor(69 * 1.1) = floor(75.9) = 75
    expect(p.gold).toBe(100 + 75);
  });

  it('applies 50% garnishment when rent overdue 4+ weeks', () => {
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, weeksSinceRent: 5, housing: 'slums' as const } : p
      ),
    }));
    useGameStore.getState().workShift(playerId, 6, 10);
    const p = useGameStore.getState().players[0];
    // floor(6 * 10 * 1.15) = 69
    // garnishment = floor(69 * 0.5) + 2 = 36
    // net = 69 - 36 = 33
    expect(p.gold).toBe(100 + 33);
  });

  it('increments shiftsWorkedSinceHire', () => {
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].shiftsWorkedSinceHire).toBe(1);
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].shiftsWorkedSinceHire).toBe(2);
  });
});
