// Studio splash: Tom's Happy Happy Funtimes Emporium, the same intro as Loincloth Legends.
// First a "press any key" gate (browsers keep sound locked until the player interacts),
// then the logo drops in with a drum roll, sunburst, confetti and fanfare.
// Any key or tap skips it. Automated tests skip it entirely (see studioSplashPolicy.ts).

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import logoUrl from '@/assets/studio-logo.webp';
import { playStudioFanfare, playStudioSparkle } from '@/audio/studioFanfare';
import './studio-splash.css';

const CONFETTI_COLORS = ['#c8102e', '#f4e3c1', '#1f3a70', '#e8b83a', '#ffffff', '#ff4fa3', '#3bceac'];
const CONFETTI_COUNT = 90;
const SPARKLE_COUNT = 14;

type SplashPhase = 'gate' | 'logo' | 'out';

/** Visual variation only, so game randomness stays untouched. */
function splashRandom(seedValue: number) {
  let s = seedValue | 0 || 0x51a5e;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function buildPieces() {
  const r = splashRandom(Date.now());
  const confetti = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    left: `${50 + (r() - 0.5) * 30}%`,
    top: `${40 + (r() - 0.5) * 20}%`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    '--dx': `${(r() - 0.5) * 110}vw`,
    '--dy': `${30 + r() * 80}vh`,
    '--rot': `${(r() - 0.5) * 1440}deg`,
    animationDuration: `${1.6 + r() * 1.6}s`,
    animationDelay: `${r() * 0.15}s`,
  }) as CSSProperties);
  const sparkles = Array.from({ length: SPARKLE_COUNT }, (_, i) => {
    const a = (i / SPARKLE_COUNT) * Math.PI * 2;
    return {
      left: `${50 + Math.cos(a) * (30 + r() * 8)}%`,
      top: `${46 + Math.sin(a) * (34 + r() * 8)}%`,
      animationDelay: `${r() * 1.6}s`,
    } as CSSProperties;
  });
  return { confetti, sparkles };
}

function isTouchFirst() {
  try {
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
  } catch {
    return false;
  }
}

interface StudioSplashProps {
  onDone: () => void;
}

export function StudioSplash({ onDone }: StudioSplashProps) {
  const [phase, setPhase] = useState<SplashPhase>('gate');
  const [landed, setLanded] = useState(false);
  const [presents, setPresents] = useState(false);
  const [fadeSeconds, setFadeSeconds] = useState(0.6);
  const [touch] = useState(isTouchFirst);
  const [pieces] = useState(buildPieces);
  const rootRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<SplashPhase>('gate');
  const doneRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const at = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  /** Fade out and hand control to the title screen. */
  const finish = useCallback((fade: number) => {
    if (phaseRef.current === 'out') return;
    phaseRef.current = 'out';
    setFadeSeconds(fade);
    setPhase('out');
    at(fade * 1000 + 30, () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current();
    });
  }, [at]);

  const start = useCallback(() => {
    phaseRef.current = 'logo';
    setPhase('logo');
    playStudioFanfare();
    at(720, () => {
      setLanded(true);
      for (let i = 0; i < 5; i++) at(200 + i * 330, playStudioSparkle);
    });
    at(1500, () => setPresents(true));
    at(4300, () => finish(0.7));
  }, [at, finish]);

  /** The first press starts the logo (and the sound), the next one skips it. */
  const input = useCallback(() => {
    if (phaseRef.current === 'gate') start();
    else if (phaseRef.current === 'logo') finish(0.3);
  }, [start, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Leave browser shortcuts (reload, zoom, dev tools) alone
      if (e.ctrlKey || e.metaKey || e.altKey || /^F\d{1,2}$/.test(e.key)) return;
      // The splash sits over everything: keys must not reach the title menu behind it
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      input();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [input]);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    const timers = timersRef.current;
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, []);

  const className = [
    'studio-splash',
    phase !== 'gate' && 'go',
    landed && 'landed',
    presents && 'pres',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={rootRef}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label="Tom's Happy Happy Funtimes Emporium presents Guild Life Adventures"
      tabIndex={-1}
      data-phase={phase}
      onPointerDown={input}
      style={phase === 'out' ? { transition: `opacity ${fadeSeconds}s ease-in`, opacity: 0 } : undefined}
    >
      <div className="sp-gate">
        <div className="sp-press">{touch ? 'TAP TO BEGIN' : 'PRESS ANY KEY'}</div>
        <div className="sp-small">SOUND ON FOR MAXIMUM GLORY.</div>
      </div>
      <div className="sp-stage" aria-hidden="true">
        <div className="sp-burst" />
        <div className="sp-glow" />
        <img className="sp-logo" alt="" src={logoUrl} draggable={false} />
        <div className="sp-presents">PRESENTS</div>
        <div className="sp-sparkles">
          {landed && pieces.sparkles.map((style, i) => <i key={i} style={style} />)}
        </div>
        <div className="sp-confetti">
          {landed && pieces.confetti.map((style, i) => <i key={i} style={style} />)}
        </div>
        <div className="sp-flash" />
      </div>
    </div>
  );
}
