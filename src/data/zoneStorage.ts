/**
 * Zone Editor localStorage persistence
 * Saves/loads zone configurations, center panel, layout, and movement paths
 * so edits survive page reloads without needing to copy code.
 */

import type { ZoneConfig, CenterPanelLayout, AnimationLayerConfig } from '@/types/game.types';
import type { CenterPanelConfig } from '@/components/game/ZoneEditor';
import type { MovementWaypoint } from '@/data/locations';

const STORAGE_KEY = 'guild-life-zone-config';

export interface ZoneEditorSaveData {
  zones: ZoneConfig[];
  centerPanel: CenterPanelConfig;
  paths: Record<string, MovementWaypoint[]>;
  layout?: CenterPanelLayout; // Optional for backwards compat with pre-layout saves
  animationLayers?: AnimationLayerConfig[]; // Optional for backwards compat
  savedAt: number;
}

/**
 * Save zone editor config to localStorage
 */
export function saveZoneConfig(
  zones: ZoneConfig[],
  centerPanel: CenterPanelConfig,
  paths: Record<string, MovementWaypoint[]>,
  layout?: CenterPanelLayout,
  animationLayers?: AnimationLayerConfig[],
): boolean {
  try {
    const data: ZoneEditorSaveData = {
      zones,
      centerPanel,
      paths,
      layout,
      animationLayers,
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
