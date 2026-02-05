import type { Location, ZoneConfig } from '@/types/game.types';

// Zone configurations with precise coordinates matching the game board image
// These can be edited to fine-tune zone positions
// Coordinates are percentages relative to the board container
export const ZONE_CONFIGS: ZoneConfig[] = [
  // Top row (left to right)
  { id: 'noble-heights',   x: 0,    y: 0,    width: 10,  height: 28 },
  { id: 'landlord',        x: 10,   y: 0,    width: 10,  height: 17 },
  { id: 'slums',           x: 20,   y: 0,    width: 11,  height: 17 },
  { id: 'fence',           x: 31,   y: 0,    width: 12,  height: 17 },
  { id: 'general-store',   x: 43,   y: 0,    width: 10,  height: 17 },
  { id: 'shadow-market',   x: 53,   y: 0,    width: 12,  height: 17 },

  // Right side (top to bottom)
  { id: 'rusty-tankard',   x: 85,   y: 17,   width: 15,  height: 23 },
  { id: 'armory',          x: 85,   y: 40,   width: 15,  height: 25 },

  // Bottom row (left to right)
  { id: 'forge',           x: 0,    y: 65,   width: 14,  height: 35 },
  { id: 'guild-hall',      x: 31,   y: 75,   width: 14,  height: 25 },
  { id: 'cave',            x: 45,   y: 78,   width: 10,  height: 22 },
  { id: 'academy',         x: 55,   y: 75,   width: 14,  height: 25 },
  { id: 'enchanter',       x: 85,   y: 65,   width: 15,  height: 35 },

  // Left side (top to bottom)
  { id: 'bank',            x: 0,    y: 28,   width: 10,  height: 22 },
];

// Convert zone config to Location format for backward compatibility
function zoneToPosition(zone: ZoneConfig): Location['position'] {
  return {
    top: `${zone.y}%`,
    left: `${zone.x}%`,
    width: `${zone.width}%`,
    height: `${zone.height}%`,
  };
}

export const LOCATIONS: Location[] = [
  // Top row (left to right)
  {
    id: 'noble-heights',
    name: 'Noble Heights',
    description: 'Luxury housing for the wealthy. Safe and prestigious living.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'noble-heights')!),
    actions: ['relax', 'view-housing'],
  },
  {
    id: 'landlord',
    name: "Landlord's Office",
    description: 'Pay rent, manage housing contracts, or upgrade your dwelling.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'landlord')!),
    actions: ['pay-rent', 'change-housing'],
  },
  {
    id: 'slums',
    name: 'The Slums',
    description: 'Cheap housing but beware of thieves. Shadowfingers are always watching.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'slums')!),
    actions: ['relax', 'view-housing'],
  },
  {
    id: 'fence',
    name: 'The Fence',
    description: 'Pawn shop and gambling den. Sell items or try your luck.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'fence')!),
    actions: ['pawn-items', 'gamble', 'buy-used'],
  },
  {
    id: 'general-store',
    name: 'General Store',
    description: 'Food, supplies, and everyday necessities.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'general-store')!),
    actions: ['buy-food', 'buy-supplies'],
  },
  {
    id: 'shadow-market',
    name: 'Shadow Market',
    description: 'Black market goods. Fresh food, lottery tickets, and newspapers.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'shadow-market')!),
    actions: ['buy-cheap-food', 'lottery', 'read-newspaper'],
  },

  // Right side (top to bottom)
  {
    id: 'rusty-tankard',
    name: 'The Rusty Tankard',
    description: 'Local tavern. Find food, drink, and socialize.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'rusty-tankard')!),
    actions: ['eat', 'drink', 'socialize'],
  },
  {
    id: 'armory',
    name: 'The Armory',
    description: 'Clothing, weapons, and armor. Essential for any adventurer.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'armory')!),
    actions: ['buy-clothing', 'buy-uniform', 'buy-weapons'],
  },

  // Bottom row (left to right)
  {
    id: 'forge',
    name: 'The Forge',
    description: 'Industrial work. Hard labor but steady pay.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'forge')!),
    actions: ['work-forge'],
  },
  {
    id: 'guild-hall',
    name: 'Guild Hall',
    description: 'Find work, view jobs, and advance your career.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'guild-hall')!),
    actions: ['view-jobs', 'work', 'take-quest'],
  },
  {
    id: 'cave',
    name: 'The Cave',
    description: 'A mysterious cave entrance. Explore for treasure... or danger.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'cave')!),
    actions: ['explore', 'rest'],
  },
  {
    id: 'academy',
    name: 'The Academy',
    description: 'Education in Fighter, Mage, Priest, or Business paths.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'academy')!),
    actions: ['enroll', 'study', 'view-degrees'],
  },
  {
    id: 'enchanter',
    name: "Enchanter's Workshop",
    description: 'Magical appliances and enchantments. Expensive but useful.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'enchanter')!),
    actions: ['buy-magic-items', 'enchant'],
  },

  // Left side
  {
    id: 'bank',
    name: 'Guildholm Bank',
    description: 'Savings accounts, loans, and investments.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'bank')!),
    actions: ['deposit', 'withdraw', 'invest', 'loan'],
  },
];

export const getLocation = (id: string): Location | undefined => 
  LOCATIONS.find(loc => loc.id === id);

export const getMovementCost = (from: string, to: string): number => {
  // Simple distance calculation based on position in array
  const fromIndex = LOCATIONS.findIndex(loc => loc.id === from);
  const toIndex = LOCATIONS.findIndex(loc => loc.id === to);
  
  if (fromIndex === -1 || toIndex === -1) return 0;
  if (fromIndex === toIndex) return 0;
  
  // Each location hop costs 2 hours
  const distance = Math.abs(fromIndex - toIndex);
  const wrappedDistance = Math.min(distance, LOCATIONS.length - distance);
  
  return wrappedDistance * 2;
};
