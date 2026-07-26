import type { Player } from '@/types/game.types';
import type { AIAction } from './types';

export type AIFailureReason = 'action-rejected';

export interface AIFailedActionRecord {
  playerId: string;
  actionIdentity: string;
  stateSignature: string;
  reason: AIFailureReason;
  attemptsForSignature: number;
}

export type AIFailedActionCache = Map<string, AIFailedActionRecord>;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

function stableEntries<T>(record: Record<string, T> | undefined): Array<[string, unknown]> {
  return Object.entries(record ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, stableValue(value)]);
}

/** Stable identity for the complete action request, independent of player state. */
export function getAIActionIdentity(action: AIAction): string {
  const details = JSON.stringify(stableValue(action.details ?? {}));
  return `${action.type}:${action.location || ''}:${details}`;
}

/**
 * Signature of the player-owned prerequisites that can make an action start or
 * stop succeeding. A record blocks a retry only while this signature is the
 * same. Earning money, moving, spending time, progressing education, changing
 * equipment/ownership, or updating quest/finance state permits a fresh attempt.
 */
export function getAIFailureStateSignature(player: Player): string {
  return JSON.stringify({
    playerId: player.id,
    location: player.currentLocation,
    previousLocation: player.previousLocation,
    gold: player.gold,
    savings: player.savings,
    investments: player.investments,
    stocks: stableEntries(player.stocks),
    loanAmount: player.loanAmount,
    loanWeeksRemaining: player.loanWeeksRemaining,
    time: player.timeRemaining,
    health: player.health,
    maxHealth: player.maxHealth,
    food: player.foodLevel,
    freshFood: player.freshFood,
    happiness: player.happiness,
    relaxation: player.relaxation,
    clothing: player.clothingCondition,
    backupOutfit: player.backupOutfit,
    job: player.currentJob,
    wage: player.currentWage,
    shiftsWorkedSinceHire: player.shiftsWorkedSinceHire,
    totalShiftsWorked: player.totalShiftsWorked,
    dependability: player.dependability,
    experience: player.experience,
    housing: player.housing,
    rentDebt: player.rentDebt,
    rentPrepaidWeeks: player.rentPrepaidWeeks,
    lockedRent: player.lockedRent,
    guildRank: player.guildRank,
    guildPass: player.hasGuildPass,
    guildReputation: player.guildReputation,
    completedDegrees: [...player.completedDegrees].sort(),
    degreeProgress: stableEntries(player.degreeProgress),
    prepaidDegrees: stableEntries(player.prepaidDegrees),
    inventory: [...player.inventory].map(String).sort(),
    durables: stableEntries(player.durables),
    appliances: stableEntries(player.appliances),
    equippedWeapon: player.equippedWeapon,
    equippedArmor: player.equippedArmor,
    equippedShield: player.equippedShield,
    temperedItems: [...player.temperedItems].sort(),
    equipmentDurability: stableEntries(player.equipmentDurability),
    activeQuest: player.activeQuest,
    questLocationProgress: [...player.questLocationProgress].sort(),
    questChainProgress: stableEntries(player.questChainProgress),
    nlChainProgress: stableEntries(player.nlChainProgress),
    completedBountiesThisWeek: [...player.completedBountiesThisWeek].sort(),
    dungeonFloorsCleared: [...player.dungeonFloorsCleared].sort((a, b) => a - b),
    dungeonAttemptsThisTurn: player.dungeonAttemptsThisTurn,
    tickets: [...player.tickets].sort(),
    lotteryTickets: player.lotteryTickets,
    sick: player.isSick,
    hexScrolls: stableValue(player.hexScrolls),
    activeCurses: stableValue(player.activeCurses),
    protectiveAmulet: player.hasProtectiveAmulet,
    hexCastCooldown: player.hexCastCooldown,
    protectionWeeksLeft: player.protectionWeeksLeft,
    raiseAttemptedThisTurn: player.raiseAttemptedThisTurn,
    gameOver: player.isGameOver,
  });
}

function getCacheKey(playerId: string, actionIdentity: string): string {
  return `${playerId}|${actionIdentity}`;
}

export function createAIFailedActionCache(): AIFailedActionCache {
  return new Map();
}

export function recordFailedAIAction(
  cache: AIFailedActionCache,
  action: AIAction,
  player: Player,
  reason: AIFailureReason = 'action-rejected',
): AIFailedActionRecord {
  const actionIdentity = getAIActionIdentity(action);
  const stateSignature = getAIFailureStateSignature(player);
  const key = getCacheKey(player.id, actionIdentity);
  const previous = cache.get(key);
  const attemptsForSignature = previous?.stateSignature === stateSignature
    ? previous.attemptsForSignature + 1
    : 1;
  const record: AIFailedActionRecord = {
    playerId: player.id,
    actionIdentity,
    stateSignature,
    reason,
    attemptsForSignature,
  };
  cache.set(key, record);
  return record;
}

export function isFailedAIActionBlocked(
  cache: AIFailedActionCache,
  action: AIAction,
  player: Player,
): boolean {
  const actionIdentity = getAIActionIdentity(action);
  const record = cache.get(getCacheKey(player.id, actionIdentity));
  return record?.stateSignature === getAIFailureStateSignature(player);
}

export function getViableAIActions(
  actions: AIAction[],
  player: Player,
  cache: AIFailedActionCache,
): AIAction[] {
  return actions.filter(action =>
    action.type === 'end-turn' || !isFailedAIActionBlocked(cache, action, player),
  );
}

/** Backwards-compatible composite key used by older tests and diagnostics. */
export function getAIFailedActionKey(action: AIAction, player: Player): string {
  return `${getAIActionIdentity(action)}|${getAIFailureStateSignature(player)}`;
}
