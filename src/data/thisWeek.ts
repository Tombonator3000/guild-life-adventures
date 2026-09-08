import type { Player, GoalSettings } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { DEGREES, getEffectiveSessionsRequired } from './education';
import type { Festival } from './festivals';
import type { WeatherState } from './weather';
import { calculateStockValue } from './stocks';

export interface WeekAdvice { id: string; title: string; detail: string; urgent?: boolean }

/** Read-only guidance. No tutorial flags, random choices or separate game rules. */
export function getThisWeekAdvice(player: Player, goals: GoalSettings, prices: Record<string, number>, festival?: Festival | null, weather?: WeatherState | null): WeekAdvice[] {
  if (player.isGameOver) return [];
  const advice: WeekAdvice[] = [];
  if (player.foodLevel <= 20 && player.freshFood <= 0) advice.push({ id: 'food', title: 'Check your food', detail: 'No preserved supplies. Visit the Rusty Tankard before your next turn.', urgent: true });
  if (player.health <= 25) advice.push({ id: 'health', title: 'Health is low', detail: 'Healing is available at the Enchanter. Check the cost before travelling.', urgent: true });
  if (player.loanAmount > 0 && player.loanWeeksRemaining <= 2) advice.push({ id: 'loan', title: `Loan due in ${player.loanWeeksRemaining} week${player.loanWeeksRemaining === 1 ? '' : 's'}`, detail: `${player.loanAmount}g owed now. Interest can increase the amount before the deadline.`, urgent: true });
  if (player.housing !== 'homeless' && player.rentPrepaidWeeks <= 0 && player.weeksSinceRent >= 3) advice.push({ id: 'rent', title: 'Rent needs attention', detail: `${player.lockedRent || RENT_COSTS[player.housing]}g weekly rate${player.rentDebt > 0 ? ` · ${player.rentDebt}g arrears` : ''}. Visit the Landlord during collection.`, urgent: true });
  if (!player.currentJob) advice.push({ id: 'job', title: 'A job opens your career goal', detail: 'The Guild Hall has entry-level jobs. Check requirements and travel hours.' });
  const appliances = Object.entries(player.appliances).filter(([, item]) => item && !item.isBroken).map(([id]) => id);
  const nearlyDone = Object.values(DEGREES).find(degree => !player.completedDegrees.includes(degree.id) && (player.degreeProgress[degree.id] ?? 0) >= getEffectiveSessionsRequired(degree.sessionsRequired, Object.keys(player.durables), appliances) - 1);
  if (nearlyDone) advice.push({ id: 'degree', title: `${nearlyDone.name}: nearly complete`, detail: 'Check your remaining session or graduation at the Academy.' });
  if (festival) advice.push({ id: 'festival', title: festival.name, detail: festival.wageMultiplier > 1 ? `Work pays ${Math.round((festival.wageMultiplier - 1) * 100)}% extra this week.` : festival.dungeonGoldMultiplier > 1 ? 'Dungeon gold rewards are increased this week. Check your equipment and health.' : festival.priceMultiplier < 1 ? `Prices are ${Math.round((1 - festival.priceMultiplier) * 100)}% lower this week.` : 'Study and dependability bonuses are active this week.' });
  if (weather && weather.movementCostExtra > 0) advice.push({ id: 'weather', title: `${weather.name}: longer journeys`, detail: `Travel costs ${weather.movementCostExtra} extra hour per step. Leave time for your destination.` });
  const wealth = player.gold + player.savings + (player.investments ?? 0) + calculateStockValue(player.stocks, prices) - player.loanAmount;
  const progress = [
    { id: 'wealth', value: wealth, target: goals.wealth, detail: 'Cash, savings and Broker value count; loan debt is deducted.' },
    { id: 'happiness', value: player.happiness, target: goals.happiness, detail: 'Rest and leisure help. Some work and weekly events can lower happiness.' },
    { id: 'education', value: player.completedDegrees.length * 9, target: goals.education, detail: 'Completed degrees count toward this goal. Check available courses at the Academy.' },
    { id: 'career', value: player.currentJob ? player.dependability : 0, target: goals.career, detail: 'Your dependability counts while employed. Work and protect your job requirements.' },
    { id: 'adventure', value: player.completedQuests + player.dungeonFloorsCleared.length, target: goals.adventure, detail: 'Regular quests and different cleared dungeon floors count.' },
  ].filter(goal => goal.target > 0 && goal.value < goal.target).sort((a, b) => a.value / a.target - b.value / b.target);
  const weakest = progress[0];
  if (weakest) advice.push({ id: `goal-${weakest.id}`, title: `Next goal to build: ${weakest.id}`, detail: weakest.detail });
  return advice.slice(0, 3);
}
