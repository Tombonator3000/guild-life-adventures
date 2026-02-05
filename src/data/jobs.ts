// Guild Life - Jobs Data (based on Jones in the Fast Lane)
// Fantasy-themed jobs with degree requirements matching Jones job progression

import type { DegreeId } from './education';

export type ClothingRequirement = 'none' | 'casual' | 'dress' | 'business' | 'uniform';

export interface Job {
  id: string;
  name: string;
  location: string;              // Where you work (for flavor)
  baseWage: number;              // Base hourly wage (like Jones base wage)
  hoursPerShift: number;         // Hours per work shift (6 like Jones)
  requiredDegrees: DegreeId[];   // ALL degrees required (AND logic)
  requiredClothing: ClothingRequirement;
  requiredExperience: number;    // Minimum experience points needed
  requiredDependability: number; // Minimum dependability needed
  description: string;
  careerLevel: number;           // 1-10, for career goal tracking
}

// All jobs in the game, organized by workplace location (like Jones)
// Wages based on Jones: Janitor $4-6, mid-level $10, high $20-22, top $25

// === GUILD HALL JOBS (Employment Office equivalent) ===
export const GUILD_HALL_JOBS: Job[] = [
  // Entry level - no requirements
  {
    id: 'floor-sweeper',
    name: 'Floor Sweeper',
    location: 'Guild Hall',
    baseWage: 4,
    hoursPerShift: 6,
    requiredDegrees: [],
    requiredClothing: 'none',
    requiredExperience: 0,
    requiredDependability: 0,
    description: 'Sweep floors and clean the guild hall. Honest work for beginners.',
    careerLevel: 1,
  },
  {
    id: 'errand-runner',
    name: 'Errand Runner',
    location: 'Guild Hall',
    baseWage: 5,
    hoursPerShift: 6,
    requiredDegrees: [],
    requiredClothing: 'casual',
    requiredExperience: 10,
    requiredDependability: 20,
    description: 'Deliver messages and packages around Guildholm.',
    careerLevel: 1,
  },
  // Requires Trade Guild
  {
    id: 'assistant-clerk',
    name: 'Assistant Clerk',
    location: 'Guild Hall',
    baseWage: 7,
    hoursPerShift: 6,
    requiredDegrees: ['trade-guild'],
    requiredClothing: 'casual',
    requiredExperience: 20,
    requiredDependability: 30,
    description: 'Help process guild paperwork and memberships.',
    careerLevel: 2,
  },
  // Requires Commerce
  {
    id: 'guild-accountant',
    name: 'Guild Accountant',
    location: 'Guild Hall',
    baseWage: 14,
    hoursPerShift: 6,
    requiredDegrees: ['commerce'],
    requiredClothing: 'dress',
    requiredExperience: 40,
    requiredDependability: 50,
    description: 'Manage guild finances and member dues.',
    careerLevel: 5,
  },
  // Top job - requires Commerce + Master Combat (like Jones GM)
  {
    id: 'guild-administrator',
    name: 'Guild Administrator',
    location: 'Guild Hall',
    baseWage: 22,
    hoursPerShift: 6,
    requiredDegrees: ['commerce', 'master-combat'],
    requiredClothing: 'business',
    requiredExperience: 60,
    requiredDependability: 60,
    description: 'Senior guild management. One of the highest-paying positions.',
    careerLevel: 8,
  },
];

// === MARKET JOBS (Black's Market / Monolith equivalent) ===
export const MARKET_JOBS: Job[] = [
  {
    id: 'market-porter',
    name: 'Market Porter',
    location: 'General Store',
    baseWage: 4,
    hoursPerShift: 6,
    requiredDegrees: [],
    requiredClothing: 'none',
    requiredExperience: 0,
    requiredDependability: 10,
    description: 'Carry goods and load carts at the market.',
    careerLevel: 1,
  },
  // Requires Trade Guild (like Butcher requires Trade School)
  {
    id: 'market-vendor',
    name: 'Market Vendor',
    location: 'Shadow Market',
    baseWage: 10,
    hoursPerShift: 6,
    requiredDegrees: ['trade-guild'],
    requiredClothing: 'casual',
    requiredExperience: 20,
    requiredDependability: 30,
    description: 'Sell goods at market stalls. Very lucrative early-game job!',
    careerLevel: 3,
  },
  {
    id: 'shop-clerk',
    name: 'Shop Clerk',
    location: 'General Store',
    baseWage: 6,
    hoursPerShift: 6,
    requiredDegrees: ['trade-guild'],
    requiredClothing: 'casual',
    requiredExperience: 10,
    requiredDependability: 20,
    description: 'Assist customers and stock shelves.',
    careerLevel: 2,
  },
  {
    id: 'shop-manager',
    name: 'Shop Manager',
    location: 'General Store',
    baseWage: 16,
    hoursPerShift: 6,
    requiredDegrees: ['commerce'],
    requiredClothing: 'dress',
    requiredExperience: 50,
    requiredDependability: 50,
    description: 'Run shop operations and manage staff.',
    careerLevel: 6,
  },
];

// === BANK JOBS ===
export const BANK_JOBS: Job[] = [
  {
    id: 'bank-janitor',
    name: 'Bank Janitor',
    location: 'Bank',
    baseWage: 6,
    hoursPerShift: 6,
    requiredDegrees: [],
    requiredClothing: 'casual',
    requiredExperience: 10,
    requiredDependability: 20,
    description: 'Clean the bank. Better pay than guild floor sweeping.',
    careerLevel: 1,
  },
  {
    id: 'bank-teller',
    name: 'Bank Teller',
    location: 'Bank',
    baseWage: 9,
    hoursPerShift: 6,
    requiredDegrees: ['junior-academy'],
    requiredClothing: 'dress',
    requiredExperience: 20,
    requiredDependability: 40,
    description: 'Handle deposits and withdrawals for customers.',
    careerLevel: 3,
  },
  // High-level job - like Jones Broker (requires Academic + Business)
  {
    id: 'guild-treasurer',
    name: 'Guild Treasurer',
    location: 'Bank',
    baseWage: 22,
    hoursPerShift: 6,
    requiredDegrees: ['scholar', 'commerce'],
    requiredClothing: 'business',
    requiredExperience: 60,
    requiredDependability: 60,
    description: 'Manage guild investments. One of the best jobs in the realm!',
    careerLevel: 8,
  },
];

// === FORGE JOBS (Factory equivalent) ===
export const FORGE_JOBS: Job[] = [
  {
    id: 'forge-laborer',
    name: 'Forge Laborer',
    location: 'Forge',
    baseWage: 4,
    hoursPerShift: 8,
    requiredDegrees: [],
    requiredClothing: 'none',
    requiredExperience: 0,
    requiredDependability: 0,
    description: 'Hard physical labor at the forge. Long shifts.',
    careerLevel: 1,
  },
  {
    id: 'apprentice-smith',
    name: 'Apprentice Smith',
    location: 'Forge',
    baseWage: 6,
    hoursPerShift: 8,
    requiredDegrees: ['trade-guild'],
    requiredClothing: 'casual',
    requiredExperience: 15,
    requiredDependability: 20,
    description: 'Learn the smithing trade under a master.',
    careerLevel: 2,
  },
  {
    id: 'journeyman-smith',
    name: 'Journeyman Smith',
    location: 'Forge',
    baseWage: 10,
    hoursPerShift: 8,
    requiredDegrees: ['combat-training'],
    requiredClothing: 'casual',
    requiredExperience: 30,
    requiredDependability: 40,
    description: 'Create quality metalwork and weapons.',
    careerLevel: 4,
  },
  // Like Jones Machinist - requires Engineering
  {
    id: 'master-smith',
    name: 'Master Smith',
    location: 'Forge',
    baseWage: 18,
    hoursPerShift: 6,
    requiredDegrees: ['master-combat'],
    requiredClothing: 'casual',
    requiredExperience: 50,
    requiredDependability: 50,
    description: 'Forge legendary weapons and armor.',
    careerLevel: 7,
  },
  // Top forge job - like Jones Engineer
  {
    id: 'forge-manager',
    name: 'Forge Manager',
    location: 'Forge',
    baseWage: 23,
    hoursPerShift: 6,
    requiredDegrees: ['master-combat', 'commerce'],
    requiredClothing: 'business',
    requiredExperience: 60,
    requiredDependability: 60,
    description: 'Run the entire forge operation. Top forge position!',
    careerLevel: 9,
  },
];

// === ACADEMY JOBS (Hi-Tech U equivalent) ===
export const ACADEMY_JOBS: Job[] = [
  {
    id: 'library-assistant',
    name: 'Library Assistant',
    location: 'Academy',
    baseWage: 7,
    hoursPerShift: 6,
    requiredDegrees: ['junior-academy'],
    requiredClothing: 'casual',
    requiredExperience: 10,
    requiredDependability: 30,
    description: 'Organize scrolls and help students find texts.',
    careerLevel: 2,
  },
  {
    id: 'scribe',
    name: 'Scribe',
    location: 'Academy',
    baseWage: 8,
    hoursPerShift: 6,
    requiredDegrees: ['junior-academy'],
    requiredClothing: 'dress',
    requiredExperience: 20,
    requiredDependability: 40,
    description: 'Copy important documents and texts.',
    careerLevel: 3,
  },
  // Like Jones Teacher
  {
    id: 'teacher',
    name: 'Teacher',
    location: 'Academy',
    baseWage: 14,
    hoursPerShift: 6,
    requiredDegrees: ['scholar'],
    requiredClothing: 'dress',
    requiredExperience: 40,
    requiredDependability: 50,
    description: 'Teach young students at the academy.',
    careerLevel: 5,
  },
  {
    id: 'senior-teacher',
    name: 'Senior Teacher',
    location: 'Academy',
    baseWage: 17,
    hoursPerShift: 6,
    requiredDegrees: ['advanced-scholar'],
    requiredClothing: 'dress',
    requiredExperience: 50,
    requiredDependability: 55,
    description: 'Lead classes and mentor junior teachers.',
    careerLevel: 6,
  },
  {
    id: 'academy-lecturer',
    name: 'Academy Lecturer',
    location: 'Academy',
    baseWage: 18,
    hoursPerShift: 6,
    requiredDegrees: ['sage-studies'],
    requiredClothing: 'dress',
    requiredExperience: 55,
    requiredDependability: 58,
    description: 'Deliver advanced lectures on specialized topics.',
    careerLevel: 7,
  },
  // Like Jones Professor - requires Research degree
  {
    id: 'sage',
    name: 'Sage',
    location: 'Academy',
    baseWage: 20,
    hoursPerShift: 6,
    requiredDegrees: ['loremaster'],
    requiredClothing: 'dress',
    requiredExperience: 50,
    requiredDependability: 60,
    description: 'The highest academic position. Conduct original research.',
    careerLevel: 8,
  },
];

// === MILITARY JOBS ===
export const MILITARY_JOBS: Job[] = [
  {
    id: 'city-guard',
    name: 'City Guard',
    location: 'Guildholm',
    baseWage: 8,
    hoursPerShift: 8,
    requiredDegrees: ['combat-training'],
    requiredClothing: 'uniform',
    requiredExperience: 20,
    requiredDependability: 40,
    description: 'Patrol the streets and maintain order.',
    careerLevel: 3,
  },
  {
    id: 'caravan-guard',
    name: 'Caravan Guard',
    location: 'Guildholm',
    baseWage: 12,
    hoursPerShift: 10,
    requiredDegrees: ['combat-training'],
    requiredClothing: 'uniform',
    requiredExperience: 30,
    requiredDependability: 50,
    description: 'Protect merchant caravans. Long hours, good pay.',
    careerLevel: 4,
  },
  {
    id: 'arena-fighter',
    name: 'Arena Fighter',
    location: 'Arena',
    baseWage: 16,
    hoursPerShift: 4,
    requiredDegrees: ['master-combat'],
    requiredClothing: 'uniform',
    requiredExperience: 40,
    requiredDependability: 30,
    description: 'Fight for glory in the arena! Short shifts, high risk.',
    careerLevel: 6,
  },
  {
    id: 'weapons-instructor',
    name: 'Weapons Instructor',
    location: 'Academy',
    baseWage: 19,
    hoursPerShift: 6,
    requiredDegrees: ['master-combat'],
    requiredClothing: 'uniform',
    requiredExperience: 50,
    requiredDependability: 55,
    description: 'Train the next generation of warriors.',
    careerLevel: 7,
  },
];

// === MAGIC JOBS ===
export const MAGIC_JOBS: Job[] = [
  {
    id: 'scroll-copier',
    name: 'Scroll Copier',
    location: 'Enchanter',
    baseWage: 7,
    hoursPerShift: 6,
    requiredDegrees: ['arcane-studies'],
    requiredClothing: 'casual',
    requiredExperience: 15,
    requiredDependability: 30,
    description: 'Copy magical scrolls. Requires careful attention.',
    careerLevel: 2,
  },
  {
    id: 'enchantment-assistant',
    name: 'Enchantment Assistant',
    location: 'Enchanter',
    baseWage: 11,
    hoursPerShift: 6,
    requiredDegrees: ['arcane-studies'],
    requiredClothing: 'dress',
    requiredExperience: 25,
    requiredDependability: 40,
    description: 'Assist master enchanters with their work.',
    careerLevel: 4,
  },
  {
    id: 'alchemist',
    name: 'Alchemist',
    location: 'Enchanter',
    baseWage: 15,
    hoursPerShift: 6,
    requiredDegrees: ['alchemy'],
    requiredClothing: 'dress',
    requiredExperience: 40,
    requiredDependability: 50,
    description: 'Brew potions and transmute materials.',
    careerLevel: 6,
  },
  {
    id: 'potion-brewer',
    name: 'Potion Brewer',
    location: 'Enchanter',
    baseWage: 13,
    hoursPerShift: 6,
    requiredDegrees: ['alchemy'],
    requiredClothing: 'dress',
    requiredExperience: 35,
    requiredDependability: 45,
    description: 'Specialize in healing and enhancement potions.',
    careerLevel: 5,
  },
];

// === NOBLE JOBS ===
export const NOBLE_JOBS: Job[] = [
  {
    id: 'court-advisor',
    name: 'Court Advisor',
    location: 'Noble Heights',
    baseWage: 21,
    hoursPerShift: 6,
    requiredDegrees: ['loremaster'],
    requiredClothing: 'business',
    requiredExperience: 60,
    requiredDependability: 60,
    description: 'Advise nobility on important matters.',
    careerLevel: 8,
  },
  // Top job in the game - like Jones General Manager
  {
    id: 'guild-master-assistant',
    name: 'Guild Master\'s Assistant',
    location: 'Guild Hall',
    baseWage: 25,
    hoursPerShift: 6,
    requiredDegrees: ['commerce', 'master-combat', 'loremaster'],
    requiredClothing: 'business',
    requiredExperience: 70,
    requiredDependability: 70,
    description: 'The highest-paying job in Guildholm. Ultimate career achievement!',
    careerLevel: 10,
  },
];

// All jobs combined
export const ALL_JOBS: Job[] = [
  ...GUILD_HALL_JOBS,
  ...MARKET_JOBS,
  ...BANK_JOBS,
  ...FORGE_JOBS,
  ...ACADEMY_JOBS,
  ...MILITARY_JOBS,
  ...MAGIC_JOBS,
  ...NOBLE_JOBS,
];

// Get jobs by location
export const getJobsByLocation = (location: string): Job[] => {
  return ALL_JOBS.filter(job => job.location.toLowerCase().includes(location.toLowerCase()));
};

// Check if player qualifies for a job
export const canWorkJob = (
  job: Job,
  completedDegrees: DegreeId[],
  clothingLevel: number,
  experience: number,
  dependability: number
): boolean => {
  // Check degrees
  const hasDegrees = job.requiredDegrees.every(deg => completedDegrees.includes(deg));
  if (!hasDegrees) return false;

  // Check clothing
  const clothingMap: Record<ClothingRequirement, number> = {
    'none': 0,
    'casual': 25,
    'dress': 50,
    'business': 75,
    'uniform': 75,
  };
  if (clothingLevel < clothingMap[job.requiredClothing]) return false;

  // Check experience and dependability
  if (experience < job.requiredExperience) return false;
  if (dependability < job.requiredDependability) return false;

  return true;
};

// Get all jobs a player can currently work
export const getAvailableJobs = (
  completedDegrees: DegreeId[],
  clothingLevel: number,
  experience: number = 0,
  dependability: number = 0
): Job[] => {
  return ALL_JOBS.filter(job =>
    canWorkJob(job, completedDegrees, clothingLevel, experience, dependability)
  );
};

// Get job by ID
export const getJob = (id: string): Job | undefined => {
  return ALL_JOBS.find(job => job.id === id);
};

// Get entry-level jobs (no degree required)
export const getEntryLevelJobs = (): Job[] => {
  return ALL_JOBS.filter(job => job.requiredDegrees.length === 0);
};

// Get jobs unlocked by a specific degree
export const getJobsForDegree = (degreeId: DegreeId): Job[] => {
  return ALL_JOBS.filter(job => job.requiredDegrees.includes(degreeId));
};

// Career level names (for display)
export const CAREER_LEVEL_NAMES: Record<number, string> = {
  1: 'Entry Level',
  2: 'Junior',
  3: 'Associate',
  4: 'Mid-Level',
  5: 'Senior',
  6: 'Lead',
  7: 'Expert',
  8: 'Executive',
  9: 'Director',
  10: 'Master',
};

// Legacy exports for backwards compatibility
export const JOBS = GUILD_HALL_JOBS;

// Legacy function
export type EducationPath = 'fighter' | 'mage' | 'priest' | 'business';
export interface LegacyJob {
  id: string;
  name: string;
  hourlyWage: number;
  hoursPerShift: number;
  requiredEducation?: { path: EducationPath; level: number };
  requiredClothing: 'none' | 'basic' | 'professional' | 'uniform';
  description: string;
}
