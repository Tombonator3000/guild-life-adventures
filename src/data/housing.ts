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
    description: 'Sleeping on the streets. Dangerous and demoralizing.',
    weeklyRent: 0,
    happinessBonus: -10,
    theftRisk: 50,
    relaxationRate: 0, // Cannot relax while homeless
  },
  slums: {
    tier: 'slums',
    name: 'The Slums',
    description: 'Cheap housing in a rough neighborhood. Beware Shadowfingers.',
    weeklyRent: 75,
    happinessBonus: 0,
    theftRisk: 25,
    relaxationRate: 8,
  },
  modest: {
    tier: 'modest',
    name: 'Modest Dwelling',
    description: 'A comfortable apartment in a decent area.',
    weeklyRent: 200,
    happinessBonus: 3,
    theftRisk: 5,
    relaxationRate: 5,
  },
  noble: {
    tier: 'noble',
    name: 'Noble Heights',
    description: 'Luxury living for the wealthy. Safe and prestigious.',
    weeklyRent: 500,
    happinessBonus: 5,
    theftRisk: 0,
    relaxationRate: 3, // Increased from 2 to prevent happiness spam
  },
};

export const HOUSING_TIERS: HousingTier[] = ['homeless', 'slums', 'modest', 'noble'];

export const getHousing = (tier: HousingTier): Housing => HOUSING_DATA[tier];

export const canAffordHousing = (tier: HousingTier, gold: number): boolean => {
  // Need first month rent plus deposit (2x rent)
  const housing = HOUSING_DATA[tier];
  return gold >= housing.weeklyRent * 8; // 2 months upfront
};

export const getUpgradeOptions = (currentTier: HousingTier): HousingTier[] => {
  const currentIndex = HOUSING_TIERS.indexOf(currentTier);
  return HOUSING_TIERS.slice(currentIndex + 1);
};

export const getDowngradeOptions = (currentTier: HousingTier): HousingTier[] => {
  const currentIndex = HOUSING_TIERS.indexOf(currentTier);
  return HOUSING_TIERS.slice(0, currentIndex);
};
