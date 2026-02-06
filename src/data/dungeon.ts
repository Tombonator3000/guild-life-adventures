// Guild Life - Dungeon System Data
// Phase 2: Floor definitions, encounter tables, loot tables, boss data
// Based on design from log.md "Rogue-Lite RPG Design Proposal"

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
  /** Rare drop available on this floor */
  rareDrop: RareDrop;
  /** Guild rank affects loot multiplier */
  lootMultiplier: Partial<Record<GuildRank, number>>;
}

// ============================================================
// Education Dungeon Bonuses
// ============================================================

export const EDUCATION_DUNGEON_BONUSES: EducationDungeonBonus[] = [
  {
    degreeId: 'trade-guild',
    name: 'Trap Sense',
    description: 'Disarm traps on Floor 2 (skip trap encounters)',
    damageReduction: 0,
    attackBonus: 0,
    goldBonus: 0,
    canDisarmTraps: true,
    canDamageEthereal: false,
    healingPotionChance: 0,
  },
  {
    degreeId: 'combat-training',
    name: 'Combat Discipline',
    description: '-15% damage received in dungeon',
    damageReduction: 0.15,
    attackBonus: 0,
    goldBonus: 0,
    canDisarmTraps: false,
    canDamageEthereal: false,
    healingPotionChance: 0,
  },
  {
    degreeId: 'master-combat',
    name: 'Master Combatant',
    description: '-25% damage received, +10% attack power',
    damageReduction: 0.25,
    attackBonus: 0.10,
    goldBonus: 0,
    canDisarmTraps: false,
    canDamageEthereal: false,
    healingPotionChance: 0,
  },
  {
    degreeId: 'arcane-studies',
    name: 'Arcane Sight',
    description: 'Damage ghosts on Floor 3, +15% gold find',
    damageReduction: 0,
    attackBonus: 0,
    goldBonus: 0.15,
    canDisarmTraps: false,
    canDamageEthereal: true,
    healingPotionChance: 0,
  },
  {
    degreeId: 'alchemy',
    name: 'Potion Brewing',
    description: '20% chance to find Healing Potion after encounters',
    damageReduction: 0,
    attackBonus: 0,
    goldBonus: 0,
    canDisarmTraps: false,
    canDamageEthereal: false,
    healingPotionChance: 0.20,
  },
  {
    degreeId: 'scholar',
    name: 'Dungeon Scholar',
    description: '+10% gold from all dungeon activities',
    damageReduction: 0,
    attackBonus: 0,
    goldBonus: 0.10,
    canDisarmTraps: false,
    canDamageEthereal: false,
    healingPotionChance: 0,
  },
];

// ============================================================
// Floor 1: Entrance Cavern
// ============================================================

const FLOOR_1_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f1-rats',
    name: 'Giant Rats',
    description: 'A swarm of oversized rats blocks the passage.',
    type: 'combat',
    difficulty: 'easy',
    basePower: 8,
    baseDamage: 5,
    baseGold: 8,
    flavorText: 'Squeaking fills the tunnel as red eyes glint in the darkness.',
  },
  {
    id: 'f1-bats',
    name: 'Cave Bats',
    description: 'A cloud of screeching bats swoops down from the ceiling.',
    type: 'combat',
    difficulty: 'easy',
    basePower: 6,
    baseDamage: 4,
    baseGold: 5,
    flavorText: 'Leathery wings beat the stale air as the bats descend.',
  },
  {
    id: 'f1-treasure',
    name: 'Abandoned Chest',
    description: 'An old wooden chest sits in an alcove, covered in cobwebs.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 15,
    flavorText: 'The chest creaks open, revealing a small cache of forgotten coins.',
  },
  {
    id: 'f1-spring',
    name: 'Healing Spring',
    description: 'A glowing pool of crystal-clear water bubbles from the rock.',
    type: 'healing',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: -10,  // Negative = healing
    baseGold: 0,
    flavorText: 'The water shimmers with a faint golden light. You feel restored.',
  },
];

const FLOOR_1_BOSS: DungeonEncounter = {
  id: 'f1-boss-rat-king',
  name: 'The Rat King',
  description: 'A massive rodent, twice the size of a man, with a crown of twisted bones.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 15,
  baseDamage: 10,
  baseGold: 25,
  flavorText: 'The Rat King screeches, its minions scattering as it charges forward!',
};

// ============================================================
// Floor 2: Goblin Tunnels
// ============================================================

const FLOOR_2_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f2-goblin-scouts',
    name: 'Goblin Scouts',
    description: 'A pair of goblins wielding crude daggers leap from the shadows.',
    type: 'combat',
    difficulty: 'medium',
    basePower: 18,
    baseDamage: 10,
    baseGold: 15,
    flavorText: 'The goblins cackle as they circle, looking for an opening.',
  },
  {
    id: 'f2-pit-trap',
    name: 'Pit Trap',
    description: 'The floor gives way beneath you — a spiked pit!',
    type: 'trap',
    difficulty: 'medium',
    basePower: 0,
    baseDamage: 12,
    baseGold: 0,
    isDisarmable: true,
    flavorText: 'Dust clouds rise as stones crumble. Trade Guild training spots the trigger plates.',
  },
  {
    id: 'f2-goblin-warriors',
    name: 'Goblin Warriors',
    description: 'Three goblins in makeshift armor block a narrow bridge.',
    type: 'combat',
    difficulty: 'medium',
    basePower: 22,
    baseDamage: 13,
    baseGold: 20,
    flavorText: 'The goblins bang their shields and howl a war cry.',
  },
  {
    id: 'f2-treasure-cache',
    name: 'Goblin Treasure Cache',
    description: 'A pile of stolen goods and coins, poorly hidden behind barrels.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 25,
    flavorText: 'The goblins\' ill-gotten gains. Finders keepers.',
  },
];

const FLOOR_2_BOSS: DungeonEncounter = {
  id: 'f2-boss-goblin-chief',
  name: 'Goblin Chieftain',
  description: 'A hulking goblin in stolen chainmail, wielding a notched greataxe.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 30,
  baseDamage: 18,
  baseGold: 45,
  flavorText: 'The Chieftain roars, slamming his axe against the stone floor, sparks flying!',
};

// ============================================================
// Floor 3: Undead Crypt
// ============================================================

const FLOOR_3_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f3-skeletons',
    name: 'Skeletal Warriors',
    description: 'Bones rattle as ancient warriors rise from their stone tombs.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 35,
    baseDamage: 18,
    baseGold: 30,
    flavorText: 'Hollow eye sockets glow with pale blue fire as the dead march.',
  },
  {
    id: 'f3-ghosts',
    name: 'Restless Ghosts',
    description: 'Translucent figures drift through the walls, wailing in anguish.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 30,
    baseDamage: 20,
    baseGold: 35,
    requiresArcane: true,
    flavorText: 'Their touch drains warmth from your body. Arcane knowledge reveals their weakness.',
  },
  {
    id: 'f3-poison-trap',
    name: 'Poison Gas Trap',
    description: 'Ancient mechanisms release a cloud of noxious green gas.',
    type: 'trap',
    difficulty: 'hard',
    basePower: 0,
    baseDamage: 15,
    baseGold: 0,
    isDisarmable: true,
    flavorText: 'Hissing sounds from the walls. Quick hands could disable the mechanism.',
  },
  {
    id: 'f3-ancient-artifacts',
    name: 'Ancient Artifact Cache',
    description: 'A sealed chamber filled with relics from a forgotten age.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 50,
    flavorText: 'Gold coins with unfamiliar faces and jeweled trinkets catch the torchlight.',
  },
];

const FLOOR_3_BOSS: DungeonEncounter = {
  id: 'f3-boss-lich',
  name: 'The Crypt Lich',
  description: 'A skeletal mage in tattered robes, dark energy crackling between its fingers.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 50,
  baseDamage: 28,
  baseGold: 80,
  requiresArcane: true,
  flavorText: 'The Lich speaks in a language dead for centuries, raising its staff high!',
};

// ============================================================
// Floor 4: Dragon's Lair
// ============================================================

const FLOOR_4_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f4-young-dragon',
    name: 'Young Dragon',
    description: 'A juvenile dragon, scales gleaming like polished copper.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 55,
    baseDamage: 30,
    baseGold: 60,
    flavorText: 'The dragon rears back, smoke curling from its nostrils.',
  },
  {
    id: 'f4-fire-trap',
    name: 'Dragon Fire Vent',
    description: 'Jets of flame erupt from cracks in the volcanic rock.',
    type: 'trap',
    difficulty: 'hard',
    basePower: 0,
    baseDamage: 25,
    baseGold: 0,
    isDisarmable: true,
    flavorText: 'The air shimmers with heat. Natural vents — or deliberate defenses?',
  },
  {
    id: 'f4-drake-pack',
    name: 'Drake Pack',
    description: 'A group of smaller drakes, coordinating their attacks.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 50,
    baseDamage: 25,
    baseGold: 50,
    flavorText: 'The drakes circle, snapping their jaws, herding you toward a wall.',
  },
  {
    id: 'f4-dragon-hoard',
    name: 'Dragon Hoard',
    description: 'A massive pile of gold and gems, left behind by a departed wyrm.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 100,
    flavorText: 'Mountains of gold coins, gemstones, and enchanted trinkets glitter in the firelight.',
  },
];

const FLOOR_4_BOSS: DungeonEncounter = {
  id: 'f4-boss-elder-dragon',
  name: 'Elder Dragon',
  description: 'An ancient dragon, its scales scarred from centuries of battle.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 75,
  baseDamage: 40,
  baseGold: 150,
  flavorText: 'The Elder Dragon unfurls its wings, filling the cavern. Its roar shakes the earth!',
};

// ============================================================
// Floor 5: The Abyss
// ============================================================

const FLOOR_5_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f5-demon-soldiers',
    name: 'Demon Soldiers',
    description: 'Twisted fiends in black iron armor, wreathed in dark flame.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 75,
    baseDamage: 40,
    baseGold: 100,
    flavorText: 'The demons speak in a tongue that makes your head throb.',
  },
  {
    id: 'f5-void-trap',
    name: 'Void Rift',
    description: 'A tear in reality threatens to pull you into the void.',
    type: 'trap',
    difficulty: 'hard',
    basePower: 0,
    baseDamage: 35,
    baseGold: 0,
    isDisarmable: true,
    flavorText: 'Space warps and bends. A careful hand can seal the rift.',
  },
  {
    id: 'f5-shadow-fiends',
    name: 'Shadow Fiends',
    description: 'Living shadows that coalesce into nightmarish forms.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 70,
    baseDamage: 35,
    baseGold: 80,
    requiresArcane: true,
    flavorText: 'The darkness itself attacks, tendrils of shadow lashing out.',
  },
  {
    id: 'f5-abyssal-vault',
    name: 'Abyssal Vault',
    description: 'A vault sealed by demonic runes, overflowing with cursed treasure.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 200,
    flavorText: 'The runes fade as you approach. Inside: riches beyond imagination.',
  },
];

const FLOOR_5_BOSS: DungeonEncounter = {
  id: 'f5-boss-demon-lord',
  name: 'Azrathor the Demon Lord',
  description: 'A towering demon prince, reality distorting around his presence.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 100,
  baseDamage: 55,
  baseGold: 300,
  requiresArcane: true,
  flavorText: 'Azrathor laughs, his voice echoing from every direction. "You dare enter MY domain?"',
};

// ============================================================
// Rare Drops (5% chance per floor clear)
// ============================================================

const RARE_DROPS: Record<number, RareDrop> = {
  1: {
    id: 'cave-mushroom',
    name: 'Cave Mushroom',
    description: 'A rare luminescent mushroom with potent healing properties.',
    dropChance: 0.05,
    effect: { type: 'heal', value: 20 },
  },
  2: {
    id: 'goblins-lucky-coin',
    name: "Goblin's Lucky Coin",
    description: 'A strange coin that seems to attract more gold. Permanent +5% gold from work.',
    dropChance: 0.05,
    effect: { type: 'permanent_gold_bonus', value: 0.05 },
  },
  3: {
    id: 'undead-amulet',
    name: 'Undead Amulet',
    description: 'An amulet pulsing with necrotic energy. Permanent +10 max health.',
    dropChance: 0.05,
    effect: { type: 'permanent_max_health', value: 10 },
  },
  4: {
    id: 'dragon-scale-shield',
    name: 'Dragon Scale Shield',
    description: 'A shield forged from dragon scales. +20 Defense, +20% Block.',
    dropChance: 0.05,
    effect: { type: 'equippable', slot: 'shield', defense: 20, blockChance: 0.20 },
  },
  5: {
    id: 'demons-heart',
    name: "Demon's Heart",
    description: 'The still-beating heart of a demon lord. +25 Happiness, +5 to all stat caps.',
    dropChance: 0.05,
    effect: { type: 'happiness_and_stats', happiness: 25, statCap: 5 },
  },
};

// ============================================================
// Loot multiplier by guild rank
// ============================================================

const GUILD_LOOT_MULTIPLIER: Partial<Record<GuildRank, number>> = {
  novice: 0.8,
  apprentice: 0.9,
  journeyman: 1.0,
  adept: 1.1,
  veteran: 1.2,
  elite: 1.35,
  'guild-master': 1.5,
};

// ============================================================
// Floor Definitions
// ============================================================

export const DUNGEON_FLOORS: DungeonFloor[] = [
  // Floor 1: Entrance Cavern
  {
    id: 1,
    name: 'Entrance Cavern',
    description: 'The upper tunnels of the cave. Rats and bats nest here among forgotten relics.',
    timeCost: 6,
    timeCostReduced: 4,
    requirements: {
      previousFloorCleared: 0,
      minimumWeapon: null,
      minimumArmor: null,
      minimumAttack: 0,
      minimumDefense: 0,
      recommendedDegrees: [],
    },
    encounters: FLOOR_1_ENCOUNTERS,
    boss: FLOOR_1_BOSS,
    goldRange: [15, 50],
    healthRisk: [5, 15],
    happinessOnClear: 3,
    rareDrop: RARE_DROPS[1],
    lootMultiplier: GUILD_LOOT_MULTIPLIER,
  },

  // Floor 2: Goblin Tunnels
  {
    id: 2,
    name: 'Goblin Tunnels',
    description: 'Crude tunnels dug by goblin clans. Traps and ambushes await the unwary.',
    timeCost: 10,
    timeCostReduced: 8,
    requirements: {
      previousFloorCleared: 1,
      minimumWeapon: 'dagger',
      minimumArmor: null,
      minimumAttack: 5,
      minimumDefense: 0,
      recommendedDegrees: ['trade-guild'],
    },
    encounters: FLOOR_2_ENCOUNTERS,
    boss: FLOOR_2_BOSS,
    goldRange: [30, 100],
    healthRisk: [15, 25],
    happinessOnClear: 5,
    rareDrop: RARE_DROPS[2],
    lootMultiplier: GUILD_LOOT_MULTIPLIER,
  },

  // Floor 3: Undead Crypt
  {
    id: 3,
    name: 'Undead Crypt',
    description: 'An ancient burial ground disturbed by dark magic. The dead do not rest easy.',
    timeCost: 14,
    timeCostReduced: 12,
    requirements: {
      previousFloorCleared: 2,
      minimumWeapon: 'sword',
      minimumArmor: 'leather-armor',
      minimumAttack: 15,
      minimumDefense: 10,
      recommendedDegrees: ['arcane-studies', 'combat-training'],
    },
    encounters: FLOOR_3_ENCOUNTERS,
    boss: FLOOR_3_BOSS,
    goldRange: [60, 200],
    healthRisk: [25, 40],
    happinessOnClear: 8,
    rareDrop: RARE_DROPS[3],
    lootMultiplier: GUILD_LOOT_MULTIPLIER,
  },

  // Floor 4: Dragon's Lair
  {
    id: 4,
    name: "Dragon's Lair",
    description: 'Deep volcanic caverns where dragons make their nests. Extreme heat and danger.',
    timeCost: 18,
    timeCostReduced: 16,
    requirements: {
      previousFloorCleared: 3,
      minimumWeapon: 'steel-sword',
      minimumArmor: 'chainmail',
      minimumAttack: 25,
      minimumDefense: 20,
      recommendedDegrees: ['master-combat'],
    },
    encounters: FLOOR_4_ENCOUNTERS,
    boss: FLOOR_4_BOSS,
    goldRange: [120, 400],
    healthRisk: [40, 60],
    happinessOnClear: 15,
    rareDrop: RARE_DROPS[4],
    lootMultiplier: GUILD_LOOT_MULTIPLIER,
  },

  // Floor 5: The Abyss
  {
    id: 5,
    name: 'The Abyss',
    description: 'The deepest level. A rift to another plane where demon lords reign.',
    timeCost: 22,
    timeCostReduced: 20,
    requirements: {
      previousFloorCleared: 4,
      minimumWeapon: 'enchanted-blade',
      minimumArmor: 'plate-armor',
      minimumAttack: 40,
      minimumDefense: 35,
      recommendedDegrees: ['master-combat', 'arcane-studies'],
    },
    encounters: FLOOR_5_ENCOUNTERS,
    boss: FLOOR_5_BOSS,
    goldRange: [250, 600],
    healthRisk: [50, 80],
    happinessOnClear: 20,
    rareDrop: RARE_DROPS[5],
    lootMultiplier: GUILD_LOOT_MULTIPLIER,
  },
];

// ============================================================
// Helper Functions
// ============================================================

/** Get a floor definition by ID (1-5) */
export function getFloor(floorId: number): DungeonFloor | undefined {
  return DUNGEON_FLOORS.find(f => f.id === floorId);
}

/** Get all floors */
export function getAllFloors(): DungeonFloor[] {
  return DUNGEON_FLOORS;
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

/** Number of encounters per floor run (3 regular + 1 boss) */
export const ENCOUNTERS_PER_FLOOR = 4;

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

/** Maximum dungeon floor */
export const MAX_DUNGEON_FLOOR = 5;

/** Max floor attempts per turn (fatigue system — prevents dungeon spamming) */
export const MAX_FLOOR_ATTEMPTS_PER_TURN = 2;

/** Healing potion restores this much HP when found */
export const HEALING_POTION_HP = 15;
