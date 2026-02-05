// Guild Life - Quest System Data

import type { QuestRank, GuildRank, EducationPath } from '@/types/game.types';
import { GUILD_RANK_ORDER } from '@/types/game.types';

export interface Quest {
  id: string;
  name: string;
  description: string;
  rank: QuestRank;
  goldReward: number;
  timeRequired: number;
  healthRisk: number;
  happinessReward: number;
  requiredEducation?: {
    path: EducationPath;
    level: number;
  };
  requiredItem?: string;
}

// Quest rank to guild rank requirements
export const QUEST_RANK_REQUIREMENTS: Record<QuestRank, GuildRank> = {
  'E': 'novice',
  'D': 'apprentice',
  'C': 'journeyman',
  'B': 'adept',
  'A': 'veteran',
  'S': 'elite',
};

// Quest rank display info
export const QUEST_RANK_INFO: Record<QuestRank, { name: string; color: string }> = {
  'E': { name: 'E-Rank', color: 'text-muted-foreground' },
  'D': { name: 'D-Rank', color: 'text-blue-400' },
  'C': { name: 'C-Rank', color: 'text-green-400' },
  'B': { name: 'B-Rank', color: 'text-yellow-400' },
  'A': { name: 'A-Rank', color: 'text-orange-400' },
  'S': { name: 'S-Rank', color: 'text-red-400' },
};

export const QUESTS: Quest[] = [
  // E-Rank Quests (beginner) - low gold, meant as guild rank grind
  {
    id: 'rat-extermination',
    name: 'Rat Extermination',
    description: 'Clear the tavern cellar of a rat infestation.',
    rank: 'E',
    goldReward: 12,
    timeRequired: 8,
    healthRisk: 5,
    happinessReward: 1,
  },
  {
    id: 'package-delivery',
    name: 'Package Delivery',
    description: 'Deliver a mysterious package across the city.',
    rank: 'E',
    goldReward: 6,
    timeRequired: 4,
    healthRisk: 0,
    happinessReward: 1,
  },
  {
    id: 'herb-gathering',
    name: 'Herb Gathering',
    description: 'Collect healing herbs from the city gardens.',
    rank: 'E',
    goldReward: 8,
    timeRequired: 6,
    healthRisk: 0,
    happinessReward: 1,
  },
  {
    id: 'lost-cat',
    name: 'Find the Lost Cat',
    description: "A noble's prized cat has gone missing.",
    rank: 'E',
    goldReward: 15,
    timeRequired: 10,
    healthRisk: 0,
    happinessReward: 2,
  },

  // D-Rank Quests
  {
    id: 'escort-merchant',
    name: 'Escort Merchant',
    description: 'Protect a merchant traveling to the next district.',
    rank: 'D',
    goldReward: 20,
    timeRequired: 16,
    healthRisk: 10,
    happinessReward: 2,
    requiredEducation: { path: 'fighter', level: 1 },
  },
  {
    id: 'guard-duty',
    name: 'Guard Duty',
    description: 'Stand watch at the city gates overnight.',
    rank: 'D',
    goldReward: 18,
    timeRequired: 12,
    healthRisk: 5,
    happinessReward: 1,
  },
  {
    id: 'courier-run',
    name: 'Urgent Courier Run',
    description: 'Deliver time-sensitive documents across the kingdom.',
    rank: 'D',
    goldReward: 22,
    timeRequired: 20,
    healthRisk: 5,
    happinessReward: 1,
  },

  // C-Rank Quests
  {
    id: 'bandit-hunt',
    name: 'Bandit Hunt',
    description: 'Track down and capture highway bandits.',
    rank: 'C',
    goldReward: 35,
    timeRequired: 24,
    healthRisk: 20,
    happinessReward: 3,
    requiredEducation: { path: 'fighter', level: 2 },
  },
  {
    id: 'lost-artifact',
    name: 'Lost Artifact',
    description: 'Recover an ancient relic from abandoned ruins.',
    rank: 'C',
    goldReward: 40,
    timeRequired: 28,
    healthRisk: 15,
    happinessReward: 3,
  },
  {
    id: 'curse-investigation',
    name: 'Curse Investigation',
    description: 'Investigate strange occurrences at the old manor.',
    rank: 'C',
    goldReward: 30,
    timeRequired: 20,
    healthRisk: 10,
    happinessReward: 2,
    requiredEducation: { path: 'mage', level: 1 },
  },

  // B-Rank Quests
  {
    id: 'monster-slaying',
    name: 'Monster Slaying',
    description: 'Hunt the beast terrorizing local farmers.',
    rank: 'B',
    goldReward: 60,
    timeRequired: 36,
    healthRisk: 35,
    happinessReward: 5,
    requiredEducation: { path: 'fighter', level: 3 },
  },
  {
    id: 'dungeon-dive',
    name: 'Dungeon Dive',
    description: 'Explore the first level of the ancient dungeon.',
    rank: 'B',
    goldReward: 75,
    timeRequired: 40,
    healthRisk: 30,
    happinessReward: 6,
  },
  {
    id: 'exorcism',
    name: 'Exorcism',
    description: 'Cleanse the haunted chapel of dark spirits.',
    rank: 'B',
    goldReward: 50,
    timeRequired: 24,
    healthRisk: 25,
    happinessReward: 4,
    requiredEducation: { path: 'priest', level: 2 },
  },

  // A-Rank Quests
  {
    id: 'dragon-investigation',
    name: 'Dragon Investigation',
    description: 'Investigate dragon sightings in the mountains.',
    rank: 'A',
    goldReward: 100,
    timeRequired: 48,
    healthRisk: 40,
    happinessReward: 7,
    requiredEducation: { path: 'fighter', level: 4 },
  },
  {
    id: 'demon-cult',
    name: 'Demon Cult',
    description: 'Infiltrate and dismantle a dangerous cult.',
    rank: 'A',
    goldReward: 120,
    timeRequired: 56,
    healthRisk: 50,
    happinessReward: 8,
  },
  {
    id: 'ancient-evil',
    name: 'Ancient Evil Awakens',
    description: 'Seal the tomb before the ancient evil escapes.',
    rank: 'A',
    goldReward: 110,
    timeRequired: 52,
    healthRisk: 45,
    happinessReward: 7,
    requiredEducation: { path: 'mage', level: 3 },
  },

  // S-Rank Quests (legendary) - meaningful rewards but not economy-breaking
  {
    id: 'deep-dungeon-clear',
    name: 'Deep Dungeon Clear',
    description: 'Conquer all levels of the legendary dungeon.',
    rank: 'S',
    goldReward: 200,
    timeRequired: 80,
    healthRisk: 60,
    happinessReward: 12,
  },
  {
    id: 'dragon-slayer',
    name: 'Dragon Slayer',
    description: 'Slay the ancient dragon threatening the kingdom.',
    rank: 'S',
    goldReward: 300,
    timeRequired: 100,
    healthRisk: 70,
    happinessReward: 15,
    requiredEducation: { path: 'fighter', level: 4 },
  },
];

export function getAvailableQuests(guildRank: GuildRank): Quest[] {
  const rankIndex = GUILD_RANK_ORDER.indexOf(guildRank);
  
  return QUESTS.filter(quest => {
    const requiredRank = QUEST_RANK_REQUIREMENTS[quest.rank];
    const requiredIndex = GUILD_RANK_ORDER.indexOf(requiredRank);
    return rankIndex >= requiredIndex;
  });
}

export function canTakeQuest(
  quest: Quest,
  guildRank: GuildRank,
  education: Record<EducationPath, number>,
  inventory: string[]
): { canTake: boolean; reason?: string } {
  // Check guild rank
  const rankIndex = GUILD_RANK_ORDER.indexOf(guildRank);
  const requiredRank = QUEST_RANK_REQUIREMENTS[quest.rank];
  const requiredIndex = GUILD_RANK_ORDER.indexOf(requiredRank);
  
  if (rankIndex < requiredIndex) {
    return { canTake: false, reason: `Requires ${requiredRank} rank` };
  }

  // Check education requirement
  if (quest.requiredEducation) {
    const playerLevel = education[quest.requiredEducation.path] || 0;
    if (playerLevel < quest.requiredEducation.level) {
      return { 
        canTake: false, 
        reason: `Requires ${quest.requiredEducation.path} level ${quest.requiredEducation.level}` 
      };
    }
  }

  // Check item requirement
  if (quest.requiredItem && !inventory.includes(quest.requiredItem)) {
    return { canTake: false, reason: `Requires ${quest.requiredItem}` };
  }

  return { canTake: true };
}

export function getQuest(id: string): Quest | undefined {
  return QUESTS.find(q => q.id === id);
}
