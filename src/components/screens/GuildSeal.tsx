import { useEffect, useRef, useState } from 'react';
import { Compass } from 'lucide-react';
import type { EnvironmentDetail } from '@/data/gameOptions';

/** Progressive decoration: no WebGL code is fetched for calm/off or small screens. */
export function GuildSeal({ detail }: { detail: EnvironmentDetail }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const size = window.matchMedia('(min-width: 701px)');
    let cancelled = false;
    let generation = 0;
    let dispose: (() => void) | undefined;
    const update = async () => {
      const request = ++generation;
      dispose?.();
      dispose = undefined;
      setReady(false);
      if (detail !== 'full' || motion.matches || !size.matches || !host.current) return;
      try {
        const { createGuildSeal } = await import('./guildSealScene');
        if (cancelled || request !== generation || !host.current) return;
        dispose = createGuildSeal(host.current, () => setReady(false));
        setReady(Boolean(dispose));
      } catch {
        // Download, WebGL support and GPU limits must never block the menu.
        if (!cancelled && request === generation) setReady(false);
      }
    };
    void update();
    motion.addEventListener('change', update);
    size.addEventListener('change', update);
    return () => {
      cancelled = true;
      generation++;
      motion.removeEventListener('change', update);
      size.removeEventListener('change', update);
      dispose?.();
    };
  }, [detail]);

  return (
    <div className="entry-seal" data-renderer={ready ? 'webgl' : 'static'} aria-hidden="true">
      <div className="entry-seal-fallback">
        <Compass />
      </div>
      <div ref={host} className="entry-seal-canvas" />
    </div>
  );
}
