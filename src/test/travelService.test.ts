import { beforeEach, describe, expect, it } from 'vitest';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';
import { validateGuestActionArgs, validateGuestActionRequest } from '@/network/actionValidation';
import { useGameStore } from '@/store/gameStore';
import { calculateCanonicalTravelCost } from '@/store/helpers/travelServiceHelpers';
import type { LocationId } from '@/types/game.types';

const goals = {
  wealth: 5000,
  happiness: 100,
  education: 45,
  career: 75,
  adventure: 0,
};

function preparePlayer(overrides: Record<string, unknown> = {}) {
  useGameStore.setState({ networkMode: 'local' });
  useGameStore.getState().startNewGame(['Traveler'], false, goals);
  useGameStore.setState(state => ({
    weather: null,
    players: state.players.map(player => ({
      ...player,
      currentLocation: 'general-store' as const,
      timeRemaining: 60,
      hadRandomEventThisTurn: true,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('host-authoritative route travel', () => {
  beforeEach(() => {
    preparePlayer();
  });

  it('computes and deducts the canonical route cost on the host', () => {
    const player = useGameStore.getState().players[0];
    const result = useGameStore.getState().travelPlayer(player.id, ['general-store', 'bank']);

    expect(result?.success).toBe(true);
    const updated = useGameStore.getState().players[0];
    expect(updated.currentLocation).toBe('bank');
    expect(updated.previousLocation).toBe('general-store');
    expect(updated.timeRemaining).toBe(59);
  });

  it('applies the current weather cost instead of a client price', () => {
    useGameStore.setState({
      weather: {
        type: 'snowstorm',
        name: 'Snowstorm',
        description: 'Heavy snow.',
        weeksRemaining: 1,
        movementCostExtra: 1,
        priceMultiplier: 1,
        happinessPerWeek: 0,
        robberyMultiplier: 1,
        foodSpoilageChance: 0,
        particle: 'snow',
      },
    });
    const player = useGameStore.getState().players[0];

    expect(calculateCanonicalTravelCost(2, 1)).toBe(4);
    expect(useGameStore.getState().travelPlayer(
      player.id,
      ['general-store', 'bank', 'forge'],
    )?.success).toBe(true);
    expect(useGameStore.getState().players[0].timeRemaining).toBe(56);
  });

  it('rejects routes that do not start at the authoritative current location', () => {
    const player = useGameStore.getState().players[0];

    const result = useGameStore.getState().travelPlayer(player.id, ['bank', 'forge']);

    expect(result?.success).toBe(false);
    expect(useGameStore.getState().players[0].currentLocation).toBe('general-store');
    expect(useGameStore.getState().players[0].timeRemaining).toBe(60);
  });

  it('rejects unknown locations and non-adjacent jumps', () => {
    const player = useGameStore.getState().players[0];

    expect(useGameStore.getState().travelPlayer(
      player.id,
      ['general-store', 'not-a-place' as LocationId],
    )?.success).toBe(false);
    expect(useGameStore.getState().travelPlayer(
      player.id,
      ['general-store', 'forge'],
    )?.success).toBe(false);
    expect(useGameStore.getState().players[0].currentLocation).toBe('general-store');
  });

  it('accepts and charges the actual longer route used after redirection', () => {
    const player = useGameStore.getState().players[0];
    const redirectedRoute: LocationId[] = [
      'general-store', 'bank', 'forge', 'guild-hall', 'cave', 'academy',
      'enchanter', 'armory', 'rusty-tankard', 'shadow-market', 'fence', 'slums',
    ];

    expect(useGameStore.getState().travelPlayer(player.id, redirectedRoute)?.success).toBe(true);
    const updated = useGameStore.getState().players[0];
    expect(updated.currentLocation).toBe('slums');
    expect(updated.timeRemaining).toBe(49);
  });

  it('rejects a valid route when the host says there is not enough time', () => {
    const playerId = preparePlayer({ timeRemaining: 1 });

    const result = useGameStore.getState().travelPlayer(
      playerId,
      ['general-store', 'bank', 'forge'],
    );

    expect(result?.success).toBe(false);
    expect(useGameStore.getState().players[0].currentLocation).toBe('general-store');
    expect(useGameStore.getState().players[0].timeRemaining).toBe(1);
  });

  it('accepts only route intent in the guest protocol', () => {
    const state = useGameStore.getState();
    const player = state.players[0];

    expect(ALLOWED_GUEST_ACTIONS.has('travelPlayer')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('movePlayer')).toBe(false);
    expect(validateGuestActionArgs(
      'travelPlayer',
      [player.id, ['general-store', 'bank']],
      state,
    )).toBeNull();
    expect(validateGuestActionRequest(
      'movePlayer',
      [player.id, 'bank', 0],
      player.id,
      player.id,
      state,
    )).toBe('Action not allowed');
  });
});
