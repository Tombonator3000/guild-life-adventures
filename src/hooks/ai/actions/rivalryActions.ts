/**
 * Grimwald AI - Rivalry Actions (C4)
 *
 * Competitive behaviors: AI steals jobs, quests, and education
 * that rival players are pursuing. Only active on medium/hard difficulty.
 *
 * Architecture: 8 focused sub-generators dispatched from main function.
 */

import { getWeeklyQuests, canTakeQuest } from '@/data/quests';
import { getJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import { DEFENSE_ITEMS, getShadowMarketHexStock, getEnchanterHexStock, getHexPrice } from '@/data/hexes';
import type { HexDefinition } from '@/data/hexes';
import { calculateGoalProgress, getWeakestGoal, getJobLocation } from '../strategy';
import type { AIAction } from '../types';
import type { ActionContext } from './actionContext';
import type { Player } from '@/types/game.types';
import { getGameOption } from '@/data/gameOptions';
import { getHexById } from '@/data/hexes';
import { useGameStore } from '@/store/gameStore';

// ── Shared rivalry context passed to each sub-generator ─────────────

interface RivalryContext {
  ctx: ActionContext;
  biggestThreat: Player;
  threatIsClose: boolean;
  rivalFocus: 'wealth' | 'happiness' | 'education' | 'career';
}

// ── Helper functions ────────────────────────────────────────────────

function getRivalFocus(rival: Player, goals: ActionContext['goals']): 'wealth' | 'happiness' | 'education' | 'career' {
  const progress = calculateGoalProgress(rival, goals);
  const weakest = getWeakestGoal(progress);
  if (weakest === 'adventure') return 'wealth';
  return weakest;
}

function isRivalThreatening(rival: Player, goals: ActionContext['goals']): boolean {
  const progress = calculateGoalProgress(rival, goals);
  return progress.overall >= 0.70 ||
    progress.wealth.progress >= 0.85 ||
    progress.happiness.progress >= 0.85 ||
    progress.education.progress >= 0.85 ||
    progress.career.progress >= 0.85;
}

function findBiggestThreat(rivals: Player[], goals: ActionContext['goals']): Player | null {
  let best: Player | null = null;
  let bestProgress = 0;
  for (const rival of rivals) {
    const rProgress = calculateGoalProgress(rival, goals);
    if (rProgress.overall > bestProgress) {
      bestProgress = rProgress.overall;
      best = rival;
    }
  }
  return best;
}

// ── Sub-generators ──────────────────────────────────────────────────

/** Compete for quests — grab high-value quests before rival */
function generateQuestCompetition({ ctx, biggestThreat, threatIsClose, rivalFocus }: RivalryContext): AIAction[] {
  const { player, currentLocation, moveCost } = ctx;
  if (!player.hasGuildPass || player.activeQuest || player.questCooldownWeeksLeft > 0) return [];
  if (biggestThreat.activeQuest !== null) return []; // rival already on a quest
  if (!(rivalFocus === 'wealth' || rivalFocus === 'career') || !threatIsClose) return [];

  const available = getWeeklyQuests(player.guildRank, ctx.week);
  const takeable = available.filter(q => {
    const check = canTakeQuest(q, player.guildRank, player.education, player.inventory, player.dungeonFloorsCleared);
    return check.canTake && q.timeRequired <= player.timeRemaining && q.healthRisk <= player.health - 20;
  });
  if (takeable.length === 0) return [];

  takeable.sort((a, b) => b.goldReward - a.goldReward);
  if (currentLocation === 'guild-hall') {
    return [{
      type: 'take-quest',
      priority: 68,
      description: `Grab quest before ${biggestThreat.name}`,
      details: { questId: takeable[0].id },
    }];
  }
  if (player.timeRemaining > moveCost('guild-hall') + 2) {
    return [{
      type: 'move',
      location: 'guild-hall',
      priority: 63,
      description: `Race to guild hall to take quest`,
    }];
  }
  return [];
}

/** Block education path — study faster to outpace rival */
function generateEducationRacing({ ctx, biggestThreat, threatIsClose, rivalFocus }: RivalryContext): AIAction[] {
  const { player, currentLocation } = ctx;
  if (rivalFocus !== 'education' || !threatIsClose || currentLocation !== 'academy') return [];

  for (const [degreeIdStr, progressCount] of Object.entries(player.degreeProgress)) {
    const degreeId = degreeIdStr as import('@/types/game.types').DegreeId;
    if (progressCount > 0 && !player.completedDegrees.includes(degreeId)) {
      const degree = DEGREES[degreeId as keyof typeof DEGREES];
      if (degree && player.gold >= degree.costPerSession && player.timeRemaining >= degree.hoursPerSession) {
        return [{
          type: 'study',
          priority: 73,
          description: `Study faster to outpace ${biggestThreat.name}`,
          details: { degreeId, cost: degree.costPerSession, hours: degree.hoursPerSession },
        }];
      }
    }
  }
  return [];
}

/** Aggressive banking — deposit to protect gold from wealthy rival */
function generateAggressiveBanking({ ctx, biggestThreat, threatIsClose, rivalFocus }: RivalryContext): AIAction[] {
  const { player, currentLocation } = ctx;
  if (!threatIsClose || rivalFocus !== 'wealth' || player.gold <= 150 || currentLocation !== 'bank') return [];

  const depositAmount = Math.floor(player.gold * 0.6);
  if (depositAmount <= 50) return [];

  return [{
    type: 'deposit-bank',
    priority: 62,
    description: `Protect gold from ${biggestThreat.name}`,
    details: { amount: depositAmount },
  }];
}

/** Hex casting — use scrolls to curse biggest threat */
function generateHexCasting({ ctx, biggestThreat, threatIsClose }: RivalryContext): AIAction[] {
  const { player, currentLocation } = ctx;
  if (!getGameOption('enableHexesCurses') || player.hexScrolls.length === 0 || !threatIsClose) return [];

  const castLocations = ['shadow-market', 'enchanter', 'graveyard'] as const;
  if (!castLocations.includes(currentLocation as typeof castLocations[number])) return [];

  for (const scroll of player.hexScrolls) {
    const hex = getHexById(scroll.hexId);
    if (!hex || player.timeRemaining < hex.castTime) continue;
    if (hex.category === 'personal' || hex.category === 'sabotage') {
      return [{
        type: 'cast-curse',
        priority: 72,
        description: `Curse ${biggestThreat.name} with ${hex.name}`,
        details: { hexId: hex.id, targetId: biggestThreat.id },
      }];
    }
    if (hex.category === 'location') {
      return [{
        type: 'cast-location-hex',
        priority: 65,
        description: `Hex a location to block ${biggestThreat.name}`,
        details: { hexId: hex.id },
      }];
    }
  }
  return [];
}

/** Buy hex scrolls — acquire ammunition for curses */
function generateHexScrollPurchase({ ctx, biggestThreat, threatIsClose }: RivalryContext): AIAction[] {
  const { player, currentLocation, moveCost } = ctx;
  if (!getGameOption('enableHexesCurses') || player.hexScrolls.length !== 0 || !threatIsClose || player.gold < 80) return [];

  const actions: AIAction[] = [];

  let availableHexes: HexDefinition[] = [];
  if (currentLocation === 'shadow-market') {
    const state = useGameStore.getState();
    availableHexes = getShadowMarketHexStock(state.week);
  } else if (currentLocation === 'enchanter') {
    availableHexes = getEnchanterHexStock(player);
  }

  if (availableHexes.length > 0) {
    const sorted = [...availableHexes].sort((a, b) => {
      const aPersonal = a.category === 'personal' || a.category === 'sabotage' ? 1 : 0;
      const bPersonal = b.category === 'personal' || b.category === 'sabotage' ? 1 : 0;
      return bPersonal - aPersonal;
    });
    const hex = sorted[0];
    const cost = getHexPrice(hex, ctx.priceModifier);
    if (player.gold >= cost && cost > 0) {
      const morgathBoost = ctx.personality.id === 'morgath' ? 10 : 0;
      actions.push({
        type: 'buy-hex-scroll',
        priority: 60 + morgathBoost,
        description: `Buy ${hex.name} scroll`,
        details: { hexId: hex.id, cost },
      });
    }
  }

  // Travel to Shadow Market if not at a hex shop
  if (currentLocation !== 'shadow-market' && currentLocation !== 'enchanter' && player.gold >= 100) {
    if (player.timeRemaining > moveCost('shadow-market') + 3) {
      actions.push({
        type: 'move',
        location: 'shadow-market',
        priority: 50 * ctx.personality.weights.rivalry,
        description: 'Travel to Shadow Market for hex scrolls',
      });
    }
  }

  return actions;
}

/** Buy Protective Amulet — defense against rival hexes */
function generateAmuletPurchase({ ctx, threatIsClose }: RivalryContext): AIAction[] {
  const { player, currentLocation } = ctx;
  if (!getGameOption('enableHexesCurses') || player.hasProtectiveAmulet || player.gold <= 500 || !threatIsClose) return [];
  if (currentLocation !== 'enchanter') return [];

  return [{
    type: 'buy-amulet',
    priority: 55,
    description: 'Buy Protective Amulet for defense',
    details: {},
  }];
}

/** Dispel hexed locations — clear enemy hexes from key locations */
function generateDispelActions({ ctx }: RivalryContext): AIAction[] {
  const { player, currentLocation } = ctx;
  if (!getGameOption('enableHexesCurses')) return [];

  const locationHexes = useGameStore.getState().locationHexes || [];
  const hexedLocationsForMe = locationHexes.filter(
    h => h.casterId !== player.id && h.weeksRemaining > 0
  );
  if (hexedLocationsForMe.length === 0) return [];

  const dispelItem = DEFENSE_ITEMS.find(d => d.id === 'dispel-scroll');
  const dispelCost = dispelItem ? Math.round(dispelItem.basePrice * ctx.priceModifier) : 250;

  // Dispel at current location
  const currentHex = hexedLocationsForMe.find(h => h.targetLocation === currentLocation);
  if (currentHex && player.gold >= dispelCost) {
    return [{
      type: 'dispel-hex',
      priority: 70,
      description: `Dispel hex on ${currentLocation}`,
      details: { cost: dispelCost, location: currentLocation },
    }];
  }

  // Travel to dispel important hexed location
  const currentJobDef = player.currentJob ? getJob(player.currentJob) : null;
  const jobLocation = currentJobDef ? getJobLocation(currentJobDef) : null;
  const importantLocations = ['academy', 'guild-hall', jobLocation].filter(Boolean) as string[];
  const hexedImportant = hexedLocationsForMe.find(h =>
    importantLocations.includes(h.targetLocation)
  );
  if (hexedImportant && player.gold >= dispelCost + 50 && player.timeRemaining > 5) {
    return [{
      type: 'move',
      location: hexedImportant.targetLocation as import('@/types/game.types').LocationId,
      priority: 58,
      description: `Travel to dispel hex on ${hexedImportant.targetLocation}`,
    }];
  }

  return [];
}

/** Dark ritual — Hard AI gambler visits graveyard for cheap hex scrolls */
function generateDarkRitualActions({ ctx, threatIsClose }: RivalryContext): AIAction[] {
  const { player, settings, currentLocation, moveCost } = ctx;
  if (!getGameOption('enableHexesCurses') || settings.planningDepth < 3 || !threatIsClose) return [];

  const personalityAggro = ctx.personality.weights.gambling;
  if (personalityAggro < 1.0 || player.gold < 100 || player.hexScrolls.length >= 2) return [];

  if (currentLocation === 'graveyard') {
    return [{
      type: 'dark-ritual',
      priority: 50,
      description: 'Perform dark ritual for hex scroll',
      details: { cost: 100 },
    }];
  }
  if (player.timeRemaining > moveCost('graveyard') + 4) {
    return [{
      type: 'move',
      location: 'graveyard' as import('@/types/game.types').LocationId,
      priority: 45,
      description: 'Travel to graveyard for dark ritual',
    }];
  }
  return [];
}

// ── Dispatch table ──────────────────────────────────────────────────

const RIVALRY_GENERATORS: Array<(rc: RivalryContext) => AIAction[]> = [
  generateQuestCompetition,
  generateEducationRacing,
  generateAggressiveBanking,
  generateHexCasting,
  generateHexScrollPurchase,
  generateAmuletPurchase,
  generateDispelActions,
  generateDarkRitualActions,
];

// ── Main entry point ────────────────────────────────────────────────

/**
 * Generate rivalry-driven actions (C4)
 * Only strategic AI (medium/hard) engages in rivalry.
 */
export function generateRivalryActions(ctx: ActionContext): AIAction[] {
  const { goals, settings, rivals } = ctx;

  if (settings.planningDepth < 2 || rivals.length === 0) return [];

  const biggestThreat = findBiggestThreat(rivals, goals);
  if (!biggestThreat) return [];

  const rc: RivalryContext = {
    ctx,
    biggestThreat,
    threatIsClose: isRivalThreatening(biggestThreat, goals),
    rivalFocus: getRivalFocus(biggestThreat, goals),
  };

  return RIVALRY_GENERATORS.flatMap(gen => gen(rc));
}
