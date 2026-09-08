import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useStorm } from './useStorm';
vi.mock('@/audio/sfxManager',()=>({playSFX:vi.fn()}));
import { playSFX } from '@/audio/sfxManager';
afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks();});
it('plays one delayed thunder and cancels pending thunder when motion or the storm stops',()=>{
  vi.useFakeTimers();const {result,rerender}=renderHook(({enabled})=>useStorm(enabled),{initialProps:{enabled:true}});
  act(()=>vi.advanceTimersByTime(4500));expect(result.current).toBe(0);expect(playSFX).not.toHaveBeenCalled();
  act(()=>vi.advanceTimersByTime(900));expect(playSFX).toHaveBeenCalledWith('weather-thunder');
  rerender({enabled:false});vi.mocked(playSFX).mockClear();
  act(()=>vi.advanceTimersByTime(30000));expect(playSFX).not.toHaveBeenCalled();
  rerender({enabled:true});act(()=>vi.advanceTimersByTime(4500));rerender({enabled:false});
  act(()=>vi.advanceTimersByTime(900));expect(playSFX).not.toHaveBeenCalled();expect(result.current).toBe(null);
});
