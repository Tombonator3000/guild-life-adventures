import { useCurrentPlayer, useGameStore } from '@/store/gameStore';
import { Coins, Heart, Smile, Clock, Utensils, Shirt } from 'lucide-react';
import { GUILD_RANK_NAMES } from '@/types/game.types';
import { GoalProgress } from './GoalProgress';

export function ResourcePanel() {
  const player = useCurrentPlayer();
  const { endTurn, goalSettings, week } = useGameStore();

  if (!player) return null;

  return (
    <div className="parchment-panel h-full p-4 flex flex-col overflow-hidden">
      {/* Player header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full border-4 border-wood-light shadow-lg flex-shrink-0"
            style={{ backgroundColor: player.color }}
          />
          <div>
            <h2 className="font-display text-xl font-bold text-card-foreground">
              {player.name}
            </h2>
            <p className="text-muted-foreground font-display text-sm">
              {GUILD_RANK_NAMES[player.guildRank]}
            </p>
          </div>
        </div>
        <button 
          onClick={endTurn}
          className="gold-button text-sm py-2 px-4"
        >
          End Turn
        </button>
      </div>

      {/* Resources - compact grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <ResourceCard 
          icon={<Coins className="w-4 h-4" />}
          label="Gold"
          value={player.gold}
          color="text-gold"
        />
        <ResourceCard 
          icon={<Clock className="w-4 h-4" />}
          label="Time"
          value={`${player.timeRemaining}h`}
          color="text-time"
          showBar
          barValue={player.timeRemaining}
          barMax={168}
          barColor="bg-time"
        />
        <ResourceCard 
          icon={<Heart className="w-4 h-4" />}
          label="Health"
          value={player.health}
          color="text-health"
          showBar
          barValue={player.health}
          barMax={player.maxHealth}
          barColor="bg-health"
        />
        <ResourceCard 
          icon={<Smile className="w-4 h-4" />}
          label="Happiness"
          value={`${player.happiness}%`}
          color="text-happiness"
          showBar
          barValue={player.happiness}
          barMax={100}
          barColor="bg-happiness"
        />
        <ResourceCard 
          icon={<Utensils className="w-4 h-4" />}
          label="Food"
          value={`${player.foodLevel}%`}
          color="text-secondary"
          showBar
          barValue={player.foodLevel}
          barMax={100}
          barColor="bg-secondary"
          warning={player.foodLevel < 25}
        />
        <ResourceCard 
          icon={<Shirt className="w-4 h-4" />}
          label="Clothing"
          value={`${player.clothingCondition}%`}
          color="text-primary"
          showBar
          barValue={player.clothingCondition}
          barMax={100}
          barColor="bg-primary"
          warning={player.clothingCondition < 25}
        />
      </div>

      {/* Goal Progress */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="font-display text-sm font-semibold text-card-foreground mb-2">
          Victory Goals
        </h3>
        <GoalProgress player={player} goals={goalSettings} />
      </div>

      {/* Week info and hint */}
      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-center text-muted-foreground text-xs">
          Week {week} - Click a location on the board to travel there
        </p>
      </div>
    </div>
  );
}

interface ResourceCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  showBar?: boolean;
  barValue?: number;
  barMax?: number;
  barColor?: string;
  warning?: boolean;
}

function ResourceCard({ 
  icon, 
  label, 
  value, 
  color, 
  showBar, 
  barValue = 0, 
  barMax = 100,
  barColor = 'bg-primary',
  warning = false,
}: ResourceCardProps) {
  return (
    <div className={`wood-frame p-2 text-card ${warning ? 'ring-2 ring-destructive' : ''}`}>
      <div className="flex items-center gap-1 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-xs opacity-80">{label}</span>
      </div>
      <div className="font-display text-lg font-bold">{value}</div>
      {showBar && (
        <div className="resource-bar mt-1 h-2">
          <div 
            className={`resource-fill ${barColor}`}
            style={{ width: `${(barValue / barMax) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
