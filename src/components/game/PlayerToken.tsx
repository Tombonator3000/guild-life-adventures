import type { Player } from '@/types/game.types';
import { cn } from '@/lib/utils';

interface PlayerTokenProps {
  player: Player;
  index: number;
  isCurrent: boolean;
}

export function PlayerToken({ player, index, isCurrent }: PlayerTokenProps) {
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full border-2 border-card shadow-lg transition-all duration-300',
        isCurrent && 'animate-float ring-2 ring-gold ring-offset-1'
      )}
      style={{ 
        backgroundColor: player.color,
        zIndex: isCurrent ? 10 : index,
      }}
      title={player.name}
    >
      {player.isAI && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs font-bold text-card-foreground">AI</span>
        </div>
      )}
    </div>
  );
}
