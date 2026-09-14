import type { DegreeId, Player } from '@/types/game.types';
import { RENT_COSTS, FOOD_DEPLETION_PER_WEEK, GUILD_PASS_COST } from '@/types/game.types';
import { DEGREES, getEffectiveSessionsRequired } from '@/data/education';
import { CLOTHING_THRESHOLDS, getItem, getItemPrice } from '@/data/items';
import { getJob } from '@/data/jobs';
import { getHomeLocation } from '@/store/helpers/turnHelpers';
import { hasCurseEffect } from '@/store/helpers/hexHelpers';
import { getEffectiveHousingRent, isLandlordOpen } from '@/store/helpers/economy/housingServiceHelpers';
import type { AIAction, GoalProgress } from './types';
import type { ActionContext } from './actions/actionContext';
import { getJobLocation, getNextDegreeByROI } from './strategy';

function foodTarget(player: Player): number {
  const decay = hasCurseEffect(player, 'food-clothing-decay')?.magnitude ?? 1;
  return Math.min(100, Math.round(FOOD_DEPLETION_PER_WEEK * decay) + 15);
}

/** Money already needed for near-term essentials is not disposable income. */
export function getEssentialReserve(player: Player, priceModifier: number): number {
  const food = Math.ceil(Math.max(15, foodTarget(player) - player.foodLevel) / 15) * Math.round(12 * priceModifier);
  const rent = player.housing !== 'homeless' && (player.rentPrepaidWeeks ?? 0) <= 0 && player.weeksSinceRent >= 2
    ? Math.max(player.rentDebt ?? 0, player.lockedRent || Math.round(RENT_COSTS[player.housing] * priceModifier)) : 0;
  const job = player.currentJob ? getJob(player.currentJob) : null;
  const clothes = job && player.clothingCondition < CLOTHING_THRESHOLDS[job.requiredClothing]
    ? Math.round((job.requiredClothing === 'business' ? 175 : job.requiredClothing === 'dress' ? 60 : 12) * priceModifier) : 0;
  return food + rent + clothes;
}

export function getAISessionsRequired(player: Player, degreeId: DegreeId): number {
  return getEffectiveSessionsRequired(DEGREES[degreeId].sessionsRequired,
    Object.keys(player.durables),
    Object.entries(player.appliances).filter(([, item]) => item && !item.isBroken).map(([id]) => id));
}

/** Check prerequisites before spending travel time. The store still owns execution. */
export function isTacticallyFeasible(action: AIAction, ctx: ActionContext): boolean {
  const { player, priceModifier } = ctx;
  if (action.type === 'move') return false;
  if (action.type === 'study' || action.type === 'graduate') {
    const id = action.details?.degreeId as DegreeId;
    const degree = DEGREES[id];
    if (!degree || player.completedDegrees.includes(id)
      || !degree.prerequisites.every(d => player.completedDegrees.includes(d))) return false;
    const done = (player.degreeProgress[id] ?? 0) >= getAISessionsRequired(player, id);
    if (action.type === 'graduate') return done;
    const cost = (player.prepaidDegrees?.[id] ?? 0) > 0 ? 0 : Math.round(degree.costPerSession * priceModifier);
    return !done && player.timeRemaining >= degree.hoursPerSession && player.gold >= cost
      && (cost === 0 || player.gold - cost >= getEssentialReserve(player, priceModifier));
  }
  if (action.type === 'work') {
    const job = player.currentJob ? getJob(player.currentJob) : null;
    return !!job && getJobLocation(job) === player.currentLocation && player.clothingCondition > 0
      && player.clothingCondition >= CLOTHING_THRESHOLDS[job.requiredClothing]
      && player.timeRemaining >= (action.details?.mode === 'remaining' ? 1 : job.hoursPerShift);
  }
  if (action.type === 'request-raise' && player.raiseAttemptedThisTurn) return false;
  if (['pay-rent', 'move-housing', 'downgrade-housing'].includes(action.type)) {
    if (!isLandlordOpen(ctx.week, player.weeksSinceRent)) return false;
    if (action.type === 'pay-rent') {
      if (player.rentPrepaidWeeks > 0 || player.housing === 'homeless') return false;
      if (player.gold < getEffectiveHousingRent(player.housing, player.lockedRent, priceModifier)) return false;
    } else {
      const tier = action.details?.tier;
      if ((tier !== 'slums' && tier !== 'noble') || tier === player.housing) return false;
      if (player.gold < getEffectiveHousingRent(tier, 0, priceModifier) * 2) return false;
    }
  }
  if (action.type === 'buy-food') {
    const base = player.currentLocation === 'rusty-tankard' ? 12
      : player.currentLocation === 'shadow-market' ? 6 : 15;
    if (player.gold < Math.round(base * priceModifier)) return false;
  }
  const hours = Number(action.details?.hours ?? (action.type === 'end-turn' || action.type === 'pay-rent' ? 0 : 1));
  const equipment = action.type === 'buy-equipment' ? getItem(String(action.details?.itemId ?? '')) : null;
  const cost = action.type === 'buy-guild-pass' ? GUILD_PASS_COST
    : equipment ? getItemPrice(equipment, priceModifier)
    : Number(action.details?.cost ?? action.details?.canonicalCost ?? 0);
  if (player.timeRemaining < hours || player.gold < cost) return false;

  // Don't spend the rent/food budget on speculative or decorative purchases.
  const discretionary = ['buy-appliance', 'buy-equipment', 'temper-equipment', 'buy-stock',
    'buy-lottery-ticket', 'buy-ticket', 'buy-hex-scroll', 'buy-guild-pass', 'sabotage-player'];
  if (discretionary.includes(action.type) && player.gold - cost < getEssentialReserve(player, priceModifier)) return false;
  return true;
}

/** Useful options previously missing from the location generators. */
export function generateTacticalActions(ctx: ActionContext, targetDegree?: string): AIAction[] {
  const { player, currentLocation, progress, settings, priceModifier } = ctx;
  const actions: AIAction[] = [];
  if (player.foodLevel < foodTarget(player)) {
    const food = currentLocation === 'rusty-tankard' ? { itemId: 'stew', cost: 12 }
      : currentLocation === 'shadow-market' ? { itemId: 'mystery-meat', cost: 6 } : null;
    if (food) actions.push({ type: 'buy-food', priority: 100, description: 'Buy enough food for the coming week',
      details: { vendor: currentLocation, itemId: food.itemId, cost: Math.round(food.cost * priceModifier) } });
  }
  if (currentLocation === 'academy') {
    // Effective graduation thresholds include books/appliances, just like the store.
    for (const degree of Object.values(DEGREES)) {
      if (!player.completedDegrees.includes(degree.id)
        && (player.degreeProgress[degree.id] ?? 0) >= getAISessionsRequired(player, degree.id)) {
        actions.push({ type: 'graduate', priority: 100, description: `Graduate from ${degree.name}`, details: { degreeId: degree.id } });
      }
    }
    const degree = targetDegree ? DEGREES[targetDegree as DegreeId] : getNextDegreeByROI(player, settings);
    if (degree && (progress.education.progress < 1 || targetDegree)) {
      actions.push({ type: 'study', priority: 74, description: `Study ${degree.name}`,
        details: { degreeId: degree.id, hours: degree.hoursPerSession } });
    }
  }
  const job = player.currentJob ? getJob(player.currentJob) : null;
  if (job && currentLocation === getJobLocation(job) && player.timeRemaining > 0 && player.timeRemaining < job.hoursPerShift) {
    actions.push({ type: 'work', priority: 65, description: `Work a short shift as ${job.name}`,
      details: { jobId: job.id, mode: 'remaining', hours: player.timeRemaining } });
  }

  // Home recovery can finish a happiness goal even above the old <40 threshold.
  if (player.housing !== 'homeless' && currentLocation === getHomeLocation(player.housing)) {
    if (player.timeRemaining >= 8 && (progress.happiness.progress < 1 || player.health < player.maxHealth)) {
      actions.push({ type: 'rest', priority: player.health < 30 ? 110 : 76,
        description: 'Sleep at home to recover health and happiness', details: { activity: 'sleep', hours: 8 } });
    }
    if (player.timeRemaining > 0) {
      const hours = player.timeRemaining;
      const gain = Math.round((hours / (player.housing === 'noble' ? 3 : 8)) * 3) + Math.round(hours);
      const othersComplete = (['wealth', 'education', 'career', 'adventure'] as const).every(g => progress[g].progress >= 1);
      const canWin = othersComplete && player.happiness + gain >= progress.happiness.target;
      if (canWin || hours <= 8) actions.push({ type: 'end-turn', priority: canWin ? 650 : 80,
        description: canWin ? 'Finish the week at home to complete the victory goals' : 'Finish the week resting at home' });
    }
  }
  if (currentLocation === 'bank') {
    const reserve = getEssentialReserve(player, priceModifier);
    if (player.gold < reserve && player.savings > 0) actions.push({
      type: 'withdraw-bank', priority: 100, description: 'Withdraw enough for food, clothing and rent',
      details: { amount: Math.min(player.savings, reserve - player.gold + 25) },
    });
  }
  return actions;
}

/** Safety priorities are applied AFTER personality/plan weights. */
export function getSurvivalPriority(action: AIAction, ctx: ActionContext): number {
  const { player } = ctx;
  if (action.type === 'buy-food' && player.foodLevel < foodTarget(player)) return 560;
  if ((action.type === 'heal' || (action.type === 'rest' && action.details?.activity === 'sleep')) && player.health < 30) return 550;
  if (action.type === 'pay-rent' && player.weeksSinceRent >= 3) return 530;
  if (action.type === 'withdraw-bank' && player.gold < getEssentialReserve(player, ctx.priceModifier)) return 520;
  const job = player.currentJob ? getJob(player.currentJob) : null;
  if (action.type === 'buy-clothing' && (player.clothingCondition <= 0
    || (job && player.clothingCondition < CLOTHING_THRESHOLDS[job.requiredClothing]))) return 540;
  if (action.type === 'cure-sickness' && player.isSick) return 490;
  return 0;
}

/** Score progress toward the remaining finish line, not endless overachievement. */
export function applyGoalRelevance(action: AIAction, ctx: ActionContext): void {
  const { progress, player } = ctx;
  const goalsByAction: Partial<Record<AIAction['type'], Array<keyof Omit<GoalProgress, 'overall'>>>> = {
    work: ['wealth', 'career'], 'apply-job': ['wealth', 'career'], 'request-raise': ['wealth'],
    study: ['education'], graduate: ['education', 'happiness'], rest: ['happiness'],
    'buy-appliance': ['happiness'], 'buy-ticket': ['happiness'],
    'explore-dungeon': ['adventure', 'wealth'], 'complete-quest': ['adventure', 'wealth'],
    'take-quest': ['adventure', 'wealth'], 'take-chain-quest': ['adventure', 'wealth'],
    'take-bounty': ['adventure', 'wealth'],
  };
  const targets = goalsByAction[action.type];
  if (!targets) return;
  const deficit = Math.max(...targets.map(g => Math.max(0, 1 - progress[g].progress)));
  if (deficit > 0) {
    // A strong personality remains recognizable, but a merchant must eventually
    // finish education too. Compare the remaining gap before applying its bias.
    action.priority *= 0.55 + deficit * 0.85;
    action.priority += 25 * deficit;
    const unfinished = (['wealth', 'happiness', 'education', 'career', 'adventure'] as const)
      .filter(g => progress[g].progress < 1);
    if (unfinished.length === 1 && targets.includes(unfinished[0])) action.priority += 65;
  } else {
    const needsIncome = player.gold < getEssentialReserve(player, ctx.priceModifier) + 50;
    const needsHealth = action.type === 'rest' && player.health < player.maxHealth * 0.7;
    if (!(needsIncome && targets.includes('wealth')) && !needsHealth) action.priority *= 0.3;
  }
}
