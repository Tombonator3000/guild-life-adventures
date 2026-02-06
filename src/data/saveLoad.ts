/**
 * Save/Load System for Guild Life Adventures
 * Supports auto-save and 3 manual save slots using localStorage.
 */

import type { GameState } from '@/types/game.types';

const SAVE_VERSION = 1;
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

    // Version check
    if (saveData.version !== SAVE_VERSION) {
      console.warn(`[Save] Save version mismatch: ${saveData.version} vs ${SAVE_VERSION}`);
      // For now, still attempt to load - future versions may need migration
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
