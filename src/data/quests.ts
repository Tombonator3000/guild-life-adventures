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
    description: 'Clear the tavern cellar of a rat infestation. The rats have organized. They have a union now.',
    rank: 'E',
    goldReward: 25,
    timeRequired: 5,
    healthRisk: 5,
    happinessReward: 2,
  },
  {
    id: 'package-delivery',
    name: 'Package Delivery',
    description: 'Deliver a mysterious package across the city. Don\'t open it. Don\'t shake it. Don\'t ask questions. Standard delivery.',
    rank: 'E',
    goldReward: 15,
    timeRequired: 3,
    healthRisk: 0,
    happinessReward: 1,
  },
  {
    id: 'herb-gathering',
    name: 'Herb Gathering',
    description: 'Collect healing herbs from the city gardens. The gardener will glare at you. This is normal.',
    rank: 'E',
    goldReward: 18,
    timeRequired: 4,
    healthRisk: 0,
    happinessReward: 2,
  },
  {
    id: 'lost-cat',
    name: 'Find the Lost Cat',
    description: "A noble's prized cat has gone missing. The cat is not lost. The cat is exactly where it wants to be.",
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
    description: 'Protect a merchant traveling to the next district. He talks. A lot. Combat is the easy part.',
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
    description: 'Stand watch at the city gates overnight. Nothing will happen. You\'ll still be exhausted. Welcome to guard duty.',
    rank: 'D',
    goldReward: 42,
    timeRequired: 6,
    healthRisk: 5,
    happinessReward: 2,
  },
  {
    id: 'courier-run',
    name: 'Urgent Courier Run',
    description: 'Deliver time-sensitive documents across the kingdom. "Time-sensitive" means "should have been sent last week."',
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
    description: 'Track down and capture highway bandits. They\'re not clever, but there are a lot of them. Quantity has a quality of its own.',
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
    description: 'Recover an ancient relic from abandoned ruins. "Abandoned" is doing a lot of heavy lifting in that sentence.',
    rank: 'C',
    goldReward: 90,
    timeRequired: 12,
    healthRisk: 15,
    happinessReward: 4,
  },
  {
    id: 'curse-investigation',
    name: 'Curse Investigation',
    description: 'Investigate strange occurrences at the old manor. Spoiler: it\'s always ghosts. It\'s never NOT ghosts.',
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
    description: 'Hunt the beast terrorizing local farmers. The farmers describe it as "big, scary, and bitey." Helpful.',
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
    description: 'Prove your dungeon prowess. Go back into the dungeon. Voluntarily. We question your judgment but respect your courage.',
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
    description: 'Cleanse the haunted chapel of dark spirits. The spirits are dark, the chapel is drafty, and the pay barely covers therapy.',
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
    description: 'Investigate dragon sightings in the mountains. "Investigate" — not "provoke," "annoy," or "poke with a stick."',
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
    description: 'Infiltrate and dismantle a dangerous cult. Their robes are surprisingly comfortable. Don\'t get attached.',
    rank: 'A',
    goldReward: 260,
    timeRequired: 22,
    healthRisk: 50,
    happinessReward: 10,
  },
  {
    id: 'ancient-evil',
    name: 'Ancient Evil Awakens',
    description: 'Seal the tomb before the ancient evil escapes. The ancient evil has been napping for 3,000 years and is NOT a morning person.',
    rank: 'A',
    goldReward: 240,
    timeRequired: 18,
    healthRisk: 45,
    happinessReward: 9,
    // H6 FIX: Reduced from mage 3 to mage 2 (was harder than S-rank quests)
    requiredEducation: { path: 'mage', level: 2 },
  },

  // S-Rank Quests (legendary) — massive rewards for top-tier adventurers
  {
    id: 'deep-dungeon-clear',
    name: 'Deep Dungeon Clear',
    description: 'Conquer all 5 levels of the legendary dungeon. This is either incredibly brave or proof that natural selection still works.',
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
    description: 'Slay the ancient dragon threatening the kingdom. The dragon is ancient, enormous, and breathes fire. You have a sword. Best of luck.',
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

// ============================================================
// B1: Quest Chains — multi-part quests with sequential steps
// ============================================================

export interface QuestChainStep {
  id: string;
  name: string;
  description: string;
  rank: QuestRank;
  goldReward: number;
  timeRequired: number;
  healthRisk: number;
  happinessReward: number;
  requiredEducation?: { path: EducationPath; level: number };
  requiresDungeonFloor?: number;
}

export interface QuestChain {
  id: string;
  name: string;
  description: string;
  steps: QuestChainStep[];
  /** Bonus gold awarded on completing all steps */
  completionBonusGold: number;
  /** Bonus happiness awarded on completing all steps */
  completionBonusHappiness: number;
  /** Minimum guild rank to start the chain */
  requiredGuildRank: GuildRank;
}

export const QUEST_CHAINS: QuestChain[] = [
  {
    id: 'dragon-conspiracy',
    name: 'The Dragon Conspiracy',
    description: 'A shadowy plot involving the dragon clans threatens the kingdom. Dragons and conspiracies — pick a lane, honestly.',
    requiredGuildRank: 'journeyman',
    completionBonusGold: 200,
    completionBonusHappiness: 15,
    steps: [
      {
        id: 'dragon-conspiracy-1',
        name: 'Whispers of Fire',
        description: 'Strange burn marks appear across the city. Could be dragons. Could be a cooking accident. Best to check.',
        rank: 'C',
        goldReward: 75,
        timeRequired: 10,
        healthRisk: 10,
        happinessReward: 4,
      },
      {
        id: 'dragon-conspiracy-2',
        name: 'The Smuggler\'s Trail',
        description: 'Follow the trail of dragon-forged weapons to a smuggling ring. They\'re not subtle. None of them are ever subtle.',
        rank: 'B',
        goldReward: 130,
        timeRequired: 14,
        healthRisk: 25,
        happinessReward: 6,
        requiredEducation: { path: 'fighter', level: 1 },
      },
      {
        id: 'dragon-conspiracy-3',
        name: 'Lair of the Conspirators',
        description: 'Confront the conspirators in their hidden lair beneath the mountains. Hidden lairs: where evil goes when it can\'t afford office space.',
        rank: 'A',
        goldReward: 250,
        timeRequired: 20,
        healthRisk: 45,
        happinessReward: 10,
        requiresDungeonFloor: 3,
      },
    ],
  },
  {
    id: 'scholars-secret',
    name: 'The Scholar\'s Secret',
    description: 'A dying scholar entrusts you with clues to forbidden knowledge. Dying people love giving cryptic errands. It\'s a whole thing.',
    requiredGuildRank: 'apprentice',
    completionBonusGold: 150,
    completionBonusHappiness: 12,
    steps: [
      {
        id: 'scholars-secret-1',
        name: 'The Coded Journal',
        description: 'Decipher the late scholar\'s encrypted journal. His handwriting was terrible even before the dying part.',
        rank: 'D',
        goldReward: 45,
        timeRequired: 8,
        healthRisk: 0,
        happinessReward: 3,
        requiredEducation: { path: 'mage', level: 1 },
      },
      {
        id: 'scholars-secret-2',
        name: 'The Hidden Library',
        description: 'Locate the secret library beneath the Academy. It\'s "secret" in the way everyone knows about it but pretends they don\'t.',
        rank: 'C',
        goldReward: 85,
        timeRequired: 12,
        healthRisk: 15,
        happinessReward: 5,
      },
      {
        id: 'scholars-secret-3',
        name: 'The Forbidden Ritual',
        description: 'Use the forbidden knowledge to seal an ancient breach. It\'s forbidden for a reason. Several reasons, actually. All of them alarming.',
        rank: 'B',
        goldReward: 150,
        timeRequired: 16,
        healthRisk: 30,
        happinessReward: 8,
        requiredEducation: { path: 'mage', level: 2 },
      },
    ],
  },
];

export function getQuestChain(chainId: string): QuestChain | undefined {
  return QUEST_CHAINS.find(c => c.id === chainId);
}

/** Get the next step for a player in a chain, or null if chain is complete */
export function getNextChainStep(
  chainId: string,
  chainProgress: Record<string, number>
): QuestChainStep | null {
  const chain = getQuestChain(chainId);
  if (!chain) return null;
  const stepsCompleted = chainProgress[chainId] || 0;
  if (stepsCompleted >= chain.steps.length) return null;
  return chain.steps[stepsCompleted];
}

/** Check if a player can start or continue a chain */
export function canTakeChainStep(
  chain: QuestChain,
  step: QuestChainStep,
  guildRank: GuildRank,
  education: Record<EducationPath, number>,
  dungeonFloorsCleared?: number[]
): { canTake: boolean; reason?: string } {
  // Check guild rank for chain
  const rankIndex = GUILD_RANK_ORDER.indexOf(guildRank);
  const requiredIndex = GUILD_RANK_ORDER.indexOf(chain.requiredGuildRank);
  if (rankIndex < requiredIndex) {
    return { canTake: false, reason: `Requires ${chain.requiredGuildRank} rank` };
  }

  // Check step education requirement
  if (step.requiredEducation) {
    const playerLevel = education[step.requiredEducation.path] || 0;
    if (playerLevel < step.requiredEducation.level) {
      return {
        canTake: false,
        reason: `Requires ${step.requiredEducation.path} level ${step.requiredEducation.level}`,
      };
    }
  }

  // Check dungeon floor requirement
  const cleared = dungeonFloorsCleared || [];
  if (step.requiresDungeonFloor && !cleared.includes(step.requiresDungeonFloor)) {
    return { canTake: false, reason: `Requires Dungeon Floor ${step.requiresDungeonFloor} cleared` };
  }

  return { canTake: true };
}

// ============================================================
// B2: Repeatable Bounties — 3 rotating weekly bounties
// ============================================================

export interface Bounty {
  id: string;
  name: string;
  description: string;
  goldReward: number;
  timeRequired: number;
  healthRisk: number;
  happinessReward: number;
}

const BOUNTY_POOL: Bounty[] = [
  { id: 'bounty-rats', name: 'Cellar Rats', description: 'Clear rats from a merchant\'s cellar. Again. They always come back. It\'s basically a subscription service.', goldReward: 12, timeRequired: 3, healthRisk: 3, happinessReward: 1 },
  { id: 'bounty-patrol', name: 'Night Patrol', description: 'Patrol the streets after dark. Mostly involves being cold, bored, and suspicious of shadows.', goldReward: 18, timeRequired: 4, healthRisk: 5, happinessReward: 1 },
  { id: 'bounty-herbs', name: 'Herb Collection', description: 'Gather herbs for the healers. They want the green ones. Not the other green ones. The OTHER other green ones.', goldReward: 10, timeRequired: 3, healthRisk: 0, happinessReward: 2 },
  { id: 'bounty-delivery', name: 'Urgent Parcel', description: 'Deliver a time-sensitive parcel. It was "urgent" three days ago. Now it\'s "extremely urgent." Same parcel.', goldReward: 14, timeRequired: 3, healthRisk: 0, happinessReward: 1 },
  { id: 'bounty-escort', name: 'Traveler Escort', description: 'Escort a traveler to the gate. They walk slowly. They stop to look at things. Your patience will be tested.', goldReward: 20, timeRequired: 5, healthRisk: 8, happinessReward: 2 },
  { id: 'bounty-cleanup', name: 'Rubble Clearing', description: 'Clear debris from a collapsed stall. The owner insists it "collapsed on its own." The insurance adjuster disagrees.', goldReward: 15, timeRequired: 4, healthRisk: 3, happinessReward: 1 },
  { id: 'bounty-gather', name: 'Mushroom Foraging', description: 'Forage rare mushrooms from the cave mouth. "Rare" because smart people don\'t go near the cave mouth.', goldReward: 16, timeRequired: 4, healthRisk: 5, happinessReward: 2 },
  { id: 'bounty-lost-item', name: 'Lost Heirloom', description: 'Find a lost ring in the slums. It\'s always a ring. Never a lost spoon. Nobody cries over spoons.', goldReward: 22, timeRequired: 5, healthRisk: 0, happinessReward: 2 },
  { id: 'bounty-sparring', name: 'Sparring Partner', description: 'Spar with a guard recruit at the Armory. He\'s new. Go easy on him. Or don\'t. Your call.', goldReward: 18, timeRequired: 4, healthRisk: 10, happinessReward: 1 },
];

/** Get 3 bounties for a given week (deterministic rotation based on week number) */
export function getWeeklyBounties(week: number): Bounty[] {
  // Use week to deterministically pick 3 bounties
  const offset = ((week - 1) * 3) % BOUNTY_POOL.length;
  const result: Bounty[] = [];
  for (let i = 0; i < 3; i++) {
    result.push(BOUNTY_POOL[(offset + i) % BOUNTY_POOL.length]);
  }
  return result;
}

export function getBounty(id: string): Bounty | undefined {
  return BOUNTY_POOL.find(b => b.id === id);
}

// ============================================================
// B3: Quest Difficulty Scaling — rewards scale with dungeon progress
// ============================================================

/** Calculate scaled gold reward based on player's dungeon progression */
export function getScaledQuestGold(baseGold: number, floorsCleared: number[]): number {
  // +10% gold per dungeon floor cleared, max +60%
  const bonus = Math.min(floorsCleared.length * 0.10, 0.60);
  return Math.round(baseGold * (1 + bonus));
}

/** Calculate scaled happiness reward based on dungeon progression */
export function getScaledQuestHappiness(baseHappiness: number, floorsCleared: number[]): number {
  // +1 happiness per 2 floors cleared
  const bonus = Math.floor(floorsCleared.length / 2);
  return baseHappiness + bonus;
}

// ============================================================
// B5: Guild Reputation — milestone bonuses
// ============================================================

export interface ReputationMilestone {
  threshold: number;
  title: string;
  goldBonusPct: number; // % bonus to quest gold
  description: string;
}

export const REPUTATION_MILESTONES: ReputationMilestone[] = [
  { threshold: 5,  title: 'Known Adventurer',    goldBonusPct: 5,  description: '+5% quest gold' },
  { threshold: 10, title: 'Trusted Agent',        goldBonusPct: 10, description: '+10% quest gold' },
  { threshold: 20, title: 'Renowned Hero',        goldBonusPct: 15, description: '+15% quest gold' },
  { threshold: 50, title: 'Legendary Champion',   goldBonusPct: 20, description: '+20% quest gold' },
];

/** Get the current reputation milestone for a given reputation score */
export function getReputationMilestone(reputation: number): ReputationMilestone | null {
  let best: ReputationMilestone | null = null;
  for (const m of REPUTATION_MILESTONES) {
    if (reputation >= m.threshold) best = m;
  }
  return best;
}

/** Get the gold bonus multiplier from reputation (e.g., 1.10 for +10%) */
export function getReputationGoldMultiplier(reputation: number): number {
  const milestone = getReputationMilestone(reputation);
  if (!milestone) return 1.0;
  return 1 + milestone.goldBonusPct / 100;
}

/** Get the next milestone the player hasn't reached yet */
export function getNextReputationMilestone(reputation: number): ReputationMilestone | null {
  for (const m of REPUTATION_MILESTONES) {
    if (reputation < m.threshold) return m;
  }
  return null;
}
