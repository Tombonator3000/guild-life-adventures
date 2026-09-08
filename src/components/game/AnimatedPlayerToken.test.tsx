import { Profiler } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Player, LocationId } from '@/types/game.types';
import { AnimatedPlayerToken } from './AnimatedPlayerToken';

vi.mock('./CharacterPortrait', () => ({ CharacterPortrait: () => <span>Portrait</span> }));
vi.mock('@/data/locations', () => ({
  getAnimationPointsWithBoundaries: (path: LocationId[]) => path.length === 1
    ? { points: [[10, 10]], locationBoundaries: [0] }
    : { points: [[10, 10], [20, 20], [30, 20], [40, 30]], locationBoundaries: [0, 2, 3] },
}));

let frames: Map<number, FrameRequestCallback>;
let nextId: number;
const player = { id: 'traveler', name: 'Traveler', color: '#ffd700', currentLocation: 'slums', activeCurses: [] } as unknown as Player;
const path: LocationId[] = ['slums', 'landlord', 'noble-heights'];
function frame(now: number) { act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); }); }
beforeEach(() => {
  frames = new Map(); nextId = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('token movement', () => {
  it('interpolates without React commits, reports crossed locations and finishes exactly once', () => {
    const completed = vi.fn(), reached = vi.fn(), committed = vi.fn();
    const { container } = render(<Profiler id="token" onRender={committed}><AnimatedPlayerToken player={player} isCurrent animationPath={path} onAnimationComplete={completed} onLocationReached={reached} /></Profiler>);
    committed.mockClear();
    frame(0); frame(40);
    expect((container.firstChild as HTMLElement).style.transform).toBe('translate3d(150px, 75px, 0)');
    expect(reached.mock.calls).toEqual([[0]]);
    frame(210); // A slow frame crosses the second location.
    expect(reached.mock.calls).toEqual([[0], [1]]);
    frame(500);
    expect(reached.mock.calls).toEqual([[0], [1], [2]]);
    expect(completed).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(committed).not.toHaveBeenCalled();
  });

  it('cancels an abandoned route and uses current completion callbacks', () => {
    const stale = vi.fn(), latest = vi.fn();
    const { rerender, unmount } = render(<AnimatedPlayerToken player={player} isCurrent animationPath={path} onAnimationComplete={stale} />);
    frame(0); frame(80);
    rerender(<AnimatedPlayerToken player={player} isCurrent animationPath={path} onAnimationComplete={latest} />);
    frame(240);
    expect(stale).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
    rerender(<AnimatedPlayerToken player={player} isCurrent animationPath={[...path]} onAnimationComplete={stale} />);
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    frame(1000);
    expect(stale).not.toHaveBeenCalled();
  });
});
