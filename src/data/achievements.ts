/**
 * Achievements System (C6) — Meta-progression across multiple games.
 *
 * Achievements persist in localStorage and track cumulative progress
 * across all play sessions. Each achievement has a condition check
 * that runs at key game moments (victory, quest complete, etc.).
 */

const STORAGE_KEY = 'guild-life-achievements';

export type AchievementCategory = 'wealth' | 'combat' | 'education' | 'social' | 'exploration' | 'mastery';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  /** Whether this achievement is hidden until unlocked */
  hidden?: boolean;
}

export interface AchievementProgress {
  /** Achievement IDs that have been unlocked */
  unlocked: Record<string, number>; // id -> timestamp when unlocked
  /** Cumulative stats tracked across games */
  stats: AchievementStats;
}

export interface AchievementStats {
  gamesWon: number;
  gamesPlayed: number;
  totalGoldEarned: number;
  totalQuestsCompleted: number;
  totalDegreesEarned: number;
  totalDungeonFloorsCleared: number;
  totalWeeksPlayed: number;
  highestHappiness: number;
  highestWealth: number;
  totalJobsHeld: number;
  bossesDefeated: number;
  festivalsAttended: number;
  achievementCount: number;
}

const DEFAULT_STATS: AchievementStats = {
  gamesWon: 0,
  gamesPlayed: 0,
  totalGoldEarned: 0,
  totalQuestsCompleted: 0,
  totalDegreesEarned: 0,
  totalDungeonFloorsCleared: 0,
  totalWeeksPlayed: 0,
  highestHappiness: 0,
  highestWealth: 0,
  totalJobsHeld: 0,
  bossesDefeated: 0,
  festivalsAttended: 0,
  achievementCount: 0,
};

/** All achievements in the game */
export const ACHIEVEMENTS: Achievement[] = [
  // === Wealth ===
  { id: 'first-100g', name: 'First Hundred', description: 'Accumulate 100 gold for the first time', icon: '💰', category: 'wealth' },
  { id: 'wealthy-1000', name: 'Wealthy Merchant', description: 'Have 1,000+ gold (cash + savings)', icon: '🏦', category: 'wealth' },
  { id: 'tycoon-5000', name: 'Guildholm Tycoon', description: 'Have 5,000+ gold total wealth', icon: '👑', category: 'wealth' },
  { id: 'gold-hoarder', name: 'Gold Hoarder', description: 'Earn 10,000 gold across all games', icon: '🐉', category: 'wealth' },

  // === Combat ===
  { id: 'first-dungeon', name: 'Into the Depths', description: 'Clear your first dungeon floor', icon: '⚔️', category: 'combat' },
  { id: 'dungeon-5', name: 'Dungeon Delver', description: 'Clear 5 dungeon floors total', icon: '🗡️', category: 'combat' },
  { id: 'dungeon-master', name: 'Dungeon Master', description: 'Clear 20 dungeon floors across all games', icon: '🏰', category: 'combat' },
  { id: 'boss-slayer', name: 'Boss Slayer', description: 'Defeat 10 dungeon bosses across all games', icon: '💀', category: 'combat' },

  // === Education ===
  { id: 'first-degree', name: 'Scholar', description: 'Complete your first degree', icon: '📜', category: 'education' },
  { id: 'triple-degree', name: 'Academic', description: 'Complete 3 degrees in a single game', icon: '🎓', category: 'education' },
  { id: 'all-degrees', name: 'Grand Scholar', description: 'Earn 15 degrees across all games', icon: '📚', category: 'education' },

  // === Social ===
  { id: 'first-quest', name: 'Adventurer', description: 'Complete your first quest', icon: '📋', category: 'social' },
  { id: 'quest-10', name: 'Seasoned Adventurer', description: 'Complete 10 quests across all games', icon: '🗺️', category: 'social' },
  { id: 'guild-master', name: 'Guild Master', description: 'Reach Guild Master rank', icon: '⭐', category: 'social' },
  { id: 'noble-life', name: 'Noble Life', description: 'Live in Noble Heights', icon: '🏠', category: 'social' },

  // === Exploration ===
  { id: 'festival-goer', name: 'Festival Goer', description: 'Experience your first seasonal festival', icon: '🎪', category: 'exploration' },
  { id: 'festival-all', name: 'Festival Fanatic', description: 'Experience all 4 seasonal festivals', icon: '🎉', category: 'exploration' },
  { id: 'survivor-50', name: 'Survivor', description: 'Play for 50 weeks in a single game', icon: '🛡️', category: 'exploration' },
  { id: 'veteran-player', name: 'Veteran', description: 'Play 5 complete games', icon: '🏅', category: 'exploration' },

  // === Mastery ===
  { id: 'first-win', name: 'Victory!', description: 'Win your first game', icon: '🏆', category: 'mastery' },
  { id: 'speed-win', name: 'Speed Runner', description: 'Win a game in under 30 weeks', icon: '⚡', category: 'mastery' },
  { id: 'triple-win', name: 'Champion', description: 'Win 3 games', icon: '🥇', category: 'mastery' },
  { id: 'max-happiness', name: 'Pure Joy', description: 'Reach 100 happiness', icon: '😊', category: 'mastery' },
  { id: 'completionist', name: 'Completionist', description: 'Unlock 20 achievements', icon: '🌟', category: 'mastery', hidden: true },
];

// === Persistence ===

let cachedProgress: AchievementProgress | null = null;

export function loadAchievements(): AchievementProgress {
  if (cachedProgress) return cachedProgress;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedProgress = { unlocked: {}, stats: { ...DEFAULT_STATS } };
      return cachedProgress;
    }
    const stored = JSON.parse(raw);
    cachedProgress = {
      unlocked: stored.unlocked || {},
      stats: { ...DEFAULT_STATS, ...stored.stats },
    };
    return cachedProgress;
  } catch {
    cachedProgress = { unlocked: {}, stats: { ...DEFAULT_STATS } };
    return cachedProgress;
  }
}

function saveAchievements(progress: AchievementProgress): void {
  cachedProgress = progress;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors
  }
  // Notify subscribers
  for (const cb of listeners) cb();
}

// === Subscription (for React hook) ===

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeAchievements(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// === Unlock & Stat tracking ===

/**
 * Unlock an achievement by ID. Returns true if newly unlocked.
 */
export function unlockAchievement(id: string): boolean {
  const progress = loadAchievements();
  if (progress.unlocked[id]) return false; // Already unlocked

  progress.unlocked[id] = Date.now();
  progress.stats.achievementCount = Object.keys(progress.unlocked).length;
  saveAchievements(progress);
  return true;
}

/**
 * Update cumulative stats. Pass partial stats to increment.
 */
export function updateAchievementStats(updates: Partial<AchievementStats>): void {
  const progress = loadAchievements();
  for (const [key, value] of Object.entries(updates)) {
    const k = key as keyof AchievementStats;
    if (typeof value === 'number') {
      // For "highest" stats, take max. For others, add.
      if (k === 'highestHappiness' || k === 'highestWealth') {
        progress.stats[k] = Math.max(progress.stats[k], value);
      } else {
        progress.stats[k] = (progress.stats[k] || 0) + value;
      }
    }
  }
  saveAchievements(progress);
}

/**
 * Check all achievements against current stats and unlock any that qualify.
 * Returns array of newly unlocked achievement IDs.
 */
export function checkAchievements(context: {
  gold?: number;
  totalWealth?: number;
  happiness?: number;
  completedDegrees?: number;
  completedQuests?: number;
  dungeonFloorsCleared?: number;
  guildRank?: string;
  housing?: string;
  week?: number;
  isVictory?: boolean;
  festivalsAttended?: string[];
}): string[] {
  const progress = loadAchievements();
  const stats = progress.stats;
  const newlyUnlocked: string[] = [];

  const tryUnlock = (id: string) => {
    if (!progress.unlocked[id]) {
      if (unlockAchievement(id)) {
        newlyUnlocked.push(id);
      }
    }
  };

  // Wealth checks
  if ((context.gold ?? 0) >= 100 || (context.totalWealth ?? 0) >= 100) tryUnlock('first-100g');
  if ((context.totalWealth ?? 0) >= 1000) tryUnlock('wealthy-1000');
  if ((context.totalWealth ?? 0) >= 5000) tryUnlock('tycoon-5000');
  if (stats.totalGoldEarned >= 10000) tryUnlock('gold-hoarder');

  // Combat checks
  if ((context.dungeonFloorsCleared ?? 0) >= 1 || stats.totalDungeonFloorsCleared >= 1) tryUnlock('first-dungeon');
  if (stats.totalDungeonFloorsCleared >= 5) tryUnlock('dungeon-5');
  if (stats.totalDungeonFloorsCleared >= 20) tryUnlock('dungeon-master');
  if (stats.bossesDefeated >= 10) tryUnlock('boss-slayer');

  // Education checks
  if ((context.completedDegrees ?? 0) >= 1 || stats.totalDegreesEarned >= 1) tryUnlock('first-degree');
  if ((context.completedDegrees ?? 0) >= 3) tryUnlock('triple-degree');
  if (stats.totalDegreesEarned >= 15) tryUnlock('all-degrees');

  // Social checks
  if ((context.completedQuests ?? 0) >= 1 || stats.totalQuestsCompleted >= 1) tryUnlock('first-quest');
  if (stats.totalQuestsCompleted >= 10) tryUnlock('quest-10');
  if (context.guildRank === 'guild-master') tryUnlock('guild-master');
  if (context.housing === 'noble') tryUnlock('noble-life');

  // Exploration checks
  if (stats.festivalsAttended >= 1) tryUnlock('festival-goer');
  if (stats.festivalsAttended >= 4) tryUnlock('festival-all');
  if ((context.week ?? 0) >= 50) tryUnlock('survivor-50');
  if (stats.gamesPlayed >= 5) tryUnlock('veteran-player');

  // Mastery checks
  if (context.isVictory) tryUnlock('first-win');
  if (context.isVictory && (context.week ?? 999) <= 30) tryUnlock('speed-win');
  if (stats.gamesWon >= 3) tryUnlock('triple-win');
  if ((context.happiness ?? 0) >= 100) tryUnlock('max-happiness');

  // Meta: completionist
  if (Object.keys(progress.unlocked).length >= 20) tryUnlock('completionist');

  return newlyUnlocked;
}

/**
 * Get the achievement object by ID
 */
export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * Get all achievements with their unlock status
 */
export function getAllAchievementsWithStatus(): (Achievement & { unlockedAt: number | null })[] {
  const progress = loadAchievements();
  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlockedAt: progress.unlocked[a.id] || null,
  }));
}

/**
 * Reset all achievements (for testing)
 */
export function resetAchievements(): void {
  cachedProgress = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  for (const cb of listeners) cb();
}
