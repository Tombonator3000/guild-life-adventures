import { Coins, Smile, GraduationCap, Briefcase, Target, Compass } from 'lucide-react';
import type { Player, GoalSettings } from '@/types/game.types';
import { calculateStockValue } from '@/data/stocks';
import { useGameStore } from '@/store/gameStore';
import { useTranslation } from '@/i18n';

interface GoalProgressProps {
  player: Player;
  goals: GoalSettings;
  compact?: boolean;
}

export function GoalProgress({ player, goals, compact = false }: GoalProgressProps) {
  const { stockPrices } = useGameStore();
  const { t } = useTranslation();
  // Calculate progress for each goal (includes stocks and loans)
  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const totalWealth = player.gold + player.savings + player.investments + stockValue - player.loanAmount;
  const wealthProgress = Math.min(100, (totalWealth / goals.wealth) * 100);

  const happinessProgress = Math.min(100, (player.happiness / goals.happiness) * 100);

  // Use completedDegrees * 9 to match checkVictory calculation (Jones-style)
  const totalEducation = player.completedDegrees.length * 9;
  const educationProgress = Math.min(100, (totalEducation / goals.education) * 100);

  // Career = dependability (Jones-style), 0 if no job
  const careerValue = player.currentJob ? player.dependability : 0;
  const careerProgress = Math.min(100, (careerValue / goals.career) * 100);

  // Adventure = quests completed + dungeon floors cleared (optional goal, 0 = disabled)
  const adventureEnabled = goals.adventure > 0;
  const adventureValue = player.completedQuests + player.dungeonFloorsCleared.length;
  const adventureProgress = adventureEnabled ? Math.min(100, (adventureValue / goals.adventure) * 100) : 100;

  const allGoalsMet =
    wealthProgress >= 100 &&
    happinessProgress >= 100 &&
    educationProgress >= 100 &&
    careerProgress >= 100 &&
    adventureProgress >= 100;

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <GoalBar
        icon={<Coins className={compact ? "w-3 h-3" : "w-4 h-4"} />}
        label={t('goals.wealth')}
        current={totalWealth}
        target={goals.wealth}
        progress={wealthProgress}
        unit="g"
        compact={compact}
      />
      <GoalBar
        icon={<Smile className={compact ? "w-3 h-3" : "w-4 h-4"} />}
        label={t('goals.happiness')}
        current={player.happiness}
        target={goals.happiness}
        progress={happinessProgress}
        unit="%"
        compact={compact}
      />
      <GoalBar
        icon={<GraduationCap className={compact ? "w-3 h-3" : "w-4 h-4"} />}
        label={t('goals.education')}
        current={totalEducation}
        target={goals.education}
        progress={educationProgress}
        unit=""
        compact={compact}
      />
      <GoalBar
        icon={<Briefcase className={compact ? "w-3 h-3" : "w-4 h-4"} />}
        label={t('goals.career')}
        current={careerValue}
        target={goals.career}
        progress={careerProgress}
        unit=""
        compact={compact}
      />
      {adventureEnabled && (
        <GoalBar
          icon={<Compass className={compact ? "w-3 h-3" : "w-4 h-4"} />}
          label={t('goals.adventure')}
          current={adventureValue}
          target={goals.adventure}
          progress={adventureProgress}
          unit=""
          compact={compact}
        />
      )}

      {allGoalsMet && (
        <div className={`${compact ? 'mt-1 p-1' : 'mt-3 p-2'} bg-gold/20 border border-gold rounded-lg text-center animate-pulse-gold`}>
          <span className={`font-display font-bold text-gold-dark ${compact ? 'text-[9px]' : 'text-sm'}`}>
            {t('goals.allGoalsMet')}
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
        <div className={`${isComplete ? 'text-green-700' : 'text-amber-700'}`}>
          {icon}
        </div>
        <span className="font-display text-[9px] w-10 text-amber-900">{label}</span>
        <div className="flex-1 h-1.5 bg-amber-900/20 rounded-full overflow-hidden">
          <div
            className={`h-full ${isComplete ? 'bg-green-600' : 'bg-amber-600'} transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[8px] text-amber-800 w-8 text-right">
          {Math.round(progress)}%
        </span>
        {isComplete && (
          <Target className="w-2.5 h-2.5 text-green-600" />
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
