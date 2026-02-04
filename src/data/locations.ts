import type { Location } from '@/types/game.types';

export const LOCATIONS: Location[] = [
  // Top row (left to right)
  {
    id: 'noble-heights',
    name: 'Noble Heights',
    description: 'Luxury housing for the wealthy. Safe and prestigious living.',
    position: { top: '0%', left: '0%', width: '12%', height: '30%' },
  },
  {
    id: 'landlord',
    name: "Landlord's Office",
    description: 'Pay rent, manage housing contracts, or upgrade your dwelling.',
    position: { top: '0%', left: '13%', width: '13%', height: '18%' },
  },
  {
    id: 'slums',
    name: 'The Slums',
    description: 'Cheap housing but beware of thieves. Shadowfingers are always watching.',
    position: { top: '0%', left: '27%', width: '20%', height: '18%' },
  },
  {
    id: 'fence',
    name: 'The Fence',
    description: 'Pawn shop and gambling den. Sell items or try your luck.',
    position: { top: '0%', left: '48%', width: '12%', height: '18%' },
  },
  {
    id: 'shadow-market',
    name: 'Shadow Market',
    description: 'Black market goods. Illegal but profitable if you dare.',
    position: { top: '0%', left: '75%', width: '25%', height: '18%' },
  },
  
  // Right side (top to bottom)
  {
    id: 'rusty-tankard',
    name: 'The Rusty Tankard',
    description: 'Local tavern. Find food, drink, rumors, and occasional work.',
    position: { top: '19%', left: '85%', width: '15%', height: '22%' },
  },
  {
    id: 'armory',
    name: 'The Armory',
    description: 'Weapons, armor, and clothing. Essential for any adventurer.',
    position: { top: '42%', left: '85%', width: '15%', height: '23%' },
  },
  
  // Bottom row (right to left)
  {
    id: 'enchanter',
    name: "Enchanter's Workshop",
    description: 'Magical items and enchantments. Expensive but powerful.',
    position: { top: '66%', left: '82%', width: '18%', height: '34%' },
  },
  {
    id: 'academy',
    name: 'The Academy',
    description: 'Education in Fighter, Mage, Priest, or Business paths.',
    position: { top: '66%', left: '48%', width: '20%', height: '34%' },
  },
  {
    id: 'guild-hall',
    name: 'Guild Hall',
    description: 'Find work, take quests, and advance your guild rank.',
    position: { top: '66%', left: '27%', width: '20%', height: '34%' },
  },
  {
    id: 'forge',
    name: 'The Forge',
    description: 'Industrial work. Hard labor but steady pay.',
    position: { top: '66%', left: '0%', width: '13%', height: '34%' },
  },
  
  // Left side (bottom to top)
  {
    id: 'bank',
    name: 'Guildholm Bank',
    description: 'Savings accounts and investments. Grow your wealth safely.',
    position: { top: '30%', left: '0%', width: '12%', height: '20%' },
  },
  {
    id: 'general-store',
    name: 'General Store',
    description: 'Food, supplies, and everyday necessities.',
    position: { top: '18%', left: '0%', width: '12%', height: '11%' },
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
