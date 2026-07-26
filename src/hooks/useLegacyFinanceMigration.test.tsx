import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { useLegacyFinanceMigration } from './useLegacyFinanceMigration';

const goals = { wealth: 5000, happiness: 75, education: 45, career: 75, adventure: 0 };

describe('useLegacyFinanceMigration', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Saver'], false, goals);
  });

  it('moves legacy investments into savings immediately when gameplay state is mounted', async () => {
    act(() => {
      useGameStore.setState(state => ({
        players: state.players.map(player => ({ ...player, savings: 25, investments: 175 })),
      }));
    });

    renderHook(() => useLegacyFinanceMigration());

    await waitFor(() => {
      const player = useGameStore.getState().players[0];
      expect(player.savings).toBe(200);
      expect(player.investments).toBe(0);
    });
  });
});
