/**
 * Zone Editor localStorage persistence
 * Saves/loads zone configurations, center panel, layout, movement paths, and mobile overrides
 * so edits survive page reloads without needing to copy code.
 */

import type { ZoneConfig, CenterPanelLayout, AnimationLayerConfig, MobileZoneOverrides, HomeItemPositions } from '@/types/game.types';
import type { CenterPanelConfig } from '@/components/game/ZoneEditor';
import type { MovementWaypoint } from '@/data/locations';

const STORAGE_KEY = 'guild-life-zone-config';

export interface ZoneEditorSaveData {
  zones: ZoneConfig[];
  centerPanel: CenterPanelConfig;
  paths: Record<string, MovementWaypoint[]>;
  layout?: CenterPanelLayout; // Optional for backwards compat with pre-layout saves
  animationLayers?: AnimationLayerConfig[]; // Optional for backwards compat
  mobileOverrides?: MobileZoneOverrides; // Optional for backwards compat
  homeItemPositions?: HomeItemPositions; // Optional for backwards compat
  savedAt: number;
}

/** Default home item positions matching the hardcoded values in RoomScene.tsx */
export const DEFAULT_HOME_ITEM_POSITIONS: HomeItemPositions = {
  // Appliances
  'scrying-mirror':      { left: 8,  bottom: 38 },
  'simple-scrying-glass':{ left: 8,  bottom: 38 },
  'memory-crystal':      { left: 72, bottom: 44 },
  'music-box':           { left: 60, bottom: 28 },
  'cooking-fire':        { left: 82, bottom: 22 },
  'preservation-box':    { left: 85, bottom: 38 },
  'arcane-tome':         { left: 22, bottom: 30 },
  'frost-chest':         { left: 90, bottom: 32 },
  // Durables
  'candles':      { left: 45, bottom: 52 },
  'blanket':      { left: 35, bottom: 18 },
  'furniture':    { left: 38, bottom: 32 },
  'glow-orb':     { left: 50, bottom: 58 },
  'warmth-stone': { left: 75, bottom: 16 },
  'dagger':       { left: 15, bottom: 52 },
  'sword':        { left: 12, bottom: 56 },
  'shield':       { left: 18, bottom: 56 },
};

/**
 * Save zone editor config to localStorage
 */
export function saveZoneConfig(
  zones: ZoneConfig[],
  centerPanel: CenterPanelConfig,
  paths: Record<string, MovementWaypoint[]>,
  layout?: CenterPanelLayout,
  animationLayers?: AnimationLayerConfig[],
  mobileOverrides?: MobileZoneOverrides,
  homeItemPositions?: HomeItemPositions,
): boolean {
  try {
    const data: ZoneEditorSaveData = {
      zones,
      centerPanel,
      paths,
      layout,
      animationLayers,
      mobileOverrides,
      homeItemPositions,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('[ZoneStorage] Failed to save zone config:', e);
    return false;
  }
}

/**
 * Load zone editor config from localStorage
 * Returns null if no saved config exists
 */
export function loadZoneConfig(): ZoneEditorSaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: ZoneEditorSaveData = JSON.parse(raw);

    // Basic validation
    if (!Array.isArray(data.zones) || !data.centerPanel || !data.paths) {
      console.warn('[ZoneStorage] Invalid save data, ignoring');
      return null;
    }

    return data;
  } catch (e) {
    console.error('[ZoneStorage] Failed to load zone config:', e);
    return null;
  }
}

/**
 * Clear saved zone config (reset to defaults)
 */
export function clearZoneConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if a saved zone config exists
 */
export function hasSavedZoneConfig(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
