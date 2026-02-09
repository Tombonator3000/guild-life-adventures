/**
 * Achievements Panel (C6) — displays unlocked and locked achievements.
 * Designed to fit in the RightSideTabs or a modal.
 */

import { useAchievements } from '@/hooks/useAchievements';
import type { AchievementCategory } from '@/data/achievements';

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  wealth: 'Wealth',
  combat: 'Combat',
  education: 'Education',
  social: 'Social',
  exploration: 'Exploration',
  mastery: 'Mastery',
};

const CATEGORY_ORDER: AchievementCategory[] = ['mastery', 'wealth', 'combat', 'education', 'social', 'exploration'];

export function AchievementsPanel() {
  const { achievements, unlockedCount, totalCount, stats } = useAchievements();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2 py-1 border-b border-border">
        <div className="text-xs font-bold">
          Achievements ({unlockedCount}/{totalCount})
        </div>
        <div className="w-full bg-muted rounded h-1.5 mt-1">
          <div
            className="bg-yellow-500 h-1.5 rounded transition-all"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1 space-y-2">
        {CATEGORY_ORDER.map(category => {
          const catAchievements = achievements.filter(a => a.category === category);
          if (catAchievements.length === 0) return null;

          return (
            <div key={category}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                {CATEGORY_LABELS[category]}
              </div>
              <div className="space-y-0.5">
                {catAchievements.map(a => {
                  const isUnlocked = a.unlockedAt !== null;
                  const isHidden = a.hidden && !isUnlocked;

                  return (
                    <div
                      key={a.id}
                      className={`flex items-start gap-1.5 px-1.5 py-1 rounded text-[11px] ${
                        isUnlocked
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'opacity-50'
                      }`}
                    >
                      <span className="text-sm flex-shrink-0">
                        {isHidden ? '❓' : a.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium leading-tight">
                          {isHidden ? '???' : a.name}
                        </div>
                        <div className="text-muted-foreground leading-tight">
                          {isHidden ? 'Hidden achievement' : a.description}
                        </div>
                      </div>
                      {isUnlocked && (
                        <span className="text-yellow-500 flex-shrink-0 ml-auto">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cumulative stats summary */}
      <div className="px-2 py-1 border-t border-border text-[10px] text-muted-foreground">
        <div className="grid grid-cols-2 gap-x-2">
          <span>Games won: {stats.gamesWon}</span>
          <span>Quests: {stats.totalQuestsCompleted}</span>
          <span>Degrees: {stats.totalDegreesEarned}</span>
          <span>Floors: {stats.totalDungeonFloorsCleared}</span>
        </div>
      </div>
    </div>
  );
}
