import { Coins, Smile, GraduationCap, Shield, Target } from 'lucide-react';
import type { Player, GoalSettings } from '@/types/game.types';
import { GUILD_RANK_INDEX } from '@/types/game.types';
import { calculateStockValue } from '@/data/stocks';
import { useGameStore } from '@/store/gameStore';

interface GoalProgressProps {
  player: Player;
  goals: GoalSettings;
  compact?: boolean;
}

export function GoalProgress({ player, goals, compact = false }: GoalProgressProps) {
  const { stockPrices } = useGameStore();
  // Calculate progress for each goal (includes stocks and loans)
  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const totalWealth = player.gold + player.savings + player.investments + stockValue - player.loanAmount;
  const wealthProgress = Math.min(100, (totalWealth / goals.wealth) * 100);
  
  const happinessProgress = Math.min(100, (player.happiness / goals.happiness) * 100);
  
  // Use completedDegrees * 9 to match checkVictory calculation (Jones-style)
  const totalEducation = player.completedDegrees.length * 9;
  const educationProgress = Math.min(100, (totalEducation / goals.education) * 100);
  
  const rankIndex = GUILD_RANK_INDEX[player.guildRank];
  const careerProgress = Math.min(100, (rankIndex / goals.career) * 100);

  const allGoalsMet = 
    wealthProgress >= 100 && 
    happinessProgress >= 100 && 
    educationProgress >= 100 && 
    careerProgress >= 100;

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <GoalBar 
        icon={<Coins className={compact ? "w-3 h-3" : "w-4 h-4"} />}
        label="Wealth"
        current={totalWealth}
        target={goals.wealth}
        progress={wealthProgress}
        unit="g"
        compact={compact}
      />
      <GoalBar 
        icon={<Smile className={compact ? "w-3 h-3" : "w-4 h-4"} />}
        label="Happiness"
        current={player.happiness}
        target={goals.happiness}
        progress={happinessProgress}
        unit="%"
        compact={compact}
      />
      <GoalBar 
        icon={<GraduationCap className={compact ? "w-3 h-3" : "w-4 h-4"} />}
        label="Education"
        current={totalEducation}
        target={goals.education}
        progress={educationProgress}
        unit=""
        compact={compact}
      />
      <GoalBar 
        icon={<Shield className={compact ? "w-3 h-3" : "w-4 h-4"} />}
        label="Career"
        current={rankIndex}
        target={goals.career}
        progress={careerProgress}
        unit=""
        compact={compact}
      />

      {allGoalsMet && (
        <div className={`${compact ? 'mt-1 p-1' : 'mt-3 p-2'} bg-gold/20 border border-gold rounded-lg text-center animate-pulse-gold`}>
          <span className={`font-display font-bold text-gold-dark ${compact ? 'text-[9px]' : 'text-sm'}`}>
            All Goals Met! You Win!
          </span>
        </div>
      )}
    </div>
  );
}

interface GoalBarProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  progress: number;
  unit: string;
  compact?: boolean;
}

function GoalBar({ icon, label, current, target, progress, unit, compact = false }: GoalBarProps) {
  const isComplete = progress >= 100;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <div className={`${isComplete ? 'text-secondary' : 'text-muted-foreground'}`}>
          {icon}
        </div>
        <span className="font-display text-[9px] w-10">{label}</span>
        <div className="flex-1 h-1.5 bg-wood/20 rounded-full overflow-hidden">
          <div 
            className={`h-full ${isComplete ? 'bg-secondary' : 'bg-primary'} transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[8px] text-muted-foreground w-8 text-right">
          {Math.round(progress)}%
        </span>
        {isComplete && (
          <Target className="w-2.5 h-2.5 text-secondary" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`${isComplete ? 'text-secondary' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <span className="font-display text-xs w-16">{label}</span>
      <div className="flex-1 resource-bar h-2">
        <div 
          className={`resource-fill ${isComplete ? 'bg-secondary' : 'bg-primary'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-20 text-right">
        {current}{unit} / {target}{unit}
      </span>
      {isComplete && (
        <Target className="w-3 h-3 text-secondary" />
      )}
    </div>
  );
}
