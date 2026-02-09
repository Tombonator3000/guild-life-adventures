// Guild Life - Combat Resolver
// Phase 4: Single-encounter resolution logic extracted from CavePanel auto-resolve
// Resolves one encounter at a time for step-by-step combat display
// Supports dungeon modifiers and mini-boss encounters

import type { DungeonEncounter, DungeonFloor, DungeonModifier } from './dungeon';
import { calculateEducationBonuses, generateFloorEncounters, rollDungeonModifier } from './dungeon';
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
  /** Active dungeon modifier for this run (null = normal run) */
  modifier: DungeonModifier | null;
  /** Whether a mini-boss appeared in this run */
  hasMiniBoss: boolean;
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
 * Generates encounters (with mini-boss chance on re-runs), rolls a modifier.
 */
export function initDungeonRun(
  floor: DungeonFloor,
  playerHealth: number,
  isFirstClear: boolean,
  floorsCleared?: number[],
): DungeonRunState {
  const encounters = generateFloorEncounters(floor, floorsCleared);
  const modifier = rollDungeonModifier();
  const hasMiniBoss = encounters.some(e => e.id.startsWith('mb-'));

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
    modifier,
    hasMiniBoss,
  };
}

/**
 * Resolve a single encounter and return the result.
 * Applies dungeon modifier effects to damage, gold, healing, etc.
 * Does NOT mutate state — caller must update DungeonRunState.
 */
export function resolveEncounter(
  encounter: DungeonEncounter,
  combatStats: CombatStats,
  eduBonuses: EducationBonuses,
  currentHealth: number,
  modifier?: DungeonModifier | null,
): EncounterResult {
  const mod = modifier ?? null;
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
      let goldMult = 1 + eduBonuses.goldBonus;
      // Fortune's Favor doubles treasure gold specifically
      if (mod?.id === 'fortunes-favor') {
        goldMult *= 2.0;
        bonusesActivated.push("Fortune's Favor (2x treasure)");
      } else if (mod && mod.goldMult !== 1.0) {
        goldMult *= mod.goldMult;
      }
      goldEarned = Math.floor(encounter.baseGold * goldMult);
      if (eduBonuses.goldBonus > 0) {
        bonusesActivated.push(`+${Math.round(eduBonuses.goldBonus * 100)}% gold`);
      }
      break;
    }

    case 'healing': {
      if (mod?.disableHealing) {
        // Blood Moon: healing encounters are disabled
        bonusesActivated.push('Healing disabled! (Blood Moon)');
        healed = 0;
      } else {
        healed = Math.abs(encounter.baseDamage);
        if (mod && mod.healingMult !== 1.0) {
          healed = Math.floor(healed * mod.healingMult);
          bonusesActivated.push(`Healing +${Math.round((mod.healingMult - 1) * 100)}%`);
        }
      }
      break;
    }

    case 'trap': {
      const canDisarm = eduBonuses.canDisarmTraps && !(mod?.disableDisarm);
      if (encounter.isDisarmable && canDisarm) {
        disarmed = true;
        bonusesActivated.push('Trap Sense');
      } else {
        if (mod?.disableDisarm && encounter.isDisarmable && eduBonuses.canDisarmTraps) {
          bonusesActivated.push('Cannot disarm! (Echoing Darkness)');
        }
        const modDamageMult = mod ? mod.damageMult : 1.0;
        const modDmgReduc = mod ? mod.bonusDamageReduction : 0;
        let d = Math.floor(encounter.baseDamage * (1 - eduBonuses.damageReduction - modDmgReduc) * noEquipmentDamageMult * modDamageMult);
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

      // Apply enemy power modifier
      const effectiveEnemyPower = encounter.basePower * (mod?.enemyPowerMult ?? 1.0);

      const playerPower = effAtk + combatStats.defense * 0.5;
      const ratio = playerPower / Math.max(1, effectiveEnemyPower);

      // Damage: inversely proportional to power ratio, penalized without armor
      const modDamageMult = mod ? mod.damageMult : 1.0;
      const modDmgReduc = mod ? mod.bonusDamageReduction : 0;
      let d = Math.floor(encounter.baseDamage * Math.max(0.3, 1 - ratio * 0.5) * noEquipmentDamageMult * modDamageMult);
      d = Math.floor(d * (1 - eduBonuses.damageReduction - modDmgReduc));

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
      const modGoldMult = mod ? mod.goldMult : 1.0;
      goldEarned = Math.floor(
        encounter.baseGold * (1 + eduBonuses.goldBonus) * Math.min(1.5, ratio) * noWeaponGoldMult * modGoldMult,
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
  // Modifier can boost rare drop chance
  let rareDropName: string | null = null;
  if (bossDefeated) {
    const baseChance = state.isFirstClear
      ? state.floor.rareDrop.dropChance
      : state.floor.rareDrop.dropChance * 0.2; // 20% of normal on repeat
    const modMult = state.modifier?.rareDropMult ?? 1.0;
    const finalChance = baseChance * modMult;
    if (Math.random() < finalChance) {
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
  /** Modifier that was active during this run */
  modifierName: string | null;
}

/**
 * Auto-resolve an entire floor run in one call.
 * Used by the Grimwald AI (Phase 5) and for any non-interactive combat.
 * Uses the same resolveEncounter() logic as the interactive combat.
 * Now supports modifiers and mini-bosses.
 */
export function autoResolveFloor(
  floor: DungeonFloor,
  combatStats: CombatStats,
  eduBonuses: EducationBonuses,
  playerHealth: number,
  isFirstClear: boolean,
  lootMultiplier: number = 1.0,
  floorsCleared?: number[],
): AutoResolveResult {
  let state = initDungeonRun(floor, playerHealth, isFirstClear, floorsCleared);
  const log: string[] = [];

  if (state.modifier) {
    log.push(`Modifier: ${state.modifier.name} — ${state.modifier.description}`);
  }
  if (state.hasMiniBoss) {
    log.push('A wandering mini-boss lurks in the shadows...');
  }

  for (let i = 0; i < state.encounters.length; i++) {
    if (state.currentHealth <= 0) {
      log.push('Too injured — retreated!');
      break;
    }

    const encounter = state.encounters[i];
    const result = resolveEncounter(encounter, combatStats, eduBonuses, state.currentHealth, state.modifier);
    state = applyEncounterResult(state, result);

    // Build log entry
    const parts: string[] = [];
    if (result.disarmed) parts.push('Disarmed');
    if (result.damageDealt > 0) parts.push(`-${result.damageDealt} HP${result.blocked ? ' (blocked)' : ''}`);
    if (result.goldEarned > 0) parts.push(`+${result.goldEarned}g`);
    if (result.healed > 0) parts.push(`+${result.healed} HP`);
    if (result.potionFound) parts.push(`+${result.potionHealed} HP (potion)`);
    const prefix = encounter.type === 'boss' ? 'BOSS ' : encounter.id.startsWith('mb-') ? 'MINI-BOSS ' : '';
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
    modifierName: state.modifier?.name ?? null,
  };
}
