import { calculateStockValue } from '@/data/stocks';
import type { GoalSettings, Player } from '@/types/game.types';
import { calculateGoalProgress } from './calculateGoalProgress';

export type GoalKey = 'wealth' | 'happiness' | 'education' | 'career' | 'adventure';

export interface GoalResult {
  key: GoalKey;
  label: string;
  current: number;
  target: number;
  suffix: string;
  met: boolean;
  missing: number;
  progress: number;
}

export interface PerformanceBreakdown {
  goalProgress: number;
  goldEarned: number;
  quests: number;
  dungeon: number;
  shifts: number;
  degrees: number;
  health: number;
  happiness: number;
  victoryBonus: number;
}

export interface PlayerPostGameResult {
  player: Player;
  totalWealth: number;
  totalEducation: number;
  careerValue: number;
  adventureValue: number;
  goals: GoalResult[];
  allGoalsMet: boolean;
  goalProgress: number;
  missingSummary: string;
  performanceScore: number;
  performanceBreakdown: PerformanceBreakdown;
}

const GOAL_PROFILES: Array<{ name: string; goals: GoalSettings }> = [
  { name: 'Quick', goals: { wealth: 2000, happiness: 75, education: 18, career: 50, adventure: 0 } },
  { name: 'Standard', goals: { wealth: 5000, happiness: 100, education: 45, career: 75, adventure: 0 } },
  { name: 'Adventure', goals: { wealth: 4000, happiness: 80, education: 27, career: 65, adventure: 12 } },
  { name: 'Epic', goals: { wealth: 10000, happiness: 100, education: 90, career: 100, adventure: 20 } },
];

function clampRatio(value: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(1, Math.max(0, value / target));
}

function goalResult(
  key: GoalKey,
  label: string,
  current: number,
  target: number,
  suffix: string,
  progress: number,
): GoalResult {
  return {
    key,
    label,
    current,
    target,
    suffix,
    met: current >= target,
    missing: Math.max(0, target - current),
    progress,
  };
}

export function formatGoalValue(goal: Pick<GoalResult, 'current' | 'suffix'>): string {
  return `${Math.round(goal.current).toLocaleString()}${goal.suffix}`;
}

export function formatGoalTarget(goal: Pick<GoalResult, 'target' | 'suffix'>): string {
  return `${Math.round(goal.target).toLocaleString()}${goal.suffix}`;
}

export function formatGoalGap(goal: Pick<GoalResult, 'missing' | 'suffix' | 'label'>): string {
  const amount = `${Math.round(goal.missing).toLocaleString()}${goal.suffix}`;
  return goal.suffix ? amount : `${amount} ${goal.label.toLowerCase()}`;
}

export function detectGoalProfile(goals: GoalSettings): string {
  const match = GOAL_PROFILES.find(profile => (
    profile.goals.wealth === goals.wealth
    && profile.goals.happiness === goals.happiness
    && profile.goals.education === goals.education
    && profile.goals.career === goals.career
    && profile.goals.adventure === (goals.adventure ?? 0)
  ));
  return match?.name ?? 'Custom';
}

function buildMissingSummary(playerName: string, goals: GoalResult[]): string {
  const missingGoals = goals.filter(goal => !goal.met);
  if (missingGoals.length === 0) {
    return `${playerName} reached every active victory goal.`;
  }

  const gaps = missingGoals.map(formatGoalGap);
  const joined = gaps.length === 1
    ? gaps[0]
    : `${gaps.slice(0, -1).join(', ')} and ${gaps[gaps.length - 1]}`;
  return `${playerName} needed ${joined} more to win.`;
}

export function calculatePerformanceScore(
  player: Player,
  goalSettings: GoalSettings,
  stockPrices: Record<string, number>,
  week: number,
  isVictoryRaceWinner: boolean,
): { score: number; breakdown: PerformanceBreakdown } {
  const progress = calculateGoalProgress(player, goalSettings, stockPrices);
  const stats = player.gameStats ?? {} as Player['gameStats'];
  const totalQuests = (stats.totalQuestsCompleted ?? 0) + (stats.totalBountiesCompleted ?? 0);
  const degreeTarget = Math.max(1, Math.ceil(goalSettings.education / 9));
  const questTarget = Math.max(1, (goalSettings.adventure ?? 0) > 0 ? goalSettings.adventure : 10);
  const goldTarget = Math.max(2000, goalSettings.wealth * 2);
  const shiftTarget = Math.max(12, week * 3);

  const breakdown: PerformanceBreakdown = {
    goalProgress: Math.round(progress.overall * 45),
    goldEarned: Math.round(clampRatio(stats.totalGoldEarned ?? 0, goldTarget) * 1000),
    quests: Math.round(clampRatio(totalQuests, questTarget) * 800),
    dungeon: Math.round(clampRatio(stats.totalDungeonFloors ?? 0, 6) * 700),
    shifts: Math.round(clampRatio(stats.totalShiftsWorked ?? player.totalShiftsWorked ?? 0, shiftTarget) * 500),
    degrees: Math.round(clampRatio(player.completedDegrees.length, degreeTarget) * 500),
    health: Math.round(clampRatio(player.health, Math.max(1, player.maxHealth)) * 500),
    happiness: Math.round(clampRatio(player.happiness, 100) * 500),
    victoryBonus: isVictoryRaceWinner ? 1000 : 0,
  };

  return {
    score: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    breakdown,
  };
}

export function buildPlayerPostGameResult(
  player: Player,
  goalSettings: GoalSettings,
  stockPrices: Record<string, number>,
  week: number,
  winnerId: string | null,
): PlayerPostGameResult {
  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const totalWealth = player.gold + player.savings + player.investments + stockValue - player.loanAmount;
  const totalEducation = player.completedDegrees.length * 9;
  const careerValue = player.currentJob ? player.dependability : 0;
  const adventureValue = player.completedQuests + player.dungeonFloorsCleared.length;
  const progress = calculateGoalProgress(player, goalSettings, stockPrices);

  const goals: GoalResult[] = [
    goalResult('wealth', 'Wealth', totalWealth, goalSettings.wealth, 'g', progress.wealth),
    goalResult('happiness', 'Happiness', player.happiness, goalSettings.happiness, '', progress.happiness),
    goalResult('education', 'Education', totalEducation, goalSettings.education, '', progress.education),
    goalResult('career', 'Career', careerValue, goalSettings.career, ' dep', progress.career),
  ];
  if ((goalSettings.adventure ?? 0) > 0 && progress.adventure !== null) {
    goals.push(goalResult(
      'adventure',
      'Adventure',
      adventureValue,
      goalSettings.adventure,
      ' pts',
      progress.adventure,
    ));
  }

  const { score, breakdown } = calculatePerformanceScore(
    player,
    goalSettings,
    stockPrices,
    week,
    player.id === winnerId,
  );

  return {
    player,
    totalWealth,
    totalEducation,
    careerValue,
    adventureValue,
    goals,
    allGoalsMet: goals.every(goal => goal.met),
    goalProgress: progress.overall,
    missingSummary: buildMissingSummary(player.name, goals),
    performanceScore: score,
    performanceBreakdown: breakdown,
  };
}

export function buildPostGameResults(
  players: Player[],
  goalSettings: GoalSettings,
  stockPrices: Record<string, number>,
  week: number,
  winnerId: string | null,
): PlayerPostGameResult[] {
  return players.map(player => buildPlayerPostGameResult(
    player,
    goalSettings,
    stockPrices,
    week,
    winnerId,
  ));
}
