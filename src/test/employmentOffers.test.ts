import { beforeEach, describe, expect, it } from 'vitest';
import { calculateOfferedWage, getJob } from '@/data/jobs';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';
import { validateGuestActionArgs } from '@/network/actionValidation';
import { useGameStore } from '@/store/gameStore';

const goals = {
  wealth: 5000,
  happiness: 100,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('host-authoritative employment offers', () => {
  beforeEach(() => {
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().startNewGame(['Alice', 'Bob'], false, goals);
    useGameStore.setState(state => ({
      week: 6,
      priceModifier: 1.12,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'guild-hall' as const,
        hadRandomEventThisTurn: true,
      })),
    }));
  });

  it('accepts a valid job using the host-computed weekly market wage', () => {
    const state = useGameStore.getState();
    const player = state.players[0];
    const job = getJob('floor-sweeper')!;
    const expectedWage = calculateOfferedWage(job, state.priceModifier, state.week).offeredWage;

    const result = state.acceptJobOffer(player.id, job.id);

    expect(result?.success).toBe(true);
    const updated = useGameStore.getState().players[0];
    expect(updated.currentJob).toBe(job.id);
    expect(updated.currentWage).toBe(expectedWage);
    expect(updated.timeRemaining).toBe(player.timeRemaining);
  });

  it('rejects employment outside the Guild Hall', () => {
    useGameStore.setState(state => ({
      players: state.players.map((player, index) => index === 0
        ? { ...player, currentLocation: 'bank' as const }
        : player),
    }));
    const player = useGameStore.getState().players[0];

    expect(useGameStore.getState().acceptJobOffer(player.id, 'floor-sweeper')?.success).toBe(false);
    expect(useGameStore.getState().players[0].currentJob).toBeNull();
  });

  it('rechecks qualifications on the host', () => {
    const player = useGameStore.getState().players[0];

    const result = useGameStore.getState().acceptJobOffer(player.id, 'guild-administrator');

    expect(result?.success).toBe(false);
    expect(useGameStore.getState().players[0].currentJob).toBeNull();
  });

  it('rejects an occupied high-tier position', () => {
    useGameStore.setState(state => ({
      players: state.players.map((player, index) => ({
        ...player,
        completedDegrees: ['commerce', 'master-combat'],
        clothingCondition: 100,
        experience: 100,
        dependability: 100,
        ...(index === 1 ? { currentJob: 'guild-administrator', currentWage: 25 } : {}),
      })),
    }));
    const alice = useGameStore.getState().players[0];

    const result = useGameStore.getState().acceptJobOffer(alice.id, 'guild-administrator');

    expect(result?.success).toBe(false);
    expect(result?.message).toMatch(/already held/i);
    expect(useGameStore.getState().players[0].currentJob).toBeNull();
  });

  it('allows entry-level positions to be shared', () => {
    useGameStore.setState(state => ({
      players: state.players.map((player, index) => index === 1
        ? { ...player, currentJob: 'floor-sweeper', currentWage: 4 }
        : player),
    }));
    const alice = useGameStore.getState().players[0];

    expect(useGameStore.getState().acceptJobOffer(alice.id, 'floor-sweeper')?.success).toBe(true);
    expect(useGameStore.getState().players[0].currentJob).toBe('floor-sweeper');
  });

  it('accepts only the canonical current market raise', () => {
    const state = useGameStore.getState();
    const job = getJob('floor-sweeper')!;
    const marketWage = calculateOfferedWage(job, state.priceModifier, state.week).offeredWage;
    useGameStore.setState(current => ({
      players: current.players.map((player, index) => index === 0
        ? { ...player, currentJob: job.id, currentWage: Math.max(1, marketWage - 1) }
        : player),
    }));
    const player = useGameStore.getState().players[0];

    expect(useGameStore.getState().acceptMarketRaise(player.id)?.success).toBe(true);
    expect(useGameStore.getState().players[0].currentWage).toBe(marketWage);
    expect(useGameStore.getState().acceptMarketRaise(player.id)?.success).toBe(false);
  });

  it('exposes only semantic employment offer actions to guests', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('acceptJobOffer')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('acceptMarketRaise')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('setJob')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('negotiateRaise')).toBe(false);

    const state = useGameStore.getState();
    const player = state.players[0];
    expect(validateGuestActionArgs('acceptJobOffer', [player.id, 'floor-sweeper'], state)).toBeNull();
    expect(validateGuestActionArgs('acceptJobOffer', [player.id, ''], state)).toBe('Invalid job');
  });
});
