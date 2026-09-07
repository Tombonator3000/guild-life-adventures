import { useEffect, useState } from 'react';
import { playSFX } from '@/audio/sfxManager';

/** Infrequent single strokes; thunder follows the visible strike, never harvest rain. */
export function useStorm(enabled: boolean) {
  const [strike,setStrike]=useState<number | null>(null);
  useEffect(() => {
    if (!enabled) { setStrike(null); return; }
    let index=0;
    let next:ReturnType<typeof setTimeout>;
    let fade:ReturnType<typeof setTimeout>;
    let thunder:ReturnType<typeof setTimeout>;
    const flash=() => {
      setStrike(index);
      thunder=setTimeout(() => { if (!document.hidden) playSFX('weather-thunder'); },900+(index%3)*350);
      fade=setTimeout(() => setStrike(null),800);
      index++;
      next=setTimeout(flash,14000+(index%4)*2300);
    };
    next=setTimeout(flash,4500);
    return () => { clearTimeout(next);clearTimeout(fade);clearTimeout(thunder); };
  },[enabled]);
  return enabled ? strike : null;
}
