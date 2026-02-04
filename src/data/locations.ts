import type { Location } from '@/types/game.types';

export const LOCATIONS: Location[] = [
  // Top row (left to right)
  {
    id: 'noble-heights',
    name: 'Noble Heights',
    description: 'Luxury housing for the wealthy. Safe and prestigious living.',
    position: { top: '0%', left: '0%', width: '12%', height: '30%' },
    actions: ['relax', 'view-housing'],
  },
  {
    id: 'landlord',
    name: "Landlord's Office",
    description: 'Pay rent, manage housing contracts, or upgrade your dwelling.',
    position: { top: '0%', left: '13%', width: '13%', height: '18%' },
    actions: ['pay-rent', 'change-housing'],
  },
  {
    id: 'slums',
    name: 'The Slums',
    description: 'Cheap housing but beware of thieves. Shadowfingers are always watching.',
    position: { top: '0%', left: '27%', width: '20%', height: '18%' },
    actions: ['relax', 'view-housing'],
  },
  {
    id: 'fence',
    name: 'The Fence',
    description: 'Pawn shop and gambling den. Sell items or try your luck.',
    position: { top: '0%', left: '48%', width: '12%', height: '18%' },
    actions: ['pawn-items', 'gamble', 'buy-used'],
  },
  {
    id: 'general-store',
    name: 'General Store',
    description: 'Food, supplies, and everyday necessities.',
    position: { top: '0%', left: '61%', width: '13%', height: '18%' },
    actions: ['buy-food', 'buy-supplies'],
  },
  {
    id: 'shadow-market',
    name: 'Shadow Market',
    description: 'Black market goods. Fresh food, lottery tickets, and newspapers.',
    position: { top: '0%', left: '75%', width: '25%', height: '18%' },
    actions: ['buy-cheap-food', 'lottery', 'read-newspaper'],
  },
  
  // Right side (top to bottom)
  {
    id: 'rusty-tankard',
    name: 'The Rusty Tankard',
    description: 'Local tavern. Find food, drink, and socialize.',
    position: { top: '19%', left: '85%', width: '15%', height: '22%' },
    actions: ['eat', 'drink', 'socialize'],
  },
  {
    id: 'armory',
    name: 'The Armory',
    description: 'Clothing, weapons, and armor. Essential for any adventurer.',
    position: { top: '42%', left: '85%', width: '15%', height: '23%' },
    actions: ['buy-clothing', 'buy-uniform', 'buy-weapons'],
  },
  
  // Bottom row (right to left)
  {
    id: 'enchanter',
    name: "Enchanter's Workshop",
    description: 'Magical appliances and enchantments. Expensive but useful.',
    position: { top: '66%', left: '82%', width: '18%', height: '34%' },
    actions: ['buy-magic-items', 'enchant'],
  },
  {
    id: 'academy',
    name: 'The Academy',
    description: 'Education in Fighter, Mage, Priest, or Business paths.',
    position: { top: '66%', left: '48%', width: '20%', height: '34%' },
    actions: ['enroll', 'study', 'view-degrees'],
  },
  {
    id: 'guild-hall',
    name: 'Guild Hall',
    description: 'Find work, view jobs, and advance your career.',
    position: { top: '66%', left: '27%', width: '20%', height: '34%' },
    actions: ['view-jobs', 'work', 'take-quest'],
  },
  {
    id: 'forge',
    name: 'The Forge',
    description: 'Industrial work. Hard labor but steady pay.',
    position: { top: '66%', left: '0%', width: '13%', height: '34%' },
    actions: ['work-forge'],
  },
  
  // Left side (bottom to top)
  {
    id: 'bank',
    name: 'Guildholm Bank',
    description: 'Savings accounts, loans, and investments.',
    position: { top: '30%', left: '0%', width: '12%', height: '20%' },
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
