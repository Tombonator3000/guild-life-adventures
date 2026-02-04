// Guild Life - Jobs Data (based on Jones in the Fast Lane)
import type { EducationPath, GuildRank } from '@/types/game.types';

export interface Job {
  id: string;
  name: string;
  hourlyWage: number;
  hoursPerShift: number;
  requiredEducation?: {
    path: EducationPath;
    level: number;
  };
  requiredClothing: 'none' | 'basic' | 'professional' | 'uniform';
  description: string;
}

// Jobs available at Guild Hall (Employment Office equivalent)
export const JOBS: Job[] = [
  // No education required
  {
    id: 'floor-sweeper',
    name: 'Floor Sweeper',
    hourlyWage: 2,
    hoursPerShift: 8,
    requiredClothing: 'none',
    description: 'Sweep floors at various establishments. Low pay but always available.',
  },
  {
    id: 'stable-hand',
    name: 'Stable Hand',
    hourlyWage: 3,
    hoursPerShift: 8,
    requiredClothing: 'basic',
    description: 'Care for horses and livestock. Honest work for honest pay.',
  },
  {
    id: 'market-porter',
    name: 'Market Porter',
    hourlyWage: 4,
    hoursPerShift: 8,
    requiredClothing: 'basic',
    description: 'Carry goods around the marketplace. Physical but rewarding.',
  },
  
  // Business education
  {
    id: 'shop-clerk',
    name: 'Shop Clerk',
    hourlyWage: 5,
    hoursPerShift: 8,
    requiredEducation: { path: 'business', level: 1 },
    requiredClothing: 'basic',
    description: 'Assist customers at local shops. Requires Trade School training.',
  },
  {
    id: 'merchant-assistant',
    name: 'Merchant Assistant',
    hourlyWage: 8,
    hoursPerShift: 8,
    requiredEducation: { path: 'business', level: 2 },
    requiredClothing: 'professional',
    description: 'Help run a merchant stall. Requires Junior College.',
  },
  {
    id: 'guild-accountant',
    name: 'Guild Accountant',
    hourlyWage: 12,
    hoursPerShift: 8,
    requiredEducation: { path: 'business', level: 3 },
    requiredClothing: 'professional',
    description: 'Manage guild finances. Requires Business Administration.',
  },
  {
    id: 'trade-master',
    name: 'Trade Master',
    hourlyWage: 18,
    hoursPerShift: 8,
    requiredEducation: { path: 'business', level: 4 },
    requiredClothing: 'professional',
    description: 'Oversee all guild trade operations. Requires Management degree.',
  },
  
  // Fighter education
  {
    id: 'city-guard',
    name: 'City Guard',
    hourlyWage: 6,
    hoursPerShift: 10,
    requiredEducation: { path: 'fighter', level: 1 },
    requiredClothing: 'uniform',
    description: 'Patrol the streets of Guildholm. Requires Fighter I training.',
  },
  {
    id: 'caravan-guard',
    name: 'Caravan Guard',
    hourlyWage: 9,
    hoursPerShift: 12,
    requiredEducation: { path: 'fighter', level: 2 },
    requiredClothing: 'uniform',
    description: 'Protect merchant caravans. Requires Fighter II training.',
  },
  {
    id: 'arena-fighter',
    name: 'Arena Fighter',
    hourlyWage: 15,
    hoursPerShift: 6,
    requiredEducation: { path: 'fighter', level: 3 },
    requiredClothing: 'uniform',
    description: 'Fight for glory in the arena. Requires Advanced Combat.',
  },
  {
    id: 'weapons-instructor',
    name: 'Weapons Instructor',
    hourlyWage: 20,
    hoursPerShift: 8,
    requiredEducation: { path: 'fighter', level: 4 },
    requiredClothing: 'professional',
    description: 'Train the next generation. Requires Weapons Master certification.',
  },
  
  // Mage education
  {
    id: 'scroll-copier',
    name: 'Scroll Copier',
    hourlyWage: 5,
    hoursPerShift: 6,
    requiredEducation: { path: 'mage', level: 1 },
    requiredClothing: 'basic',
    description: 'Copy magical scrolls at the Academy. Requires Cantrips training.',
  },
  {
    id: 'enchantment-assistant',
    name: 'Enchantment Assistant',
    hourlyWage: 10,
    hoursPerShift: 6,
    requiredEducation: { path: 'mage', level: 2 },
    requiredClothing: 'professional',
    description: 'Assist master enchanters. Requires Elemental Magic.',
  },
  {
    id: 'battle-mage',
    name: 'Battle Mage',
    hourlyWage: 16,
    hoursPerShift: 8,
    requiredEducation: { path: 'mage', level: 3 },
    requiredClothing: 'professional',
    description: 'Magical support for the city guard. Requires Advanced Sorcery.',
  },
  {
    id: 'court-wizard',
    name: 'Court Wizard',
    hourlyWage: 25,
    hoursPerShift: 6,
    requiredEducation: { path: 'mage', level: 4 },
    requiredClothing: 'professional',
    description: 'Advise nobility on magical matters. Requires Archmage status.',
  },
  
  // Priest education
  {
    id: 'temple-acolyte',
    name: 'Temple Acolyte',
    hourlyWage: 4,
    hoursPerShift: 8,
    requiredEducation: { path: 'priest', level: 1 },
    requiredClothing: 'basic',
    description: 'Assist at the temple. Requires Acolyte training.',
  },
  {
    id: 'healer',
    name: 'Healer',
    hourlyWage: 8,
    hoursPerShift: 8,
    requiredEducation: { path: 'priest', level: 2 },
    requiredClothing: 'professional',
    description: 'Heal the sick and injured. Requires Divine Magic.',
  },
  {
    id: 'senior-healer',
    name: 'Senior Healer',
    hourlyWage: 14,
    hoursPerShift: 8,
    requiredEducation: { path: 'priest', level: 3 },
    requiredClothing: 'professional',
    description: 'Lead healing operations. Requires Advanced Healing.',
  },
  {
    id: 'high-priest',
    name: 'High Priest',
    hourlyWage: 22,
    hoursPerShift: 6,
    requiredEducation: { path: 'priest', level: 4 },
    requiredClothing: 'professional',
    description: 'Lead a temple congregation. Requires High Priest ordination.',
  },
];

// Factory jobs at The Forge
export const FORGE_JOBS: Job[] = [
  {
    id: 'forge-laborer',
    name: 'Forge Laborer',
    hourlyWage: 4,
    hoursPerShift: 10,
    requiredClothing: 'none',
    description: 'Hard physical labor at the forge. No skill required.',
  },
  {
    id: 'apprentice-smith',
    name: 'Apprentice Smith',
    hourlyWage: 6,
    hoursPerShift: 10,
    requiredEducation: { path: 'fighter', level: 1 },
    requiredClothing: 'basic',
    description: 'Learn the smithing trade. Requires basic combat knowledge.',
  },
  {
    id: 'journeyman-smith',
    name: 'Journeyman Smith',
    hourlyWage: 9,
    hoursPerShift: 10,
    requiredEducation: { path: 'fighter', level: 2 },
    requiredClothing: 'basic',
    description: 'Create quality metalwork. Requires Fighter II training.',
  },
  {
    id: 'master-smith',
    name: 'Master Smith',
    hourlyWage: 14,
    hoursPerShift: 8,
    requiredEducation: { path: 'fighter', level: 3 },
    requiredClothing: 'professional',
    description: 'Forge legendary weapons. Requires Advanced Combat knowledge.',
  },
];

export const getAvailableJobs = (
  education: Record<string, number>,
  clothingCondition: number
): Job[] => {
  const hasClothing = (required: Job['requiredClothing']) => {
    if (required === 'none') return true;
    if (required === 'basic') return clothingCondition >= 25;
    if (required === 'professional') return clothingCondition >= 50;
    if (required === 'uniform') return clothingCondition >= 75;
    return false;
  };

  const hasEducation = (req?: { path: EducationPath; level: number }) => {
    if (!req) return true;
    return (education[req.path] || 0) >= req.level;
  };

  return [...JOBS, ...FORGE_JOBS].filter(job => 
    hasEducation(job.requiredEducation) && hasClothing(job.requiredClothing)
  );
};

export const getJob = (id: string): Job | undefined => 
  [...JOBS, ...FORGE_JOBS].find(j => j.id === id);
