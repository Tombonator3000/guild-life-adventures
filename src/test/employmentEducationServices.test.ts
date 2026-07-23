import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getJob } from '@/data/jobs';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('host-authoritative employment and education services', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Tester'], false, goals);
  });

  it('resolves work hours and wage from the host state', () => {
    const job = getJob('shop-clerk');
    expect(job).toBeDefined();

    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentJob: 'shop-clerk',
        currentWage: 7,
        currentLocation: 'general-store',
        clothingCondition: 100,
        gold: 0,
        timeRemaining: 60,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().performWorkShift(playerId, 'full');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.timeRemaining).toBe(60 - job!.hoursPerShift);
    expect(player.gold).toBe(Math.floor(job!.hoursPerShift * 7 * 1.15));
    expect(player.workedThisTurn).toBe(true);
  });

  it('rejects working away from the canonical job location', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentJob: 'shop-clerk',
        currentWage: 50,
        currentLocation: 'academy',
        clothingCondition: 100,
        gold: 0,
        timeRemaining: 60,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().performWorkShift(playerId, 'full');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(false);
    expect(player.gold).toBe(0);
    expect(player.timeRemaining).toBe(60);
  });

  it('uses the host price modifier and degree duration for a class session', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'academy',
        gold: 100,
        timeRemaining: 60,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().attendDegreeSession(playerId, 'trade-guild', 'standard');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(90);
    expect(player.timeRemaining).toBe(54);
    expect(player.degreeProgress['trade-guild']).toBe(1);
  });

  it('calculates remaining prepaid tuition on the host', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'academy',
        gold: 100,
        degreeProgress: { ...player.degreeProgress, 'trade-guild': 5 },
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().prepayDegree(playerId, 'trade-guild');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(50);
    expect(player.prepaidDegrees?.['trade-guild']).toBe(5);
  });

  it('validates progress before graduating', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'academy',
        degreeProgress: { ...player.degreeProgress, 'trade-guild': 10 },
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().graduateDegree(playerId, 'trade-guild');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.completedDegrees).toContain('trade-guild');
    expect(player.degreeProgress['trade-guild']).toBeUndefined();
  });

  it('exposes semantic actions to guests and removes numeric legacy actions', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('performWorkShift')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('attendDegreeSession')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('prepayDegree')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('graduateDegree')).toBe(true);

    expect(ALLOWED_GUEST_ACTIONS.has('workShift')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('studySession')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('studyDegree')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('payFullTuition')).toBe(false);
  });
});
