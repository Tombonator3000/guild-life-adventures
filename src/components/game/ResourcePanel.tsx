import { useCurrentPlayer, useGameStore } from '@/store/gameStore';
import { Coins, Heart, Smile, Clock, Shield } from 'lucide-react';
import { GUILD_RANK_NAMES } from '@/types/game.types';
import { GoalProgress } from './GoalProgress';

export function ResourcePanel() {
  const player = useCurrentPlayer();
  const { endTurn, goalSettings } = useGameStore();

  if (!player) return null;

  return (
    <div className="parchment-panel h-full p-6 flex flex-col">
      {/* Player header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-full border-4 border-wood-light shadow-lg"
            style={{ backgroundColor: player.color }}
          />
          <div>
            <h2 className="font-display text-2xl font-bold text-card-foreground">
              {player.name}
            </h2>
            <p className="text-muted-foreground font-display">
              {GUILD_RANK_NAMES[player.guildRank]}
            </p>
          </div>
        </div>
        <button 
          onClick={endTurn}
          className="gold-button"
        >
          End Turn
        </button>
      </div>

      {/* Resources */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ResourceCard 
          icon={<Coins className="w-6 h-6" />}
          label="Gold"
          value={player.gold}
          color="text-gold"
        />
        <ResourceCard 
          icon={<Clock className="w-6 h-6" />}
          label="Time"
          value={`${player.timeRemaining}h`}
          color="text-time"
          showBar
          barValue={player.timeRemaining}
          barMax={168}
          barColor="bg-time"
        />
        <ResourceCard 
          icon={<Heart className="w-6 h-6" />}
          label="Health"
          value={player.health}
          color="text-health"
          showBar
          barValue={player.health}
          barMax={player.maxHealth}
          barColor="bg-health"
        />
        <ResourceCard 
          icon={<Smile className="w-6 h-6" />}
          label="Happiness"
          value={`${player.happiness}%`}
          color="text-happiness"
          showBar
          barValue={player.happiness}
          barMax={100}
          barColor="bg-happiness"
        />
      </div>

      {/* Goal Progress */}
      <div className="flex-1">
        <h3 className="font-display text-lg font-semibold text-card-foreground mb-3">
          Victory Goals
        </h3>
        <GoalProgress player={player} goals={goalSettings} />
      </div>

      {/* Hint */}
      <p className="text-center text-muted-foreground text-sm mt-4">
        Click a location on the board to travel there
      </p>
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
}

function ResourceCard({ 
  icon, 
  label, 
  value, 
  color, 
  showBar, 
  barValue = 0, 
  barMax = 100,
  barColor = 'bg-primary'
}: ResourceCardProps) {
  return (
    <div className="wood-frame p-3 text-card">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-sm opacity-80">{label}</span>
      </div>
      <div className="font-display text-xl font-bold">{value}</div>
      {showBar && (
        <div className="resource-bar mt-2">
          <div 
            className={`resource-fill ${barColor}`}
            style={{ width: `${(barValue / barMax) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
