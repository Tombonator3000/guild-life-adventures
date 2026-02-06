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
  /** Requires specific dungeon floor to be cleared */
  requiresDungeonFloor?: number;
  /** Requires ALL dungeon floors to be cleared */
  requiresAllDungeonFloors?: boolean;
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

// Quest balance (2026-02-06 rebalance):
// Gold/hour targets per rank, competitive with equivalent-tier jobs:
//   E-rank: ~4.5-5.0 g/hr  (entry-level work = 4.6 g/hr)
//   D-rank: ~5.0-7.0 g/hr  (single-degree work = 6-10 g/hr)
//   C-rank: ~7.5-8.0 g/hr  (multi-degree work = 10-16 g/hr)
//   B-rank: ~10-11 g/hr    (mid-tier work = 14-16 g/hr)
//   A-rank: ~12-13 g/hr    (high-tier work = 18-20 g/hr)
//   S-rank: ~15-17 g/hr    (top-tier work = 22-25 g/hr)
// Quests are never the best pure-gold option (working is),
// but they provide happiness, guild rank, and variety.

export const QUESTS: Quest[] = [
  // E-Rank Quests (beginner) — modest gold, quick completion
  {
    id: 'rat-extermination',
    name: 'Rat Extermination',
    description: 'Clear the tavern cellar of a rat infestation.',
    rank: 'E',
    goldReward: 25,
    timeRequired: 5,
    healthRisk: 5,
    happinessReward: 2,
  },
  {
    id: 'package-delivery',
    name: 'Package Delivery',
    description: 'Deliver a mysterious package across the city.',
    rank: 'E',
    goldReward: 15,
    timeRequired: 3,
    healthRisk: 0,
    happinessReward: 1,
  },
  {
    id: 'herb-gathering',
    name: 'Herb Gathering',
    description: 'Collect healing herbs from the city gardens.',
    rank: 'E',
    goldReward: 18,
    timeRequired: 4,
    healthRisk: 0,
    happinessReward: 2,
  },
  {
    id: 'lost-cat',
    name: 'Find the Lost Cat',
    description: "A noble's prized cat has gone missing.",
    rank: 'E',
    goldReward: 30,
    timeRequired: 6,
    healthRisk: 0,
    happinessReward: 3,
  },

  // D-Rank Quests — solid income, some risk
  {
    id: 'escort-merchant',
    name: 'Escort Merchant',
    description: 'Protect a merchant traveling to the next district.',
    rank: 'D',
    goldReward: 50,
    timeRequired: 10,
    healthRisk: 10,
    happinessReward: 3,
    requiredEducation: { path: 'fighter', level: 1 },
  },
  {
    id: 'guard-duty',
    name: 'Guard Duty',
    description: 'Stand watch at the city gates overnight.',
    rank: 'D',
    goldReward: 42,
    timeRequired: 6,
    healthRisk: 5,
    happinessReward: 2,
  },
  {
    id: 'courier-run',
    name: 'Urgent Courier Run',
    description: 'Deliver time-sensitive documents across the kingdom.',
    rank: 'D',
    goldReward: 40,
    timeRequired: 8,
    healthRisk: 5,
    happinessReward: 2,
  },

  // C-Rank Quests — good rewards for competent adventurers
  {
    id: 'bandit-hunt',
    name: 'Bandit Hunt',
    description: 'Track down and capture highway bandits.',
    rank: 'C',
    goldReward: 80,
    timeRequired: 10,
    healthRisk: 20,
    happinessReward: 4,
    requiredEducation: { path: 'fighter', level: 2 },
  },
  {
    id: 'lost-artifact',
    name: 'Lost Artifact',
    description: 'Recover an ancient relic from abandoned ruins.',
    rank: 'C',
    goldReward: 90,
    timeRequired: 12,
    healthRisk: 15,
    happinessReward: 4,
  },
  {
    id: 'curse-investigation',
    name: 'Curse Investigation',
    description: 'Investigate strange occurrences at the old manor.',
    rank: 'C',
    goldReward: 65,
    timeRequired: 8,
    healthRisk: 10,
    happinessReward: 3,
    requiredEducation: { path: 'mage', level: 1 },
  },

  // B-Rank Quests — high rewards for experienced adventurers
  {
    id: 'monster-slaying',
    name: 'Monster Slaying',
    description: 'Hunt the beast terrorizing local farmers.',
    rank: 'B',
    goldReward: 140,
    timeRequired: 14,
    healthRisk: 35,
    happinessReward: 6,
    // Fixed: was fighter 3 which is impossible (max fighter = 2 via combat-training + master-combat)
    requiredEducation: { path: 'fighter', level: 2 },
  },
  {
    id: 'dungeon-dive',
    name: 'Dungeon Dive',
    description: 'Prove your dungeon prowess — requires Floor 1 cleared.',
    rank: 'B',
    goldReward: 160,
    timeRequired: 16,
    healthRisk: 30,
    happinessReward: 7,
    requiresDungeonFloor: 1,
  },
  {
    id: 'exorcism',
    name: 'Exorcism',
    description: 'Cleanse the haunted chapel of dark spirits.',
    rank: 'B',
    goldReward: 110,
    timeRequired: 10,
    healthRisk: 25,
    happinessReward: 5,
    requiredEducation: { path: 'priest', level: 2 },
  },

  // A-Rank Quests — elite rewards
  {
    id: 'dragon-investigation',
    name: 'Dragon Investigation',
    description: 'Investigate dragon sightings in the mountains.',
    rank: 'A',
    goldReward: 220,
    timeRequired: 18,
    healthRisk: 40,
    happinessReward: 9,
    // Fixed: was fighter 4 which is impossible (max fighter = 2)
    requiredEducation: { path: 'fighter', level: 2 },
  },
  {
    id: 'demon-cult',
    name: 'Demon Cult',
    description: 'Infiltrate and dismantle a dangerous cult.',
    rank: 'A',
    goldReward: 260,
    timeRequired: 22,
    healthRisk: 50,
    happinessReward: 10,
  },
  {
    id: 'ancient-evil',
    name: 'Ancient Evil Awakens',
    description: 'Seal the tomb before the ancient evil escapes.',
    rank: 'A',
    goldReward: 240,
    timeRequired: 18,
    healthRisk: 45,
    happinessReward: 9,
    requiredEducation: { path: 'mage', level: 3 },
  },

  // S-Rank Quests (legendary) — massive rewards for top-tier adventurers
  {
    id: 'deep-dungeon-clear',
    name: 'Deep Dungeon Clear',
    description: 'Conquer all 5 levels of the legendary dungeon.',
    rank: 'S',
    goldReward: 450,
    timeRequired: 30,
    healthRisk: 60,
    happinessReward: 15,
    requiresAllDungeonFloors: true,
  },
  {
    id: 'dragon-slayer',
    name: 'Dragon Slayer',
    description: 'Slay the ancient dragon threatening the kingdom.',
    rank: 'S',
    goldReward: 600,
    timeRequired: 36,
    healthRisk: 70,
    happinessReward: 20,
    // Fixed: was fighter 4 which is impossible (max fighter = 2)
    requiredEducation: { path: 'fighter', level: 2 },
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
  inventory: string[],
  dungeonFloorsCleared?: number[]
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

  // Check dungeon floor requirement
  const cleared = dungeonFloorsCleared || [];
  if (quest.requiresDungeonFloor && !cleared.includes(quest.requiresDungeonFloor)) {
    return { canTake: false, reason: `Requires Dungeon Floor ${quest.requiresDungeonFloor} cleared` };
  }

  // Check all dungeon floors requirement
  if (quest.requiresAllDungeonFloors) {
    const allCleared = [1, 2, 3, 4, 5].every(f => cleared.includes(f));
    if (!allCleared) {
      return { canTake: false, reason: `Requires all 5 dungeon floors cleared` };
    }
  }

  return { canTake: true };
}

export function getQuest(id: string): Quest | undefined {
  return QUESTS.find(q => q.id === id);
}
