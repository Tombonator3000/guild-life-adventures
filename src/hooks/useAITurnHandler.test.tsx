import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AIDifficulty, Player } from '@/types/game.types';

const mocks = vi.hoisted(() => ({
  runAITurn: vi.fn(),
  resetAdaptiveSystems: vi.fn(),
  getState: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock('@/hooks/useGrimwaldAI', () => ({
  useGrimwaldAI: () => ({
    runAITurn: mocks.runAITurn,
    resetAdaptiveSystems: mocks.resetAdaptiveSystems,
  }),
}));

vi.mock('@/store/gameStore', () => {
  const useGameStore = Object.assign(vi.fn(), { getState: mocks.getState });
  return { useGameStore };
});

vi.mock('sonner', () => ({
  toast: { info: mocks.toastInfo },
}));

import { useAITurnHandler } from './useAITurnHandler';

interface HookProps {
  currentPlayer: Player | undefined;
  phase: string;
  aiDifficulty: AIDifficulty;
}

function makeAI(overrides: Partial<Player> = {}): Player {
  return {
    id: 'ai-1',
    name: 'Grimwald',
    isAI: true,
    aiDifficulty: 'medium',
    ...overrides,
  } as Player;
}

describe('useAITurnHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('does not cancel the scheduled AI turn when thinking state or player data rerenders', () => {
    const ai = makeAI();
    mocks.getState.mockReturnValue({
      players: [ai],
      currentPlayerIndex: 0,
      phase: 'playing',
    });

    const { result, rerender } = renderHook(
      (props: HookProps) => useAITurnHandler(props),
      {
        initialProps: {
          currentPlayer: ai,
          phase: 'playing',
          aiDifficulty: 'medium' as AIDifficulty,
        },
      },
    );

    expect(result.current.aiIsThinking).toBe(true);

    // Emulate a normal Zustand update that returns a fresh player object while
    // the same AI still owns the turn.
    rerender({
      currentPlayer: makeAI({ gold: 75 }),
      phase: 'playing',
      aiDifficulty: 'medium',
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mocks.runAITurn).toHaveBeenCalledTimes(1);
    expect(mocks.runAITurn).toHaveBeenCalledWith(
      ai,
      expect.any(Function),
    );
  });
});
