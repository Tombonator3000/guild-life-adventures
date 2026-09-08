import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { GeneralStorePanel } from './GeneralStorePanel';

const goals = { wealth: 5000, happiness: 75, education: 45, career: 75, adventure: 0 };

function Harness() {
  const player = useGameStore(state => state.players[0]);
  const priceModifier = useGameStore(state => state.priceModifier);
  return player ? <GeneralStorePanel player={player} priceModifier={priceModifier} /> : null;
}

function prepare(hasNewspaper = false) {
  useGameStore.getState().resetForNewGame();
  useGameStore.getState().startNewGame(['Reader'], false, goals);
  useGameStore.setState(state => ({
    players: state.players.map(player => ({ ...player, currentLocation: 'general-store', gold: 100, hasNewspaper })),
  }));
}

describe('GeneralStorePanel newspaper flow', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
    localStorage.clear();
    prepare(false);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens the newspaper automatically after a successful purchase', async () => {
    render(<Harness />);
    const beforeGold = useGameStore.getState().players[0].gold;
    fireEvent.click(screen.getByRole('button', { name: /Guildholm Herald/i }));

    expect(await screen.findByText('WEEK 1 · CITY EDITION')).toBeInTheDocument();
    expect(useGameStore.getState().players[0].hasNewspaper).toBe(true);
    expect(useGameStore.getState().players[0].gold).toBeLessThan(beforeGold);

    fireEvent.click(screen.getAllByRole('button', { name: 'Close newspaper' })[0]);
    await waitFor(() => expect(screen.queryByText('WEEK 1 · CITY EDITION')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Read The Guildholm Herald/i })).toBeInTheDocument();
  });

  it('reopens an owned newspaper without charging for a second purchase', async () => {
    prepare(true);
    render(<Harness />);

    expect(screen.queryByText('WEEK 1 · CITY EDITION')).not.toBeInTheDocument();
    const beforeGold = useGameStore.getState().players[0].gold;
    fireEvent.click(screen.getByRole('button', { name: /Read The Guildholm Herald/i }));

    expect(await screen.findByText('WEEK 1 · CITY EDITION')).toBeInTheDocument();
    expect(useGameStore.getState().players[0].gold).toBe(beforeGold);
  });

  it('opens when an online host sync changes ownership from false to true', async () => {
    render(<Harness />);
    act(() => {
      useGameStore.setState(state => ({
        players: state.players.map(player => ({ ...player, hasNewspaper: true })),
      }));
    });

    await waitFor(() => expect(screen.getByText('WEEK 1 · CITY EDITION')).toBeInTheDocument());
  });
});
