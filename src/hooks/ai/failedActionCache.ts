import type { Player } from '@/types/game.types';
import type { AIAction } from './types';

/** Stable identity for the action itself, independent of the player's state. */
export function getAIActionIdentity(action: AIAction): string {
  const detail = action.details?.degreeId
    || action.details?.jobId
    || action.details?.itemId
    || action.details?.floorId
    || action.details?.questId
    || action.details?.bountyId
    || action.details?.ticketType
    || action.details?.targetId
    || '';

  return `${action.type}:${action.location || ''}:${String(detail)}`;
}

/**
 * Compact signature of the prerequisites that commonly decide whether an AI
 * action can succeed. A failed action is suppressed only while this signature
 * remains unchanged. Moving, earning gold, spending time, changing job or
 * progressing education therefore permits a fresh attempt.
 */
export function getAIFailureStateSignature(player: Player): string {
  return JSON.stringify({
    location: player.currentLocation,
    gold: player.gold,
    time: player.timeRemaining,
    health: player.health,
    food: player.foodLevel,
    happiness: player.happiness,
    clothing: player.clothingCondition,
    relaxation: player.relaxation,
    job: player.currentJob,
    wage: player.currentWage,
    housing: player.housing,
    guildRank: player.guildRank,
    dependability: player.dependability,
    experience: player.experience,
    savings: player.savings,
    investments: player.investments,
    freshFood: player.freshFood,
    sick: player.isSick,
    guildPass: player.hasGuildPass,
    rentDebt: player.rentDebt,
    completedDegrees: [...player.completedDegrees].sort(),
    degreeProgress: Object.entries(player.degreeProgress)
      .sort(([left], [right]) => left.localeCompare(right)),
    prepaidDegrees: Object.entries(player.prepaidDegrees ?? {})
      .sort(([left], [right]) => left.localeCompare(right)),
    inventory: [...player.inventory].map(item => String(item)).sort(),
  });
}

export function getAIFailedActionKey(action: AIAction, player: Player): string {
  return `${getAIActionIdentity(action)}|${getAIFailureStateSignature(player)}`;
}
