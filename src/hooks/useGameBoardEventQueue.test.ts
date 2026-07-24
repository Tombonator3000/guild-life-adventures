import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '@/components/game/EventModal';
import { useGameBoardEventQueue } from './useGameBoardEventQueue';

const createEvent = (overrides: Partial<GameEvent> = {}): GameEvent => ({
  id: 'event-one',
  title: 'WEEK EVENT',
  description: 'First line',
  type: 'info',
  ...overrides,
});

describe('useGameBoardEventQueue', () => {
  it('advances through non-empty event lines before dismissing the store event', () => {
    const dismissEvent = vi.fn();
    const currentEvent = createEvent({
      description: 'First line\n\nSecond line\nThird line',
    });
    const { result } = renderHook(() => useGameBoardEventQueue({
      currentEvent,
      eventSource: 'gameplay',
      dismissEvent,
    }));

    expect(result.current.queuedEvent).toMatchObject({
      title: 'WEEK EVENT (1/3)',
      description: 'First line',
    });

    act(() => result.current.handleEventDismiss());
    expect(result.current.queuedEvent).toMatchObject({
      title: 'WEEK EVENT (2/3)',
      description: 'Second line',
    });
    expect(dismissEvent).not.toHaveBeenCalled();

    act(() => result.current.handleEventDismiss());
    expect(result.current.queuedEvent).toMatchObject({
      title: 'WEEK EVENT (3/3)',
      description: 'Third line',
    });

    act(() => result.current.handleEventDismiss());
    expect(dismissEvent).toHaveBeenCalledTimes(1);
    expect(result.current.queuedEvent).toMatchObject({
      title: 'WEEK EVENT (1/3)',
      description: 'First line',
    });
  });

  it('keeps weekend event text together and dismisses it in one step', () => {
    const dismissEvent = vi.fn();
    const currentEvent = createEvent({
      title: 'WEEKEND EVENTS',
      description: 'First result\nSecond result',
    });
    const { result } = renderHook(() => useGameBoardEventQueue({
      currentEvent,
      eventSource: 'weekend',
      dismissEvent,
    }));

    expect(result.current.queuedEvent).toEqual(currentEvent);

    act(() => result.current.handleEventDismiss());
    expect(dismissEvent).toHaveBeenCalledTimes(1);
  });

  it('resets to the first line when the event id changes', () => {
    const dismissEvent = vi.fn();
    const firstEvent = createEvent({
      id: 'first-event',
      description: 'First A\nFirst B',
    });
    const secondEvent = createEvent({
      id: 'second-event',
      title: 'SECOND EVENT',
      description: 'Second A\nSecond B',
    });
    const { result, rerender } = renderHook(
      ({ currentEvent }: { currentEvent: GameEvent }) => useGameBoardEventQueue({
        currentEvent,
        eventSource: 'gameplay',
        dismissEvent,
      }),
      { initialProps: { currentEvent: firstEvent } },
    );

    act(() => result.current.handleEventDismiss());
    expect(result.current.queuedEvent?.description).toBe('First B');

    rerender({ currentEvent: secondEvent });
    expect(result.current.queuedEvent).toMatchObject({
      title: 'SECOND EVENT (1/2)',
      description: 'Second A',
    });
  });

  it('returns no queued event when there is no current event', () => {
    const { result } = renderHook(() => useGameBoardEventQueue({
      currentEvent: null,
      eventSource: null,
      dismissEvent: vi.fn(),
    }));

    expect(result.current.queuedEvent).toBeNull();
  });
});
