import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationId } from '@/types/game.types';

const bridgeMocks = vi.hoisted(() => ({
  registerAIAnimateCallback: vi.fn(),
}));

vi.mock('./useAIAnimationBridge', () => bridgeMocks);

import { useGameBoardAnimationSync } from './useGameBoardAnimationSync';

const path: LocationId[] = ['slums', 'bank'];

describe('useGameBoardAnimationSync', () => {
  beforeEach(() => {
    bridgeMocks.registerAIAnimateCallback.mockClear();
  });

  it('registers the animation callback and clears the bridge on unmount', () => {
    const startRemoteAnimation = vi.fn();
    const { unmount } = renderHook(() => useGameBoardAnimationSync({
      animatingPlayer: null,
      remoteAnimation: null,
      startRemoteAnimation,
      clearRemoteAnimation: vi.fn(),
    }));

    expect(bridgeMocks.registerAIAnimateCallback).toHaveBeenCalledWith(startRemoteAnimation);

    unmount();
    expect(bridgeMocks.registerAIAnimateCallback).toHaveBeenLastCalledWith(null);
  });

  it('starts and clears a pending remote animation when the board is idle', () => {
    const startRemoteAnimation = vi.fn();
    const clearRemoteAnimation = vi.fn();

    renderHook(() => useGameBoardAnimationSync({
      animatingPlayer: null,
      remoteAnimation: { playerId: 'remote-player', path },
      startRemoteAnimation,
      clearRemoteAnimation,
    }));

    expect(startRemoteAnimation).toHaveBeenCalledWith('remote-player', path);
    expect(clearRemoteAnimation).toHaveBeenCalledTimes(1);
  });

  it('waits until the current animation finishes before consuming the remote request', () => {
    const startRemoteAnimation = vi.fn();
    const clearRemoteAnimation = vi.fn();
    const remoteAnimation = { playerId: 'remote-player', path };
    const { rerender } = renderHook(
      ({ animatingPlayer }: { animatingPlayer: string | null }) => useGameBoardAnimationSync({
        animatingPlayer,
        remoteAnimation,
        startRemoteAnimation,
        clearRemoteAnimation,
      }),
      { initialProps: { animatingPlayer: 'local-player' } },
    );

    expect(startRemoteAnimation).not.toHaveBeenCalled();
    expect(clearRemoteAnimation).not.toHaveBeenCalled();

    rerender({ animatingPlayer: null });
    expect(startRemoteAnimation).toHaveBeenCalledWith('remote-player', path);
    expect(clearRemoteAnimation).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no remote animation request', () => {
    const startRemoteAnimation = vi.fn();
    const clearRemoteAnimation = vi.fn();

    renderHook(() => useGameBoardAnimationSync({
      animatingPlayer: null,
      remoteAnimation: null,
      startRemoteAnimation,
      clearRemoteAnimation,
    }));

    expect(startRemoteAnimation).not.toHaveBeenCalled();
    expect(clearRemoteAnimation).not.toHaveBeenCalled();
  });
});
