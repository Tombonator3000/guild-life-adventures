// Guild Life - Combat Resolver
// Phase 4: Single-encounter resolution logic extracted from CavePanel auto-resolve
// Resolves one encounter at a time for step-by-step combat display

import type { DungeonEncounter, DungeonFloor } from './dungeon';
import { calculateEducationBonuses, generateFloorEncounters } from './dungeon';
import type { DegreeId } from '@/types/game.types';

// ============================================================
// Types
// ============================================================

/** Result of resolving a single encounter */
export interface EncounterResult {
  encounter: DungeonEncounter;
  damageDealt: number;
  goldEarned: number;
  healed: number;
  blocked: boolean;
  disarmed: boolean;
  potionFound: boolean;
  potionHealed: number;
  /** Education bonus names that activated during this encounter */
  bonusesActivated: string[];
}

/** Phases of the combat state machine */
export type CombatPhase =
  | 'encounter-intro'
  | 'encounter-result'
  | 'floor-summary';

/** Full state of a dungeon run in progress */
export interface DungeonRunState {
  phase: CombatPhase;
  floor: DungeonFloor;
  encounters: DungeonEncounter[];
  currentEncounterIndex: number;
  currentHealth: number;
  startHealth: number;
  results: EncounterResult[];
  totalGold: number;
  totalDamage: number;
  totalHealed: number;
  bossDefeated: boolean;
  retreated: boolean;
  isFirstClear: boolean;
  rareDropName: string | null;
}

/** Player combat stats needed for resolution */
export interface CombatStats {
  attack: number;
  defense: number;
  blockChance: number;
}

/** Education bonuses for dungeon combat */
export type EducationBonuses = ReturnType<typeof calculateEducationBonuses>;

// ============================================================
// Constants
// ============================================================

export const HEALING_POTION_RESTORE = 15;
export const RETREAT_HAPPINESS_PENALTY = 0; // No penalty for strategic retreat

// ============================================================
// Functions
// ============================================================

/**
 * Initialize a new dungeon run state.
 * Generates encounters, sets up initial state.
 */
export function initDungeonRun(
  floor: DungeonFloor,
  playerHealth: number,
  isFirstClear: boolean,
): DungeonRunState {
  const encounters = generateFloorEncounters(floor);

  return {
    phase: 'encounter-intro',
    floor,
    encounters,
    currentEncounterIndex: 0,
    currentHealth: playerHealth,
    startHealth: playerHealth,
    results: [],
    totalGold: 0,
    totalDamage: 0,
    totalHealed: 0,
    bossDefeated: false,
    retreated: false,
    isFirstClear,
    rareDropName: null,
  };
}

/**
 * Resolve a single encounter and return the result.
 * Does NOT mutate state — caller must update DungeonRunState.
 */
export function resolveEncounter(
  encounter: DungeonEncounter,
  combatStats: CombatStats,
  eduBonuses: EducationBonuses,
  currentHealth: number,
): EncounterResult {
  const bonusesActivated: string[] = [];
  const attackPower = combatStats.attack * (1 + eduBonuses.attackBonus);

  // RPG equipment penalty: no weapon = heavily penalized attack, no armor = more damage taken
  const hasNoWeapon = combatStats.attack <= 0;
  const hasNoArmor = combatStats.defense <= 0;
  const noEquipmentDamageMult = hasNoArmor ? 1.5 : 1.0; // +50% damage taken without armor
  const noWeaponGoldMult = hasNoWeapon ? 0.3 : 1.0;     // -70% gold earned without weapon

  if (hasNoWeapon) bonusesActivated.push('No weapon! (-70% gold)');
  if (hasNoArmor) bonusesActivated.push('No armor! (+50% dmg taken)');

  if (eduBonuses.attackBonus > 0) {
    bonusesActivated.push(`+${Math.round(eduBonuses.attackBonus * 100)}% ATK`);
  }

  let damageDealt = 0;
  let goldEarned = 0;
  let healed = 0;
  let blocked = false;
  let disarmed = false;
  let potionFound = false;
  let potionHealed = 0;

  switch (encounter.type) {
    case 'treasure': {
      goldEarned = Math.floor(encounter.baseGold * (1 + eduBonuses.goldBonus));
      if (eduBonuses.goldBonus > 0) {
        bonusesActivated.push(`+${Math.round(eduBonuses.goldBonus * 100)}% gold`);
      }
      break;
    }

    case 'healing': {
      healed = Math.abs(encounter.baseDamage);
      break;
    }

    case 'trap': {
      if (encounter.isDisarmable && eduBonuses.canDisarmTraps) {
        disarmed = true;
        bonusesActivated.push('Trap Sense');
      } else {
        let d = Math.floor(encounter.baseDamage * (1 - eduBonuses.damageReduction) * noEquipmentDamageMult);
        d = Math.max(1, d);
        damageDealt = d;
        if (eduBonuses.damageReduction > 0) {
          bonusesActivated.push(`-${Math.round(eduBonuses.damageReduction * 100)}% dmg`);
        }
      }
      break;
    }

    case 'combat':
    case 'boss': {
      let effAtk = attackPower;
      if (encounter.requiresArcane && !eduBonuses.canDamageEthereal) {
        effAtk *= 0.3;
      }
      if (encounter.requiresArcane && eduBonuses.canDamageEthereal) {
        bonusesActivated.push('Arcane Sight');
      }

      const playerPower = effAtk + combatStats.defense * 0.5;
      const ratio = playerPower / Math.max(1, encounter.basePower);

      // Damage: inversely proportional to power ratio, penalized without armor
      let d = Math.floor(encounter.baseDamage * Math.max(0.3, 1 - ratio * 0.5) * noEquipmentDamageMult);
      d = Math.floor(d * (1 - eduBonuses.damageReduction));

      if (eduBonuses.damageReduction > 0) {
        bonusesActivated.push(`-${Math.round(eduBonuses.damageReduction * 100)}% dmg`);
      }

      if (combatStats.blockChance > 0 && Math.random() < combatStats.blockChance) {
        d = Math.floor(d * 0.5);
        blocked = true;
      }
      d = Math.max(1, d);
      damageDealt = d;

      // Gold: proportional to power ratio (capped at 1.5x), penalized without weapon
      goldEarned = Math.floor(
        encounter.baseGold * (1 + eduBonuses.goldBonus) * Math.min(1.5, ratio) * noWeaponGoldMult,
      );
      if (eduBonuses.goldBonus > 0) {
        bonusesActivated.push(`+${Math.round(eduBonuses.goldBonus * 100)}% gold`);
      }
      break;
    }
  }

  // Healing potion chance from Alchemy
  if (eduBonuses.healingPotionChance > 0 && Math.random() < eduBonuses.healingPotionChance) {
    potionFound = true;
    potionHealed = HEALING_POTION_RESTORE;
    bonusesActivated.push('Potion Brewing');
  }

  return {
    encounter,
    damageDealt,
    goldEarned,
    healed,
    blocked,
    disarmed,
    potionFound,
    potionHealed,
    bonusesActivated,
  };
}

/**
 * Apply an encounter result to the run state, advancing to next encounter.
 * Returns updated DungeonRunState.
 */
export function applyEncounterResult(
  state: DungeonRunState,
  result: EncounterResult,
): DungeonRunState {
  const newHealth = Math.max(
    0,
    Math.min(
      state.startHealth,
      state.currentHealth - result.damageDealt + result.healed + result.potionHealed,
    ),
  );

  const newResults = [...state.results, result];
  const newTotalGold = state.totalGold + result.goldEarned;
  const newTotalDamage = state.totalDamage + result.damageDealt;
  const newTotalHealed = state.totalHealed + result.healed + result.potionHealed;

  const isBossEncounter = result.encounter.type === 'boss';
  const bossDefeated = isBossEncounter && newHealth > 0;
  const playerDied = newHealth <= 0;

  // If player died or boss was the last encounter, go to summary
  const isLastEncounter = state.currentEncounterIndex >= state.encounters.length - 1;

  // Check rare drop (full chance on first clear, 20% of normal on repeat)
  let rareDropName: string | null = null;
  if (bossDefeated) {
    const dropChance = state.isFirstClear
      ? state.floor.rareDrop.dropChance
      : state.floor.rareDrop.dropChance * 0.2; // 20% of normal on repeat
    if (Math.random() < dropChance) {
      rareDropName = state.floor.rareDrop.name;
    }
  }

  const goToSummary = playerDied || isLastEncounter;

  return {
    ...state,
    phase: goToSummary ? 'floor-summary' : 'encounter-result',
    currentHealth: newHealth,
    results: newResults,
    totalGold: newTotalGold,
    totalDamage: newTotalDamage,
    totalHealed: newTotalHealed,
    bossDefeated: bossDefeated || state.bossDefeated,
    rareDropName: rareDropName || state.rareDropName,
  };
}

/**
 * Advance to the next encounter (player chose "Continue Deeper").
 */
export function advanceToNextEncounter(state: DungeonRunState): DungeonRunState {
  return {
    ...state,
    phase: 'encounter-intro',
    currentEncounterIndex: state.currentEncounterIndex + 1,
  };
}

/**
 * Player retreats — go to floor summary with partial rewards.
 */
export function retreatFromDungeon(state: DungeonRunState): DungeonRunState {
  return {
    ...state,
    phase: 'floor-summary',
    retreated: true,
    totalGold: Math.floor(state.totalGold * 0.5), // Forfeit 50% gold on retreat
  };
}

/**
 * Get the action label for an encounter type.
 */
export function getEncounterAction(encounter: DungeonEncounter, canDisarm: boolean): string {
  switch (encounter.type) {
    case 'treasure': return 'Search';
    case 'healing': return 'Drink';
    case 'trap': return canDisarm ? 'Disarm' : 'Proceed';
    case 'boss': return 'Fight Boss!';
    case 'combat': return 'Fight!';
    default: return 'Proceed';
  }
}

/**
 * Get icon identifier for encounter type.
 */
export function getEncounterIcon(type: DungeonEncounter['type']): string {
  switch (type) {
    case 'combat': return '⚔';
    case 'boss': return '💀';
    case 'treasure': return '💰';
    case 'healing': return '💧';
    case 'trap': return '⚠';
    default: return '?';
  }
}

// ============================================================
// Auto-Resolve (for AI / non-interactive combat)
// ============================================================

/** Result of an auto-resolved floor run */
export interface AutoResolveResult {
  success: boolean;
  goldEarned: number;
  totalDamage: number;
  totalHealed: number;
  /** Actual health change (negative = damage, positive = net heal). Uses real HP delta, not raw totals. */
  healthChange: number;
  bossDefeated: boolean;
  rareDropName: string | null;
  log: string[];
}

/**
 * Auto-resolve an entire floor run in one call.
 * Used by the Grimwald AI (Phase 5) and for any non-interactive combat.
 * Uses the same resolveEncounter() logic as the interactive combat.
 */
export function autoResolveFloor(
  floor: DungeonFloor,
  combatStats: CombatStats,
  eduBonuses: EducationBonuses,
  playerHealth: number,
  isFirstClear: boolean,
  lootMultiplier: number = 1.0,
): AutoResolveResult {
  let state = initDungeonRun(floor, playerHealth, isFirstClear);
  const log: string[] = [];

  for (let i = 0; i < state.encounters.length; i++) {
    if (state.currentHealth <= 0) {
      log.push('Too injured — retreated!');
      break;
    }

    const encounter = state.encounters[i];
    const result = resolveEncounter(encounter, combatStats, eduBonuses, state.currentHealth);
    state = applyEncounterResult(state, result);

    // Build log entry
    const parts: string[] = [];
    if (result.disarmed) parts.push('Disarmed');
    if (result.damageDealt > 0) parts.push(`-${result.damageDealt} HP${result.blocked ? ' (blocked)' : ''}`);
    if (result.goldEarned > 0) parts.push(`+${result.goldEarned}g`);
    if (result.healed > 0) parts.push(`+${result.healed} HP`);
    if (result.potionFound) parts.push(`+${result.potionHealed} HP (potion)`);
    const prefix = encounter.type === 'boss' ? 'BOSS ' : '';
    log.push(`${prefix}${encounter.name}: ${parts.join(', ')}`);

    // Advance index for next iteration
    if (state.phase !== 'floor-summary') {
      state = { ...state, currentEncounterIndex: i + 1 };
    }
  }

  return {
    success: state.bossDefeated,
    goldEarned: Math.floor(state.totalGold * lootMultiplier),
    totalDamage: state.totalDamage,
    totalHealed: state.totalHealed,
    healthChange: state.currentHealth - state.startHealth,
    bossDefeated: state.bossDefeated,
    rareDropName: state.rareDropName,
    log,
  };
}
