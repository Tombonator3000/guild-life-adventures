import { useCurrentPlayer, useGameStore } from '@/store/gameStore';
import { GUILD_RANK_NAMES } from '@/types/game.types';
import { GoalProgress } from './GoalProgress';
import { CharacterPortrait } from './CharacterPortrait';
import { ThisWeek } from './ThisWeek';

export function ResourcePanel({ compact = false }: { compact?: boolean }) {
  const player = useCurrentPlayer();
  const { endTurn, goalSettings, week } = useGameStore();

  if (!player) return null;

  return (
    <div className="parchment-panel h-full p-3 resource-overview">
      {/* Player header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CharacterPortrait
            portraitId={player.portraitId}
            playerColor={player.color}
            playerName={player.name}
            size={32}
            isAI={player.isAI}
            className="shadow-lg flex-shrink-0"
            hasCurse={(player.activeCurses?.length ?? 0) > 0}
            isToad={player.activeCurses?.some(c => c.effectType === 'toad-transformation') ?? false}
            curses={player.activeCurses}
          />
          <div>
            <h2 className="font-display text-lg font-bold text-card-foreground leading-tight">
              {player.name}
            </h2>
            <p className="text-muted-foreground font-display text-xs">
              {GUILD_RANK_NAMES[player.guildRank]}
            </p>
          </div>
        </div>
        {!compact && <div className="flex flex-col gap-1 items-end">
          <button
            onClick={endTurn}
            className="gold-button text-sm py-1.5 px-3"
            title="End your turn (E)"
          >
            End Turn
          </button>
        </div>}
      </div>

      <div className="resource-summary-grid flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#402d19]" aria-label="Current resources">
        <span>Gold <strong>{player.gold}g</strong></span><span>Time <strong>{player.timeRemaining}h</strong></span>
        <span>Health <strong>{player.health}</strong></span><span>Food <strong>{player.foodLevel}%</strong></span>
      </div>
      <ThisWeek />

      {/* Goal Progress */}
      <div className="goal-overview">
        <h3 className="font-display text-sm font-semibold text-card-foreground mb-2">
          Victory Goals
        </h3>
        <GoalProgress player={player} goals={goalSettings} />
      </div>

      {/* Week info and hint */}
      <div className="mt-1 pt-1 border-t border-border">
        <p className="text-center text-muted-foreground text-[10px]">
          Week {week} &middot; Click location to travel &middot; E=End Turn &middot; Esc=Menu
        </p>
      </div>
    </div>
  );
}
