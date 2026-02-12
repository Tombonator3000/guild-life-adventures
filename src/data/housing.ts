// Guild Life - Housing System
import type { HousingTier } from '@/types/game.types';

export interface Housing {
  tier: HousingTier;
  name: string;
  description: string;
  weeklyRent: number;
  happinessBonus: number;
  theftRisk: number; // 0-100 chance per week
  relaxationRate: number; // Hours to restore 10% happiness
}

export const HOUSING_DATA: Record<HousingTier, Housing> = {
  homeless: {
    tier: 'homeless',
    name: 'Homeless',
    description: 'Sleeping on the streets. Free accommodation with complimentary rain, crime, and existential dread.',
    weeklyRent: 0,
    happinessBonus: -3,
    theftRisk: 50,
    relaxationRate: 0, // Cannot relax while homeless
  },
  slums: {
    tier: 'slums',
    name: 'The Slums',
    description: 'Cheap housing in a rough neighborhood. The walls are thin, the neighbors are loud, and Shadowfingers treats your door as a suggestion.',
    weeklyRent: 75,
    happinessBonus: 0,
    theftRisk: 25,
    relaxationRate: 8,
  },
  noble: {
    tier: 'noble',
    name: 'Noble Heights',
    description: 'Luxury living for the wealthy. So safe and prestigious that you\'ll feel guilty. But not guilty enough to move back to the Slums.',
    weeklyRent: 120,
    happinessBonus: 3,
    theftRisk: 0,
    relaxationRate: 3, // Increased from 2 to prevent happiness spam
  },
};

export const HOUSING_TIERS: HousingTier[] = ['homeless', 'slums', 'noble'];

export const getHousing = (tier: HousingTier): Housing => HOUSING_DATA[tier];

