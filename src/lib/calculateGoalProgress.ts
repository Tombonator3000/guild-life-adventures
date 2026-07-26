import { calculateStockValue } from '@/data/stocks';
import type { GoalSettings, Player } from '@/types/game.types';

const STARTING_WEALTH = 100;
const STARTING_HAPPINESS = 50;

function progressFromStartingValue(value: number, goal: number, startingValue: number): number {
  if (goal <= startingValue) return value >= goal ? 100 : 0;
  const progress = ((value - startingValue) / (goal - startingValue)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export interface GoalProgressBreakdown {
  wealth: number;
  happiness: number;
  education: number;
  career: number;
  adventure: number | null;
  overall: number;
}

export function calculateGoalProgress(
  player: Player,
  goalSettings: GoalSettings,
  stockPrices: Record<string, number>,
): GoalProgressBreakdown {
  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const totalWealth = player.gold + player.savings + player.investments + stockValue - player.loanAmount;
  const educationValue = player.completedDegrees.length * 9;
  const careerValue = player.currentJob ? player.dependability : 0;
  const adventureGoal = goalSettings.adventure ?? 0;
  const adventureEnabled = adventureGoal > 0;
  const adventureValue = player.completedQuests + player.dungeonFloorsCleared.length;

  const wealth = progressFromStartingValue(totalWealth, goalSettings.wealth, STARTING_WEALTH);
  const happiness = progressFromStartingValue(player.happiness, goalSettings.happiness, STARTING_HAPPINESS);
  const education = progressFromStartingValue(educationValue, goalSettings.education, 0);
  const career = progressFromStartingValue(careerValue, goalSettings.career, 0);
  const adventure = adventureEnabled
    ? progressFromStartingValue(adventureValue, adventureGoal, 0)
    : null;
  const enabledProgress = [wealth, happiness, education, career];
  if (adventure !== null) enabledProgress.push(adventure);

  return {
    wealth,
    happiness,
    education,
    career,
    adventure,
    overall: enabledProgress.reduce((sum, value) => sum + value, 0) / enabledProgress.length,
  };
}
