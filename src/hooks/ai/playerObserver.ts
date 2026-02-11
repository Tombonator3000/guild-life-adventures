/**
 * Grimwald AI - Player Strategy Observer
 *
 * Observes human player behavior by comparing state snapshots between turns.
 * Builds a strategy profile that AI opponents use to counter-strategize.
 *
 * Design: Instead of hooking into every store action, we snapshot human player
 * state at the start of each AI turn and infer what changed. This is simpler,
 * avoids coupling to store internals, and catches all player behaviors.
 */

import type { Player } from '@/types/game.types';

// ─── Types ───────────────────────────────────────────────────────────────

/** Snapshot of player state at a point in time */
interface PlayerSnapshot {
  week: number;
  gold: number;
  savings: number;
  investments: number;
  happiness: number;
  degreeCount: number;
  dependability: number;
  health: number;
  currentJob: string | null;
  currentWage: number;
  housing: string;
  currentLocation: string;
  completedQuests: number;
  dungeonFloorsCleared: number;
  equippedWeapon: string | null;
  equippedArmor: string | null;
  applianceCount: number;
  durableCount: number;
}

/** Inferred changes between two snapshots */
interface TurnDelta {
  goldDelta: number;       // Gold + savings + investments change
  happinessDelta: number;
  degreeDelta: number;     // Number of new degrees
  dependabilityDelta: number;
  combatDelta: number;     // New dungeon floors cleared
  questDelta: number;      // New quests completed
  gotNewJob: boolean;
  gotWageIncrease: boolean;
  upgradedHousing: boolean;
  boughtEquipment: boolean;
  boughtAppliances: boolean;
}

/** Strategy profile for a human player */
export interface PlayerStrategyProfile {
  /** How many turns of data we have */
  turnCount: number;
  /** Rolling focus scores (0-1 each, sum to ~1) based on where player invests effort */
  focusWeights: {
    education: number;
    wealth: number;
    combat: number;
    happiness: number;
  };
  /** Location visit frequency (normalized) */
  locationFrequency: Record<string, number>;
  /** Recent turn deltas for trend analysis */
  recentDeltas: TurnDelta[];
  /** Dominant strategy label */
  dominantStrategy: 'education-rush' | 'wealth-grind' | 'combat-focus' | 'happiness-focus' | 'balanced';
}

/** Counter-strategy weights that modify AI priorities to compete with the human */
export interface CounterStrategyWeights {
  education: number;  // Multiplier for AI education actions
  wealth: number;     // Multiplier for AI wealth actions
  combat: number;     // Multiplier for AI combat actions
  happiness: number;  // Multiplier for AI happiness actions
}

// ─── Module State ────────────────────────────────────────────────────────

/** Previous snapshots per human player ID */
const previousSnapshots = new Map<string, PlayerSnapshot>();

/** Accumulated strategy profiles per human player ID */
const strategyProfiles = new Map<string, PlayerStrategyProfile>();

/** Maximum number of recent deltas to keep for trend analysis */
const MAX_DELTA_HISTORY = 10;

// ─── Core Functions ──────────────────────────────────────────────────────

/** Create a snapshot of a player's current state */
function createSnapshot(player: Player, week: number): PlayerSnapshot {
  return {
    week,
    gold: player.gold,
    savings: player.savings,
    investments: player.investments,
    happiness: player.happiness,
    degreeCount: player.completedDegrees.length,
    dependability: player.dependability,
    health: player.health,
    currentJob: player.currentJob,
    currentWage: player.currentWage,
    housing: player.housing,
    currentLocation: player.currentLocation,
    completedQuests: player.completedQuests,
    dungeonFloorsCleared: player.dungeonFloorsCleared.length,
    equippedWeapon: player.equippedWeapon,
    equippedArmor: player.equippedArmor,
    applianceCount: Object.keys(player.appliances).length,
    durableCount: Object.keys(player.durables).length,
  };
}

/** Calculate delta between two snapshots */
function calculateDelta(prev: PlayerSnapshot, curr: PlayerSnapshot): TurnDelta {
  const prevWealth = prev.gold + prev.savings + prev.investments;
  const currWealth = curr.gold + curr.savings + curr.investments;

  return {
    goldDelta: currWealth - prevWealth,
    happinessDelta: curr.happiness - prev.happiness,
    degreeDelta: curr.degreeCount - prev.degreeCount,
    dependabilityDelta: curr.dependability - prev.dependability,
    combatDelta: curr.dungeonFloorsCleared - prev.dungeonFloorsCleared,
    questDelta: curr.completedQuests - prev.completedQuests,
    gotNewJob: curr.currentJob !== prev.currentJob && curr.currentJob !== null,
    gotWageIncrease: curr.currentWage > prev.currentWage,
    upgradedHousing: curr.housing !== prev.housing && curr.housing === 'noble',
    boughtEquipment: curr.equippedWeapon !== prev.equippedWeapon ||
                     curr.equippedArmor !== prev.equippedArmor ||
                     curr.durableCount > prev.durableCount,
    boughtAppliances: curr.applianceCount > prev.applianceCount,
  };
}

/** Update focus weights based on a new delta */
function updateFocusWeights(
  profile: PlayerStrategyProfile,
  delta: TurnDelta,
): void {
  // Score each focus area based on the delta
  const educationSignal = (delta.degreeDelta > 0 ? 3 : 0) + (delta.dependabilityDelta > 5 ? 1 : 0);
  const wealthSignal = (delta.goldDelta > 100 ? 2 : delta.goldDelta > 50 ? 1 : 0) +
                        (delta.gotNewJob ? 1 : 0) + (delta.gotWageIncrease ? 1 : 0);
  const combatSignal = (delta.combatDelta > 0 ? 3 : 0) + (delta.boughtEquipment ? 1 : 0) +
                        (delta.questDelta > 0 ? 1 : 0);
  const happinessSignal = (delta.happinessDelta > 5 ? 2 : delta.happinessDelta > 0 ? 1 : 0) +
                           (delta.boughtAppliances ? 1 : 0);

  const total = educationSignal + wealthSignal + combatSignal + happinessSignal;
  if (total === 0) return; // No signal this turn

  // Exponential moving average (alpha = 0.3 for recent turns, 0.7 for history)
  const alpha = 0.3;
  const newEdu = total > 0 ? educationSignal / total : 0.25;
  const newWealth = total > 0 ? wealthSignal / total : 0.25;
  const newCombat = total > 0 ? combatSignal / total : 0.25;
  const newHappiness = total > 0 ? happinessSignal / total : 0.25;

  profile.focusWeights.education = profile.focusWeights.education * (1 - alpha) + newEdu * alpha;
  profile.focusWeights.wealth = profile.focusWeights.wealth * (1 - alpha) + newWealth * alpha;
  profile.focusWeights.combat = profile.focusWeights.combat * (1 - alpha) + newCombat * alpha;
  profile.focusWeights.happiness = profile.focusWeights.happiness * (1 - alpha) + newHappiness * alpha;
}

/** Determine dominant strategy from focus weights */
function classifyStrategy(profile: PlayerStrategyProfile): PlayerStrategyProfile['dominantStrategy'] {
  const { education, wealth, combat, happiness } = profile.focusWeights;
  const max = Math.max(education, wealth, combat, happiness);

  // If no single focus is dominant (all within 10% of each other), it's balanced
  const min = Math.min(education, wealth, combat, happiness);
  if (max - min < 0.12) return 'balanced';

  if (max === education) return 'education-rush';
  if (max === wealth) return 'wealth-grind';
  if (max === combat) return 'combat-focus';
  return 'happiness-focus';
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Observe a human player's state and update their strategy profile.
 * Call this at the start of each AI turn, passing all human players.
 */
export function observeHumanPlayers(humanPlayers: Player[], week: number): void {
  for (const player of humanPlayers) {
    const snapshot = createSnapshot(player, week);
    const prev = previousSnapshots.get(player.id);

    if (prev && prev.week !== week) {
      // We have a previous snapshot from a different week — calculate delta
      const delta = calculateDelta(prev, snapshot);

      let profile = strategyProfiles.get(player.id);
      if (!profile) {
        profile = {
          turnCount: 0,
          focusWeights: { education: 0.25, wealth: 0.25, combat: 0.25, happiness: 0.25 },
          locationFrequency: {},
          recentDeltas: [],
          dominantStrategy: 'balanced',
        };
        strategyProfiles.set(player.id, profile);
      }

      profile.turnCount++;
      profile.recentDeltas.push(delta);
      if (profile.recentDeltas.length > MAX_DELTA_HISTORY) {
        profile.recentDeltas.shift();
      }

      // Update location frequency
      const loc = snapshot.currentLocation;
      profile.locationFrequency[loc] = (profile.locationFrequency[loc] || 0) + 1;

      // Update focus weights
      updateFocusWeights(profile, delta);

      // Classify dominant strategy
      profile.dominantStrategy = classifyStrategy(profile);
    }

    // Store current snapshot for next comparison
    previousSnapshots.set(player.id, snapshot);
  }
}

/**
 * Get the strategy profile for a human player.
 * Returns null if insufficient data (< 3 turns observed).
 */
export function getPlayerProfile(playerId: string): PlayerStrategyProfile | null {
  const profile = strategyProfiles.get(playerId);
  if (!profile || profile.turnCount < 3) return null;
  return profile;
}

/**
 * Calculate counter-strategy weights for an AI to use against human players.
 * Returns multipliers that boost AI focus in areas where humans are strong,
 * creating competitive pressure rather than simply copying the human strategy.
 *
 * Strategy logic:
 * - If human is education-rushing, AI boosts its own education to compete
 * - If human is wealth-grinding, AI tries to race them on wealth + education (for better jobs)
 * - If human is combat-focused, AI can pivot to neglected goals (education, wealth)
 * - If balanced, AI stays balanced but slightly boosts its personality preference
 *
 * @param planningDepth - Only medium/hard AI (planningDepth >= 2) counter-strategizes
 */
export function getCounterStrategyWeights(
  rivalPlayerIds: string[],
  planningDepth: number,
): CounterStrategyWeights {
  // Default: no modification
  const weights: CounterStrategyWeights = {
    education: 1.0,
    wealth: 1.0,
    combat: 1.0,
    happiness: 1.0,
  };

  // Only strategic AI uses counter-strategy
  if (planningDepth < 2) return weights;

  // Aggregate human profiles
  const profiles: PlayerStrategyProfile[] = [];
  for (const id of rivalPlayerIds) {
    const profile = getPlayerProfile(id);
    if (profile) profiles.push(profile);
  }

  if (profiles.length === 0) return weights;

  // Average human focus weights across all observed humans
  const avgFocus = { education: 0, wealth: 0, combat: 0, happiness: 0 };
  for (const p of profiles) {
    avgFocus.education += p.focusWeights.education;
    avgFocus.wealth += p.focusWeights.wealth;
    avgFocus.combat += p.focusWeights.combat;
    avgFocus.happiness += p.focusWeights.happiness;
  }
  avgFocus.education /= profiles.length;
  avgFocus.wealth /= profiles.length;
  avgFocus.combat /= profiles.length;
  avgFocus.happiness /= profiles.length;

  // Counter-strategy: boost where humans are strong (competitive pressure)
  // and slightly boost neglected areas (exploit gaps)
  // Scale: if human focuses 40% on education, AI gets 1.0 + 0.4 * 0.5 = 1.2x education
  const competitiveBoost = planningDepth >= 3 ? 0.6 : 0.4; // Hard AI reacts more strongly
  const gapExploit = planningDepth >= 3 ? 0.3 : 0.15;

  // Find the human's weakest area
  const minFocus = Math.min(avgFocus.education, avgFocus.wealth, avgFocus.combat, avgFocus.happiness);

  for (const key of ['education', 'wealth', 'combat', 'happiness'] as const) {
    const humanFocus = avgFocus[key];
    const isWeakest = humanFocus === minFocus;

    if (isWeakest) {
      // Exploit the gap: humans neglect this, so AI can gain here cheaply
      weights[key] = 1.0 + gapExploit;
    } else {
      // Competitive pressure: match human strength to prevent them winning
      weights[key] = 1.0 + humanFocus * competitiveBoost;
    }
  }

  return weights;
}

/**
 * Reset all observations. Call when starting a new game.
 */
export function resetObservations(): void {
  previousSnapshots.clear();
  strategyProfiles.clear();
}

/**
 * Get all strategy profiles (for debugging/UI display).
 */
export function getAllProfiles(): Map<string, PlayerStrategyProfile> {
  return new Map(strategyProfiles);
}
