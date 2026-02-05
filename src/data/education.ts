// Guild Life - Education System (based on Jones in the Fast Lane Hi-Tech U)
// Fantasy-themed degrees with Jones-style prerequisites and unlock system

export type DegreeId =
  | 'trade-guild'        // Trade School equivalent - starting degree
  | 'junior-academy'     // Junior College equivalent - starting degree
  | 'arcane-studies'     // Electronics equivalent
  | 'combat-training'    // Pre-Engineering equivalent
  | 'master-combat'      // Engineering equivalent
  | 'scholar'            // Academic equivalent
  | 'advanced-scholar'   // Graduate School equivalent
  | 'sage-studies'       // Post Doctoral equivalent
  | 'loremaster'         // Research equivalent
  | 'commerce'           // Business Administration equivalent
  | 'alchemy';           // Extra fantasy degree

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
    unlocksJobs: ['shop-clerk', 'market-vendor', 'apprentice-smith'],
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
    unlocksJobs: ['scribe', 'assistant-clerk'],
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
    unlocksJobs: ['city-guard', 'caravan-guard'],
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
    unlocksJobs: ['teacher', 'library-assistant'],
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
    unlocksJobs: ['merchant-assistant', 'guild-accountant', 'shop-manager'],
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

// Legacy compatibility - map old path system to new degrees
export type EducationPath = 'fighter' | 'mage' | 'priest' | 'business';

export const PATH_TO_DEGREES: Record<EducationPath, DegreeId[]> = {
  fighter: ['trade-guild', 'combat-training', 'master-combat'],
  mage: ['junior-academy', 'arcane-studies', 'alchemy'],
  priest: ['junior-academy', 'scholar', 'advanced-scholar', 'sage-studies', 'loremaster'],
  business: ['trade-guild', 'junior-academy', 'commerce'],
};

// For backwards compatibility with existing code
export const EDUCATION_PATHS: Record<EducationPath, {
  name: string;
  description: string;
  courses: { id: string; name: string; path: EducationPath; level: number; sessionsRequired: number; costPerSession: number; hoursPerSession: number; description: string; }[];
}> = {
  fighter: {
    name: 'Combat Path',
    description: 'Military and forge training',
    courses: [
      { id: 'trade-guild', name: 'Trade Guild', path: 'fighter', level: 1, sessionsRequired: 10, costPerSession: 5, hoursPerSession: 6, description: 'Basic trade skills' },
      { id: 'combat-training', name: 'Combat Training', path: 'fighter', level: 2, sessionsRequired: 10, costPerSession: 8, hoursPerSession: 6, description: 'Weapons and tactics' },
      { id: 'master-combat', name: 'Master Combat', path: 'fighter', level: 3, sessionsRequired: 10, costPerSession: 12, hoursPerSession: 6, description: 'Elite combat mastery' },
    ],
  },
  mage: {
    name: 'Arcane Path',
    description: 'Magic and enchantment',
    courses: [
      { id: 'junior-academy', name: 'Junior Academy', path: 'mage', level: 1, sessionsRequired: 10, costPerSession: 5, hoursPerSession: 6, description: 'Foundational studies' },
      { id: 'arcane-studies', name: 'Arcane Studies', path: 'mage', level: 2, sessionsRequired: 10, costPerSession: 8, hoursPerSession: 6, description: 'Magic theory' },
      { id: 'alchemy', name: 'Alchemy', path: 'mage', level: 3, sessionsRequired: 10, costPerSession: 15, hoursPerSession: 6, description: 'Potion and transmutation' },
    ],
  },
  priest: {
    name: 'Scholar Path',
    description: 'Academic studies and lore',
    courses: [
      { id: 'junior-academy', name: 'Junior Academy', path: 'priest', level: 1, sessionsRequired: 10, costPerSession: 5, hoursPerSession: 6, description: 'Foundational studies' },
      { id: 'scholar', name: 'Scholar', path: 'priest', level: 2, sessionsRequired: 10, costPerSession: 10, hoursPerSession: 6, description: 'Advanced academics' },
      { id: 'advanced-scholar', name: 'Advanced Scholar', path: 'priest', level: 3, sessionsRequired: 10, costPerSession: 15, hoursPerSession: 6, description: 'Research and thesis' },
      { id: 'loremaster', name: 'Loremaster', path: 'priest', level: 4, sessionsRequired: 10, costPerSession: 25, hoursPerSession: 6, description: 'Ultimate knowledge' },
    ],
  },
  business: {
    name: 'Commerce Path',
    description: 'Trade and management',
    courses: [
      { id: 'trade-guild', name: 'Trade Guild', path: 'business', level: 1, sessionsRequired: 10, costPerSession: 5, hoursPerSession: 6, description: 'Basic commerce' },
      { id: 'junior-academy', name: 'Junior Academy', path: 'business', level: 2, sessionsRequired: 10, costPerSession: 5, hoursPerSession: 6, description: 'Foundation studies' },
      { id: 'commerce', name: 'Commerce', path: 'business', level: 3, sessionsRequired: 10, costPerSession: 10, hoursPerSession: 6, description: 'Business administration' },
    ],
  },
};

export const getCourse = (path: EducationPath, level: number) => {
  return EDUCATION_PATHS[path].courses.find(c => c.level === level);
};

export const getNextCourse = (path: EducationPath, currentLevel: number) => {
  return EDUCATION_PATHS[path].courses.find(c => c.level === currentLevel + 1);
};

export const getTotalEducationLevel = (education: Record<string, number>): number => {
  return Object.values(education).reduce((sum, level) => sum + level, 0);
};
