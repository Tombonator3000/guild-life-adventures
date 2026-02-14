/**
 * Save/Load System for Guild Life Adventures
 * Supports auto-save and 3 manual save slots using localStorage.
 */

import type { GameState } from '@/types/game.types';

const SAVE_VERSION = 4;
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

    return saveData;
  } catch (e) {
    console.error('[Save] Failed to load game:', e);
    return null;
  }
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
