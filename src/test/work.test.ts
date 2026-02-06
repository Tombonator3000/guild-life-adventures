import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

let playerId: string;

function resetAndStart() {
  const store = useGameStore.getState();
  store.startNewGame(['TestPlayer'], false, { wealth: 5000, happiness: 75, education: 5, career: 4 });
  playerId = useGameStore.getState().players[0].id;
}

describe('workShift', () => {
  beforeEach(resetAndStart);

  it('adds earnings and spends time', () => {
    useGameStore.getState().workShift(playerId, 6, 10);
    const p = useGameStore.getState().players[0];
    // 6 hours at 10/hr, 6 >= 6 so bonus: ceil(6 * 1.15) = 7 hours * 10 = 70
    expect(p.gold).toBe(100 + 70);
    expect(p.timeRemaining).toBe(54); // 60 - 6
  });

  it('applies 15% efficiency bonus for 6+ hour shifts', () => {
    useGameStore.getState().workShift(playerId, 6, 10);
    const p = useGameStore.getState().players[0];
    // bonusHours = ceil(6 * 1.15) = 7, earnings = 7 * 10 = 70
    expect(p.gold).toBe(170);
  });

  it('no efficiency bonus for shifts under 6 hours', () => {
    useGameStore.getState().workShift(playerId, 4, 10);
    const p = useGameStore.getState().players[0];
    // bonusHours = 4, earnings = 4 * 10 = 40
    expect(p.gold).toBe(140);
  });

  it('uses currentWage when player has a job', () => {
    useGameStore.getState().setJob(playerId, 'floor-sweeper', 5);
    useGameStore.getState().workShift(playerId, 6, 999); // wage param should be ignored
    const p = useGameStore.getState().players[0];
    // effectiveWage = currentWage (5), bonusHours = 7, earnings = 7 * 5 = 35
    expect(p.gold).toBe(135);
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

  it('no happiness penalty in weeks 1-3', () => {
    // week is 1 by default
    const hapBefore = useGameStore.getState().players[0].happiness;
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].happiness).toBe(hapBefore);
  });

  it('-1 happiness penalty in weeks 4-8', () => {
    useGameStore.setState({ week: 5 });
    const hapBefore = useGameStore.getState().players[0].happiness;
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].happiness).toBe(hapBefore - 1);
  });

  it('-2 happiness penalty in weeks 9+', () => {
    useGameStore.setState({ week: 10 });
    const hapBefore = useGameStore.getState().players[0].happiness;
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].happiness).toBe(hapBefore - 2);
  });

  it('applies permanentGoldBonus', () => {
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, permanentGoldBonus: 0.1 } : p
      ),
    }));
    useGameStore.getState().workShift(playerId, 6, 10);
    const p = useGameStore.getState().players[0];
    // bonusHours = 7, earnings = 7 * 10 = 70, with 10% bonus = floor(70 * 1.1) = 77
    expect(p.gold).toBe(100 + 77);
  });

  it('applies 50% garnishment when rent overdue 4+ weeks', () => {
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, weeksSinceRent: 5, housing: 'slums' as const } : p
      ),
    }));
    useGameStore.getState().workShift(playerId, 6, 10);
    const p = useGameStore.getState().players[0];
    // bonusHours = 7, earnings = 70
    // garnishment = floor(70 * 0.5) + 2 = 37
    // net = 70 - 37 = 33
    expect(p.gold).toBe(100 + 33);
  });

  it('increments shiftsWorkedSinceHire', () => {
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].shiftsWorkedSinceHire).toBe(1);
    useGameStore.getState().workShift(playerId, 6, 10);
    expect(useGameStore.getState().players[0].shiftsWorkedSinceHire).toBe(2);
  });
});
