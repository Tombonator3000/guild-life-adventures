/**
 * AI Action Handlers — Quests, Guild & Dungeon
 *
 * Handles: buy-guild-pass, take-quest, take-chain-quest, take-bounty,
 *          complete-quest, complete-location-objective, explore-dungeon
 */

import type { Player } from '@/types/game.types';
import { GUILD_PASS_COST } from '@/types/game.types';
import { useGameStore } from '@/store/gameStore';
import type { DungeonActionResult } from '@/store/dungeonTypes';

import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

// ─── Guild & Quests ─────────────────────────────────────────────────────

export function handleBuyGuildPass(player: Player, _action: AIAction, store: StoreActions): boolean {
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

export function handleCompleteQuest(player: Player, _action: AIAction, store: StoreActions): boolean {
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

function failure(message: string): DungeonActionResult {
  return { success: false, message };
}

/**
 * Synchronously drives the same host-owned dungeon session used by the
 * interactive UI. The AI chooses only the floor; encounter generation,
 * randomness, time, health, loot, drops and durability remain authoritative.
 */
function autoResolveCanonicalDungeon(playerId: string, floorId: number): DungeonActionResult {
  const started = useGameStore.getState().beginDungeonRun(playerId, floorId);
  if (!started?.success) return started ?? failure('The dungeon run could not be started.');

  // A floor is intentionally small, but keep a hard guard so malformed state
  // can never create an infinite AI turn.
  for (let step = 0; step < 64; step += 1) {
    const state = useGameStore.getState();
    const session = state.dungeonRuns[playerId];
    if (!session) return failure('The active dungeon session disappeared.');

    if (session.runState.phase === 'encounter-intro') {
      const resolved = state.resolveDungeonEncounter(playerId);
      if (!resolved?.success) return resolved ?? failure('The encounter could not be resolved.');
      continue;
    }

    if (session.runState.phase === 'encounter-result') {
      const currentPlayer = state.players.find(candidate => candidate.id === playerId);
      if (!currentPlayer) return failure('Player not found during dungeon run.');

      const nextAction = currentPlayer.timeRemaining >= session.encounterTimeCost
        ? 'continue'
        : 'leave';
      const advanced = state.advanceDungeonRun(playerId, nextAction);
      if (!advanced?.success) return advanced ?? failure('The dungeon run could not advance.');
      continue;
    }

    const finalized = state.finalizeDungeonRun(playerId);
    return finalized ?? failure('The dungeon run could not be finalized.');
  }

  return failure('Dungeon auto-resolve exceeded its safety limit.');
}

export function handleExploreDungeon(player: Player, action: AIAction, _store: StoreActions): boolean {
  const floorId = action.details?.floorId;
  if (!Number.isInteger(floorId)) return false;

  const result = autoResolveCanonicalDungeon(player.id, floorId as number);
  if (!result.success) return false;

  const summary = result.summary;
  console.log(
    `[Grimwald AI] Dungeon Floor ${floorId}: ${summary?.success ? 'CLEARED' : 'FAILED'}. ` +
    `+${summary?.goldEarned ?? 0}g, ${summary?.encountersCompleted ?? 0} encounters.`,
  );
  return true;
}
