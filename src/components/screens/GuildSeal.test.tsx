import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuildSeal } from './GuildSeal';

const { createSeal, disposeSeal } = vi.hoisted(() => ({ createSeal: vi.fn(), disposeSeal: vi.fn() }));
vi.mock('./guildSealScene', () => ({ createGuildSeal: createSeal }));

let reduced = false;
let wide = true;
let motionChange: (() => void) | undefined;
beforeEach(() => {
  reduced = false;
  wide = true;
  motionChange = undefined;
  createSeal.mockReset().mockReturnValue(disposeSeal);
  disposeSeal.mockReset();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('reduced-motion') ? reduced : wide;
    },
    addEventListener: (_: string, cb: () => void) => {
      if (query.includes('reduced-motion')) motionChange = cb;
    },
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('optional guild seal', () => {
  it('keeps all menu content available when WebGL setup fails', async () => {
    createSeal.mockImplementation(() => {
      throw new Error('GPU unavailable');
    });
    const { container } = render(
      <>
        <GuildSeal detail="full" />
        <button>New Adventure</button>
      </>,
    );
    await waitFor(() => expect(createSeal).toHaveBeenCalledOnce());
    expect(container.querySelector('.entry-seal')).toHaveAttribute('data-renderer', 'static');
    expect(screen.getByRole('button', { name: 'New Adventure' })).toBeEnabled();
  });

  it('releases the scene on unmount and immediately respects a changed motion preference', async () => {
    const { container, unmount } = render(<GuildSeal detail="full" />);
    await waitFor(() =>
      expect(container.querySelector('.entry-seal')).toHaveAttribute('data-renderer', 'webgl'),
    );
    act(() => {
      reduced = true;
      motionChange?.();
    });
    expect(disposeSeal).toHaveBeenCalledOnce();
    expect(container.querySelector('.entry-seal')).toHaveAttribute('data-renderer', 'static');
    act(() => {
      reduced = false;
      motionChange?.();
    });
    await waitFor(() => expect(createSeal).toHaveBeenCalledTimes(2));
    unmount();
    expect(disposeSeal).toHaveBeenCalledTimes(2);
  });

  it.each(['reduced', 'off'] as const)('never creates a GPU scene with %s effects', async (detail) => {
    render(<GuildSeal detail={detail} />);
    await act(async () => {});
    expect(createSeal).not.toHaveBeenCalled();
  });

  it('uses the static seal on phones and when reduced motion is already enabled', async () => {
    wide = false;
    const view = render(<GuildSeal detail="full" />);
    await act(async () => {});
    expect(createSeal).not.toHaveBeenCalled();
    view.unmount();
    wide = true;
    reduced = true;
    render(<GuildSeal detail="full" />);
    await act(async () => {});
    expect(createSeal).not.toHaveBeenCalled();
  });
});
