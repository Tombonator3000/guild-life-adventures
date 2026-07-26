import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { TutorialOverlay } from './TutorialOverlay';

const goals = { wealth: 5000, happiness: 75, education: 45, career: 75, adventure: 0 };

function prepare() {
  useGameStore.getState().resetForNewGame();
  useGameStore.getState().startNewGame(['Guide Tester'], false, goals);
  useGameStore.getState().setTutorialStep(0);
  useGameStore.getState().setShowTutorial(true);
}

function updatePlayer(changes: Record<string, unknown>) {
  act(() => {
    useGameStore.setState(state => ({
      players: state.players.map((player, index) => index === 0 ? { ...player, ...changes } : player),
    }));
  });
}

describe('TutorialOverlay guided first turn', () => {
  beforeEach(() => {
    localStorage.clear();
    prepare();
  });

  it('advances only after real player state changes', async () => {
    const onClose = vi.fn();
    render(<TutorialOverlay onClose={onClose} />);

    expect(screen.getByText('Your First Turn — Learn by Doing')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start guided turn/i }));
    expect(await screen.findByText('1. Travel to the Guild Hall')).toBeInTheDocument();

    updatePlayer({ currentLocation: 'guild-hall' });
    expect(await screen.findByText('2. Get an Entry-Level Job')).toBeInTheDocument();

    updatePlayer({ currentJob: 'floor-sweeper', currentWage: 4 });
    expect(await screen.findByText('3. Work One Full Shift')).toBeInTheDocument();

    await waitFor(() => expect(useGameStore.getState().tutorialStep).toBe(3));
    updatePlayer({ totalShiftsWorked: 1, shiftsWorkedSinceHire: 1, gold: 124 });
    expect(await screen.findByText('4. Buy Food for the Week')).toBeInTheDocument();

    await waitFor(() => expect(useGameStore.getState().tutorialStep).toBe(4));
    updatePlayer({ foodLevel: 80, hasStoreBoughtFood: true, gold: 116 });
    expect(await screen.findByText('5. Protect Some Gold at the Bank')).toBeInTheDocument();

    await waitFor(() => expect(useGameStore.getState().tutorialStep).toBe(5));
    updatePlayer({ savings: 50, gold: 66 });
    expect(await screen.findByText('6. Review the Turn and End It')).toBeInTheDocument();

    act(() => {
      useGameStore.setState(state => ({ week: state.week + 1 }));
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(useGameStore.getState().showTutorial).toBe(false);
      expect(useGameStore.getState().tutorialStep).toBe(0);
    });
    expect(localStorage.getItem('guild-life-guided-tutorial-completed')).toBe('true');
  });

  it('keeps the corrected rule cards as a reference fallback', async () => {
    render(<TutorialOverlay onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /rule reference/i }));
    expect(await screen.findByRole('dialog', { name: /tutorial rule reference/i })).toBeInTheDocument();
    expect(screen.getByText('Welcome to Guild Life!')).toBeInTheDocument();
    expect(screen.getByText(/60 hours each turn/i)).toBeInTheDocument();
  });

  it('does not cover spectators, remote players or AI turns', () => {
    act(() => {
      useGameStore.setState({
        networkMode: 'guest',
        localPlayerId: 'another-player',
        isSpectating: true,
      });
    });

    const { container, rerender } = render(<TutorialOverlay onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();

    act(() => {
      useGameStore.setState(state => ({
        networkMode: 'local',
        localPlayerId: null,
        isSpectating: false,
        players: state.players.map((player, index) => index === 0 ? { ...player, isAI: true } : player),
      }));
    });
    rerender(<TutorialOverlay onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('can be skipped without mutating the real game state', () => {
    const onClose = vi.fn();
    const before = useGameStore.getState().players[0];
    render(<TutorialOverlay onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /skip guide/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().showTutorial).toBe(false);
    expect(useGameStore.getState().players[0]).toEqual(before);
  });
});
