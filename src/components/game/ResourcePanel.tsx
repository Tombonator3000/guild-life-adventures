import { useCurrentPlayer, useGameStore } from '@/store/gameStore';
import { GoalProgress } from './GoalProgress';
import { ThisWeek } from './ThisWeek';

export function ResourcePanel() {
  const player = useCurrentPlayer();
  const { goalSettings, week } = useGameStore();

  if (!player) return null;

  return (
    <div className="parchment-panel h-full p-3 resource-overview">
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
