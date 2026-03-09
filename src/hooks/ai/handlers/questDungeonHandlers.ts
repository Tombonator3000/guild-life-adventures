/**
 * AI Action Handlers — Quests, Guild & Dungeon
 *
 * Handles: buy-guild-pass, take-quest, take-chain-quest, take-bounty,
 *          complete-quest, complete-location-objective, explore-dungeon
 */

import type { Player } from '@/types/game.types';
import { GUILD_PASS_COST } from '@/types/game.types';
import { calculateCombatStats } from '@/data/items';
import { getFloor, calculateEducationBonuses, getEncounterTimeCost, getLootMultiplier, ENCOUNTERS_PER_FLOOR } from '@/data/dungeon';
import { autoResolveFloor } from '@/data/combatResolver';
import { FESTIVALS } from '@/data/festivals';
import { useGameStore } from '@/store/gameStore';

import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

// ─── Guild & Quests ─────────────────────────────────────────────────────

export function handleBuyGuildPass(player: Player, action: AIAction, store: StoreActions): boolean {
  if (player.hasGuildPass || player.gold < GUILD_PASS_COST) return false;
  store.buyGuildPass(player.id);
  store.spendTime(player.id, 1);
  return true;
}

export function handleTakeQuest(player: Player, action: AIAction, store: StoreActions): boolean {
  const questId = action.details?.questId as string;
  if (!questId || player.activeQuest) return false;
  if (player.questCooldownWeeksLeft > 0) return false;
  store.takeQuest(player.id, questId);
  store.spendTime(player.id, 1);
  return true;
}

export function handleTakeChainQuest(player: Player, action: AIAction, store: StoreActions): boolean {
  const chainId = action.details?.chainId as string;
  if (!chainId || player.activeQuest) return false;
  if (player.questCooldownWeeksLeft > 0) return false;
  store.takeChainQuest(player.id, chainId);
  store.spendTime(player.id, 1);
  return true;
}

export function handleTakeBounty(player: Player, action: AIAction, store: StoreActions): boolean {
  const bountyId = action.details?.bountyId as string;
  if (!bountyId || player.activeQuest) return false;
  if (player.completedBountiesThisWeek.includes(bountyId)) return false;
  store.takeBounty(player.id, bountyId);
  store.spendTime(player.id, 1);
  return true;
}

export function handleCompleteQuest(player: Player, action: AIAction, store: StoreActions): boolean {
  if (!player.activeQuest) return false;
  store.completeQuest(player.id);
  return true;
}

export function handleCompleteLocationObjective(player: Player, action: AIAction, store: StoreActions): boolean {
  const objectiveId = action.details?.objectiveId as string;
  if (!objectiveId || !player.activeQuest) return false;
  store.completeLocationObjective(player.id, objectiveId);
  return true;
}

// ─── Dungeon ────────────────────────────────────────────────────────────

/** Validate that the player can attempt a dungeon floor. Returns false if blocked. */
function canAttemptDungeon(player: Player, timeCost: number): boolean {
  const attemptsUsed = player.dungeonAttemptsThisTurn || 0;
  if (attemptsUsed >= 2) return false;
  if (player.health <= 20) return false;
  if (player.completedDegrees.length === 0) return false;
  if (player.timeRemaining < timeCost) return false;
  return true;
}

/** Increment the player's dungeon attempt counter for this turn. */
function trackDungeonAttempt(playerId: string): void {
  const storeState = useGameStore.getState();
  useGameStore.setState({
    players: storeState.players.map(p =>
      p.id === playerId
        ? { ...p, dungeonAttemptsThisTurn: (p.dungeonAttemptsThisTurn || 0) + 1 }
        : p
    ),
  });
}

/** Calculate festival-adjusted gold earned from a dungeon run. */
function calculateDungeonGold(baseGold: number, bossDefeated: boolean): number {
  const festivalId = useGameStore.getState().activeFestival;
  const festivalMult = festivalId
    ? (FESTIVALS.find(f => f.id === festivalId)?.dungeonGoldMultiplier ?? 1.0)
    : 1.0;
  const defeatMult = bossDefeated ? 1.0 : 0.25;
  return Math.floor(baseGold * defeatMult * festivalMult);
}

/** Packages the player's combat and education stats for a given floor into a single context object. */
function buildDungeonRunContext(player: Player, floor: NonNullable<ReturnType<typeof getFloor>>) {
  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
    player.temperedItems,
    player.equipmentDurability,
  );
  const eduBonuses = calculateEducationBonuses(player.completedDegrees);
  const timeCost = getEncounterTimeCost(floor, combatStats) * ENCOUNTERS_PER_FLOOR;
  return { combatStats, eduBonuses, timeCost };
}

/** Apply all results from a dungeon run: gold, health, happiness, floor clear, rare drops, durability. */
function applyDungeonResults(
  playerId: string,
  floorId: number,
  floor: ReturnType<typeof getFloor> & object,
  result: ReturnType<typeof autoResolveFloor>,
  isFirstClear: boolean,
  store: StoreActions,
): number {
  const actualGold = calculateDungeonGold(result.goldEarned, result.bossDefeated);

  if (actualGold > 0) store.modifyGold(playerId, actualGold);
  if (result.healthChange !== 0) store.modifyHealth(playerId, result.healthChange);

  if (result.bossDefeated && isFirstClear) {
    store.clearDungeonFloor(playerId, floorId);
    store.modifyHappiness(playerId, floor.happinessOnClear);
  } else if (!result.bossDefeated) {
    store.modifyHappiness(playerId, -2);
  }

  if (result.rareDropName) {
    store.applyRareDrop(playerId, floor.rareDrop.id);
  }
  if (result.durabilityLoss) {
    store.applyDurabilityLoss(playerId, result.durabilityLoss);
  }

  return actualGold;
}

export function handleExploreDungeon(player: Player, action: AIAction, store: StoreActions): boolean {
  const floorId = action.details?.floorId as number;
  // H8 FIX: Use explicit null check instead of falsy (floor 0 is valid)
  if (floorId === undefined || floorId === null) return false;
  const floor = getFloor(floorId);
  if (!floor) return false;

  // Build the player's combat context and validate time budget
  const { combatStats, eduBonuses, timeCost } = buildDungeonRunContext(player, floor);
  if (!canAttemptDungeon(player, timeCost)) return false;

  // Commit to the run — spend time and record the attempt
  store.spendTime(player.id, timeCost);
  trackDungeonAttempt(player.id);

  // Resolve the dungeon floor
  const isFirstClear = !player.dungeonFloorsCleared.includes(floorId);
  const lootMult = getLootMultiplier(floor, player.guildRank);
  const equippedItems = {
    weapon: player.equippedWeapon,
    armor: player.equippedArmor,
    shield: player.equippedShield,
  };
  const result = autoResolveFloor(
    floor,
    combatStats,
    eduBonuses,
    player.health,
    isFirstClear,
    lootMult,
    player.dungeonFloorsCleared,
    equippedItems,
    player.maxHealth,
  );

  // Apply results and check for death
  const actualGold = applyDungeonResults(player.id, floorId, floor, result, isFirstClear, store);
  useGameStore.getState().checkDeath(player.id);

  console.log(`[Grimwald AI] Dungeon Floor ${floorId}: ${result.success ? 'CLEARED' : 'FAILED'}. ` +
    `+${actualGold}g, ${result.healthChange} HP. ${result.log.join(' | ')}`);
  return true;
}
