import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CreditsScreen } from './CreditsScreen';
import { audioManager } from '@/audio/audioManager';
import { MUSIC_TRACKS } from '@/audio/musicConfig';

const state = vi.hoisted(() => ({muted:true,visible:true}));
vi.mock('@/audio/audioManager', () => ({audioManager:{stop:vi.fn(),play:vi.fn(),getCurrentTrack:() => 'main-theme'}}));
vi.mock('@/hooks/useMusic', () => ({useAudioSettings:() => ({musicMuted:state.muted})}));
vi.mock('@/hooks/useEnvironmentActivity', () => ({useEnvironmentActivity:() => ({reducedMotion:true,visible:state.visible})}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('keeps credits quiet when muted or hidden and uses the shared music path when enabled', () => {
  const {rerender} = render(<CreditsScreen onClose={vi.fn()} />);
  expect(audioManager.stop).toHaveBeenCalled();
  expect(audioManager.play).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Roll credits'})).toBeDisabled();
  expect(screen.getByText('Tom Husby',{exact:true})).toBeVisible();

  state.muted = false;
  rerender(<CreditsScreen onClose={vi.fn()} />);
  expect(audioManager.play).toHaveBeenCalledTimes(1);
  expect(Object.keys(MUSIC_TRACKS)).toContain(vi.mocked(audioManager.play).mock.calls[0][0]);

  state.visible = false;
  rerender(<CreditsScreen onClose={vi.fn()} />);
  expect(audioManager.stop).toHaveBeenCalledTimes(2);
});
