// Hexes & Curses System — Dark magic sabotage/rivalry mechanics
// Players can hex locations (block opponents) or curse specific rivals (debuffs)

import type { LocationId } from '@/types/game.types';

// ============================================================
// Types
// ============================================================

export type HexCategory = 'location' | 'personal' | 'sabotage';

export interface HexDefinition {
  id: string;
  name: string;
  category: HexCategory;
  description: string;
  flavorText: string;           // Dramatic message shown to target
  basePrice: number;            // Gold cost (0 = drop-only)
  castTime: number;             // Hours to cast
  duration: number;             // Weeks (0 = instant for sabotage)
  // Location hex fields
  targetLocation?: LocationId;  // Which location this blocks
  // Personal curse fields
  effect?: HexEffect;
  // Sources — where this hex can be obtained
  sources: HexSource[];
}

export interface HexEffect {
  type: HexEffectType;
  magnitude: number;            // Effect strength (e.g. 0.4 = 40% reduction)
}

export type HexEffectType =
  | 'wage-reduction'       // Curse of Poverty: wages reduced
  | 'durability-decay'     // Hex of Clumsiness: equipment degrades faster
  | 'time-loss'            // Curse of Lethargy: lose hours per turn
  | 'misfortune'           // Hex of Misfortune: doubled robbery, random bad events
  | 'food-clothing-decay'  // Curse of Decay: food/clothing degrade faster
  | 'study-penalty'        // Hex of Confusion: extra study sessions
  | 'destroy-weapon'       // Shatter Hex: destroy weapon
  | 'destroy-armor'        // Corrode Hex: destroy armor
  | 'destroy-food'         // Spoilage Curse: destroy all food
  | 'break-appliance'      // Appliance Jinx: break random appliance
  | 'destroy-clothing'     // Wardrobe Hex: clothing → 0
  | 'legendary-ruin';      // Hex of Ruin: close all shops + lose 25% gold

export interface HexSource {
  location: 'enchanter' | 'shadow-market' | 'graveyard' | 'dungeon';
  requiresFloorCleared?: number;  // Dungeon floor required to purchase
  dropOnly?: boolean;             // Only available as dungeon drop
  dungeonFloor?: number;          // Which floor drops this
  dropChance?: number;            // Drop chance (0-1)
}

/** Active hex on a location (blocks opponents) */
export interface ActiveLocationHex {
  hexId: string;
  casterId: string;
  casterName: string;
  targetLocation: LocationId;
  weeksRemaining: number;
}

/** Active personal curse on a player */
export interface ActiveCurse {
  hexId: string;
  casterId: string;
  casterName: string;
  effectType: HexEffectType;
  magnitude: number;
  weeksRemaining: number;        // 0 = instant (already applied)
}

// ============================================================
// Hex Scroll Inventory Item
// ============================================================

export interface HexScroll {
  hexId: string;
  quantity: number;
}

// ============================================================
// Location Hex Definitions
// ============================================================

export const LOCATION_HEXES: HexDefinition[] = [
  {
    id: 'seal-of-ignorance',
    name: 'Seal of Ignorance',
    category: 'location',
    description: 'Seals the Academy with dark magic. Opponents cannot study.',
    flavorText: 'Dark magic seals the Academy doors. Ancient runes pulse with malevolent light.',
    basePrice: 500,
    castTime: 3,
    duration: 2,
    targetLocation: 'academy',
    sources: [
      { location: 'enchanter', requiresFloorCleared: 2 },
      { location: 'dungeon', dungeonFloor: 3, dropChance: 0.04 },
    ],
  },
  {
    id: 'embargo-decree',
    name: 'Embargo Decree',
    category: 'location',
    description: 'Curses the Guild Hall. Opponents cannot accept quests or apply for jobs.',
    flavorText: 'A spectral proclamation bars the Guild Hall. The doors slam shut as you approach.',
    basePrice: 600,
    castTime: 3,
    duration: 2,
    targetLocation: 'guild-hall',
    sources: [
      { location: 'shadow-market' },
      { location: 'dungeon', dungeonFloor: 4, dropChance: 0.04 },
    ],
  },
  {
    id: 'market-blight',
    name: 'Market Blight',
    category: 'location',
    description: 'Curses the General Store. Opponents cannot buy food or items.',
    flavorText: 'A sickly green fog seeps from the store. The goods inside have turned to ash.',
    basePrice: 400,
    castTime: 3,
    duration: 1,
    targetLocation: 'general-store',
    sources: [
      { location: 'shadow-market' },
    ],
  },
  {
    id: 'forge-curse',
    name: 'Forge Curse',
    category: 'location',
    description: 'Hexes the Forge. Opponents cannot temper, repair, or salvage.',
    flavorText: 'The forge fire burns cold and black. No hammer will strike true here.',
    basePrice: 350,
    castTime: 3,
    duration: 2,
    targetLocation: 'forge',
    sources: [
      { location: 'shadow-market' },
      { location: 'dungeon', dungeonFloor: 3, dropChance: 0.04 },
    ],
  },
  {
    id: 'vault-seal',
    name: 'Vault Seal',
    category: 'location',
    description: 'Seals the Bank vault. Opponents cannot deposit, withdraw, or trade stocks.',
    flavorText: 'Ghostly chains bind the vault doors. Your gold is trapped behind dark magic.',
    basePrice: 500,
    castTime: 3,
    duration: 1,
    targetLocation: 'bank',
    sources: [
      { location: 'dungeon', dungeonFloor: 4, dropChance: 0.05, dropOnly: true },
    ],
  },
  {
    id: 'dungeon-ward',
    name: 'Dungeon Ward',
    category: 'location',
    description: 'Wards the Cave entrance. Opponents cannot enter the dungeon.',
    flavorText: 'A barrier of dark energy crackles across the cave mouth. The darkness rejects you.',
    basePrice: 450,
    castTime: 3,
    duration: 2,
    targetLocation: 'cave',
    sources: [
      { location: 'enchanter', requiresFloorCleared: 2 },
      { location: 'dungeon', dungeonFloor: 4, dropChance: 0.04 },
    ],
  },
];

// ============================================================
// Personal Curse Definitions
// ============================================================

export const PERSONAL_CURSES: HexDefinition[] = [
  {
    id: 'curse-of-poverty',
    name: 'Curse of Poverty',
    category: 'personal',
    description: "Target's wages reduced by 40% for 3 weeks.",
    flavorText: 'A spectral hand reaches into your coin purse. Your earnings crumble to dust.',
    basePrice: 500,
    castTime: 2,
    duration: 3,
    effect: { type: 'wage-reduction', magnitude: 0.4 },
    sources: [
      { location: 'shadow-market' },
      { location: 'dungeon', dungeonFloor: 3, dropChance: 0.04 },
    ],
  },
  {
    id: 'hex-of-clumsiness',
    name: 'Hex of Clumsiness',
    category: 'personal',
    description: "Target's equipment degrades 3x faster for 3 weeks.",
    flavorText: 'Your hands feel clumsy and numb. Everything you touch seems to crumble.',
    basePrice: 400,
    castTime: 2,
    duration: 3,
    effect: { type: 'durability-decay', magnitude: 3 },
    sources: [
      { location: 'shadow-market' },
    ],
  },
  {
    id: 'curse-of-lethargy',
    name: 'Curse of Lethargy',
    category: 'personal',
    description: 'Target loses 10 extra hours per turn for 2 weeks.',
    flavorText: 'A crushing weariness settles over you. Every step takes twice the effort.',
    basePrice: 600,
    castTime: 2,
    duration: 2,
    effect: { type: 'time-loss', magnitude: 10 },
    sources: [
      { location: 'dungeon', dungeonFloor: 4, dropChance: 0.05, dropOnly: true },
    ],
  },
  {
    id: 'hex-of-misfortune',
    name: 'Hex of Misfortune',
    category: 'personal',
    description: 'Robbery chance doubled and 25% chance of random bad events each week for 4 weeks.',
    flavorText: 'A black cat crosses your path. Then another. Then a third. This cannot be good.',
    basePrice: 350,
    castTime: 2,
    duration: 4,
    effect: { type: 'misfortune', magnitude: 2 },
    sources: [
      { location: 'graveyard' },
      { location: 'shadow-market' },
    ],
  },
  {
    id: 'curse-of-decay',
    name: 'Curse of Decay',
    category: 'personal',
    description: 'Food spoils 2x faster and clothing degrades 2x faster for 3 weeks.',
    flavorText: 'Your belongings smell of rot. Moths swarm your wardrobe. Mold blooms on your bread.',
    basePrice: 300,
    castTime: 2,
    duration: 3,
    effect: { type: 'food-clothing-decay', magnitude: 2 },
    sources: [
      { location: 'shadow-market' },
    ],
  },
  {
    id: 'hex-of-confusion',
    name: 'Hex of Confusion',
    category: 'personal',
    description: 'Target needs +2 extra study sessions per degree for 2 weeks.',
    flavorText: 'The words on the page swim and rearrange. Nothing makes sense anymore.',
    basePrice: 450,
    castTime: 2,
    duration: 2,
    effect: { type: 'study-penalty', magnitude: 2 },
    sources: [
      { location: 'enchanter', requiresFloorCleared: 2 },
      { location: 'dungeon', dungeonFloor: 3, dropChance: 0.04 },
    ],
  },
];

// ============================================================
// Equipment Sabotage Definitions (instant, no duration)
// ============================================================

export const SABOTAGE_HEXES: HexDefinition[] = [
  {
    id: 'shatter-hex',
    name: 'Shatter Hex',
    category: 'sabotage',
    description: "Destroy target's equipped weapon permanently.",
    flavorText: 'Your weapon shatters into a thousand pieces as dark energy courses through it.',
    basePrice: 0,
    castTime: 2,
    duration: 0,
    effect: { type: 'destroy-weapon', magnitude: 1 },
    sources: [
      { location: 'dungeon', dungeonFloor: 4, dropChance: 0.03, dropOnly: true },
    ],
  },
  {
    id: 'corrode-hex',
    name: 'Corrode Hex',
    category: 'sabotage',
    description: "Destroy target's equipped armor permanently.",
    flavorText: 'Acid-green light eats through your armor, dissolving it to nothing.',
    basePrice: 0,
    castTime: 2,
    duration: 0,
    effect: { type: 'destroy-armor', magnitude: 1 },
    sources: [
      { location: 'dungeon', dungeonFloor: 4, dropChance: 0.03, dropOnly: true },
    ],
  },
  {
    id: 'spoilage-curse',
    name: 'Spoilage Curse',
    category: 'sabotage',
    description: "Destroy ALL of target's stored food.",
    flavorText: 'Your entire food supply rots in an instant. A terrible stench fills the air.',
    basePrice: 300,
    castTime: 2,
    duration: 0,
    effect: { type: 'destroy-food', magnitude: 1 },
    sources: [
      { location: 'shadow-market' },
    ],
  },
  {
    id: 'appliance-jinx',
    name: 'Appliance Jinx',
    category: 'sabotage',
    description: "Break one random appliance the target owns.",
    flavorText: 'A magical surge fries one of your enchanted devices. Smoke pours from the wreckage.',
    basePrice: 250,
    castTime: 2,
    duration: 0,
    effect: { type: 'break-appliance', magnitude: 1 },
    sources: [
      { location: 'shadow-market' },
      { location: 'enchanter', requiresFloorCleared: 2 },
    ],
  },
  {
    id: 'wardrobe-hex',
    name: 'Wardrobe Hex',
    category: 'sabotage',
    description: "Reduce target's clothing condition to 0.",
    flavorText: 'Your finest clothes unravel thread by thread. You are left in rags.',
    basePrice: 200,
    castTime: 2,
    duration: 0,
    effect: { type: 'destroy-clothing', magnitude: 1 },
    sources: [
      { location: 'shadow-market' },
    ],
  },
];

// ============================================================
// Legendary Hex (Floor 5 drop only)
// ============================================================

export const LEGENDARY_HEX: HexDefinition = {
  id: 'hex-of-ruin',
  name: 'Hex of Ruin',
  category: 'personal',
  description: 'Closes ALL shops for target for 1 week AND reduces their gold by 25%. Cannot be warded.',
  flavorText: 'The legendary Hex of Ruin descends! All of Guildholm turns its back on you.',
  basePrice: 0,
  castTime: 3,
  duration: 1,
  effect: { type: 'legendary-ruin', magnitude: 0.25 },
  sources: [
    { location: 'dungeon', dungeonFloor: 5, dropChance: 0.03, dropOnly: true },
  ],
};

// ============================================================
// Defense Items
// ============================================================

export interface DefenseItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  source: 'enchanter' | 'graveyard';
  timeCost: number;
}

export const DEFENSE_ITEMS: DefenseItem[] = [
  {
    id: 'protective-amulet',
    name: 'Protective Amulet',
    description: 'Blocks the next hex or curse cast on you (consumed on use).',
    basePrice: 400,
    source: 'enchanter',
    timeCost: 0,
  },
  {
    id: 'dispel-scroll',
    name: 'Dispel Scroll',
    description: 'Removes one active location hex. Must be used AT the hexed location.',
    basePrice: 250,
    source: 'enchanter',
    timeCost: 1,
  },
];

// ============================================================
// All Hexes Combined
// ============================================================

export const ALL_HEXES: HexDefinition[] = [
  ...LOCATION_HEXES,
  ...PERSONAL_CURSES,
  ...SABOTAGE_HEXES,
  LEGENDARY_HEX,
];

export function getHexById(id: string): HexDefinition | undefined {
  return ALL_HEXES.find(h => h.id === id);
}

// ============================================================
// Shadow Market rotating stock (3-4 available per week)
// ============================================================

/** Get which hex scrolls are available at Shadow Market this week */
export function getShadowMarketHexStock(week: number): HexDefinition[] {
  // All hexes sold at shadow market (non-drop-only)
  const shadowHexes = ALL_HEXES.filter(h =>
    h.sources.some(s => s.location === 'shadow-market' && !s.dropOnly)
  );
  // Deterministic rotation using week number
  const seed = week * 7 + 13;
  const shuffled = [...shadowHexes].sort((a, b) => {
    const hashA = ((seed * 31 + a.id.charCodeAt(0)) % 1000);
    const hashB = ((seed * 31 + b.id.charCodeAt(0)) % 1000);
    return hashA - hashB;
  });
  // Return 3-4 items
  const count = 3 + (seed % 2); // 3 or 4
  return shuffled.slice(0, count);
}

/** Get which hex scrolls are available at Enchanter this week */
export function getEnchanterHexStock(player: { dungeonFloorsCleared: number[] }): HexDefinition[] {
  return ALL_HEXES.filter(h =>
    h.sources.some(s => {
      if (s.location !== 'enchanter') return false;
      if (s.dropOnly) return false;
      if (s.requiresFloorCleared && !player.dungeonFloorsCleared.includes(s.requiresFloorCleared)) return false;
      return true;
    })
  );
}

/** Roll for hex scroll dungeon drops (called after boss defeat) */
export function rollHexDrop(floorNumber: number): HexDefinition | null {
  const eligibleHexes = ALL_HEXES.filter(h =>
    h.sources.some(s => s.location === 'dungeon' && s.dungeonFloor === floorNumber)
  );
  if (eligibleHexes.length === 0) return null;

  for (const hex of eligibleHexes) {
    const source = hex.sources.find(s => s.location === 'dungeon' && s.dungeonFloor === floorNumber);
    if (source && source.dropChance && Math.random() < source.dropChance) {
      return hex;
    }
  }
  return null;
}

/** Get hex casting cost adjusted by price modifier */
export function getHexPrice(hex: HexDefinition, priceModifier: number): number {
  if (hex.basePrice === 0) return 0; // Drop-only items
  return Math.round(hex.basePrice * priceModifier);
}

/** Check if a location is blocked for a specific player by any active location hex */
export function isLocationHexed(
  locationId: LocationId,
  playerId: string,
  locationHexes: ActiveLocationHex[]
): ActiveLocationHex | null {
  return locationHexes.find(
    h => h.targetLocation === locationId && h.casterId !== playerId && h.weeksRemaining > 0
  ) || null;
}

/** Graveyard dark ritual: random hex scroll (weighted toward lower tiers) */
export function rollGraveyardRitual(): { hex: HexDefinition; backfired: boolean } {
  const backfired = Math.random() < 0.15; // 15% backfire chance
  // Weighted pool: more common hexes appear more often
  // Note: Only hexes WITH effects can backfire (location hexes have no effect field),
  // so if backfired, only use personal/sabotage curses that have effects.
  const allPool: HexDefinition[] = [
    ...PERSONAL_CURSES.filter(h => h.basePrice <= 400),  // cheap curses (2x weight)
    ...PERSONAL_CURSES.filter(h => h.basePrice <= 400),
    ...LOCATION_HEXES.filter(h => h.basePrice <= 400),   // cheap location hexes
    ...SABOTAGE_HEXES.filter(h => h.basePrice <= 300),   // cheap sabotage
    ...PERSONAL_CURSES,                                    // all curses (1x weight)
    ...LOCATION_HEXES,                                     // all location hexes
  ];

  if (backfired) {
    // Backfired rituals apply the curse to the caster, so the hex MUST have an effect field.
    // Location hexes don't have effects — filter them out.
    const effectPool = allPool.filter(h => h.effect != null);
    const hex = effectPool[Math.floor(Math.random() * effectPool.length)];
    return { hex, backfired };
  }

  // Success: any hex type is fine (player gets a scroll, not an instant effect)
  const hex = allPool[Math.floor(Math.random() * allPool.length)];
  return { hex, backfired };
}

/** Graveyard curse reflection: 35% reflect, 25% remove, 40% fail */
export function rollCurseReflection(): 'reflect' | 'remove' | 'fail' {
  const roll = Math.random();
  if (roll < 0.35) return 'reflect';
  if (roll < 0.60) return 'remove';
  return 'fail';
}
