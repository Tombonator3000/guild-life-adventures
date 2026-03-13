import type React from 'react';
import type { Player } from '@/types/game.types';
import { cn } from '@/lib/utils';
import { CharacterPortrait } from './CharacterPortrait';

interface PlayerTokenProps {
  player: Player;
  index: number;
  isCurrent: boolean;
  onClickPlayer?: (player: Player) => void;
}

function TokenCurseEffect({ isToad }: { isToad: boolean }) {
  const badge = isToad ? '🐸' : '🔮';
  return (
    <>
      {/* Badge — øvre høyre hjørne */}
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
        {badge}
      </div>
      {/* Partikler rundt token */}
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
  );
}

export function PlayerToken({ player, index, isCurrent, onClickPlayer }: PlayerTokenProps) {
  const hasCurse = (player.activeCurses?.length ?? 0) > 0;
  const isToad = player.activeCurses?.some(c => c.effectType === 'toad-transformation') ?? false;
  const isDead = player.isGameOver;

  const handleClick = onClickPlayer
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        onClickPlayer(player);
      }
    : undefined;

  return (
    <div
      className={cn(
        'relative w-16 h-16 rounded-full shadow-lg transition-all duration-300 animate-token-arrive',
        isCurrent && !isDead && 'animate-float ring-2 ring-gold ring-offset-1',
        isDead && 'grayscale opacity-50',
        onClickPlayer && !isCurrent && 'cursor-pointer hover:scale-110'
      )}
      style={{
        zIndex: isCurrent ? 10 : index,
      }}
      title={isDead ? `${player.name} (fallen)` : player.name}
      onClick={handleClick}
    >
      <CharacterPortrait
        portraitId={player.portraitId}
        playerColor={player.color}
        playerName={player.name}
        size={64}
        isAI={player.isAI}
        hasCurse={hasCurse && !isDead}
        isToad={isToad && !isDead}
        curses={isDead ? undefined : player.activeCurses}
      />
      {isDead && (
        <div
          className="absolute -top-1 -right-1 z-10 rounded-full w-5 h-5 flex items-center justify-center leading-none select-none pointer-events-none"
          style={{ fontSize: '10px', background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          💀
        </div>
      )}
      {hasCurse && !isDead && <TokenCurseEffect isToad={isToad} />}
    </div>
  );
}

