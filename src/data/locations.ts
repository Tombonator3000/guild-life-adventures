import type { Location, ZoneConfig, LocationId } from '@/types/game.types';

// Jones-style board path - locations form a ring that players travel around
// The path goes clockwise from top-left around the board
// Full lap around the board costs approximately 10-14 Hours
export const BOARD_PATH: LocationId[] = [
  'noble-heights',    // Top left
  'general-store',    // Left side (below noble-heights)
  'bank',             // Left side (below general-store)
  'forge',            // Bottom left
  'guild-hall',       // Bottom
  'cave',             // Bottom center
  'academy',          // Bottom
  'enchanter',        // Bottom right
  'armory',           // Right side
  'rusty-tankard',    // Right side (above armory)
  'shadow-market',    // Top right
  'fence',            // Top
  'slums',            // Top center
  'landlord',         // Top (between slums and noble-heights)
];

// Get the index of a location in the board path
export const getPathIndex = (locationId: LocationId): number => {
  return BOARD_PATH.indexOf(locationId);
};

// Calculate movement cost between two locations (Jones-style)
// Each step along the path costs 1 Hour
// Players can move in either direction and take the shortest route
export const calculatePathDistance = (from: LocationId, to: LocationId): number => {
  if (from === to) return 0;

  const fromIndex = getPathIndex(from);
  const toIndex = getPathIndex(to);

  if (fromIndex === -1 || toIndex === -1) return 0;

  const pathLength = BOARD_PATH.length;

  // Calculate distance in both directions
  const clockwise = (toIndex - fromIndex + pathLength) % pathLength;
  const counterClockwise = (fromIndex - toIndex + pathLength) % pathLength;

  // Return the shorter distance
  return Math.min(clockwise, counterClockwise);
};

// Get the path from one location to another (shortest route)
export const getPath = (from: LocationId, to: LocationId): LocationId[] => {
  if (from === to) return [from];

  const fromIndex = getPathIndex(from);
  const toIndex = getPathIndex(to);

  if (fromIndex === -1 || toIndex === -1) return [from];

  const pathLength = BOARD_PATH.length;
  const clockwise = (toIndex - fromIndex + pathLength) % pathLength;
  const counterClockwise = (fromIndex - toIndex + pathLength) % pathLength;

  const path: LocationId[] = [from];

  if (clockwise <= counterClockwise) {
    // Go clockwise
    for (let i = 1; i <= clockwise; i++) {
      path.push(BOARD_PATH[(fromIndex + i) % pathLength]);
    }
  } else {
    // Go counter-clockwise
    for (let i = 1; i <= counterClockwise; i++) {
      path.push(BOARD_PATH[(fromIndex - i + pathLength) % pathLength]);
    }
  }

  return path;
};

// Zone configurations with precise coordinates matching the game board image
// These can be edited to fine-tune zone positions
// Coordinates are percentages relative to the board container
export const ZONE_CONFIGS: ZoneConfig[] = [
  { id: 'noble-heights', x: 10.6, y: 0.3, width: 15.2, height: 30.2 },
  { id: 'landlord', x: 30.9, y: 2.5, width: 9.9, height: 18.9 },
  { id: 'slums', x: 41.9, y: 1.1, width: 18.2, height: 21.2 },
  { id: 'fence', x: 61.1, y: 0.0, width: 13.1, height: 20.6 },
  { id: 'general-store', x: 11.0, y: 35.9, width: 15.2, height: 18.9 },
  { id: 'shadow-market', x: 74.7, y: 0.8, width: 14.9, height: 18.8 },
  { id: 'rusty-tankard', x: 74.9, y: 20.9, width: 14.4, height: 19.6 },
  { id: 'armory', x: 74.9, y: 41.0, width: 14.3, height: 22.7 },
  { id: 'forge', x: 11.9, y: 74.3, width: 13.3, height: 25.2 },
  { id: 'guild-hall', x: 26.9, y: 77.0, width: 14.3, height: 23.0 },
  { id: 'cave', x: 45.0, y: 78.0, width: 10.0, height: 22.0 },
  { id: 'academy', x: 58.9, y: 77.0, width: 14.8, height: 22.8 },
  { id: 'enchanter', x: 74.6, y: 65.0, width: 15.0, height: 35.0 },
  { id: 'bank', x: 10.9, y: 55.8, width: 14.6, height: 17.0 },
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

// Jones-style movement cost: Each step along the path costs 1 Hour
export const getMovementCost = (from: string, to: string): number => {
  return calculatePathDistance(from as LocationId, to as LocationId);
};
