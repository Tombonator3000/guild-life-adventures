import type { Player } from '@/types/game.types';
import { cn } from '@/lib/utils';
import { CharacterPortrait } from './CharacterPortrait';

interface PlayerTokenProps {
  player: Player;
  index: number;
  isCurrent: boolean;
}

export function PlayerToken({ player, index, isCurrent }: PlayerTokenProps) {
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full shadow-lg transition-all duration-300',
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
        size={32}
        isAI={player.isAI}
      />
    </div>
  );
}
