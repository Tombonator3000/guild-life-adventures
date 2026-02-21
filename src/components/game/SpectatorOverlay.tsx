// Spectator mode overlay for online multiplayer.
// Shown when: 1) dead player in active game, or 2) joined as spectator (no player slot).

import { Eye, Skull } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { CharacterPortrait } from './CharacterPortrait';

interface SpectatorOverlayProps {
  /** The local player (if they died) — null for pure spectators */
  player?: Player | null;
  /** The player whose turn it currently is */
  currentTurnPlayer?: Player;
  /** True when spectating without a player slot (joined as spectator) */
  isPureSpectator?: boolean;
}

/**
 * Shown when:
 * - A local player is dead (isGameOver) but game continues
 * - A user joined as pure spectator (no player slot)
 * Dims the UI and shows a "Spectating" badge — can still watch and chat.
 */
export function SpectatorOverlay({ player, currentTurnPlayer, isPureSpectator }: SpectatorOverlayProps) {
  return (
    <>
      {/* Top banner */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center pointer-events-none">
        <div
          className="flex items-center gap-2 px-4 py-2 mt-2 rounded-full pointer-events-auto animate-slide-down"
          style={{
            background: 'rgba(20, 12, 5, 0.85)',
            border: '1px solid rgba(180, 120, 30, 0.4)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="font-display text-sm text-amber-300 tracking-wide">
            Spectating
          </span>
          {player && !isPureSpectator && (
            <>
              <div className="w-px h-4 bg-amber-800/50" />
              <Skull className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-amber-500">
                {player.name} has fallen
              </span>
            </>
          )}
        </div>
      </div>

      {/* Watching indicator */}
      {currentTurnPlayer && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg animate-fade-in"
            style={{
              background: 'rgba(20, 12, 5, 0.75)',
              border: '1px solid rgba(180, 120, 30, 0.3)',
            }}
          >
            <CharacterPortrait
              portraitId={currentTurnPlayer.portraitId}
              playerColor={currentTurnPlayer.color}
              playerName={currentTurnPlayer.name}
              size={20}
              isAI={currentTurnPlayer.isAI}
            />
            <span className="text-xs text-amber-400 font-display">
              {currentTurnPlayer.name}'s turn
            </span>
          </div>
        </div>
      )}

      {/* Subtle vignette overlay to indicate spectator mode */}
      <div
        className="fixed inset-0 z-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.25) 100%)',
        }}
      />
    </>
  );
}
