import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

function preparePlayer(overrides: Record<string, unknown> = {}) {
  useGameStore.setState(state => ({
    week: 3,
    priceModifier: 2,
    players: state.players.map(player => ({
      ...player,
      currentLocation: 'landlord',
      housing: 'slums',
      gold: 2000,
      timeRemaining: 12,
      lockedRent: 0,
      weeksSinceRent: 1,
      rentPrepaidWeeks: 0,
      rentExtensionUsed: false,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('host-authoritative housing services', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Housing Tester'], false, goals);
  });

  it('prepaids rent using the host economy modifier and deducts time atomically', () => {
    const playerId = preparePlayer();
    const result = useGameStore.getState().payHousingRent(playerId, 4);
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(1400); // 75 * 2 * 4
    expect(player.timeRemaining).toBe(11);
    expect(player.rentPrepaidWeeks).toBe(4);
    expect(player.weeksSinceRent).toBe(0);
  });

  it('uses locked rent rather than a manipulated or changed market rate', () => {
    const playerId = preparePlayer({ lockedRent: 90 });
    useGameStore.getState().payHousingRent(playerId, 1);
    const player = useGameStore.getState().players[0];

    expect(player.gold).toBe(1910);
  });

  it('rejects payment away from the Landlord or while the office is closed', () => {
    let playerId = preparePlayer({ currentLocation: 'bank' });
    expect(useGameStore.getState().payHousingRent(playerId, 1)?.success).toBe(false);

    playerId = preparePlayer({ currentLocation: 'landlord', weeksSinceRent: 1 });
    useGameStore.setState({ week: 1 });
    expect(useGameStore.getState().payHousingRent(playerId, 1)?.success).toBe(false);
  });

  it('moves housing using canonical market rent, cost and four-hour duration', () => {
    const playerId = preparePlayer({ housing: 'slums' });
    const result = useGameStore.getState().moveHousingAtLandlord(playerId, 'noble');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.housing).toBe('noble');
    expect(player.lockedRent).toBe(240);
    expect(player.gold).toBe(1520); // 2 * 240 move-in cost
    expect(player.timeRemaining).toBe(8);
    expect(player.rentPrepaidWeeks).toBe(0);
  });

  it('rejects invalid, duplicate or unaffordable housing moves', () => {
    let playerId = preparePlayer({ housing: 'slums' });
    expect(useGameStore.getState().moveHousingAtLandlord(playerId, 'slums')?.success).toBe(false);
    expect(useGameStore.getState().moveHousingAtLandlord(playerId, 'homeless')?.success).toBe(false);

    playerId = preparePlayer({ gold: 100 });
    expect(useGameStore.getState().moveHousingAtLandlord(playerId, 'noble')?.success).toBe(false);
  });

  it('resolves a successful extension and time cost atomically', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerId = preparePlayer({ weeksSinceRent: 3, dependability: 0 });
    const result = useGameStore.getState().requestRentExtensionAtLandlord(playerId);
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.weeksSinceRent).toBe(2);
    expect(player.timeRemaining).toBe(11);
    expect(player.rentExtensionUsed).toBe(true);
  });

  it('charges time and the larger happiness penalty when pleading fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const playerId = preparePlayer({ weeksSinceRent: 3, happiness: 50, dependability: 0 });
    const result = useGameStore.getState().requestRentExtensionAtLandlord(playerId);
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(false);
    expect(player.weeksSinceRent).toBe(3);
    expect(player.timeRemaining).toBe(11);
    expect(player.happiness).toBe(45);
  });

  it('allows only semantic housing actions to guests', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('payHousingRent')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('moveHousingAtLandlord')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('requestRentExtensionAtLandlord')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('setHousing')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('payRent')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('prepayRent')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('moveToHousing')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('begForMoreTime')).toBe(false);
  });
});
