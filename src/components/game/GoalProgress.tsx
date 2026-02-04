import type { Player, GoalSettings, GUILD_RANK_ORDER } from '@/types/game.types';
import { GUILD_RANK_ORDER as rankOrder } from '@/types/game.types';
import { Target, Coins, Smile, GraduationCap, Shield } from 'lucide-react';

interface GoalProgressProps {
  player: Player;
  goals: GoalSettings;
}

export function GoalProgress({ player, goals }: GoalProgressProps) {
  // Calculate progress percentages
  const wealthTarget = goals.wealth * 100; // e.g., 50% goal = 5000 gold target
  const wealthProgress = Math.min(100, (player.gold / wealthTarget) * 100);

  const happinessProgress = Math.min(100, (player.happiness / goals.happiness) * 100);

  const educationTotal = Object.values(player.education).reduce((sum, val) => sum + (val || 0), 0);
  const educationTarget = goals.education; // Number of courses
  const educationProgress = Math.min(100, (educationTotal / educationTarget) * 100);

  const careerTarget = Math.floor((goals.career / 100) * rankOrder.length);
  const careerCurrent = rankOrder.indexOf(player.guildRank);
  const careerProgress = Math.min(100, ((careerCurrent + 1) / (careerTarget + 1)) * 100);

  const allGoalsMet = 
    wealthProgress >= 100 && 
    happinessProgress >= 100 && 
    educationProgress >= 100 && 
    careerProgress >= 100;

  return (
    <div className="space-y-3">
      <GoalBar 
        icon={<Coins className="w-4 h-4" />}
        label="Wealth"
        current={player.gold}
        target={wealthTarget}
        progress={wealthProgress}
        unit="g"
      />
      <GoalBar 
        icon={<Smile className="w-4 h-4" />}
        label="Happiness"
        current={player.happiness}
        target={goals.happiness}
        progress={happinessProgress}
        unit="%"
      />
      <GoalBar 
        icon={<GraduationCap className="w-4 h-4" />}
        label="Education"
        current={educationTotal}
        target={educationTarget}
        progress={educationProgress}
        unit=" courses"
      />
      <GoalBar 
        icon={<Shield className="w-4 h-4" />}
        label="Career"
        current={careerCurrent + 1}
        target={careerTarget + 1}
        progress={careerProgress}
        unit=" rank"
      />

      {allGoalsMet && (
        <div className="mt-4 p-3 bg-gold/20 border border-gold rounded-lg text-center animate-pulse-gold">
          <span className="font-display font-bold text-gold-dark">
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
}

function GoalBar({ icon, label, current, target, progress, unit }: GoalBarProps) {
  const isComplete = progress >= 100;

  return (
    <div className="flex items-center gap-3">
      <div className={`${isComplete ? 'text-secondary' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-display">{label}</span>
          <span className="text-muted-foreground">
            {current}{unit} / {target}{unit}
          </span>
        </div>
        <div className="resource-bar h-2">
          <div 
            className={`resource-fill ${isComplete ? 'bg-secondary' : 'bg-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {isComplete && (
        <Target className="w-4 h-4 text-secondary" />
      )}
    </div>
  );
}
