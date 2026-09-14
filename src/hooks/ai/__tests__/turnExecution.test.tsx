import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { useGrimwaldAI } from '@/hooks/useGrimwaldAI';
import { usePlayerAnimation } from '@/hooks/usePlayerAnimation';
import * as generator from '../actionGenerator';
import * as executor from '../actionExecutor';

vi.mock('@/audio/sfxManager', () => ({ playSFX: () => {} }));
vi.mock('@/hooks/useAIAnimationBridge', () => ({ triggerAIAnimation: () => {} }));
vi.mock('@/data/aiTrashTalk', () => ({ getTrashTalkLine: () => null, TRASH_TALK_COOLDOWN: 10000 }));
const goals = { wealth: 2000, happiness: 75, education: 18, career: 50, adventure: 0 };

describe('AI turn execution and presentation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Tom'], false, goals, 'hard', [
      { name: 'Grimwald', difficulty: 'hard' }, { name: 'Seraphina', difficulty: 'hard' },
    ]);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('keeps each opponent’s degree plan across intervening opponents and a new week', () => {
    const observed = vi.spyOn(generator, 'generateActions');
    const hook = renderHook(() => useGrimwaldAI('hard'));
    for (const [index, week] of [[1, 1], [2, 1], [1, 2]]) {
      act(() => {
        useGameStore.setState(s => ({ currentPlayerIndex: index, week, phase: 'playing',
          players: s.players.map(p => ({ ...p, currentLocation: 'academy', timeRemaining: 6,
            foodLevel: 80, happiness: 60, gold: 500, health: 100, clothingCondition: 90,
            weeksSinceRent: 0, rentPrepaidWeeks: 4 })) }));
        void hook.result.current.runAITurn(useGameStore.getState().players[index]);
        vi.advanceTimersByTime(30_000);
      });
    }
    const firstId = useGameStore.getState().players[1].id;
    const resumed = observed.mock.calls.find(args => args[0].id === firstId && args[3] === 2);
    expect(resumed).toBeDefined();
    expect(resumed![6]?.type).toBe('earn-degree');
    expect(resumed![6]?.startTurn).toBe(1);
    hook.unmount();
  });

  it('Skip uses the same actions and resulting resources as the animated turn', () => {
    useGameStore.setState(s => ({ phase: 'playing', currentPlayerIndex: 1,
      players: s.players.map(p => ({ ...p, foodLevel: 80, gold: 500, happiness: 60, clothingCondition: 90 })) }));
    const initial = useGameStore.getState();
    const original = executor.executeAIAction;
    const traces: string[][] = [[], []];
    let run = 0;
    vi.spyOn(executor, 'executeAIAction').mockImplementation((p, a, s) => {
      traces[run].push(`${a.type}:${a.location ?? ''}:${JSON.stringify(a.details ?? {})}`);
      return original(p, a, s);
    });
    const results = [];
    for (run = 0; run < 2; run++) {
      useGameStore.setState({ ...initial, skipAITurn: run === 1 });
      const hook = renderHook(() => useGrimwaldAI('hard'));
      act(() => {
        hook.result.current.resetAdaptiveSystems();
        void hook.result.current.runAITurn(useGameStore.getState().players[1]);
        vi.advanceTimersByTime(30_000);
      });
      results.push(useGameStore.getState().players);
      hook.unmount();
    }
    expect(traces[1]).toEqual(traces[0]);
    expect(results[1]).toEqual(results[0]);
  });

  it('clears an old AI travel animation when the finished opponent goes home', () => {
    useGameStore.setState(s => ({ currentPlayerIndex: 2, phase: 'playing',
      players: s.players.map((p, i) => i === 2 ? { ...p, currentLocation: 'academy', timeRemaining: 0 } : p) }));
    const id = useGameStore.getState().players[2].id;
    const hook = renderHook(() => usePlayerAnimation());
    act(() => hook.result.current.startRemoteAnimation(id, ['cave', 'academy']));
    expect(hook.result.current.animatingPlayer).toBe(id);
    act(() => useGameStore.getState().endTurn());
    expect(useGameStore.getState().players[2].currentLocation).toBe('slums');
    expect(hook.result.current.animatingPlayer).toBeNull();
    expect(hook.result.current.animationPath).toBeNull();
    hook.unmount();
  });

  it('does not let an old timer advance a new week with the same player index', () => {
    useGameStore.setState({ currentPlayerIndex: 1, phase: 'playing' });
    const hook = renderHook(() => useGrimwaldAI('hard'));
    act(() => {
      void hook.result.current.runAITurn(useGameStore.getState().players[1]);
      useGameStore.setState(s => ({ week: s.week + 1 }));
      vi.advanceTimersByTime(30_000);
    });
    expect(useGameStore.getState().week).toBe(2);
    expect(useGameStore.getState().currentPlayerIndex).toBe(1);
    hook.unmount();
  });
});
