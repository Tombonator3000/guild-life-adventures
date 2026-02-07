// Guild Life - Dungeon System Types
// All type and interface definitions for the dungeon system

import type { DegreeId, GuildRank } from '@/types/game.types';

// ============================================================
// Types
// ============================================================

/** Encounter difficulty tier */
export type EncounterDifficulty = 'easy' | 'medium' | 'hard' | 'boss';

/** Encounter type determines behavior and visuals */
export type EncounterType =
  | 'combat'      // Standard fight
  | 'trap'        // Environmental hazard (Trade Guild disarms)
  | 'treasure'    // Free loot, no damage
  | 'healing'     // Restore health mid-floor
  | 'boss';       // End-of-floor boss, must defeat to clear

/** Result of a single encounter resolution */
export type EncounterOutcome = 'victory' | 'pyrrhic' | 'defeat';

/** Result of an entire floor run */
export type FloorRunResult = 'cleared' | 'retreated' | 'defeated';

/** A single encounter within a dungeon floor */
export interface DungeonEncounter {
  id: string;
  name: string;
  description: string;
  type: EncounterType;
  difficulty: EncounterDifficulty;
  /** Base power level of this encounter (used in combat formula) */
  basePower: number;
  /** Base damage this encounter deals before mitigation */
  baseDamage: number;
  /** Base gold reward for defeating this encounter */
  baseGold: number;
  /** If true, can be skipped with Trade Guild Certificate */
  isDisarmable?: boolean;
  /** If true, requires Arcane Studies to deal full damage (ghosts) */
  requiresArcane?: boolean;
  /** Flavor text shown during encounter */
  flavorText: string;
}

/** Requirements to attempt a dungeon floor */
export interface FloorRequirements {
  /** Previous floor must be cleared (0 = no requirement) */
  previousFloorCleared: number;
  /** Minimum weapon item ID required (null = none) */
  minimumWeapon: string | null;
  /** Minimum armor item ID required (null = none) */
  minimumArmor: string | null;
  /** Minimum total attack power required */
  minimumAttack: number;
  /** Minimum total defense power required */
  minimumDefense: number;
  /** Degrees that help but aren't required */
  recommendedDegrees: DegreeId[];
}

/** Rare drop definition */
export interface RareDrop {
  id: string;
  name: string;
  description: string;
  /** Base drop chance (0-1), 0.05 = 5% */
  dropChance: number;
  /** Effect when acquired */
  effect: RareDropEffect;
}

/** What a rare drop does */
export type RareDropEffect =
  | { type: 'heal'; value: number }
  | { type: 'permanent_gold_bonus'; value: number }    // % bonus to all gold income
  | { type: 'permanent_max_health'; value: number }     // Increase max health
  | { type: 'equippable'; slot: 'shield'; attack?: number; defense: number; blockChance: number }
  | { type: 'happiness_and_stats'; happiness: number; statCap: number };

/** Education bonus applied during dungeon combat */
export interface EducationDungeonBonus {
  degreeId: DegreeId;
  name: string;
  description: string;
  /** Damage reduction multiplier (0.15 = 15% less damage) */
  damageReduction: number;
  /** Attack power multiplier (0.10 = 10% more attack) */
  attackBonus: number;
  /** Gold find multiplier (0.15 = 15% more gold) */
  goldBonus: number;
  /** Can disarm traps (skip trap encounters) */
  canDisarmTraps: boolean;
  /** Can damage ethereal enemies (ghosts) */
  canDamageEthereal: boolean;
  /** Chance to find healing potion after encounter (0-1) */
  healingPotionChance: number;
}

/** A complete dungeon floor definition */
export interface DungeonFloor {
  id: number;
  name: string;
  description: string;
  /** Time in hours to attempt this floor */
  timeCost: number;
  /** Time cost if player has good equipment (reduces by this much) */
  timeCostReduced: number;
  /** Requirements to enter this floor */
  requirements: FloorRequirements;
  /** Encounter table (3-4 regular + 1 boss) */
  encounters: DungeonEncounter[];
  /** Boss encounter (always last) */
  boss: DungeonEncounter;
  /** Gold range for the floor [min, max] */
  goldRange: [number, number];
  /** Health risk range [min, max] */
  healthRisk: [number, number];
  /** Happiness bonus for clearing this floor */
  happinessOnClear: number;
  /** Dependability bonus for clearing this floor (first clear only) */
  dependabilityOnClear: number;
  /** Rare drop available on this floor */
  rareDrop: RareDrop;
  /** Guild rank affects loot multiplier */
  lootMultiplier: Partial<Record<GuildRank, number>>;
}
