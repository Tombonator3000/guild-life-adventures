import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Player } from '@/types/game.types';
import { useGameBoardUiState } from './useGameBoardUiState';

const player = { id: 'player-one', name: 'Player One' } as Player;

describe('useGameBoardUiState', () => {
  it('starts with all transient UI closed', () => {
    const { result } = renderHook(() => useGameBoardUiState());

    expect(result.current.showZoneEditor).toBe(false);
    expect(result.current.showDebugOverlay).toBe(false);
    expect(result.current.showGameMenu).toBe(false);
    expect(result.current.showLeftDrawer).toBe(false);
    expect(result.current.showRightDrawer).toBe(false);
    expect(result.current.fullboardMode).toBe(false);
    expect(result.current.viewingPlayer).toBeNull();
  });

  it('opens and closes the regular menu, drawers and fullboard mode', () => {
    const { result } = renderHook(() => useGameBoardUiState());

    act(() => {
      result.current.openGameMenu();
      result.current.openLeftDrawer();
      result.current.openRightDrawer();
      result.current.enterFullboard();
    });

    expect(result.current.showGameMenu).toBe(true);
    expect(result.current.showLeftDrawer).toBe(true);
    expect(result.current.showRightDrawer).toBe(true);
    expect(result.current.fullboardMode).toBe(true);

    act(() => {
      result.current.closeGameMenu();
      result.current.closeLeftDrawer();
      result.current.closeRightDrawer();
      result.current.exitFullboard();
    });

    expect(result.current.showGameMenu).toBe(false);
    expect(result.current.showLeftDrawer).toBe(false);
    expect(result.current.showRightDrawer).toBe(false);
    expect(result.current.fullboardMode).toBe(false);
  });

  it('closes the mobile right drawer before opening the game menu', () => {
    const { result } = renderHook(() => useGameBoardUiState());

    act(() => result.current.openRightDrawer());
    expect(result.current.showRightDrawer).toBe(true);

    act(() => result.current.openMobileGameMenu());
    expect(result.current.showRightDrawer).toBe(false);
    expect(result.current.showGameMenu).toBe(true);
  });

  it('closes the mobile right drawer before opening the zone editor', () => {
    const { result } = renderHook(() => useGameBoardUiState());

    act(() => result.current.openRightDrawer());
    act(() => result.current.openMobileZoneEditor());

    expect(result.current.showRightDrawer).toBe(false);
    expect(result.current.showZoneEditor).toBe(true);

    act(() => result.current.closeZoneEditor());
    expect(result.current.showZoneEditor).toBe(false);
  });

  it('toggles debug state and manages the viewed player', () => {
    const { result } = renderHook(() => useGameBoardUiState());

    act(() => result.current.toggleDebugOverlay());
    expect(result.current.showDebugOverlay).toBe(true);

    act(() => result.current.toggleDebugOverlay());
    expect(result.current.showDebugOverlay).toBe(false);

    act(() => result.current.setViewingPlayer(player));
    expect(result.current.viewingPlayer).toBe(player);

    act(() => result.current.closePlayerInfo());
    expect(result.current.viewingPlayer).toBeNull();
  });
});
