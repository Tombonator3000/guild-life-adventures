// PlayersTab - Turn order and goal progress for all players
// Shows each player's portrait, gold/time, and circular progress indicator

import { Crown, Skull, Bot } from 'lucide-react';
import { CharacterPortrait } from '../CharacterPortrait';
import { useGameStore } from '@/store/gameStore';
import { calculateGoalProgress } from '@/lib/calculateGoalProgress';
import type { Player, GoalSettings } from '@/types/game.types';

interface PlayersTabProps {
  players: Player[];
  currentPlayerIndex: number;
  goalSettings: GoalSettings;
}

export function PlayersTab({ players, currentPlayerIndex, goalSettings }: PlayersTabProps) {
  const stockPrices = useGameStore(state => state.stockPrices);

  return (
    <div className="space-y-1.5">
      {players.map((player, index) => {
        const isCurrentTurn = index === currentPlayerIndex;
        const isDead = player.health <= 0;
        const overallProgress = calculateGoalProgress(player, goalSettings, stockPrices).overall;

        return (
          <div
            key={player.id}
            className={`p-1.5 rounded transition-all border ${
              isCurrentTurn
                ? 'bg-amber-200/50 border-amber-600'
                : isDead
                ? 'bg-red-100/50 border-red-300 opacity-60'
                : 'bg-amber-100/30 border-amber-300/50'
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Turn indicator */}
              <div className="w-5 h-5 flex items-center justify-center">
                {isCurrentTurn ? (
                  <Crown className="w-4 h-4 text-amber-600 animate-pulse" />
                ) : isDead ? (
                  <Skull className="w-4 h-4 text-red-600" />
                ) : (
                  <span className="text-xs text-amber-700 font-bold">{index + 1}</span>
                )}
              </div>

              {/* Player portrait */}
              <CharacterPortrait
                portraitId={player.portraitId}
                playerColor={player.color}
                playerName={player.name}
                size={16}
                isAI={player.isAI}
                hasCurse={(player.activeCurses?.length ?? 0) > 0}
                curses={player.activeCurses}
              />

              {/* Name and status */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-display font-bold text-amber-900 truncate ${isDead ? 'line-through' : ''}`}>
                    {player.name}
                  </span>
                  {player.isAI && (
                    <Bot className="w-3 h-3 text-amber-700" />
                  )}
                </div>
                {!isDead && (
                  <div className="flex items-center gap-2 text-[10px] text-amber-800">
                    <span>{player.gold}g</span>
                    <span>{player.timeRemaining}h</span>
                    {((player.fame ?? 0) >= 20 || (player.infamy ?? 0) >= 20) && (
                      <span className={(player.fame ?? 0) >= (player.infamy ?? 0) ? 'text-amber-600' : 'text-purple-600'}>
                        {(player.fame ?? 0) >= (player.infamy ?? 0)
                          ? `⭐${player.fame ?? 0}`
                          : `💀${player.infamy ?? 0}`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              {!isDead && (
                <div className="w-8 h-8 relative" title={`${Math.round(overallProgress)}% goal progress`}>
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-amber-200"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${overallProgress * 0.754} 100`}
                      className="text-amber-600"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-amber-900">
                    {Math.round(overallProgress)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Game Tip */}
      <div className="pt-2 mt-2 border-t border-amber-300/50">
        <p className="text-[10px] text-amber-700 text-center italic">
          Click locations to travel directly
        </p>
      </div>
    </div>
  );
}
