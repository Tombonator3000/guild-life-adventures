import type { Player } from '@/types/game.types';
import { cn } from '@/lib/utils';
import { CharacterPortrait } from './CharacterPortrait';

interface PlayerTokenProps {
  player: Player;
  index: number;
  isCurrent: boolean;
}

function TokenCurseEffect() {
  return (
    <>
      {/* 🔮 badge — øvre høyre hjørne */}
      <div
        className="absolute -top-1 -right-1 z-10 rounded-full
                   w-5 h-5 flex items-center justify-center leading-none
                   animate-curse-pulse select-none pointer-events-none"
        style={{
          fontSize: '10px',
          background: 'rgba(59, 7, 100, 0.85)',
          border: '1px solid rgba(192, 132, 252, 0.6)',
        }}
      >
        🔮
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
            color: 'rgb(192, 132, 252)',
            animationDelay: `${p.delay}s`,
          }}
        >
          ✦
        </span>
      ))}
    </>
  );
}

export function PlayerToken({ player, index, isCurrent }: PlayerTokenProps) {
  const hasCurse = (player.activeCurses?.length ?? 0) > 0;

  return (
    <div
      className={cn(
        'relative w-16 h-16 rounded-full shadow-lg transition-all duration-300',
        isCurrent && 'animate-float ring-2 ring-gold ring-offset-1'
      )}
      style={{
        zIndex: isCurrent ? 10 : index,
      }}
      title={player.name}
    >
      <CharacterPortrait
        portraitId={player.portraitId}
        playerColor={player.color}
        playerName={player.name}
        size={64}
        isAI={player.isAI}
        hasCurse={(player.activeCurses?.length ?? 0) > 0}
      />
      {hasCurse && <TokenCurseEffect />}
    </div>
  );
}

