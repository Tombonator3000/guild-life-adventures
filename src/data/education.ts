// Guild Life - Education System (based on Jones Hi-Tech U)
import type { EducationPath } from '@/types/game.types';

export interface Course {
  id: string;
  name: string;
  path: EducationPath;
  level: number;
  sessionsRequired: number;
  costPerSession: number;
  hoursPerSession: number;
  description: string;
}

export const EDUCATION_PATHS: Record<EducationPath, {
  name: string;
  description: string;
  courses: Course[];
}> = {
  fighter: {
    name: 'Fighter Path',
    description: 'Combat training for warriors and guards',
    courses: [
      {
        id: 'fighter-1',
        name: 'Fighter I',
        path: 'fighter',
        level: 1,
        sessionsRequired: 10,
        costPerSession: 15,
        hoursPerSession: 4,
        description: 'Basic combat stances and weapon handling.',
      },
      {
        id: 'fighter-2',
        name: 'Fighter II',
        path: 'fighter',
        level: 2,
        sessionsRequired: 10,
        costPerSession: 25,
        hoursPerSession: 4,
        description: 'Advanced combat techniques and tactics.',
      },
      {
        id: 'advanced-combat',
        name: 'Advanced Combat',
        path: 'fighter',
        level: 3,
        sessionsRequired: 10,
        costPerSession: 40,
        hoursPerSession: 4,
        description: 'Elite combat training for professionals.',
      },
      {
        id: 'weapons-master',
        name: 'Weapons Master',
        path: 'fighter',
        level: 4,
        sessionsRequired: 10,
        costPerSession: 60,
        hoursPerSession: 4,
        description: 'Mastery of all weapon forms and combat styles.',
      },
    ],
  },
  mage: {
    name: 'Mage Path',
    description: 'Arcane studies for aspiring wizards',
    courses: [
      {
        id: 'cantrips',
        name: 'Cantrips',
        path: 'mage',
        level: 1,
        sessionsRequired: 10,
        costPerSession: 20,
        hoursPerSession: 4,
        description: 'Simple magical tricks and basic theory.',
      },
      {
        id: 'elemental',
        name: 'Elemental Magic',
        path: 'mage',
        level: 2,
        sessionsRequired: 10,
        costPerSession: 35,
        hoursPerSession: 4,
        description: 'Control of fire, water, earth, and air.',
      },
      {
        id: 'advanced-sorcery',
        name: 'Advanced Sorcery',
        path: 'mage',
        level: 3,
        sessionsRequired: 10,
        costPerSession: 55,
        hoursPerSession: 4,
        description: 'Complex spellwork and magical theory.',
      },
      {
        id: 'archmage',
        name: 'Archmage Studies',
        path: 'mage',
        level: 4,
        sessionsRequired: 10,
        costPerSession: 80,
        hoursPerSession: 4,
        description: 'The pinnacle of arcane knowledge.',
      },
    ],
  },
  priest: {
    name: 'Priest Path',
    description: 'Divine training for healers and clerics',
    courses: [
      {
        id: 'acolyte',
        name: 'Acolyte Training',
        path: 'priest',
        level: 1,
        sessionsRequired: 10,
        costPerSession: 15,
        hoursPerSession: 4,
        description: 'Temple service and basic prayers.',
      },
      {
        id: 'divine-magic',
        name: 'Divine Magic',
        path: 'priest',
        level: 2,
        sessionsRequired: 10,
        costPerSession: 30,
        hoursPerSession: 4,
        description: 'Channeling divine power for blessings.',
      },
      {
        id: 'advanced-healing',
        name: 'Advanced Healing',
        path: 'priest',
        level: 3,
        sessionsRequired: 10,
        costPerSession: 50,
        hoursPerSession: 4,
        description: 'Powerful healing magic and restoration.',
      },
      {
        id: 'high-priest',
        name: 'High Priest Ordination',
        path: 'priest',
        level: 4,
        sessionsRequired: 10,
        costPerSession: 75,
        hoursPerSession: 4,
        description: 'Leadership of a temple congregation.',
      },
    ],
  },
  business: {
    name: 'Business Path',
    description: 'Merchant training for traders and managers',
    courses: [
      {
        id: 'trade-school',
        name: 'Trade School',
        path: 'business',
        level: 1,
        sessionsRequired: 10,
        costPerSession: 10,
        hoursPerSession: 4,
        description: 'Basic commerce and bookkeeping.',
      },
      {
        id: 'junior-college',
        name: 'Junior College',
        path: 'business',
        level: 2,
        sessionsRequired: 10,
        costPerSession: 20,
        hoursPerSession: 4,
        description: 'Advanced trade practices and negotiation.',
      },
      {
        id: 'business-admin',
        name: 'Business Administration',
        path: 'business',
        level: 3,
        sessionsRequired: 10,
        costPerSession: 35,
        hoursPerSession: 4,
        description: 'Management of trade operations.',
      },
      {
        id: 'management',
        name: 'Management Mastery',
        path: 'business',
        level: 4,
        sessionsRequired: 10,
        costPerSession: 50,
        hoursPerSession: 4,
        description: 'Executive leadership and guild management.',
      },
    ],
  },
};

export const getCourse = (path: EducationPath, level: number): Course | undefined => {
  return EDUCATION_PATHS[path].courses.find(c => c.level === level);
};

export const getNextCourse = (
  path: EducationPath, 
  currentLevel: number
): Course | undefined => {
  return EDUCATION_PATHS[path].courses.find(c => c.level === currentLevel + 1);
};

export const getTotalEducationLevel = (education: Record<string, number>): number => {
  return Object.values(education).reduce((sum, level) => sum + level, 0);
};
