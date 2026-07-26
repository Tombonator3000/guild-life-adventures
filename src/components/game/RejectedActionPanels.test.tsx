import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '@/types/game.types';
import {
  clearPendingActions,
  resolveAction,
  trackPendingAction,
} from '@/network/NetworkActionProxy';
import { SabotagePanel } from './SabotagePanel';
import { FenceProtectionPanel } from './FenceProtectionPanel';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

function player(id: string, name: string): Player {
  return {
    id,
    name,
    gold: 500,
    timeRemaining: 60,
    health: 100,
    happiness: 50,
    clothingCondition: 100,
    protectionWeeksLeft: 0,
    isGameOver: false,
    inventory: [],
    appliances: {},
    pawnedAppliances: [],
    activeCurses: [],
  } as unknown as Player;
}

afterEach(() => {
  clearPendingActions();
  vi.clearAllMocks();
});

describe('rejected online service actions', () => {
  it('unlocks SabotagePanel immediately when the host rejects the exact request', async () => {
    const actor = player('player-a', 'Ayla');
    const rival = player('player-b', 'Borin');

    render(
      <SabotagePanel
        player={actor}
        rivals={[rival]}
        priceModifier={1}
        onSabotage={(targetId, option) => {
          trackPendingAction('sabotage-request', 'sabotagePlayer', [actor.id, targetId, option.id]);
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Hire Shadowfingers: Pickpocket/i }));
    expect(screen.getByText('Waiting for host…')).toBeInTheDocument();

    act(() => resolveAction('sabotage-request', false, 'Target moved'));

    await waitFor(() => {
      expect(screen.queryByText('Waiting for host…')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hire Shadowfingers: Pickpocket/i })).toBeEnabled();
    });
  });

  it('unlocks protection immediately when the host rejects the purchase', async () => {
    const actor = player('player-a', 'Ayla');
    const rival = player('player-b', 'Borin');

    render(
      <FenceProtectionPanel
        player={actor}
        rivals={[rival]}
        priceModifier={1}
        onBuyProtection={weeks => {
          trackPendingAction('protection-request', 'buyProtection', [actor.id, weeks]);
        }}
        onBuyTipOff={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Protection — 3 Weeks/i }));
    expect(screen.getByText('Waiting for host…')).toBeInTheDocument();

    act(() => resolveAction('protection-request', false, 'Not enough gold'));

    await waitFor(() => {
      expect(screen.queryByText('Waiting for host…')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Protection — 3 Weeks/i })).toBeEnabled();
    });
  });

  it('unlocks tip-off immediately when the host rejects the purchase', async () => {
    const actor = player('player-a', 'Ayla');
    const rival = player('player-b', 'Borin');

    render(
      <FenceProtectionPanel
        player={actor}
        rivals={[rival]}
        priceModifier={1}
        onBuyProtection={() => undefined}
        onBuyTipOff={targetId => {
          trackPendingAction('tipoff-request', 'buyTipOff', [actor.id, targetId]);
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Buy Tip-off/i }));
    expect(screen.getByText('Waiting for host…')).toBeInTheDocument();

    act(() => resolveAction('tipoff-request', false, 'Target unavailable'));

    await waitFor(() => {
      expect(screen.queryByText('Waiting for host…')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Buy Tip-off/i })).toBeEnabled();
    });
  });
});
