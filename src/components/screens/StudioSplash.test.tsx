import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioSplash } from './StudioSplash';
import { shouldShowStudioSplash } from './studioSplashPolicy';
import { playStudioFanfare, playStudioSparkle } from '@/audio/studioFanfare';

vi.mock('@/audio/studioFanfare', () => ({ playStudioFanfare: vi.fn(), playStudioSparkle: vi.fn() }));

const splash = () => screen.getByRole('dialog', { name: /Tom's Happy Happy Funtimes Emporium/ });

describe('StudioSplash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

  it('waits at the gate, then plays the fanfare and hands over to the title by itself', () => {
    const onDone = vi.fn();
    render(<StudioSplash onDone={onDone} />);
    expect(screen.getByText('PRESS ANY KEY')).toBeInTheDocument();
    expect(splash()).toHaveAttribute('data-phase', 'gate');
    expect(playStudioFanfare).not.toHaveBeenCalled();

    fireEvent.pointerDown(splash());
    expect(splash()).toHaveAttribute('data-phase', 'logo');
    expect(playStudioFanfare).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(1600); });
    expect(splash()).toHaveClass('landed', 'pres');
    expect(playStudioSparkle).toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(4300 + 700 + 30); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('skips the logo on the second key press and keeps keys away from the title menu', () => {
    const onDone = vi.fn();
    const titleKey = vi.fn();
    window.addEventListener('keydown', titleKey);
    render(<StudioSplash onDone={onDone} />);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(splash()).toHaveAttribute('data-phase', 'logo');
    fireEvent.keyDown(window, { key: ' ' });
    expect(splash()).toHaveAttribute('data-phase', 'out');
    expect(titleKey).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(400); });
    expect(onDone).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', titleKey);
  });

  it('leaves browser shortcuts alone', () => {
    render(<StudioSplash onDone={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'r', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'F5' });
    expect(splash()).toHaveAttribute('data-phase', 'gate');
  });

  it('stops its timers when unmounted early', () => {
    const onDone = vi.fn();
    const { unmount } = render(<StudioSplash onDone={onDone} />);
    fireEvent.pointerDown(splash());
    unmount();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('shouldShowStudioSplash', () => {
  it('plays for players and stays out of automated browsers', () => {
    expect(shouldShowStudioSplash('', false)).toBe(true);
    expect(shouldShowStudioSplash('?nosplash', false)).toBe(false);
    expect(shouldShowStudioSplash('', true)).toBe(false);
    expect(shouldShowStudioSplash('?splash', true)).toBe(true);
  });
});
