import { FESTIVALS } from '@/data/festivals';
import {
  calculateEducationBonuses,
  checkFloorRequirements,
  getEncounterTimeCost,
  getFloor,
  getLootMultiplier,
  MAX_FLOOR_ATTEMPTS_PER_TURN,
} from '@/data/dungeon';
import {
  advanceToNextEncounter,
  applyEncounterResult,
  initDungeonRun,
  resolveEncounter,
  retreatFromDungeon,
} from '@/data/combatResolver';
import { calculateCombatStats, MAX_DURABILITY } from '@/data/items';
import type { FestivalId, Player } from '@/types/game.types';
import type { GetFn, SetFn } from '../storeTypes';
import type {
  DungeonActionResult,
  DungeonAdvanceAction,
  DungeonCompletionSummary,
  DungeonRunSession,
} from '../dungeonTypes';

function fail(message: string): DungeonActionResult {
  return { success: false, message };
}

/** Pure summary builder used by both settlement and the result UI. */
export function buildDungeonCompletionSummary(
  session: DungeonRunSession,
  player: Player,
  activeFestival: FestivalId | null,
): DungeonCompletionSummary {
  const floor = getFloor(session.floorId);
  if (!floor) {
    throw new Error(`Unknown dungeon floor ${session.floorId}`);
  }

  const run = session.runState;
  const happinessChange = run.bossDefeated && run.isFirstClear
    ? floor.happinessOnClear
    : !run.bossDefeated && !run.retreated
      ? -2
      : 0;
  const lootMultiplier = getLootMultiplier(floor, player.guildRank);
  const defeatMultiplier = !run.bossDefeated && !run.retreated ? 0.25 : 1;
  const festivalMultiplier = activeFestival
    ? (FESTIVALS.find(festival => festival.id === activeFestival)?.dungeonGoldMultiplier ?? 1)
    : 1;

  return {
    success: run.bossDefeated,
    goldEarned: Math.floor(run.totalGold * lootMultiplier * defeatMultiplier * festivalMultiplier),
    totalDamage: run.totalDamage,
    totalHealed: run.totalHealed,
    healthChange: 0,
    isFirstClear: run.isFirstClear && run.bossDefeated,
    retreated: run.retreated,
    rareDropName: run.rareDropName,
    happinessChange,
    encounterLog: run.results,
    encountersCompleted: run.results.length,
    durabilityLoss: run.totalDurabilityLoss,
    hexScrollDropId: run.hexScrollDropId,
  };
}

function applySnapshotDurability(
  player: Player,
  session: DungeonRunSession,
): Player['equipmentDurability'] {
  const next = { ...player.equipmentDurability };
  const { equippedItems, runState } = session;
  const loss = runState.totalDurabilityLoss;

  if (equippedItems.weapon && loss.weaponLoss > 0) {
    next[equippedItems.weapon] = Math.max(
      0,
      (next[equippedItems.weapon] ?? MAX_DURABILITY) - loss.weaponLoss,
    );
  }
  if (equippedItems.armor && loss.armorLoss > 0) {
    next[equippedItems.armor] = Math.max(
      0,
      (next[equippedItems.armor] ?? MAX_DURABILITY) - loss.armorLoss,
    );
  }
  if (equippedItems.shield && loss.shieldLoss > 0) {
    next[equippedItems.shield] = Math.max(
      0,
      (next[equippedItems.shield] ?? MAX_DURABILITY) - loss.shieldLoss,
    );
  }

  return next;
}

export function createDungeonServiceActions(set: SetFn, get: GetFn) {
  return {
    beginDungeonRun: (playerId: string, floorId: number): DungeonActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      const floor = getFloor(floorId);
      if (!player || !floor) return fail('Invalid dungeon request.');
      if (player.currentLocation !== 'cave') return fail('Visit the Cave before entering a floor.');
      if (state.dungeonRuns[playerId]) return fail('A dungeon run is already active.');
      if (player.completedDegrees.length === 0) return fail('Complete a degree before entering the Cave.');
      if (player.health <= 0 || player.isGameOver) return fail('This player cannot enter the dungeon.');
      if ((player.dungeonAttemptsThisTurn ?? 0) >= MAX_FLOOR_ATTEMPTS_PER_TURN) {
        return fail('No dungeon attempts remain this turn.');
      }

      const combatStats = calculateCombatStats(
        player.equippedWeapon,
        player.equippedArmor,
        player.equippedShield,
        player.temperedItems,
        player.equipmentDurability,
      );
      const requirements = checkFloorRequirements(
        floor,
        player.dungeonFloorsCleared,
        player.equippedWeapon,
        player.equippedArmor,
        combatStats,
        player.completedDegrees,
      );
      if (!requirements.canEnter) return fail(requirements.reasons.join('; '));

      const educationBonuses = calculateEducationBonuses(player.completedDegrees);
      const encounterTimeCost = getEncounterTimeCost(floor, combatStats);
      if (player.timeRemaining < encounterTimeCost) return fail('Not enough time for the first encounter.');

      const session: DungeonRunSession = {
        floorId,
        runState: initDungeonRun(
          floor,
          player.health,
          !player.dungeonFloorsCleared.includes(floorId),
          player.dungeonFloorsCleared,
          player.maxHealth,
        ),
        combatStats,
        educationBonuses,
        equippedItems: {
          weapon: player.equippedWeapon,
          armor: player.equippedArmor,
          shield: player.equippedShield,
        },
        encounterTimeCost,
        startedWeek: state.week,
      };

      set(current => ({
        dungeonRuns: { ...current.dungeonRuns, [playerId]: session },
        players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
          ...candidate,
          timeRemaining: Math.max(0, candidate.timeRemaining - encounterTimeCost),
          dungeonAttemptsThisTurn: (candidate.dungeonAttemptsThisTurn ?? 0) + 1,
          gameStats: {
            ...candidate.gameStats,
            totalDungeonRuns: (candidate.gameStats.totalDungeonRuns ?? 0) + 1,
          },
        }),
      }));

      return { success: true, message: `Entered ${floor.name}.` };
    },

    resolveDungeonEncounter: (playerId: string): DungeonActionResult => {
      const state = get();
      const session = state.dungeonRuns[playerId];
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!session || !player) return fail('No active dungeon run.');
      const run = session.runState;
      if (run.phase !== 'encounter-intro') return fail('The encounter is not ready to resolve.');
      const encounter = run.encounters[run.currentEncounterIndex];
      if (!encounter) return fail('Dungeon encounter not found.');

      const encounterResult = resolveEncounter(
        encounter,
        session.combatStats,
        session.educationBonuses,
        run.currentHealth,
        run.modifier,
        session.equippedItems,
      );
      const nextRun = applyEncounterResult(run, encounterResult);
      const nextSession = { ...session, runState: nextRun };

      set(current => ({
        dungeonRuns: { ...current.dungeonRuns, [playerId]: nextSession },
        players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
          ...candidate,
          health: Math.max(0, Math.min(candidate.maxHealth, nextRun.currentHealth)),
        }),
      }));

      if (nextRun.currentHealth <= 0) get().checkDeath(playerId);
      return { success: true, message: encounterResult.encounter.name };
    },

    advanceDungeonRun: (playerId: string, action: DungeonAdvanceAction): DungeonActionResult => {
      const state = get();
      const session = state.dungeonRuns[playerId];
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!session || !player) return fail('No active dungeon run.');
      const run = session.runState;
      const currentEncounter = run.encounters[run.currentEncounterIndex];

      if (action === 'skip-healing') {
        if (run.phase !== 'encounter-intro' || currentEncounter?.type !== 'healing') {
          return fail('Only a healing encounter can be skipped.');
        }
        set(current => ({
          dungeonRuns: {
            ...current.dungeonRuns,
            [playerId]: { ...session, runState: advanceToNextEncounter(run) },
          },
        }));
        return { success: true, message: 'Healing encounter skipped.' };
      }

      if (run.phase !== 'encounter-result') return fail('Resolve the current encounter first.');

      if (action === 'continue') {
        if (run.currentEncounterIndex >= run.encounters.length - 1) return fail('No encounter remains.');
        if (player.timeRemaining < session.encounterTimeCost) return fail('Not enough time to continue.');
        set(current => ({
          dungeonRuns: {
            ...current.dungeonRuns,
            [playerId]: { ...session, runState: advanceToNextEncounter(run) },
          },
          players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
            ...candidate,
            timeRemaining: Math.max(0, candidate.timeRemaining - session.encounterTimeCost),
          }),
        }));
        return { success: true, message: 'Continued deeper into the dungeon.' };
      }

      if (action === 'retreat') {
        const nextEncounter = run.encounters[run.currentEncounterIndex + 1];
        if (currentEncounter?.type === 'boss' || nextEncounter?.type === 'boss') {
          return fail('Retreat is no longer possible this close to the boss.');
        }
        set(current => ({
          dungeonRuns: {
            ...current.dungeonRuns,
            [playerId]: { ...session, runState: retreatFromDungeon(run) },
          },
        }));
        return { success: true, message: 'Retreated from the dungeon.' };
      }

      if (action === 'leave') {
        if (player.timeRemaining >= session.encounterTimeCost) {
          return fail('You still have enough time to continue.');
        }
        set(current => ({
          dungeonRuns: {
            ...current.dungeonRuns,
            [playerId]: {
              ...session,
              runState: { ...run, phase: 'floor-summary', retreated: true, leftDueToTime: true },
            },
          },
        }));
        return { success: true, message: 'Left the dungeon because the turn is nearly over.' };
      }

      return fail('Invalid dungeon action.');
    },

    finalizeDungeonRun: (playerId: string): DungeonActionResult => {
      const state = get();
      const session = state.dungeonRuns[playerId];
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!session || !player) return fail('No active dungeon run.');
      if (session.runState.phase !== 'floor-summary') return fail('The dungeon run is not finished.');
      const floor = getFloor(session.floorId);
      if (!floor) return fail('Dungeon floor not found.');

      const summary = buildDungeonCompletionSummary(session, player, state.activeFestival);
      set(current => {
        const nextRuns = { ...current.dungeonRuns };
        delete nextRuns[playerId];
        return {
          dungeonRuns: nextRuns,
          players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
            ...candidate,
            gold: candidate.gold + summary.goldEarned,
            happiness: Math.max(0, Math.min(100, candidate.happiness + summary.happinessChange)),
            equipmentDurability: applySnapshotDurability(candidate, session),
            gameStats: {
              ...candidate.gameStats,
              totalGoldEarned: (candidate.gameStats.totalGoldEarned ?? 0) + summary.goldEarned,
            },
          }),
        };
      });

      if (summary.isFirstClear) get().clearDungeonFloor(playerId, session.floorId);
      if (summary.rareDropName) get().applyRareDrop(playerId, floor.rareDrop.id);
      if (summary.hexScrollDropId) get().addHexScrollToPlayer(playerId, summary.hexScrollDropId);
      get().updatePlayerDungeonRecord(
        playerId,
        session.floorId,
        summary.goldEarned,
        summary.encountersCompleted,
        state.week,
        summary.success,
      );
      get().checkDeath(playerId);

      return { success: true, message: `${floor.name} run completed.`, summary };
    },
  };
}
