import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeathEvent } from '@/types/game.types';

vi.mock('@/audio/sfxManager', () => ({ playSFX: vi.fn() }));
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      if (key === 'death.youAreDead') return 'YOU ARE DEAD';
      if (key === 'death.hasFallen') return `${vars?.name ?? 'Player'} has fallen`;
      if (key === 'death.permadeathEnabled') return 'Permadeath is enabled';
      if (key === 'death.riseAgain') return 'Rise Again';
      return key;
    },
  }),
}));

import { DeathModal } from './DeathModal';

const permadeathEvent: DeathEvent = {
  playerId: 'player-0',
  playerName: 'Bjorn',
  isPermadeath: true,
  wasResurrected: false,
  message: 'Your adventure ends here.',
};

describe('DeathModal permadeath choices', () => {
  it('offers explicit spectate and leave actions while survivors remain', () => {
    const onSpectate = vi.fn();
    const onLeave = vi.fn();

    render(
      <DeathModal
        event={permadeathEvent}
        onDismiss={vi.fn()}
        onSpectate={onSpectate}
        onLeave={onLeave}
        canSpectate
        leaveLabel="Leave Game"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Spectate Game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave Game' }));

    expect(onSpectate).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/remaining players will continue automatically/i)).toBeInTheDocument();
  });

  it('shows the final game-over action when nobody remains to spectate', () => {
    const onDismiss = vi.fn();

    render(
      <DeathModal
        event={permadeathEvent}
        onDismiss={onDismiss}
        canSpectate={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Spectate Game' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View Game Over' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
