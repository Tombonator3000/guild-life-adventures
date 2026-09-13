import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CreditsScreen } from './CreditsScreen';

vi.mock('@/audio/audioManager', () => ({audioManager:{stop:vi.fn(),play:vi.fn()}}));
vi.mock('@/hooks/useMusic', () => ({useAudioSettings:() => ({musicMuted:true,musicVolume:.25})}));
vi.mock('@/hooks/useEnvironmentActivity', () => ({useEnvironmentActivity:() => ({reducedMotion:true,visible:true})}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('honors muted music and reduced motion when opening the credits', () => {
  const created: {muted:boolean;volume:number;play:ReturnType<typeof vi.fn>}[]=[];
  vi.stubGlobal('Audio', class {
    src=''; muted=false; volume=1; loop=false;
    play=vi.fn().mockResolvedValue(undefined); pause=vi.fn();
    constructor() { created.push(this); }
  });
  render(<CreditsScreen onClose={vi.fn()} />);
  expect(created).toHaveLength(1);
  expect(created[0].muted).toBe(true);
  expect(created[0].volume).toBe(.25);
  expect(created[0].play).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Roll credits'})).toBeDisabled();
  expect(screen.getByText('Tom Husby',{exact:true})).toBeVisible();
});
