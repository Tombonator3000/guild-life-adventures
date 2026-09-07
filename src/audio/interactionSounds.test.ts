import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { installInteractionSounds } from './interactionSounds';
import { sfxManager } from './sfxManager';
import { playSynthSFX } from './synthSFX';

vi.mock('./synthSFX', () => ({playSynthSFX:vi.fn()}));
let uninstall: (() => void) | undefined;
afterEach(() => { uninstall?.(); document.body.innerHTML=''; vi.restoreAllMocks(); vi.useRealTimers(); sfxManager.setMuted(false); });
describe('interaction feedback', () => {
  it('uses contextual feedback, leaves disabled controls silent, and preserves handler sounds', () => {
    vi.useFakeTimers(); uninstall=installInteractionSounds();
    document.body.innerHTML='<div data-ui-sound="coin-spend"><button id="buy">Buy</button></div><button id="disabled" disabled>Locked</button><button id="own">Work</button><button id="silent" data-ui-sound="off">Silent</button>';
    const play=vi.spyOn(sfxManager,'play').mockImplementation(() => {sfxManager.playRevision++;});
    fireEvent.click(document.querySelector('#buy')!); vi.runAllTimers();
    expect(play).toHaveBeenLastCalledWith('coin-spend');
    fireEvent.click(document.querySelector('#disabled')!); fireEvent.click(document.querySelector('#silent')!); vi.runAllTimers();
    expect(play).toHaveBeenCalledTimes(1);
    document.querySelector('#own')!.addEventListener('click', e => {e.stopPropagation();sfxManager.play('work-complete');});
    fireEvent.click(document.querySelector('#own')!); vi.runAllTimers();
    expect(play).toHaveBeenCalledTimes(2);
    expect(play).toHaveBeenLastCalledWith('work-complete');
  });
  it('routes synthesized contextual feedback through the existing mute and volume settings', () => {
    vi.mocked(playSynthSFX).mockClear();
    sfxManager.setVolume(.2); sfxManager.setMuted(true); sfxManager.play('study');
    expect(playSynthSFX).not.toHaveBeenCalled();
    sfxManager.setMuted(false); sfxManager.play('study');
    expect(playSynthSFX).toHaveBeenCalledWith('study',.4*.2);
    sfxManager.setVolume(.5);
  });
});
