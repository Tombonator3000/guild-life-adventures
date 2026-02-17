// Guild Life - Dungeon Helper Functions
// Utility functions for floor access, requirements checking, encounter generation,
// modifiers, mini-bosses, leaderboard, and progress tracking

import type { DegreeId, GuildRank } from '@/types/game.types';
import type { DungeonEncounter, DungeonFloor, DungeonModifier, DungeonRecord, MiniBoss } from './types';
import { DUNGEON_FLOORS, EDUCATION_DUNGEON_BONUSES, DUNGEON_MODIFIERS } from './floors';
import { MINI_BOSSES } from './encounters';

// ============================================================
// Constants
// ============================================================

/** Number of encounters per floor run (3 regular + 1 boss) */
export const ENCOUNTERS_PER_FLOOR = 4;

/** Maximum dungeon floor */
export const MAX_DUNGEON_FLOOR = 6;

/** Max floor attempts per turn (fatigue system — prevents dungeon spamming) */
export const MAX_FLOOR_ATTEMPTS_PER_TURN = 2;

/** Healing potion restores this much HP when found */
export const HEALING_POTION_HP = 15;

/** Chance for a mini-boss to appear on re-runs (15%) */
export const MINI_BOSS_CHANCE = 0.15;

// ============================================================
// Floor Access Functions
// ============================================================

/** Get a floor definition by ID (1-6) */
export function getFloor(floorId: number): DungeonFloor | undefined {
  return DUNGEON_FLOORS.find(f => f.id === floorId);
}

/** Get all floors */
export function getAllFloors(): DungeonFloor[] {
  return DUNGEON_FLOORS;
}

// ============================================================
// Requirements Checking
// ============================================================

/** Check degree requirements — if completedDegrees is missing, assume none met */
function checkDegreeRequirements(requiredDegrees: DegreeId[] | undefined, completedDegrees?: DegreeId[]): string[] {
  if (!requiredDegrees || requiredDegrees.length === 0) return [];
  return requiredDegrees
    .filter(degreeId => !completedDegrees?.includes(degreeId))
    .map(degreeId => `Requires ${getDegreeName(degreeId)} degree`);
}

/** Check equipment stat requirement (weapon or armor) */
function checkEquipmentRequirement(
  requiredId: string | undefined,
  equipped: string | null,
  stat: number,
  minStat: number,
  labels: { equipMsg: string; statLabel: string },
): string[] {
  if (!requiredId) return [];
  if (!equipped) return [labels.equipMsg];
  if (stat < minStat) return [`Need at least ${minStat} ${labels.statLabel} (have ${stat})`];
  return [];
}

/**
 * Check if a player meets requirements for a floor.
 * Returns { canEnter: true } or { canEnter: false, reasons: string[] }
 */
export function checkFloorRequirements(
  floor: DungeonFloor,
  floorsCleared: number[],
  equippedWeapon: string | null,
  equippedArmor: string | null,
  combatStats: { attack: number; defense: number },
  completedDegrees?: DegreeId[],
): { canEnter: boolean; reasons: string[] } {
  const req = floor.requirements;

  const reasons = [
    // Previous floor
    ...(req.previousFloorCleared > 0 && !floorsCleared.includes(req.previousFloorCleared)
      ? [`Clear Floor ${req.previousFloorCleared} first`] : []),
    // Degrees
    ...checkDegreeRequirements(req.requiredDegrees, completedDegrees),
    // Weapon
    ...checkEquipmentRequirement(req.minimumWeapon, equippedWeapon, combatStats.attack, req.minimumAttack,
      { equipMsg: `Equip a weapon (need ${getWeaponName(req.minimumWeapon!)})`, statLabel: 'ATK' }),
    // Armor
    ...checkEquipmentRequirement(req.minimumArmor, equippedArmor, combatStats.defense, req.minimumDefense,
      { equipMsg: `Equip armor (need ${getArmorName(req.minimumArmor!)})`, statLabel: 'DEF' }),
  ];

  return { canEnter: reasons.length === 0, reasons };
}

/** Human-readable weapon name for requirement messages */
function getWeaponName(weaponId: string): string {
  const names: Record<string, string> = {
    dagger: 'Simple Dagger',
    sword: 'Iron Sword',
    'steel-sword': 'Steel Sword',
    'enchanted-blade': 'Enchanted Blade',
  };
  return names[weaponId] || weaponId;
}

/** Human-readable armor name for requirement messages */
function getArmorName(armorId: string): string {
  const names: Record<string, string> = {
    'leather-armor': 'Leather Armor',
    chainmail: 'Chainmail',
    'plate-armor': 'Plate Armor',
    'enchanted-plate': 'Enchanted Plate',
  };
  return names[armorId] || armorId;
}

/** Human-readable degree name for requirement messages */
function getDegreeName(degreeId: DegreeId): string {
  const names: Record<string, string> = {
    'trade-guild': 'Trade Guild',
    'junior-academy': 'Junior Academy',
    'arcane-studies': 'Arcane Studies',
    'combat-training': 'Combat Training',
    'master-combat': 'Master Combat',
    scholar: 'Scholar',
    'advanced-scholar': 'Advanced Scholar',
    'sage-studies': 'Sage Studies',
    loremaster: 'Loremaster',
    commerce: 'Commerce',
    alchemy: 'Alchemy',
  };
  return names[degreeId] || degreeId;
}

// ============================================================
// Education Bonuses
// ============================================================

/**
 * Calculate education bonuses for dungeon combat.
 * Returns accumulated bonuses from all completed degrees.
 */
export function calculateEducationBonuses(completedDegrees: DegreeId[]): {
  damageReduction: number;
  attackBonus: number;
  goldBonus: number;
  canDisarmTraps: boolean;
  canDamageEthereal: boolean;
  healingPotionChance: number;
} {
  let damageReduction = 0;
  let attackBonus = 0;
  let goldBonus = 0;
  let canDisarmTraps = false;
  let canDamageEthereal = false;
  let healingPotionChance = 0;

  // Use best damage reduction (master-combat overrides combat-training)
  let bestDamageReduction = 0;

  for (const bonus of EDUCATION_DUNGEON_BONUSES) {
    if (completedDegrees.includes(bonus.degreeId)) {
      // Damage reduction: take highest (not additive, to avoid stacking master + basic)
      if (bonus.damageReduction > bestDamageReduction) {
        bestDamageReduction = bonus.damageReduction;
      }
      attackBonus += bonus.attackBonus;
      goldBonus += bonus.goldBonus;
      if (bonus.canDisarmTraps) canDisarmTraps = true;
      if (bonus.canDamageEthereal) canDamageEthereal = true;
      if (bonus.healingPotionChance > healingPotionChance) {
        healingPotionChance = bonus.healingPotionChance;
      }
    }
  }

  damageReduction = bestDamageReduction;

  return { damageReduction, attackBonus, goldBonus, canDisarmTraps, canDamageEthereal, healingPotionChance };
}

// ============================================================
// Dungeon Modifiers
// ============================================================

/**
 * Roll a random dungeon modifier for a run.
 * Returns a modifier or null (40% chance of no modifier for variety).
 */
export function rollDungeonModifier(): DungeonModifier | null {
  if (Math.random() < 0.4) return null; // 40% = normal run
  const idx = Math.floor(Math.random() * DUNGEON_MODIFIERS.length);
  return DUNGEON_MODIFIERS[idx];
}

/** Get all available modifiers (for display purposes) */
export function getAllModifiers(): DungeonModifier[] {
  return DUNGEON_MODIFIERS;
}

// ============================================================
// Mini-Boss System
// ============================================================

/**
 * Get the mini-boss for a floor (if any).
 */
export function getMiniBoss(floorId: number): MiniBoss | undefined {
  return MINI_BOSSES[floorId];
}

/**
 * Check if a mini-boss should appear on this re-run.
 * Only appears on floors already cleared (re-runs), with 15% chance.
 */
export function shouldSpawnMiniBoss(floorId: number, floorsCleared: number[]): boolean {
  if (!floorsCleared.includes(floorId)) return false; // Only on re-runs
  return Math.random() < MINI_BOSS_CHANCE;
}

/**
 * Create a DungeonEncounter from a MiniBoss definition.
 */
export function miniBossToEncounter(miniBoss: MiniBoss): DungeonEncounter {
  return {
    id: miniBoss.id,
    name: `★ ${miniBoss.name}`,
    description: miniBoss.description,
    type: 'combat',
    difficulty: 'boss', // Uses boss difficulty for damage calc
    basePower: miniBoss.basePower,
    baseDamage: miniBoss.baseDamage,
    baseGold: miniBoss.baseGold,
    requiresArcane: miniBoss.requiresArcane,
    flavorText: miniBoss.flavorText,
  };
}

// ============================================================
// Encounter Generation (updated for mini-bosses)
// ============================================================

/**
 * Select random encounters for a floor run.
 * Picks 3 random encounters from the pool, then adds the boss.
 * On re-runs, 15% chance to replace one regular encounter with a mini-boss.
 * Returns encounters in order (3 random + 1 boss = 4 total).
 */
export function generateFloorEncounters(
  floor: DungeonFloor,
  floorsCleared?: number[],
): DungeonEncounter[] {
  const pool = [...floor.encounters];
  const selected: DungeonEncounter[] = [];

  // Pick 3 random encounters (with replacement possible for small pools)
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool[idx]);
  }

  // Mini-boss: on re-runs, 15% chance to replace first regular combat encounter
  if (floorsCleared && shouldSpawnMiniBoss(floor.id, floorsCleared)) {
    const miniBoss = getMiniBoss(floor.id);
    if (miniBoss) {
      // Replace the first combat encounter with the mini-boss
      const combatIdx = selected.findIndex(e => e.type === 'combat');
      if (combatIdx >= 0) {
        selected[combatIdx] = miniBossToEncounter(miniBoss);
      } else {
        // If no combat encounters picked, replace the first one
        selected[0] = miniBossToEncounter(miniBoss);
      }
    }
  }

  // Boss is always last
  selected.push(floor.boss);

  return selected;
}

// ============================================================
// Loot & Time Functions
// ============================================================

/**
 * Get the loot multiplier for a player's guild rank on a given floor.
 */
export function getLootMultiplier(floor: DungeonFloor, guildRank: GuildRank): number {
  return floor.lootMultiplier[guildRank] ?? 1.0;
}

/**
 * Get the time cost for a floor, considering equipment quality.
 * Better equipment (meeting recommended levels) gives reduced time cost.
 */
export function getFloorTimeCost(
  floor: DungeonFloor,
  combatStats: { attack: number; defense: number },
): number {
  // If player's combined power is significantly above minimum, use reduced time
  const totalPower = combatStats.attack + combatStats.defense;
  const minRequired = floor.requirements.minimumAttack + floor.requirements.minimumDefense;
  const overpowered = minRequired > 0 && totalPower >= minRequired * 1.5;

  return overpowered ? floor.timeCostReduced : floor.timeCost;
}

/**
 * Get the time cost per encounter within a floor.
 * Total floor time is distributed across encounters.
 * Each encounter costs floor.timeCost / ENCOUNTERS_PER_FLOOR (rounded up).
 */
export function getEncounterTimeCost(
  floor: DungeonFloor,
  combatStats: { attack: number; defense: number },
): number {
  const totalTime = getFloorTimeCost(floor, combatStats);
  return Math.ceil(totalTime / ENCOUNTERS_PER_FLOOR);
}

// ============================================================
// Dungeon Leaderboard / Records
// ============================================================

/** Update a dungeon record with a new run result */
export function updateDungeonRecord(
  existing: DungeonRecord | undefined,
  goldEarned: number,
  encountersCompleted: number,
): DungeonRecord {
  if (!existing) {
    return {
      bestGold: goldEarned,
      bestEncounters: encountersCompleted,
      runs: 1,
      totalGold: goldEarned,
    };
  }
  return {
    bestGold: Math.max(existing.bestGold, goldEarned),
    bestEncounters: encountersCompleted < existing.bestEncounters
      ? encountersCompleted
      : existing.bestEncounters,
    runs: existing.runs + 1,
    totalGold: existing.totalGold + goldEarned,
  };
}

// ============================================================
// Progress Tracking
// ============================================================

/**
 * Get the highest floor a player can currently attempt.
 */
export function getHighestAvailableFloor(floorsCleared: number[]): number {
  if (floorsCleared.length === 0) return 1;
  const maxCleared = Math.max(...floorsCleared);
  return Math.min(maxCleared + 1, MAX_DUNGEON_FLOOR);
}

/**
 * Get a summary of dungeon progress for display.
 */
export function getDungeonProgress(floorsCleared: number[]): {
  totalFloorsCleared: number;
  highestFloor: number;
  allFloorsCleared: boolean;
  nextFloor: DungeonFloor | undefined;
} {
  const totalFloorsCleared = floorsCleared.length;
  const highestFloor = floorsCleared.length > 0 ? Math.max(...floorsCleared) : 0;
  const allFloorsCleared = floorsCleared.length >= MAX_DUNGEON_FLOOR;
  const nextFloorId = allFloorsCleared ? undefined : getHighestAvailableFloor(floorsCleared);
  const nextFloor = nextFloorId ? getFloor(nextFloorId) : undefined;

  return { totalFloorsCleared, highestFloor, allFloorsCleared, nextFloor };
}
