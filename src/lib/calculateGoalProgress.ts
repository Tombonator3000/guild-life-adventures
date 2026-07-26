import { calculateStockValue } from '@/data/stocks';
import type { GoalSettings, Player } from '@/types/game.types';

export const STARTING_WEALTH = 100;
export const STARTING_HAPPINESS = 50;
export const EDUCATION_POINTS_PER_DEGREE = 9;

function progressFromStartingValue(value: number, goal: number, startingValue: number): number {
  if (goal <= startingValue) return value >= goal ? 100 : 0;
  const progress = ((value - startingValue) / (goal - startingValue)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function calculateTotalWealth(
  player: Pick<Player, 'gold' | 'savings' | 'investments' | 'stocks' | 'loanAmount'>,
  stockPrices: Record<string, number>,
): number {
  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const legacyInvestmentValue = Math.max(0, player.investments ?? 0);
  return player.gold + player.savings + legacyInvestmentValue + stockValue - player.loanAmount;
}

export function calculateEducationValue(player: Pick<Player, 'completedDegrees'>): number {
  return player.completedDegrees.length * EDUCATION_POINTS_PER_DEGREE;
}

export function calculateCareerValue(player: Pick<Player, 'currentJob' | 'dependability'>): number {
  return player.currentJob ? player.dependability : 0;
}

export function calculateAdventureValue(
  player: Pick<Player, 'completedQuests' | 'dungeonFloorsCleared'>,
): number {
  return player.completedQuests + player.dungeonFloorsCleared.length;
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
  const totalWealth = calculateTotalWealth(player, stockPrices);
  const educationValue = calculateEducationValue(player);
  const careerValue = calculateCareerValue(player);
  const adventureGoal = goalSettings.adventure ?? 0;
  const adventureEnabled = adventureGoal > 0;
  const adventureValue = calculateAdventureValue(player);

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
