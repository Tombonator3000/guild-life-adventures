// Guild Life - Dungeon Floor Definitions
// Floor data, rare drops, loot multipliers, education bonuses, and run modifiers

import type { GuildRank } from '@/types/game.types';
import type { EducationDungeonBonus, RareDrop, DungeonFloor, DungeonModifier } from './types';
import {
  FLOOR_1_ENCOUNTERS, FLOOR_1_BOSS,
  FLOOR_2_ENCOUNTERS, FLOOR_2_BOSS,
  FLOOR_3_ENCOUNTERS, FLOOR_3_BOSS,
  FLOOR_4_ENCOUNTERS, FLOOR_4_BOSS,
  FLOOR_5_ENCOUNTERS, FLOOR_5_BOSS,
  FLOOR_6_ENCOUNTERS, FLOOR_6_BOSS,
} from './encounters';

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
  {
    degreeId: 'loremaster',
    name: 'Loremaster\'s Insight',
    description: '+15% ATK, +20% gold, unlock The Forgotten Temple',
    damageReduction: 0,
    attackBonus: 0.15,
    goldBonus: 0.20,
    canDisarmTraps: false,
    canDamageEthereal: false,
    healingPotionChance: 0,
  },
];

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
  6: {
    id: 'archons-crown',
    name: "Archon's Crown",
    description: 'A radiant crown of divine authority. +15 max health, +10% permanent gold bonus, +30 happiness.',
    dropChance: 0.05,
    effect: { type: 'happiness_and_stats', happiness: 30, statCap: 8 },
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
    healthRisk: [10, 25],
    happinessOnClear: 3,
    dependabilityOnClear: 3,
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
    healthRisk: [20, 40],
    happinessOnClear: 5,
    dependabilityOnClear: 5,
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
    healthRisk: [35, 60],
    happinessOnClear: 8,
    dependabilityOnClear: 7,
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
    healthRisk: [55, 85],
    happinessOnClear: 15,
    dependabilityOnClear: 10,
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
    healthRisk: [70, 120],
    happinessOnClear: 20,
    dependabilityOnClear: 15,
    rareDrop: RARE_DROPS[5],
    lootMultiplier: GUILD_LOOT_MULTIPLIER,
  },

  // Floor 6: The Forgotten Temple (ultra-endgame, requires Loremaster degree)
  {
    id: 6,
    name: 'The Forgotten Temple',
    description: 'A sanctum sealed for aeons, where divine power still lingers. Only those who have mastered ancient lore may enter.',
    timeCost: 28,
    timeCostReduced: 24,
    requirements: {
      previousFloorCleared: 5,
      minimumWeapon: 'enchanted-blade',
      minimumArmor: 'enchanted-plate',
      minimumAttack: 45,
      minimumDefense: 50,
      requiredDegrees: ['loremaster'],
      recommendedDegrees: ['master-combat', 'arcane-studies', 'loremaster'],
    },
    encounters: FLOOR_6_ENCOUNTERS,
    boss: FLOOR_6_BOSS,
    goldRange: [400, 1000],
    healthRisk: [90, 150],
    happinessOnClear: 30,
    dependabilityOnClear: 20,
    rareDrop: RARE_DROPS[6],
    lootMultiplier: GUILD_LOOT_MULTIPLIER,
  },
];

// ============================================================
// Dungeon Run Modifiers (random per-run effects)
// ============================================================

export const DUNGEON_MODIFIERS: DungeonModifier[] = [
  {
    id: 'cursed-halls',
    name: 'Cursed Halls',
    description: '+30% damage taken, but +50% gold earned.',
    damageMult: 1.3,
    goldMult: 1.5,
    enemyPowerMult: 1.0,
    rareDropMult: 1.0,
    disableHealing: false,
    disableDisarm: false,
    bonusDamageReduction: 0,
    healingMult: 1.0,
    color: '#9333ea',
    icon: '🔮',
  },
  {
    id: 'lucky-day',
    name: 'Lucky Day',
    description: '+25% rare drop chance, +25% gold earned.',
    damageMult: 1.0,
    goldMult: 1.25,
    enemyPowerMult: 1.0,
    rareDropMult: 1.25,
    disableHealing: false,
    disableDisarm: false,
    bonusDamageReduction: 0,
    healingMult: 1.0,
    color: '#eab308',
    icon: '🍀',
  },
  {
    id: 'blood-moon',
    name: 'Blood Moon',
    description: 'Enemies +50% power, +100% gold, no healing encounters.',
    damageMult: 1.0,
    goldMult: 2.0,
    enemyPowerMult: 1.5,
    rareDropMult: 1.0,
    disableHealing: true,
    disableDisarm: false,
    bonusDamageReduction: 0,
    healingMult: 1.0,
    color: '#dc2626',
    icon: '🌑',
  },
  {
    id: 'echoing-darkness',
    name: 'Echoing Darkness',
    description: 'Traps cannot be disarmed, but +20% gold.',
    damageMult: 1.0,
    goldMult: 1.2,
    enemyPowerMult: 1.0,
    rareDropMult: 1.0,
    disableHealing: false,
    disableDisarm: true,
    bonusDamageReduction: 0,
    healingMult: 1.0,
    color: '#374151',
    icon: '🕳',
  },
  {
    id: 'blessed-ground',
    name: 'Blessed Ground',
    description: '-20% damage taken, healing +50%.',
    damageMult: 0.8,
    goldMult: 1.0,
    enemyPowerMult: 1.0,
    rareDropMult: 1.0,
    disableHealing: false,
    disableDisarm: false,
    bonusDamageReduction: 0.2,
    healingMult: 1.5,
    color: '#22c55e',
    icon: '✨',
  },
  {
    id: 'fortunes-favor',
    name: "Fortune's Favor",
    description: 'Treasure encounters give 2x gold.',
    damageMult: 1.0,
    goldMult: 1.0, // Only applies to treasure encounters (handled in combat resolver)
    enemyPowerMult: 1.0,
    rareDropMult: 1.5,
    disableHealing: false,
    disableDisarm: false,
    bonusDamageReduction: 0,
    healingMult: 1.0,
    color: '#f59e0b',
    icon: '💰',
  },
  {
    id: 'weakened-wards',
    name: 'Weakened Wards',
    description: 'Enemies -30% power, but -30% gold.',
    damageMult: 1.0,
    goldMult: 0.7,
    enemyPowerMult: 0.7,
    rareDropMult: 1.0,
    disableHealing: false,
    disableDisarm: false,
    bonusDamageReduction: 0,
    healingMult: 1.0,
    color: '#60a5fa',
    icon: '🛡',
  },
];
