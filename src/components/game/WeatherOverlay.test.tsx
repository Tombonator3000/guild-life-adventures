import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { WeatherOverlay } from './WeatherOverlay';
import { FestivalOverlay } from './FestivalOverlay';
import { BoardAtmosphere } from './environment/BoardAtmosphere';

afterEach(() => {cleanup(); vi.restoreAllMocks();});
describe('weather rendering', () => {
  it('does not consume gameplay randomness when rendering decoration', () => {
    const random = vi.spyOn(Math,'random');
    render(<><WeatherOverlay particle="rain" weatherType="thunderstorm" /><BoardAtmosphere animated isMobile={false} /><FestivalOverlay activeFestival="harvest-festival" /></>);
    expect(random).not.toHaveBeenCalled();
  });
  it('uses a smaller mobile particle budget and removes motion in calm mode', () => {
    const {container,rerender} = render(<WeatherOverlay particle="rain" />);
    const desktop = container.querySelectorAll('.weather-rain').length;
    rerender(<WeatherOverlay particle="rain" isMobile />);
    expect(container.querySelectorAll('.weather-rain').length).toBeLessThan(desktop);
    rerender(<WeatherOverlay particle="rain" animated={false} />);
    expect(container.querySelector('.weather-particles')).not.toBeInTheDocument();
    expect(container.querySelector('.weather-tint-rain')).toBeInTheDocument();
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
