// Guild Life - Dungeon Helper Functions
// Utility functions for floor access, requirements checking, encounter generation, and progress tracking

import type { DegreeId, GuildRank } from '@/types/game.types';
import type { DungeonEncounter, DungeonFloor } from './types';
import { DUNGEON_FLOORS, EDUCATION_DUNGEON_BONUSES } from './floors';

// ============================================================
// Constants
// ============================================================

/** Number of encounters per floor run (3 regular + 1 boss) */
export const ENCOUNTERS_PER_FLOOR = 4;

/** Maximum dungeon floor */
export const MAX_DUNGEON_FLOOR = 5;

/** Max floor attempts per turn (fatigue system — prevents dungeon spamming) */
export const MAX_FLOOR_ATTEMPTS_PER_TURN = 2;

/** Healing potion restores this much HP when found */
export const HEALING_POTION_HP = 15;

// ============================================================
// Floor Access Functions
// ============================================================

/** Get a floor definition by ID (1-5) */
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
): { canEnter: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const req = floor.requirements;

  // Check previous floor cleared
  if (req.previousFloorCleared > 0 && !floorsCleared.includes(req.previousFloorCleared)) {
    reasons.push(`Clear Floor ${req.previousFloorCleared} first`);
  }

  // Check minimum weapon
  if (req.minimumWeapon && !equippedWeapon) {
    reasons.push(`Equip a weapon (need ${getWeaponName(req.minimumWeapon)})`);
  } else if (req.minimumWeapon && equippedWeapon) {
    if (combatStats.attack < req.minimumAttack) {
      reasons.push(`Need at least ${req.minimumAttack} ATK (have ${combatStats.attack})`);
    }
  }

  // Check minimum armor
  if (req.minimumArmor && !equippedArmor) {
    reasons.push(`Equip armor (need ${getArmorName(req.minimumArmor)})`);
  } else if (req.minimumArmor && equippedArmor) {
    if (combatStats.defense < req.minimumDefense) {
      reasons.push(`Need at least ${req.minimumDefense} DEF (have ${combatStats.defense})`);
    }
  }

  return {
    canEnter: reasons.length === 0,
    reasons,
  };
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
// Encounter Generation
// ============================================================

/**
 * Select random encounters for a floor run.
 * Picks 3 random encounters from the pool, then adds the boss.
 * Returns encounters in order (3 random + 1 boss = 4 total).
 */
export function generateFloorEncounters(floor: DungeonFloor): DungeonEncounter[] {
  const pool = [...floor.encounters];
  const selected: DungeonEncounter[] = [];

  // Pick 3 random encounters (with replacement possible for small pools)
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool[idx]);
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
// Progress Tracking
// ============================================================

/**
 * Get the highest floor a player can currently attempt.
 */
export function getHighestAvailableFloor(floorsCleared: number[]): number {
  if (floorsCleared.length === 0) return 1;
  const maxCleared = Math.max(...floorsCleared);
  return Math.min(maxCleared + 1, 5);
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
  const allFloorsCleared = floorsCleared.length >= 5;
  const nextFloorId = allFloorsCleared ? undefined : getHighestAvailableFloor(floorsCleared);
  const nextFloor = nextFloorId ? getFloor(nextFloorId) : undefined;

  return { totalFloorsCleared, highestFloor, allFloorsCleared, nextFloor };
}
