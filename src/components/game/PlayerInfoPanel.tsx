import { Player } from '@/types/game.types';
import { GUILD_RANK_NAMES, HOURS_PER_TURN } from '@/types/game.types';
import { Coins, Heart, Smile, Clock, Utensils, Shirt, Shield, Briefcase, Home, Sparkles, Skull } from 'lucide-react';
import { HOUSING_DATA } from '@/data/housing';
import { getGameOption } from '@/data/gameOptions';

interface PlayerInfoPanelProps {
  player: Player;
  isCurrentPlayer: boolean;
}

export function PlayerInfoPanel({ player, isCurrentPlayer }: PlayerInfoPanelProps) {
  const housingName = player.housing !== 'homeless' ? HOUSING_DATA[player.housing]?.name : 'Homeless';
  const agingEnabled = getGameOption('enableAging');

  // Warning states
  const healthWarning = player.health <= 20;
  const timeWarning = player.timeRemaining <= 10;
  const foodWarning = player.foodLevel <= 25;
  const clothingWarning = player.clothingCondition <= 25;

  return (
    <div className={`h-full flex flex-col p-[4%] bg-card/95 rounded-lg border-2 ${isCurrentPlayer ? 'border-primary' : 'border-wood-dark/50'}`}>
      {/* Player Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
        <div
          className="w-8 h-8 rounded-full border-3 border-wood-light shadow-md flex-shrink-0"
          style={{ backgroundColor: player.color }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-bold text-[#3d2a14] truncate">
            {player.name}
          </h3>
          <p className="text-xs text-[#6b5a42] truncate">
            {GUILD_RANK_NAMES[player.guildRank]}{agingEnabled ? ` · Age ${player.age ?? 18}` : ''}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {/* Time - Most Important */}
        <StatRow
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Hours"
          value={`${player.timeRemaining}/${HOURS_PER_TURN}`}
          color="text-time"
          warning={timeWarning}
          showBar
          barValue={player.timeRemaining}
          barMax={HOURS_PER_TURN}
          barColor="bg-time"
        />

        {/* Gold */}
        <StatRow
          icon={<Coins className="w-3.5 h-3.5" />}
          label="Gold"
          value={player.gold.toString()}
          color="text-gold"
        />

        {/* Health */}
        <StatRow
          icon={<Heart className="w-3.5 h-3.5" />}
          label="Health"
          value={`${player.health}/${player.maxHealth}`}
          color="text-health"
          warning={healthWarning}
          showBar
          barValue={player.health}
          barMax={player.maxHealth}
          barColor="bg-health"
        />

        {/* Happiness */}
        <StatRow
          icon={<Smile className="w-3.5 h-3.5" />}
          label="Happiness"
          value={`${player.happiness}%`}
          color="text-happiness"
          showBar
          barValue={player.happiness}
          barMax={100}
          barColor="bg-happiness"
        />

        {/* Food */}
        <StatRow
          icon={<Utensils className="w-3.5 h-3.5" />}
          label="Food"
          value={`${player.foodLevel}%`}
          color="text-secondary"
          warning={foodWarning}
          showBar
          barValue={player.foodLevel}
          barMax={100}
          barColor="bg-secondary"
        />

        {/* Clothing */}
        <StatRow
          icon={<Shirt className="w-3.5 h-3.5" />}
          label="Clothing"
          value={`${player.clothingCondition}%`}
          color="text-primary"
          warning={clothingWarning}
          showBar
          barValue={player.clothingCondition}
          barMax={100}
          barColor="bg-primary"
        />

        {/* Dependability */}
        <StatRow
          icon={<Shield className="w-3.5 h-3.5" />}
          label="Depend."
          value={`${player.dependability}%`}
          color="text-accent-foreground"
          warning={player.dependability < 30}
        />

        {/* Current Job */}
        {player.currentJob && (
          <StatRow
            icon={<Briefcase className="w-3.5 h-3.5" />}
            label="Wage"
            value={`${player.currentWage}g/h`}
            color="text-gold"
          />
        )}

        {/* Housing */}
        <StatRow
          icon={<Home className="w-3.5 h-3.5" />}
          label="Home"
          value={housingName}
          color="text-[#6b5a42]"
        />

        {/* Experience */}
        <StatRow
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Exp"
          value={`${player.experience}/${player.maxExperience}`}
          color="text-purple-400"
        />
      </div>

      {/* Status Indicators */}
      {(player.isSick || player.health <= 0) && (
        <div className="mt-2 pt-2 border-t border-border">
          {player.isSick && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <Skull className="w-3 h-3" />
              <span>Sick - Visit Enchanter!</span>
            </div>
          )}
          {player.health <= 0 && (
            <div className="flex items-center gap-1 text-xs text-destructive font-bold">
              <Skull className="w-3 h-3" />
              <span>DEAD</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  warning?: boolean;
  showBar?: boolean;
  barValue?: number;
  barMax?: number;
  barColor?: string;
}

function StatRow({
  icon,
  label,
  value,
  color,
  warning = false,
  showBar = false,
  barValue = 0,
  barMax = 100,
  barColor = 'bg-primary'
}: StatRowProps) {
  return (
    <div className={`${warning ? 'bg-destructive/20 rounded px-1' : ''}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <span className={color}>{icon}</span>
          <span className="text-[#6b5a42]">{label}</span>
        </div>
        <span className={`font-bold ${color} ${warning ? 'animate-pulse' : ''}`}>{value}</span>
      </div>
      {showBar && (
        <div className="h-1 bg-muted rounded-full mt-0.5 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${Math.max(0, Math.min(100, (barValue / barMax) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
