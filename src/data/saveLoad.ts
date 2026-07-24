/**
 * Save/Load System for Guild Life Adventures
 * Supports auto-save and 3 manual save slots using localStorage.
 */

import type { GameState } from '@/types/game.types';

const SAVE_VERSION = 10;
const STORAGE_PREFIX = 'guild-life-';
const AUTO_SAVE_KEY = `${STORAGE_PREFIX}autosave`;
const SAVE_SLOT_KEY = (slot: number) => `${STORAGE_PREFIX}save-${slot}`;

export interface SaveData {
  version: number;
  timestamp: number;
  slotName: string;
  week: number;
  playerNames: string[];
  gameState: Omit<GameState, 'weekendEvent'>; // weekendEvent is transient
}

/**
 * Extract the serializable portion of GameState (exclude transient UI state)
 */
function extractSaveState(state: GameState): SaveData['gameState'] {
  const { weekendEvent, ...saveable } = state;
  return saveable;
}

/**
 * Save game to a specific slot (0 = auto-save, 1-3 = manual slots)
 */
export function saveGame(state: GameState, slot: number = 0, slotName?: string): boolean {
  try {
    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      slotName: slotName || (slot === 0 ? 'Auto Save' : `Save Slot ${slot}`),
      week: state.week,
      playerNames: state.players.map(p => p.name),
      gameState: extractSaveState(state),
    };

    const key = slot === 0 ? AUTO_SAVE_KEY : SAVE_SLOT_KEY(slot);
    localStorage.setItem(key, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('[Save] Failed to save game:', e);
    return false;
  }
}

/**
 * Load game from a specific slot
 */
export function loadGame(slot: number = 0): SaveData | null {
  try {
    const key = slot === 0 ? AUTO_SAVE_KEY : SAVE_SLOT_KEY(slot);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const saveData: SaveData = JSON.parse(raw);

    // Version migration
    if (saveData.version < 2) {
      // v1 → v2: Add age field to players (default 18 + weeks/4)
      if (saveData.gameState?.players) {
        for (const p of saveData.gameState.players as unknown as Record<string, unknown>[]) {
          if (p.age === undefined) {
            // Estimate age from game week: starting age + weeks elapsed / 4
            p.age = 18 + Math.floor((saveData.week || 1) / 4);
          }
        }
      }
      saveData.version = 2;
    }

    if (saveData.version < 3) {
      // v2 → v3: Add quest system B-features fields
      if (saveData.gameState?.players) {
        for (const p of saveData.gameState.players as unknown as Record<string, unknown>[]) {
          if (p.questChainProgress === undefined) p.questChainProgress = {};
          if (p.completedBountiesThisWeek === undefined) p.completedBountiesThisWeek = [];
          if (p.questCooldownWeeksLeft === undefined) p.questCooldownWeeksLeft = 0;
          if (p.guildReputation === undefined) p.guildReputation = (p.completedQuests as number) || 0;
        }
      }
      saveData.version = 3;
    }

    if (saveData.version < 4) {
      // v3 → v4: Add Hexes & Curses system fields
      if (saveData.gameState?.players) {
        for (const p of saveData.gameState.players as unknown as Record<string, unknown>[]) {
          if (p.hexScrolls === undefined) p.hexScrolls = [];
          if (p.activeCurses === undefined) p.activeCurses = [];
          if (p.hasProtectiveAmulet === undefined) p.hasProtectiveAmulet = false;
          if (p.hexCastCooldown === undefined) p.hexCastCooldown = 0;
        }
      }
      if (saveData.gameState && (saveData.gameState as Record<string, unknown>).locationHexes === undefined) {
        (saveData.gameState as Record<string, unknown>).locationHexes = [];
      }
      saveData.version = 4;
    }

    if (saveData.version < 5) {
      // v4 → v5: Add pawn shop redemption tracking
      if (saveData.gameState?.players) {
        for (const p of saveData.gameState.players as unknown as Record<string, unknown>[]) {
          if (p.pawnedAppliances === undefined) p.pawnedAppliances = [];
        }
      }
      saveData.version = 5;
    }

    if (saveData.version < 6) {
      // v5 → v6: Add Jones-style full-course tuition prepayment tracking
      if (saveData.gameState?.players) {
        for (const p of saveData.gameState.players as unknown as Record<string, unknown>[]) {
          if (p.prepaidDegrees === undefined) p.prepaidDegrees = {};
        }
      }
      saveData.version = 6;
    }

    if (saveData.version < 7) {
      // v6 → v7: Add reputation system (Fame & Infamy)
      if (saveData.gameState?.players) {
        for (const p of saveData.gameState.players as unknown as Record<string, unknown>[]) {
          if (p.fame === undefined) p.fame = 0;
          if (p.infamy === undefined) p.infamy = 0;
          if (p.purchasedReputationUnlocks === undefined) p.purchasedReputationUnlocks = [];
        }
      }
      saveData.version = 7;
    }

    // v7 → v8: Add protectionWeeksLeft
    if (saveData.version < 8) {
      for (const p of saveData.gameState.players as unknown as Record<string, unknown>[]) {
        if (p.protectionWeeksLeft === undefined) p.protectionWeeksLeft = 0;
      }
      saveData.version = 8;
    }

    // v8 → v9: Backfill non-linear quest chain + backup outfit fields that
    // were added without migrations (would crash old saves on UI/store reads).
    if (saveData.version < 9) {
      if (saveData.gameState?.players) {
        for (const p of saveData.gameState.players as unknown as Record<string, unknown>[]) {
          if (p.nlChainProgress === undefined) p.nlChainProgress = {};
          if (p.nlChainCompleted === undefined) p.nlChainCompleted = [];
          if (p.pendingNLChainChoice === undefined) p.pendingNLChainChoice = null;
          if (p.backupOutfit === undefined) p.backupOutfit = null;
        }
      }
      saveData.version = 9;
    }

    // v9 → v10: Comprehensive normalization pass — backfill EVERY known Player
    // and GameState field with a safe default. Any post-v3 field added without
    // its own migration would otherwise crash reads on old saves. Old fixtures
    // load correctly; existing valid values are never overwritten.
    if (saveData.version < 10) {
      normalizeSaveInPlace(saveData.gameState as unknown as Record<string, unknown>);
      saveData.version = 10;
    }

    return saveData;
  } catch (e) {
    console.error('[Save] Failed to load game:', e);
    return null;
  }
}

// ─── Normalization helpers ─────────────────────────────────────────────

const DEFAULT_GAME_STATS = {
  totalGoldEarned: 0,
  totalGoldSpent: 0,
  totalQuestsCompleted: 0,
  totalBountiesCompleted: 0,
  totalDungeonRuns: 0,
  totalDungeonFloors: 0,
  totalShiftsWorked: 0,
  totalHoursWorked: 0,
  totalDegreesEarned: 0,
  totalHealingReceived: 0,
  totalDamageTaken: 0,
  totalRentPaid: 0,
  locationVisits: {},
  mostVisitedLocation: '',
  longestJobHeld: null,
  hexesCast: 0,
  hexesReceived: 0,
  timesRobbed: 0,
  deathCount: 0,
};

/** Set a default value ONLY when the current value is undefined. Never overwrites valid data. */
function setDefault(obj: Record<string, unknown>, key: string, value: unknown) {
  if (obj[key] === undefined) obj[key] = value;
}

/** Normalize a Player record — backfills every field createPlayer() sets. */
export function normalizePlayer(p: Record<string, unknown>): void {
  setDefault(p, 'portraitId', null);
  setDefault(p, 'previousLocation', null);
  setDefault(p, 'completedDegrees', []);
  setDefault(p, 'degreeProgress', {});
  setDefault(p, 'maxDependability', 100);
  setDefault(p, 'maxExperience', 100);
  setDefault(p, 'completedQuests', 0);
  setDefault(p, 'backupOutfit', null);
  setDefault(p, 'foodBoughtWithoutPreservation', false);
  setDefault(p, 'hasStoreBoughtFood', false);
  setDefault(p, 'shiftsWorkedSinceHire', 0);
  setDefault(p, 'totalShiftsWorked', 0);
  setDefault(p, 'relaxation', 30);
  setDefault(p, 'durables', {});
  setDefault(p, 'appliances', {});
  setDefault(p, 'applianceHistory', []);
  setDefault(p, 'pawnedAppliances', []);
  setDefault(p, 'prepaidDegrees', {});
  setDefault(p, 'inventory', []);
  setDefault(p, 'activeQuest', null);
  setDefault(p, 'hasGuildPass', false);
  setDefault(p, 'hasNewspaper', false);
  setDefault(p, 'isSick', false);
  setDefault(p, 'rentDebt', 0);
  setDefault(p, 'rentPrepaidWeeks', 0);
  setDefault(p, 'lockedRent', 0);
  setDefault(p, 'rentExtensionUsed', false);
  setDefault(p, 'isGameOver', false);
  setDefault(p, 'wasResurrectedThisWeek', false);
  setDefault(p, 'equippedWeapon', null);
  setDefault(p, 'equippedArmor', null);
  setDefault(p, 'equippedShield', null);
  setDefault(p, 'dungeonFloorsCleared', []);
  setDefault(p, 'dungeonAttemptsThisTurn', 0);
  setDefault(p, 'permanentGoldBonus', 0);
  setDefault(p, 'dungeonRecords', {});
  setDefault(p, 'stocks', {});
  setDefault(p, 'loanAmount', 0);
  setDefault(p, 'loanWeeksRemaining', 0);
  setDefault(p, 'tickets', []);
  setDefault(p, 'freshFood', 0);
  setDefault(p, 'lotteryTickets', 0);
  setDefault(p, 'temperedItems', []);
  setDefault(p, 'equipmentDurability', {});
  setDefault(p, 'questLocationProgress', []);
  setDefault(p, 'questChainProgress', {});
  setDefault(p, 'completedBountiesThisWeek', []);
  setDefault(p, 'questCooldownWeeksLeft', 0);
  setDefault(p, 'guildReputation', (p.completedQuests as number) || 0);
  setDefault(p, 'nlChainProgress', {});
  setDefault(p, 'nlChainCompleted', []);
  setDefault(p, 'pendingNLChainChoice', null);
  setDefault(p, 'hexScrolls', []);
  setDefault(p, 'activeCurses', []);
  setDefault(p, 'hasProtectiveAmulet', false);
  setDefault(p, 'hexCastCooldown', 0);
  setDefault(p, 'workedThisTurn', false);
  setDefault(p, 'hadRandomEventThisTurn', false);
  setDefault(p, 'raiseAttemptedThisTurn', false);
  setDefault(p, 'tavernAlesDrunkThisTurn', 0);
  setDefault(p, 'fame', 0);
  setDefault(p, 'infamy', 0);
  setDefault(p, 'purchasedReputationUnlocks', []);
  setDefault(p, 'protectionWeeksLeft', 0);
  setDefault(p, 'weeklySnapshots', []);
  // gameStats: shallow-merge to preserve valid existing stats
  const stats = (p.gameStats as Record<string, unknown> | undefined) ?? {};
  p.gameStats = { ...DEFAULT_GAME_STATS, ...stats };
}

/** Normalize GameState — backfills locationHexes / weeklyNewsEvents / etc. */
export function normalizeSaveInPlace(gs: Record<string, unknown>): void {
  if (!gs) return;
  const players = gs.players as Record<string, unknown>[] | undefined;
  if (Array.isArray(players)) {
    for (const p of players) normalizePlayer(p);
  }
  setDefault(gs, 'locationHexes', []);
  setDefault(gs, 'weeklyNewsEvents', []);
  setDefault(gs, 'stockPriceHistory', {});
  setDefault(gs, 'economyTrend', 0);
  setDefault(gs, 'economyCycleWeeksLeft', 4);
  setDefault(gs, 'activeFestival', null);
  setDefault(gs, 'deathEvent', null);
  setDefault(gs, 'shadowfingersEvent', null);
  setDefault(gs, 'applianceBreakageEvent', null);
  setDefault(gs, 'basePriceModifier', gs.priceModifier ?? 1);
  // Transient UI fields intentionally left blank on load (cleared by loadFromSlot).
}

/**
 * Delete a save slot
 */
export function deleteSave(slot: number): void {
  const key = slot === 0 ? AUTO_SAVE_KEY : SAVE_SLOT_KEY(slot);
  localStorage.removeItem(key);
}

/**
 * Get metadata for all save slots (without loading full state)
 */
export interface SaveSlotInfo {
  slot: number;
  exists: boolean;
  slotName: string;
  timestamp: number;
  week: number;
  playerNames: string[];
}

export function getSaveSlots(): SaveSlotInfo[] {
  const slots: SaveSlotInfo[] = [];
  for (let slot = 0; slot <= 3; slot++) {
    const data = loadGame(slot);
    if (data) {
      slots.push({
        slot,
        exists: true,
        slotName: data.slotName,
        timestamp: data.timestamp,
        week: data.week,
        playerNames: data.playerNames,
      });
    } else {
      slots.push({
        slot,
        exists: false,
        slotName: slot === 0 ? 'Auto Save' : `Save Slot ${slot}`,
        timestamp: 0,
        week: 0,
        playerNames: [],
      });
    }
  }
  return slots;
}

/**
 * Check if an auto-save exists
 */
export function hasAutoSave(): boolean {
  return localStorage.getItem(AUTO_SAVE_KEY) !== null;
}

/**
 * Format a timestamp for display
 */
export function formatSaveDate(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
