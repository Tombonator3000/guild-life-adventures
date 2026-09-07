import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { WeatherOverlay } from './WeatherOverlay';
import { FestivalOverlay } from './FestivalOverlay';
import { BoardAtmosphere } from './environment/BoardAtmosphere';

vi.mock('@/audio/sfxManager', () => ({ playSFX: vi.fn() }));
import { playSFX } from '@/audio/sfxManager';

// jsdom has no canvas renderer; the browser journey verifies actual pixels.
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(() => {cleanup(); vi.restoreAllMocks(); vi.useRealTimers();});
describe('weather rendering', () => {
  it('does not consume gameplay randomness when rendering decoration', () => {
    const random = vi.spyOn(Math,'random');
    render(<><WeatherOverlay particle="rain" weatherType="thunderstorm" /><BoardAtmosphere animated isMobile={false} /><FestivalOverlay activeFestival="harvest-festival" /></>);
    expect(random).not.toHaveBeenCalled();
  });
  it('uses a smaller mobile particle budget and removes motion in calm mode', () => {
    const {container,rerender} = render(<WeatherOverlay particle="rain" />);
    const desktop = Number(container.querySelector('canvas')?.dataset.particleBudget);
    rerender(<WeatherOverlay particle="rain" isMobile />);
    expect(Number(container.querySelector('canvas')?.dataset.particleBudget)).toBeLessThan(desktop);
    rerender(<WeatherOverlay particle="rain" animated={false} />);
    expect(container.querySelector('.weather-particles')).not.toBeInTheDocument();
    expect(container.querySelector('.weather-tint-rain')).toBeInTheDocument();
  });
  it('restores a storm strike followed by thunder, and cancels pending thunder when motion stops', () => {
    vi.useFakeTimers(); vi.mocked(playSFX).mockClear();
    const {container,rerender}=render(<WeatherOverlay particle="rain" weatherType="thunderstorm" />);
    act(() => vi.advanceTimersByTime(4500));
    expect(container.querySelector('.weather-lightning')).toBeInTheDocument();
    expect(playSFX).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(900));
    expect(playSFX).toHaveBeenCalledWith('weather-thunder');
    vi.mocked(playSFX).mockClear();
    rerender(<WeatherOverlay particle="rain" weatherType="thunderstorm" animated={false} />);
    act(() => vi.advanceTimersByTime(30000));
    expect(playSFX).not.toHaveBeenCalled();
    rerender(<WeatherOverlay particle="light-rain" weatherType="harvest-rain" />);
    act(() => vi.advanceTimersByTime(30000));
    expect(container.querySelector('.weather-lightning')).not.toBeInTheDocument();
    expect(playSFX).not.toHaveBeenCalled();
    rerender(<WeatherOverlay particle="rain" weatherType="thunderstorm" />);
    act(() => vi.advanceTimersByTime(4500));
    rerender(<WeatherOverlay particle="rain" weatherType="thunderstorm" animated={false} />);
    act(() => vi.advanceTimersByTime(900));
    expect(playSFX).not.toHaveBeenCalled();
  });
  it('shelters passing birds during storms and snow covers drifting leaves', () => {
    const {container,rerender} = render(<BoardAtmosphere animated isMobile={false} />);
    expect(container.querySelector('.environment-swallow')).toBeInTheDocument();
    rerender(<BoardAtmosphere animated isMobile={false} weatherType="thunderstorm" />);
    expect(container.querySelector('.environment-swallow')).not.toBeInTheDocument();
    rerender(<BoardAtmosphere animated isMobile={false} weatherType="snowstorm" />);
    expect(container.querySelector('.environment-leaf')).not.toBeInTheDocument();
  });
});
