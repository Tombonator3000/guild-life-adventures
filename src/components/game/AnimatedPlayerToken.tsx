import { useEffect, useRef } from 'react';
import type { Player, LocationId } from '@/types/game.types';
import { getAnimationPointsWithBoundaries } from '@/data/locations';
import { cn } from '@/lib/utils';
import { CharacterPortrait } from './CharacterPortrait';

interface AnimatedPlayerTokenProps {
  player: Player;
  isCurrent: boolean;
  animationPath: LocationId[] | null;
  onAnimationComplete?: () => void;
  onLocationReached?: (pathLocationIndex: number) => void;
}

const ANIMATION_STEP_MS = 80; // ms per waypoint (was 150ms — faster, smoother movement)

export function AnimatedPlayerToken({
  player,
  isCurrent,
  animationPath,
  onAnimationComplete,
  onLocationReached,
}: AnimatedPlayerTokenProps) {
  const token = useRef<HTMLDivElement>(null);
  // Boundary callbacks stay current without restarting an in-flight route.
  const onCompleteRef = useRef(onAnimationComplete);
  const onLocationRef = useRef(onLocationReached);
  onCompleteRef.current = onAnimationComplete;
  onLocationRef.current = onLocationReached;

  useEffect(() => {
    const element = token.current, board = element?.parentElement;
    if (!element || !board) return;
    const { points, locationBoundaries } = getAnimationPointsWithBoundaries(animationPath?.length ? animationPath : [player.currentLocation]);
    if (!points.length) { if (animationPath) onCompleteRef.current?.(); return; }
    let width = board.clientWidth, height = board.clientHeight;
    let point = points[0];
    let frame = 0, started: number | null = null, nextBoundary = 1;
    const place = () => {
      // Only the transform changes per frame. No React updates or layout reads.
      element.style.transform = `translate3d(${point[0] * width / 100}px, ${point[1] * height / 100}px, 0)`;
    };
    place();
    const resize = new ResizeObserver(entries => {
      width = entries[0].contentRect.width;
      height = entries[0].contentRect.height;
      place();
    });
    resize.observe(board);
    if (animationPath) onLocationRef.current?.(0);
    const tick = (now: number) => {
      started ??= now;
      const progress = Math.min((now - started) / ANIMATION_STEP_MS, points.length - 1);
      const index = Math.floor(progress), fraction = progress - index;
      const from = points[index], to = points[Math.min(index + 1, points.length - 1)];
      point = [from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction];
      place();
      // A delayed frame still reports every crossed location exactly once.
      while (nextBoundary < locationBoundaries.length && locationBoundaries[nextBoundary] <= index) {
        onLocationRef.current?.(nextBoundary);
        nextBoundary++;
      }
      if (progress >= points.length - 1) { onCompleteRef.current?.(); return; }
      frame = requestAnimationFrame(tick);
    };
    if (animationPath) {
      if (points.length === 1) onCompleteRef.current?.();
      else frame = requestAnimationFrame(tick);
    }
    return () => { cancelAnimationFrame(frame); resize.disconnect(); };
  }, [animationPath, player.currentLocation]);

  const hasCurse = (player.activeCurses?.length ?? 0) > 0;
  const isToad = player.activeCurses?.some(c => c.effectType === 'toad-transformation') ?? false;

  return (
    <div ref={token} className="animated-player-token absolute left-0 top-0 w-20 h-20 z-50" style={{ willChange: 'transform' }}>
    <div
      className={cn('relative w-20 h-20 rounded-full shadow-xl', animationPath && 'animate-token-walk')}
      style={{ transform: animationPath ? undefined : 'translate(-50%, -50%)', boxShadow: `0 4px 15px rgba(0,0,0,0.4), 0 0 ${isCurrent ? '20px' : '10px'} ${player.color}` }}
      title={player.name}
    >
      <CharacterPortrait
        portraitId={player.portraitId}
        playerColor={player.color}
        playerName={player.name}
        size={80}
        isAI={player.isAI}
        hasCurse={hasCurse}
        isToad={isToad}
        curses={player.activeCurses}
      />
      {hasCurse && (
        <>
          {/* Badge */}
          <div
            className="absolute -top-1 -right-1 z-10 rounded-full
                       w-5 h-5 flex items-center justify-center leading-none
                       animate-curse-pulse select-none pointer-events-none"
            style={{
              fontSize: '10px',
              background: isToad ? 'rgba(5, 46, 22, 0.9)' : 'rgba(59, 7, 100, 0.85)',
              border: `1px solid ${isToad ? 'rgba(74, 222, 128, 0.6)' : 'rgba(192, 132, 252, 0.6)'}`,
            }}
          >
            {isToad ? '🐸' : '🔮'}
          </div>
          {/* Partikler */}
          {[
            { left: '15%', delay: 0 },
            { left: '50%', delay: 0.7 },
            { left: '80%', delay: 1.3 },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute animate-curse-particle pointer-events-none select-none"
              style={{
                left: p.left,
                bottom: '100%',
                fontSize: '8px',
                color: isToad ? 'rgb(74, 222, 128)' : 'rgb(192, 132, 252)',
                animationDelay: `${p.delay}s`,
              }}
            >
              ✦
            </span>
          ))}
        </>
      )}
    </div>
    </div>
  );
}
