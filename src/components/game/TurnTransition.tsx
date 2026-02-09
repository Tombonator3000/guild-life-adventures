import { Shield } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { CharacterPortrait } from './CharacterPortrait';

interface TurnTransitionProps {
  player: Player;
  onReady: () => void;
}

/**
 * Privacy screen shown between human player turns in local multiplayer.
 * Prevents players from seeing each other's resources/state.
 */
export function TurnTransition({ player, onReady }: TurnTransitionProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="parchment-panel p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        <Shield className="w-12 h-12 text-primary" />
        <h2 className="font-display text-2xl text-card-foreground text-center">
          Pass the device to
        </h2>
        <div className="flex items-center gap-3">
          <CharacterPortrait
            portraitId={player.portraitId}
            playerColor={player.color}
            playerName={player.name}
            size={32}
            isAI={player.isAI}
          />
          <span className="font-display text-xl text-primary font-bold">
            {player.name}
          </span>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          It's your turn! Tap below when ready.
        </p>
        <button
          onClick={onReady}
          className="gold-button mt-2"
          autoFocus
        >
          I'm Ready
        </button>
      </div>
    </div>
  );
}
