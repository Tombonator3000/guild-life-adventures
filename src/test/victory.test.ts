import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

function resetAndStart(goals = { wealth: 1000, happiness: 50, education: 9, career: 60 }) {
  const store = useGameStore.getState();
  store.startNewGame(['TestPlayer'], false, goals);
  return useGameStore.getState().players[0].id;
}

describe('checkVictory', () => {
  beforeEach(() => {
    useGameStore.setState({ winner: null, phase: 'playing' });
  });

  it('returns false when no goals are met', () => {
    const playerId = resetAndStart();
    const result = useGameStore.getState().checkVictory(playerId);
    expect(result).toBe(false);
    expect(useGameStore.getState().winner).toBeNull();
  });

  it('returns false when only wealth goal is met', () => {
    const playerId = resetAndStart({ wealth: 100, happiness: 80, education: 9, career: 60 });
    // Player starts with 100 gold, so wealth is met but other goals not
    const result = useGameStore.getState().checkVictory(playerId);
    expect(result).toBe(false);
  });

  it('returns true when all goals are met', () => {
    const playerId = resetAndStart({ wealth: 50, happiness: 40, education: 0, career: 40 });
    // Player starts: gold=100 (>= 50), happiness=50 (>= 40), education=0 (>= 0)
    // Career: need job + dependability >= 40. Give job + dep=50.
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: 'floor-sweeper', dependability: 50 } : p
      ),
    }));
    const result = useGameStore.getState().checkVictory(playerId);
    expect(result).toBe(true);
    expect(useGameStore.getState().winner).toBe(playerId);
    expect(useGameStore.getState().phase).toBe('victory');
  });

  it('counts wealth as gold + savings + investments + stocks - loans', () => {
    const playerId = resetAndStart({ wealth: 500, happiness: 40, education: 0, career: 40 });
    // Give job + dependability so career is met
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: 'floor-sweeper', dependability: 50 } : p
      ),
    }));
    // Player starts with 100 gold. Add 200 savings and 200 investments = 500
    useGameStore.getState().depositToBank(playerId, 50); // gold=50, savings=50
    useGameStore.getState().invest(playerId, 50); // gold=0, investments=50
    // Total = 0 + 50 + 50 = 100 (not enough)
    expect(useGameStore.getState().checkVictory(playerId)).toBe(false);

    // Give more gold via modifyGold
    useGameStore.getState().modifyGold(playerId, 500);
    // gold=500, savings=50, investments=50 = 600 >= 500
    expect(useGameStore.getState().checkVictory(playerId)).toBe(true);
  });

  it('counts education as completedDegrees * 9', () => {
    const playerId = resetAndStart({ wealth: 50, happiness: 40, education: 18, career: 40 });
    // Give job + dependability so career is met
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: 'floor-sweeper', dependability: 50 } : p
      ),
    }));
    // Need 18 education points = 2 degrees
    expect(useGameStore.getState().checkVictory(playerId)).toBe(false);

    // Complete 2 degrees
    useGameStore.getState().completeDegree(playerId, 'trade-guild');
    useGameStore.getState().completeDegree(playerId, 'junior-academy');
    const player = useGameStore.getState().players.find(p => p.id === playerId)!;
    expect(player.completedDegrees).toHaveLength(2);
    expect(useGameStore.getState().checkVictory(playerId)).toBe(true);
  });

  it('counts career as dependability (0 if no job)', () => {
    const playerId = resetAndStart({ wealth: 50, happiness: 40, education: 0, career: 60 });
    // Player starts with dependability=50 but no job, so career=0. Need career >= 60.
    expect(useGameStore.getState().checkVictory(playerId)).toBe(false);

    // Give player a job but low dependability
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: 'floor-sweeper', dependability: 55 } : p
      ),
    }));
    // 55 < 60, not enough
    expect(useGameStore.getState().checkVictory(playerId)).toBe(false);

    // Raise dependability to meet goal
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, dependability: 65 } : p
      ),
    }));
    // 65 >= 60, career met
    expect(useGameStore.getState().checkVictory(playerId)).toBe(true);
  });

  it('career is 0 when player has no job', () => {
    const playerId = resetAndStart({ wealth: 50, happiness: 40, education: 0, career: 10 });
    // Player has dependability=50 but no job -> career value = 0
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: null, dependability: 100 } : p
      ),
    }));
    expect(useGameStore.getState().checkVictory(playerId)).toBe(false);

    // Give job -> career = dependability = 100 >= 10
    useGameStore.setState({ winner: null, phase: 'playing' });
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: 'floor-sweeper' } : p
      ),
    }));
    expect(useGameStore.getState().checkVictory(playerId)).toBe(true);
  });

  it('subtracts loan amount from wealth', () => {
    const playerId = resetAndStart({ wealth: 200, happiness: 40, education: 0, career: 40 });
    // Give job + dependability so career is met
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, currentJob: 'floor-sweeper', dependability: 50 } : p
      ),
    }));
    useGameStore.getState().modifyGold(playerId, 200); // gold = 300
    expect(useGameStore.getState().checkVictory(playerId)).toBe(true);

    // Take a loan that pushes net wealth below goal
    useGameStore.getState().takeLoan(playerId, 200); // gold = 500, loan = 200, net = 300
    // Reset winner state
    useGameStore.setState({ winner: null, phase: 'playing' });
    expect(useGameStore.getState().checkVictory(playerId)).toBe(true); // 500 - 200 = 300 >= 200

    useGameStore.setState({ winner: null, phase: 'playing' });
    useGameStore.setState((state) => ({
      players: state.players.map(p =>
        p.id === playerId ? { ...p, gold: 50, loanAmount: 200 } : p
      ),
    }));
    // gold=50 + savings + investments - loan=200 = net -150 < 200
    expect(useGameStore.getState().checkVictory(playerId)).toBe(false);
  });

  it('returns false for invalid player id', () => {
    resetAndStart();
    expect(useGameStore.getState().checkVictory('nonexistent')).toBe(false);
  });
});
