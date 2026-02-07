// Guild Life - Education System (based on Jones in the Fast Lane Hi-Tech U)
// Fantasy-themed degrees with Jones-style prerequisites and unlock system

import type { DegreeId } from '@/types/game.types';

// Re-export types for backwards compatibility
export type { DegreeId };

export interface Degree {
  id: DegreeId;
  name: string;
  description: string;
  prerequisites: DegreeId[];  // Must have ALL of these to enroll
  sessionsRequired: number;   // 10 sessions like Jones
  costPerSession: number;     // Base cost (affected by economy)
  hoursPerSession: number;    // Time per class (6 hours like Jones)
  educationPoints: number;    // +9 per degree like Jones
  unlocksJobs: string[];      // Job IDs this degree qualifies you for
}

// All degrees in the game - Jones-style tree structure
export const DEGREES: Record<DegreeId, Degree> = {
  // === STARTING DEGREES (no prerequisites) ===
  'trade-guild': {
    id: 'trade-guild',
    name: 'Trade Guild Certificate',
    description: 'Basic commerce and craftsmanship. Opens doors to many practical jobs.',
    prerequisites: [],
    sessionsRequired: 10,
    costPerSession: 5,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['shop-clerk', 'market-vendor', 'apprentice-smith', 'assistant-clerk', 'tavern-chef'],
  },
  'junior-academy': {
    id: 'junior-academy',
    name: 'Junior Academy Diploma',
    description: 'Foundational knowledge in letters and numbers. Gateway to advanced studies.',
    prerequisites: [],
    sessionsRequired: 10,
    costPerSession: 5,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['scribe', 'library-assistant', 'bank-teller'],
  },

  // === TRADE GUILD PATH ===
  'arcane-studies': {
    id: 'arcane-studies',
    name: 'Arcane Studies Certificate',
    description: 'Basic magical theory and enchantment principles.',
    prerequisites: ['trade-guild'],
    sessionsRequired: 10,
    costPerSession: 8,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['enchantment-assistant', 'scroll-copier'],
  },
  'combat-training': {
    id: 'combat-training',
    name: 'Combat Training Certificate',
    description: 'Fundamental weapons and tactics. Required for advanced martial positions.',
    prerequisites: ['trade-guild'],
    sessionsRequired: 10,
    costPerSession: 8,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['city-guard', 'caravan-guard', 'journeyman-smith'],
  },
  'master-combat': {
    id: 'master-combat',
    name: 'Master Combat Degree',
    description: 'Elite combat techniques and leadership. Key to top military and forge positions.',
    prerequisites: ['combat-training'],
    sessionsRequired: 10,
    costPerSession: 12,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['arena-fighter', 'weapons-instructor', 'master-smith', 'forge-manager'],
  },

  // === JUNIOR ACADEMY PATH ===
  'scholar': {
    id: 'scholar',
    name: 'Scholar Degree',
    description: 'Advanced literacy and research methods. Qualifies you as a Teacher.',
    prerequisites: ['junior-academy'],
    sessionsRequired: 10,
    costPerSession: 10,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['teacher'],
  },
  'advanced-scholar': {
    id: 'advanced-scholar',
    name: 'Advanced Scholar Degree',
    description: 'Deep academic study and thesis work.',
    prerequisites: ['scholar'],
    sessionsRequired: 10,
    costPerSession: 15,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['senior-teacher', 'researcher'],
  },
  'sage-studies': {
    id: 'sage-studies',
    name: 'Sage Studies Certificate',
    description: 'Preparation for the highest academic honors.',
    prerequisites: ['advanced-scholar'],
    sessionsRequired: 10,
    costPerSession: 20,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['academy-lecturer'],
  },
  'loremaster': {
    id: 'loremaster',
    name: 'Loremaster Degree',
    description: 'The pinnacle of academic achievement. Only Loremasters can become Sages.',
    prerequisites: ['sage-studies'],
    sessionsRequired: 10,
    costPerSession: 25,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['sage', 'court-advisor'],
  },
  'commerce': {
    id: 'commerce',
    name: 'Commerce Degree',
    description: 'Business administration and guild management. Key to management positions.',
    prerequisites: ['junior-academy'],
    sessionsRequired: 10,
    costPerSession: 10,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['guild-accountant', 'shop-manager', 'tavern-manager', 'merchant-assistant'],
  },

  // === COMBINATION DEGREES ===
  'alchemy': {
    id: 'alchemy',
    name: 'Alchemy Degree',
    description: 'The science of transmutation. Combines arcane and scholarly knowledge.',
    prerequisites: ['arcane-studies', 'junior-academy'],
    sessionsRequired: 10,
    costPerSession: 15,
    hoursPerSession: 6,
    educationPoints: 9,
    unlocksJobs: ['alchemist', 'potion-brewer'],
  },
};

// Get all degrees as an array
export const ALL_DEGREES = Object.values(DEGREES);

// Check if player has all prerequisites for a degree
export const canEnrollIn = (
  degreeId: DegreeId,
  completedDegrees: DegreeId[]
): boolean => {
  const degree = DEGREES[degreeId];
  if (!degree) return false;

  // Already have this degree?
  if (completedDegrees.includes(degreeId)) return false;

  // Check all prerequisites
  return degree.prerequisites.every(prereq => completedDegrees.includes(prereq));
};

// Get all degrees the player can currently enroll in
export const getAvailableDegrees = (completedDegrees: DegreeId[]): Degree[] => {
  return ALL_DEGREES.filter(degree => canEnrollIn(degree.id, completedDegrees));
};

// Get degrees the player has completed
export const getCompletedDegrees = (completedDegrees: DegreeId[]): Degree[] => {
  return completedDegrees.map(id => DEGREES[id]).filter(Boolean);
};

// Calculate total education points (for goals)
export const getTotalEducationPoints = (completedDegrees: DegreeId[]): number => {
  return completedDegrees.reduce((total, id) => {
    const degree = DEGREES[id];
    return total + (degree?.educationPoints || 0);
  }, 0);
};

// Get degree by ID
export const getDegree = (id: DegreeId): Degree | undefined => DEGREES[id];

// Graduation bonuses (like Jones)
export const GRADUATION_BONUSES = {
  happiness: 5,
  dependability: 5,
  maxDependability: 5,  // Permanent increase
  maxExperience: 5,     // Permanent increase
};

// Max degrees in game (for education goal calculation)
export const MAX_DEGREES = ALL_DEGREES.length; // 11 degrees like Jones
export const MAX_EDUCATION_POINTS = MAX_DEGREES * 9; // 99 points max

