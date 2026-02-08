// Guild Life - Items and Shopping Data
import type { ApplianceSource, EquipmentSlot, EquipmentStats } from '@/types/game.types';

export type ItemCategory = 'food' | 'clothing' | 'appliance' | 'luxury' | 'weapon' | 'armor' | 'shield' | 'magic' | 'education';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  basePrice: number;
  effect?: {
    type: 'happiness' | 'health' | 'clothing' | 'food' | 'relaxation';
    value: number;
  };
  description: string;
  isDurable?: boolean; // If true, can be stored at apartment and potentially stolen
  isUnstealable?: boolean; // If true, cannot be stolen by Shadowfingers
  isAppliance?: boolean; // If true, can break and require repair
  happinessOnPurchase?: number; // Happiness bonus when purchased (first time only)
  happinessOnPurchaseMarket?: number; // Lower happiness bonus when bought from market/pawn
  givesPerTurnBonus?: boolean; // True for items like microwave/stove that give +1/turn
  canGenerateIncome?: boolean; // True for computer - random income chance
  // Fresh food for Preservation Box storage
  isFreshFood?: boolean;     // True for items that store in Preservation Box
  freshFoodUnits?: number;   // Number of fresh food units this item provides
  // Lottery and ticket types
  isLotteryTicket?: boolean; // True for lottery tickets (weekly drawing)
  isTicket?: boolean;        // True for weekend event tickets
  ticketType?: string;       // Weekend ticket type (jousting, theatre, bard-concert)
  // Combat equipment stats
  equipSlot?: EquipmentSlot; // Which slot this equips to
  equipStats?: EquipmentStats; // Combat stats when equipped
  requiresFloorCleared?: number; // Dungeon floor that must be cleared to purchase
}

// Appliance data for Jones-style appliances (Socket City = Enchanter's Workshop)
export interface Appliance {
  id: string;
  name: string;
  enchanterPrice: number; // Socket City equivalent price
  marketPrice?: number; // Z-Mart equivalent price (undefined = not sold there)
  happinessEnchanter: number; // Happiness bonus from Enchanter
  happinessMarket: number; // Happiness bonus from Market/Pawn
  description: string;
  givesPerTurnBonus?: boolean;
  canGenerateIncome?: boolean;
}

// Jones-style appliances translated to fantasy
export const APPLIANCES: Appliance[] = [
  {
    id: 'scrying-mirror',
    name: 'Scrying Mirror',
    enchanterPrice: 525,
    marketPrice: 450,
    happinessEnchanter: 2,
    happinessMarket: 1,
    description: 'A magical mirror that shows distant places and events. Entertainment for the home.',
  },
  {
    id: 'simple-scrying-glass',
    name: 'Simple Scrying Glass',
    enchanterPrice: 0, // Not sold at enchanter
    marketPrice: 220,
    happinessEnchanter: 0,
    happinessMarket: 1,
    description: 'A basic enchanted glass. Shows fuzzy images but works.',
  },
  {
    id: 'memory-crystal',
    name: 'Memory Crystal',
    enchanterPrice: 333,
    marketPrice: 250,
    happinessEnchanter: 2,
    happinessMarket: 1,
    description: 'Stores and replays magical recordings. Like having your own theater.',
  },
  {
    id: 'music-box',
    name: 'Enchanted Music Box',
    enchanterPrice: 325,
    marketPrice: 350, // Cheaper at enchanter in Jones
    happinessEnchanter: 2,
    happinessMarket: 1,
    description: 'A magical music box that plays soothing melodies endlessly.',
  },
  {
    id: 'cooking-fire',
    name: 'Eternal Cooking Fire',
    enchanterPrice: 276,
    marketPrice: 200,
    happinessEnchanter: 1,
    happinessMarket: 1,
    description: 'A magical flame for cooking. Provides comfort each day.',
    givesPerTurnBonus: true,
  },
  {
    id: 'preservation-box',
    name: 'Preservation Box',
    enchanterPrice: 876,
    marketPrice: 650,
    happinessEnchanter: 2,
    happinessMarket: 1,
    description: 'Keeps food fresh indefinitely with preservation magic.',
  },
  {
    id: 'arcane-tome',
    name: 'Arcane Tome',
    enchanterPrice: 1599,
    marketPrice: undefined, // Not sold at market
    happinessEnchanter: 3,
    happinessMarket: 0,
    description: 'A powerful magical book that can generate income through arcane knowledge.',
    canGenerateIncome: true,
  },
  {
    id: 'frost-chest',
    name: 'Frost Chest',
    enchanterPrice: 1200,
    marketPrice: 900,
    happinessEnchanter: 1,
    happinessMarket: 1,
    description: 'Doubles food storage to 12 units. Requires Preservation Box.',
  },
];

// Get appliance by ID
export const getAppliance = (id: string): Appliance | undefined => {
  return APPLIANCES.find(a => a.id === id);
};

// Get appliances available at Enchanter (Socket City)
export const getEnchanterAppliances = (): Appliance[] => {
  return APPLIANCES.filter(a => a.enchanterPrice > 0);
};

// Get appliances available at Market (Z-Mart)
export const getMarketAppliances = (): Appliance[] => {
  return APPLIANCES.filter(a => a.marketPrice !== undefined && a.marketPrice > 0);
};

// Calculate repair cost for a broken appliance (Jones-style: 1/20 to 1/4 of original price)
export const calculateRepairCost = (originalPrice: number): number => {
  const minCost = Math.floor(originalPrice / 20); // 5% minimum
  const maxCost = Math.floor(originalPrice / 4);  // 25% maximum
  return Math.floor(Math.random() * (maxCost - minCost + 1)) + minCost;
};

// Check if an appliance breaks this turn (Jones-style)
// Only triggers if player has >500 gold
export const checkApplianceBreakage = (
  source: ApplianceSource,
  playerGold: number
): boolean => {
  if (playerGold <= 500) return false;

  const breakChance = source === 'enchanter' ? 1 / 51 : 1 / 36;
  return Math.random() < breakChance;
};

// Get pawn value for an item (40% of original price)
export const getPawnValue = (originalPrice: number, economyModifier: number): number => {
  return Math.floor(originalPrice * 0.4 * economyModifier);
};

// Get redeem price for a pawned item (50% of original price)
export const getRedeemPrice = (originalPrice: number): number => {
  return Math.floor(originalPrice * 0.5);
};

// Get sale price for items on sale at pawn shop (50% of original price)
export const getPawnSalePrice = (originalPrice: number): number => {
  return Math.floor(originalPrice * 0.5);
};

// General Store items (Z-Mart equivalent)
// Food prices increased to be a meaningful gold sink (was too cheap before)
export const GENERAL_STORE_ITEMS: Item[] = [
  // Food items - prices increased so food is a real expense
  {
    id: 'bread',
    name: 'Loaf of Bread',
    category: 'food',
    basePrice: 8,
    effect: { type: 'food', value: 10 },
    description: 'Basic sustenance. Keeps hunger at bay.',
  },
  {
    id: 'cheese',
    name: 'Wheel of Cheese',
    category: 'food',
    basePrice: 15,
    effect: { type: 'food', value: 15 },
    description: 'Aged cheese from local dairies.',
  },
  {
    id: 'meat',
    name: 'Salted Meat',
    category: 'food',
    basePrice: 25,
    effect: { type: 'food', value: 25 },
    description: 'Preserved meat that lasts for weeks.',
  },
  {
    id: 'provisions',
    name: 'Week of Provisions',
    category: 'food',
    basePrice: 50,
    effect: { type: 'food', value: 50 },
    description: 'Enough food for a full week.',
  },
  {
    id: 'feast',
    name: 'Feast Supplies',
    category: 'food',
    basePrice: 85,
    effect: { type: 'food', value: 100 },
    description: 'Enough to throw a small party!',
  },
  // Fresh Food - requires Preservation Box to store (Jones-style Refrigerator food)
  {
    id: 'fresh-vegetables',
    name: 'Fresh Vegetables',
    category: 'food',
    basePrice: 12,
    description: 'Fresh produce. Stores 2 units in Preservation Box.',
    isFreshFood: true,
    freshFoodUnits: 2,
  },
  {
    id: 'fresh-meat',
    name: 'Fresh Meat',
    category: 'food',
    basePrice: 20,
    description: 'Quality fresh meat. Stores 3 units in Preservation Box.',
    isFreshFood: true,
    freshFoodUnits: 3,
  },
  {
    id: 'fresh-provisions',
    name: 'Fresh Provisions Bundle',
    category: 'food',
    basePrice: 35,
    description: 'A full bundle of fresh food. Stores 6 units in Preservation Box.',
    isFreshFood: true,
    freshFoodUnits: 6,
  },
  // Durable Appliances - happiness reduced so they're comfort items, not happiness farms
  {
    id: 'candles',
    name: 'Bundle of Candles',
    category: 'appliance',
    basePrice: 12,
    effect: { type: 'happiness', value: 1 },
    description: 'Light up your dwelling.',
    isDurable: true,
  },
  {
    id: 'blanket',
    name: 'Wool Blanket',
    category: 'appliance',
    basePrice: 30,
    effect: { type: 'happiness', value: 2 },
    description: 'Stay warm on cold nights.',
    isDurable: true,
  },
  {
    id: 'stereo',
    name: 'Music Box',
    category: 'appliance',
    basePrice: 75,
    effect: { type: 'relaxation', value: 5 },
    description: 'A magical music box that plays soothing melodies.',
    isDurable: true,
  },
  {
    id: 'furniture',
    name: 'Quality Furniture',
    category: 'appliance',
    basePrice: 150,
    effect: { type: 'relaxation', value: 10 },
    description: 'Comfortable chairs and tables for your dwelling.',
    isDurable: true,
  },
];

// Shadow Market items (Black's Market equivalent)
export const SHADOW_MARKET_ITEMS: Item[] = [
  {
    id: 'mystery-meat',
    name: 'Mystery Meat',
    category: 'food',
    basePrice: 6,
    effect: { type: 'food', value: 10 },
    description: 'Do not ask where this came from.',
  },
  {
    id: 'stolen-goods',
    name: 'Stolen Goods',
    category: 'luxury',
    basePrice: 30,
    effect: { type: 'happiness', value: 3 },
    description: 'Fell off a merchant cart, surely.',
  },
  {
    id: 'lottery-ticket',
    name: "Fortune's Wheel Ticket",
    category: 'luxury',
    basePrice: 10,
    description: "Weekly lottery drawing. More tickets = better odds! Grand prize: 5,000g.",
    isLotteryTicket: true,
  },
  {
    id: 'black-market-intel',
    name: 'Market Intel',
    category: 'luxury',
    basePrice: 50,
    effect: { type: 'happiness', value: 5 },
    description: 'Insider trade secrets. Knowledge is power. +5 Happiness.',
  },
  // Weekend event tickets
  {
    id: 'jousting-ticket',
    name: 'Jousting Tournament Ticket',
    category: 'luxury',
    basePrice: 25,
    description: 'Attend the jousting tournament this weekend! +8 Happiness.',
    isTicket: true,
    ticketType: 'jousting',
  },
  {
    id: 'theatre-ticket',
    name: 'Theatre Performance Ticket',
    category: 'luxury',
    basePrice: 40,
    description: 'See a theatrical performance this weekend! +10 Happiness.',
    isTicket: true,
    ticketType: 'theatre',
  },
  {
    id: 'bard-concert-ticket',
    name: 'Bard Concert Ticket',
    category: 'luxury',
    basePrice: 50,
    description: 'Attend a grand bard concert this weekend! +12 Happiness.',
    isTicket: true,
    ticketType: 'bard-concert',
  },
];

// Armory items (QT Clothing equivalent)
export const ARMORY_ITEMS: Item[] = [
  // Clothing
  {
    id: 'peasant-garb',
    name: 'Peasant Garb',
    category: 'clothing',
    basePrice: 25,
    effect: { type: 'clothing', value: 50 },
    description: 'Simple clothes for simple folk.',
  },
  {
    id: 'common-clothes',
    name: 'Common Clothes',
    category: 'clothing',
    basePrice: 50,
    effect: { type: 'clothing', value: 75 },
    description: 'Respectable attire for everyday work.',
  },
  {
    id: 'fine-clothes',
    name: 'Fine Clothes',
    category: 'clothing',
    basePrice: 100,
    effect: { type: 'clothing', value: 100 },
    description: 'Quality garments for professionals.',
  },
  {
    id: 'noble-attire',
    name: 'Noble Attire',
    category: 'clothing',
    basePrice: 250,
    effect: { type: 'clothing', value: 100 },
    description: 'Luxurious clothing fit for nobility.',
  },
  {
    id: 'guild-uniform',
    name: 'Guild Uniform',
    category: 'clothing',
    basePrice: 150,
    effect: { type: 'clothing', value: 100 },
    description: 'Official uniform for guild work.',
  },
  // Weapons - equippable with combat stats
  {
    id: 'dagger',
    name: 'Simple Dagger',
    category: 'weapon',
    basePrice: 35,
    effect: { type: 'happiness', value: 1 },
    description: 'A basic self-defense weapon. +5 Attack.',
    isDurable: true,
    equipSlot: 'weapon',
    equipStats: { attack: 5 },
  },
  {
    id: 'sword',
    name: 'Iron Sword',
    category: 'weapon',
    basePrice: 90,
    effect: { type: 'happiness', value: 2 },
    description: 'A reliable blade for adventurers. +15 Attack.',
    isDurable: true,
    equipSlot: 'weapon',
    equipStats: { attack: 15 },
  },
  {
    id: 'steel-sword',
    name: 'Steel Sword',
    category: 'weapon',
    basePrice: 250,
    effect: { type: 'happiness', value: 3 },
    description: 'A finely forged steel blade. +25 Attack. Requires Floor 2 cleared.',
    isDurable: true,
    equipSlot: 'weapon',
    equipStats: { attack: 25 },
    requiresFloorCleared: 2,
  },
  {
    id: 'enchanted-blade',
    name: 'Enchanted Blade',
    category: 'weapon',
    basePrice: 500,
    effect: { type: 'happiness', value: 5 },
    description: 'A blade imbued with arcane energy. +40 Attack. Requires Floor 3 cleared.',
    isDurable: true,
    equipSlot: 'weapon',
    equipStats: { attack: 40 },
    requiresFloorCleared: 3,
  },
  // Armor - equippable with defense stats
  {
    id: 'leather-armor',
    name: 'Leather Armor',
    category: 'armor',
    basePrice: 75,
    effect: { type: 'happiness', value: 1 },
    description: 'Light protection for dungeon delving. +10 Defense.',
    isDurable: true,
    equipSlot: 'armor',
    equipStats: { defense: 10 },
  },
  {
    id: 'chainmail',
    name: 'Chainmail',
    category: 'armor',
    basePrice: 200,
    effect: { type: 'happiness', value: 2 },
    description: 'Interlocking metal rings. +20 Defense. Requires Floor 2 cleared.',
    isDurable: true,
    equipSlot: 'armor',
    equipStats: { defense: 20 },
    requiresFloorCleared: 2,
  },
  {
    id: 'plate-armor',
    name: 'Plate Armor',
    category: 'armor',
    basePrice: 450,
    effect: { type: 'happiness', value: 3 },
    description: 'Heavy steel plates. +35 Defense. Requires Floor 3 cleared.',
    isDurable: true,
    equipSlot: 'armor',
    equipStats: { defense: 35 },
    requiresFloorCleared: 3,
  },
  {
    id: 'enchanted-plate',
    name: 'Enchanted Plate',
    category: 'armor',
    basePrice: 900,
    effect: { type: 'happiness', value: 5 },
    description: 'Magically reinforced armor. +50 Defense. Requires Floor 4 cleared.',
    isDurable: true,
    equipSlot: 'armor',
    equipStats: { defense: 50 },
    requiresFloorCleared: 4,
  },
  // Shields - equippable with defense + block chance
  {
    id: 'shield',
    name: 'Wooden Shield',
    category: 'shield',
    basePrice: 45,
    effect: { type: 'happiness', value: 1 },
    description: 'Basic protection. +5 Defense, 10% Block.',
    isDurable: true,
    equipSlot: 'shield',
    equipStats: { defense: 5, blockChance: 0.10 },
  },
  {
    id: 'iron-shield',
    name: 'Iron Shield',
    category: 'shield',
    basePrice: 120,
    effect: { type: 'happiness', value: 2 },
    description: 'Sturdy metal shield. +10 Defense, 15% Block.',
    isDurable: true,
    equipSlot: 'shield',
    equipStats: { defense: 10, blockChance: 0.15 },
  },
  {
    id: 'tower-shield',
    name: 'Tower Shield',
    category: 'shield',
    basePrice: 300,
    effect: { type: 'happiness', value: 3 },
    description: 'Massive shield. +15 Defense, 25% Block. Requires Floor 2 cleared.',
    isDurable: true,
    equipSlot: 'shield',
    equipStats: { defense: 15, blockChance: 0.25 },
    requiresFloorCleared: 2,
  },
];

// Enchanter items (Socket City equivalent) - Durable magical items
// Happiness values reduced to prevent easy happiness accumulation
// Enchanter non-appliance items (appliances like Preservation Box, Scrying Mirror
// are managed separately via APPLIANCES array with source tracking & breakage)
export const ENCHANTER_ITEMS: Item[] = [
  {
    id: 'glow-orb',
    name: 'Glow Orb',
    category: 'magic',
    basePrice: 60,
    effect: { type: 'happiness', value: 2 },
    description: 'Magical light source that never dims.',
    isDurable: true,
  },
  {
    id: 'warmth-stone',
    name: 'Stone of Warmth',
    category: 'magic',
    basePrice: 120,
    effect: { type: 'happiness', value: 3 },
    description: 'Keeps your home warm without fire.',
    isDurable: true,
  },
  {
    id: 'healing-potion',
    name: 'Healing Potion',
    category: 'magic',
    basePrice: 75,
    effect: { type: 'health', value: 50 },
    description: 'Restores health instantly.',
    // Not durable - consumable
  },
];

// Tavern food items (Monolith Burger equivalent)
// Tavern food is slightly cheaper than General Store but less efficient
export const TAVERN_ITEMS: Item[] = [
  {
    id: 'ale',
    name: 'Mug of Ale',
    category: 'food',
    basePrice: 5,
    effect: { type: 'happiness', value: 1 },
    description: 'A refreshing drink after hard work.',
  },
  {
    id: 'stew',
    name: 'Hearty Stew',
    category: 'food',
    basePrice: 12,
    effect: { type: 'food', value: 15 },
    description: 'Hot, filling, and delicious.',
  },
  {
    id: 'roast',
    name: 'Roast Dinner',
    category: 'food',
    basePrice: 22,
    effect: { type: 'food', value: 30 },
    description: 'A proper meal with all the trimmings.',
  },
  {
    id: 'feast',
    name: 'Tavern Feast',
    category: 'food',
    basePrice: 45,
    effect: { type: 'food', value: 50 },
    description: 'The best the Rusty Tankard has to offer!',
  },
];

// Academy items - Educational durables that CANNOT be stolen by Shadowfingers
export const ACADEMY_ITEMS: Item[] = [
  {
    id: 'encyclopedia',
    name: 'Encyclopedia',
    category: 'education',
    basePrice: 200,
    effect: { type: 'happiness', value: 2 },
    description: 'A comprehensive book of knowledge. Helps with studies.',
    isDurable: true,
    isUnstealable: true, // Cannot be stolen by Shadowfingers
  },
  {
    id: 'dictionary',
    name: 'Dictionary',
    category: 'education',
    basePrice: 100,
    effect: { type: 'happiness', value: 1 },
    description: 'Contains definitions of every word. Essential for scholars.',
    isDurable: true,
    isUnstealable: true, // Cannot be stolen by Shadowfingers
  },
  {
    id: 'atlas',
    name: 'Atlas',
    category: 'education',
    basePrice: 150,
    effect: { type: 'happiness', value: 1 },
    description: 'Maps of the known world. Aids in quest planning.',
    isDurable: true,
    isUnstealable: true, // Cannot be stolen by Shadowfingers
  },
];

// Rare dungeon drop items (obtained from dungeon bosses)
export const RARE_DROP_ITEMS: Item[] = [
  {
    id: 'dragon-scale-shield',
    name: 'Dragon Scale Shield',
    category: 'shield',
    basePrice: 0,
    description: 'A shield forged from dragon scales. +20 Defense, +20% Block.',
    isDurable: true,
    isUnstealable: true,
    equipSlot: 'shield',
    equipStats: { defense: 20, blockChance: 0.20 },
  },
];

// All items combined
export const ALL_ITEMS: Item[] = [
  ...GENERAL_STORE_ITEMS,
  ...SHADOW_MARKET_ITEMS,
  ...ARMORY_ITEMS,
  ...ENCHANTER_ITEMS,
  ...TAVERN_ITEMS,
  ...ACADEMY_ITEMS,
  ...RARE_DROP_ITEMS,
];

// Get all durable items that can be stolen
export const STEALABLE_DURABLES: Item[] = ALL_ITEMS.filter(
  item => item.isDurable && !item.isUnstealable
);

// Get all durable item types (for robbery logic)
export const DURABLE_ITEM_TYPES: string[] = [...new Set(
  ALL_ITEMS.filter(item => item.isDurable).map(item => item.id)
)];

export const getItem = (id: string): Item | undefined => {
  return ALL_ITEMS.find(item => item.id === id);
};

export const getItemPrice = (item: Item, priceModifier: number): number => {
  return Math.round(item.basePrice * priceModifier);
};

// Check if an item can be stolen by Shadowfingers
export const canBeStolen = (itemId: string): boolean => {
  const item = getItem(itemId);
  return item ? (item.isDurable === true && item.isUnstealable !== true) : false;
};

// Get all equippable items by slot
export const getEquipmentBySlot = (slot: EquipmentSlot): Item[] => {
  return ALL_ITEMS.filter(item => item.equipSlot === slot);
};

// Get combat stats for an equipped item
export const getEquipStats = (itemId: string): EquipmentStats | undefined => {
  const item = getItem(itemId);
  return item?.equipStats;
};

// Calculate total combat stats for a player's equipment
export const calculateCombatStats = (
  equippedWeapon: string | null,
  equippedArmor: string | null,
  equippedShield: string | null,
): { attack: number; defense: number; blockChance: number } => {
  let attack = 0;
  let defense = 0;
  let blockChance = 0;

  if (equippedWeapon) {
    const stats = getEquipStats(equippedWeapon);
    if (stats) attack += stats.attack || 0;
  }
  if (equippedArmor) {
    const stats = getEquipStats(equippedArmor);
    if (stats) defense += stats.defense || 0;
  }
  if (equippedShield) {
    const stats = getEquipStats(equippedShield);
    if (stats) {
      defense += stats.defense || 0;
      blockChance = stats.blockChance || 0;
    }
  }

  return { attack, defense, blockChance };
};
