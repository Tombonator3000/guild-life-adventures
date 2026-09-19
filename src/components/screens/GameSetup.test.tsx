import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { GameSetup } from './GameSetup';
import { useGameStore } from '@/store/gameStore';

// Exercise the real setup and game store. Portrait rendering is covered by browser checks.
vi.mock('@/components/game/CharacterPortrait', () => ({
  CharacterPortrait: () => <span>Portrait</span>,
}));
vi.mock('@/components/game/PortraitPicker', () => ({
  PortraitPicker: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect('mage')}>Select mage portrait</button>
  ),
}));

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  useGameStore.getState().resetForNewGame();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Choose Game Goals' }));

describe('adventure setup', () => {
  it('preserves names, portraits, individual rival difficulty, goals and tutorial across both steps into the actual game', () => {
    render(<GameSetup />);
    fireEvent.change(screen.getByPlaceholderText('Enter name...'), { target: { value: '  Tom  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Choose portrait/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Select mage portrait' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add computer rival' }));
    fireEvent.change(screen.getByPlaceholderText('Rival name...'), { target: { value: '  Rival  ' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Master' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Show Tutorial/ }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Adventure' }));
    expect(screen.getByText(/First to reach all five/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByPlaceholderText('Enter name...')).toHaveValue('  Tom  ');
    expect(screen.getByRole('radio', { name: 'Master' })).toBeChecked();
    next();
    expect(screen.getByRole('button', { name: 'Adventure' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Begin Adventure' }));
    const state = useGameStore.getState();
    expect(state.players.map((player) => player.name)).toEqual(['Tom', 'Rival']);
    expect(state.players[0].portraitId).toBe('mage');
    expect(state.players[1].aiDifficulty).toBe('hard');
    expect(state.goalSettings).toEqual({
      wealth: 4000,
      happiness: 80,
      education: 27,
      career: 65,
      adventure: 12,
    });
    expect(state.showTutorial).toBe(false);
  });

  it('blocks blank rival names and duplicates across humans and rivals', () => {
    render(<GameSetup />);
    fireEvent.change(screen.getByPlaceholderText('Enter name...'), { target: { value: 'Tom' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add computer rival' }));
    fireEvent.change(screen.getByPlaceholderText('Rival name...'), { target: { value: '   ' } });
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Give every adventurer');
    fireEvent.change(screen.getByPlaceholderText('Rival name...'), { target: { value: ' tom ' } });
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('unique names');
    expect(screen.queryByRole('button', { name: 'Begin Adventure' })).toBeNull();
  });

  it('keeps the six-player and four-rival limits and recovers paging after removal', () => {
    render(<GameSetup />);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Add computer rival' }));
    expect(screen.getByRole('button', { name: 'Add computer rival' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add human player' }));
    expect(screen.getByRole('button', { name: 'Add human player' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next players' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next players' }));
    fireEvent.click(
      within(screen.getByRole('article', { name: 'Computer rival 4' })).getByRole('button', {
        name: /Remove/,
      }),
    );
    fireEvent.click(
      within(screen.getByRole('article', { name: 'Computer rival 3' })).getByRole('button', {
        name: /Remove/,
      }),
    );
    expect(screen.getByText('Players 3–4 of 4')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add computer rival' })).toBeEnabled();
  });

  it('labels edited goals as Custom and retains them when changing steps', () => {
    render(<GameSetup />);
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Quick Game' }));
    fireEvent.click(screen.getByText('Customize targets'));
    fireEvent.change(screen.getByRole('slider', { name: /Wealth Target/ }), {
      target: { value: '6000' },
    });
    expect(screen.getByRole('heading', { name: 'Your Custom game' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quick Game' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    next();
    expect(screen.getByText('6,000 gold')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Begin Adventure' }));
    expect(useGameStore.getState().goalSettings.wealth).toBe(6000);
    expect(useGameStore.getState().goalSettings.education).toBe(18);
  });
});
