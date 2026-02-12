import type { Location, ZoneConfig, LocationId } from '@/types/game.types';

// Jones-style board path - locations form a ring that players travel around
// The path goes clockwise from top-left around the board
// Full lap around the board costs approximately 10-14 Hours
export const BOARD_PATH: LocationId[] = [
  'noble-heights',    // Top left
  'graveyard',        // Below noble-heights
  'general-store',    // Left side (below graveyard)
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

// Direction choice: get both clockwise and counter-clockwise paths (Jones-style)
export type MovementDirection = 'clockwise' | 'counter-clockwise';

export interface DirectionOption {
  direction: MovementDirection;
  path: LocationId[];
  distance: number;
  isShortest: boolean;
}

// Get both directional paths between two locations
export const getBothPaths = (from: LocationId, to: LocationId): DirectionOption[] => {
  if (from === to) return [];

  const fromIndex = getPathIndex(from);
  const toIndex = getPathIndex(to);
  if (fromIndex === -1 || toIndex === -1) return [];

  const pathLength = BOARD_PATH.length;
  const cwDist = (toIndex - fromIndex + pathLength) % pathLength;
  const ccwDist = (fromIndex - toIndex + pathLength) % pathLength;

  // Build clockwise path
  const cwPath: LocationId[] = [from];
  for (let i = 1; i <= cwDist; i++) {
    cwPath.push(BOARD_PATH[(fromIndex + i) % pathLength]);
  }

  // Build counter-clockwise path
  const ccwPath: LocationId[] = [from];
  for (let i = 1; i <= ccwDist; i++) {
    ccwPath.push(BOARD_PATH[(fromIndex - i + pathLength) % pathLength]);
  }

  return [
    { direction: 'clockwise', path: cwPath, distance: cwDist, isShortest: cwDist <= ccwDist },
    { direction: 'counter-clockwise', path: ccwPath, distance: ccwDist, isShortest: ccwDist <= cwDist },
  ];
};

// Get path in a specific direction
export const getDirectedPath = (from: LocationId, to: LocationId, direction: MovementDirection): LocationId[] => {
  const options = getBothPaths(from, to);
  const chosen = options.find(o => o.direction === direction);
  return chosen ? chosen.path : getPath(from, to);
};

// Zone configurations with precise coordinates matching the game board image
// These can be edited to fine-tune zone positions
// Coordinates are percentages relative to the board container
export const ZONE_CONFIGS: ZoneConfig[] = [
  { id: 'noble-heights', x: 1.1, y: 0.0, width: 19.3, height: 24.5 },
  { id: 'landlord', x: 25.4, y: 1.6, width: 12.8, height: 18.7 },
  { id: 'slums', x: 41.1, y: 0.7, width: 20.2, height: 19.7 },
  { id: 'fence', x: 63.3, y: 0.9, width: 14.5, height: 18.9 },
  { id: 'general-store', x: 6.4, y: 35.3, width: 14.4, height: 18.0 },
  { id: 'shadow-market', x: 80.1, y: 0.9, width: 18.0, height: 18.9 },
  { id: 'rusty-tankard', x: 81.1, y: 22.3, width: 16.1, height: 18.2 },
  { id: 'armory', x: 80.6, y: 41.9, width: 13.9, height: 18.7 },
  { id: 'forge', x: 4.6, y: 76.7, width: 17.7, height: 15.2 },
  { id: 'guild-hall', x: 23.2, y: 76.3, width: 15.7, height: 16.3 },
  { id: 'cave', x: 41.9, y: 78.8, width: 15.5, height: 14.9 },
  { id: 'academy', x: 60.3, y: 77.8, width: 17.9, height: 16.1 },
  { id: 'enchanter', x: 80.5, y: 67.0, width: 14.4, height: 26.1 },
  { id: 'bank', x: 1.3, y: 55.4, width: 17.9, height: 17.7 },
  { id: 'graveyard', x: 0.0, y: 24.7, width: 5.6, height: 17.0 },
];

// Board aspect ratio for the game board container
// Side panels take 12% each (24% total), leaving 76% of viewport width for the board
// This ratio ensures the board fills available space well on 16:9 screens
// Both GameBoard and ZoneEditor MUST use this same value for zone alignment
export const BOARD_ASPECT_RATIO = `${76 * 16} / ${100 * 9}`; // 1216/900 ≈ 1.351

// Movement paths between adjacent locations
// Each key is "fromId_toId" in clockwise BOARD_PATH order
// Values are arrays of [x, y] waypoints (percentages) between zone centers
// When traveling counter-clockwise, waypoints are reversed automatically
export type MovementWaypoint = [number, number];

export const MOVEMENT_PATHS: Record<string, MovementWaypoint[]> = {
  'noble-heights_general-store': [[5.6, 51.4], [5.6, 51.4]],
  'general-store_bank': [[19.9, 69.5]],
  'bank_forge': [[3.6, 88.8]],
  'forge_guild-hall': [[22.7, 92.8]],
  'guild-hall_cave': [[37.2, 93.3]],
  'cave_academy': [[59.9, 93.4]],
  'academy_enchanter': [[79.5, 94.2]],
  'enchanter_armory': [[97.0, 78.0]],
  'armory_rusty-tankard': [[96.8, 52.1]],
  'rusty-tankard_shadow-market': [[81.8, 33.4], [81.8, 33.4]],
  'shadow-market_fence': [[78.7, 21.0]],
  'fence_slums': [[62.3, 20.1]],
  'slums_landlord': [[40.4, 19.7]],
  'landlord_noble-heights': [[22.2, 20.5]],
  'noble-heights_graveyard': [[13.0, 31.6], [5.1, 38.3], [5.1, 38.3]],
  'graveyard_general-store': [[5.6, 52.6]],
};

// Get the movement path key for two adjacent locations (always clockwise order)
export const getPathKey = (from: LocationId, to: LocationId): { key: string; reversed: boolean } => {
  const fromIdx = getPathIndex(from);
  const toIdx = getPathIndex(to);
  const len = BOARD_PATH.length;

  // Check if going clockwise (from → to is +1 step)
  if ((fromIdx + 1) % len === toIdx) {
    return { key: `${from}_${to}`, reversed: false };
  }
  // Going counter-clockwise (to → from is +1 step)
  if ((toIdx + 1) % len === fromIdx) {
    return { key: `${to}_${from}`, reversed: true };
  }
  // Non-adjacent - shouldn't happen for single steps
  return { key: `${from}_${to}`, reversed: false };
};

// Get waypoints for traveling between two adjacent locations
export const getSegmentWaypoints = (from: LocationId, to: LocationId): MovementWaypoint[] => {
  const { key, reversed } = getPathKey(from, to);
  const waypoints = MOVEMENT_PATHS[key];
  if (!waypoints || waypoints.length === 0) return [];
  return reversed ? [...waypoints].reverse() : waypoints;
};

// Get the full list of animation points for a path (zone centers + intermediate waypoints)
export const getAnimationPoints = (path: LocationId[]): MovementWaypoint[] => {
  if (path.length === 0) return [];

  const points: MovementWaypoint[] = [];

  for (let i = 0; i < path.length; i++) {
    // Add zone center
    const zone = ZONE_CONFIGS.find(z => z.id === path[i]);
    if (zone) {
      points.push([zone.x + zone.width / 2, zone.y + zone.height - 5]);
    }

    // Add waypoints between this zone and the next
    if (i < path.length - 1) {
      const waypoints = getSegmentWaypoints(path[i], path[i + 1]);
      points.push(...waypoints);
    }
  }

  return points;
};

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
    description: 'Luxury housing for the wealthy. Safe, prestigious, and smugly out of reach for most people.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'noble-heights')!),
    actions: ['relax', 'view-housing'],
  },
  {
    id: 'landlord',
    name: "Landlord's Office",
    description: 'Pay rent, manage housing contracts, or upgrade your dwelling. Tomas will be waiting. He\'s always waiting.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'landlord')!),
    actions: ['pay-rent', 'change-housing'],
  },
  {
    id: 'slums',
    name: 'The Slums',
    description: 'Cheap housing in a rough neighborhood. What it lacks in safety it makes up for in... no, it just lacks safety.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'slums')!),
    actions: ['relax', 'view-housing'],
  },
  {
    id: 'fence',
    name: 'The Fence',
    description: 'Pawn shop and gambling den. Where dignity goes to die and loose change goes to multiply. Theoretically.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'fence')!),
    actions: ['pawn-items', 'gamble', 'buy-used'],
  },
  {
    id: 'general-store',
    name: 'General Store',
    description: 'Food, supplies, and everyday necessities. Everything an adventurer needs, except life insurance.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'general-store')!),
    actions: ['buy-food', 'buy-supplies'],
  },
  {
    id: 'graveyard',
    name: 'The Graveyard',
    description: 'A somber cemetery where fallen adventurers are laid to rest. Some of them take it literally and get back up again.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'graveyard')!),
    actions: ['pray', 'mourn', 'resurrect'],
  },
  {
    id: 'shadow-market',
    name: 'Shadow Market',
    description: 'Black market goods. Everything here "fell off a cart." The carts of Guildholm are remarkably clumsy.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'shadow-market')!),
    actions: ['buy-cheap-food', 'lottery', 'read-newspaper'],
  },

  // Right side (top to bottom)
  {
    id: 'rusty-tankard',
    name: 'The Rusty Tankard',
    description: 'Local tavern. Where ale flows freely, stories grow taller, and no one judges your life choices. Much.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'rusty-tankard')!),
    actions: ['eat', 'drink', 'socialize'],
  },
  {
    id: 'armory',
    name: 'The Armory',
    description: 'Clothing, weapons, and armor. Come for the swords, stay because the armor is too heavy to leave in.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'armory')!),
    actions: ['buy-clothing', 'buy-uniform', 'buy-weapons'],
  },

  // Bottom row (left to right)
  {
    id: 'forge',
    name: 'The Forge',
    description: 'Industrial work. Hot, loud, and smells like burnt metal. The pay is steady. So is the sweating.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'forge')!),
    actions: ['work-forge'],
  },
  {
    id: 'guild-hall',
    name: 'Guild Hall',
    description: 'Find work, view jobs, and advance your career. The bulletin board has seen things. Terrible things. Written in terrible handwriting.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'guild-hall')!),
    actions: ['view-jobs', 'work', 'take-quest'],
  },
  {
    id: 'cave',
    name: 'The Cave',
    description: 'A mysterious cave entrance. The treasure-to-danger ratio is not in your favor, statistically speaking.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'cave')!),
    actions: ['explore', 'rest'],
  },
  {
    id: 'academy',
    name: 'The Academy',
    description: 'Education in Fighter, Mage, Priest, or Business paths. Student loans not available, mercifully.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'academy')!),
    actions: ['enroll', 'study', 'view-degrees'],
  },
  {
    id: 'enchanter',
    name: "Enchanter's Workshop",
    description: 'Magical appliances and enchantments. Expensive, occasionally explosive, but genuinely useful.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'enchanter')!),
    actions: ['buy-magic-items', 'enchant'],
  },

  // Left side
  {
    id: 'bank',
    name: 'Guildholm Bank',
    description: 'Savings accounts, loans, and investments. Your gold is in good hands. Well, hands. They\'re hands.',
    position: zoneToPosition(ZONE_CONFIGS.find(z => z.id === 'bank')!),
    actions: ['deposit', 'withdraw', 'invest', 'loan'],
  },
];

export const getLocation = (id: string): Location | undefined =>
  LOCATIONS.find(loc => loc.id === id);

// Movement cost: Each step along the path costs 1 Hour
export const getMovementCost = (from: string, to: string): number => {
  return calculatePathDistance(from as LocationId, to as LocationId);
};
