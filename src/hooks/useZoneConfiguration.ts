import { useState, useEffect } from 'react';
import type { ZoneConfig, CenterPanelLayout } from '@/types/game.types';
import type { CenterPanelConfig } from '@/components/game/ZoneEditor';
import type { MovementWaypoint } from '@/data/locations';
import { ZONE_CONFIGS, LOCATIONS, MOVEMENT_PATHS } from '@/data/locations';
import { loadZoneConfig, saveZoneConfig, clearZoneConfig } from '@/data/zoneStorage';
import { DEFAULT_LAYOUT } from '@/hooks/useZoneEditorState';
import { toast } from 'sonner';

const DEFAULT_CENTER_PANEL: CenterPanelConfig = {
  top: 22.6,
  left: 22.0,
  width: 56.4,
  height: 53.6,
};

// Merge saved zones with current ZONE_CONFIGS so newly added locations always appear
function mergeWithDefaults(savedZones: ZoneConfig[]): ZoneConfig[] {
  const savedIds = new Set(savedZones.map(z => z.id));
  const missing = ZONE_CONFIGS.filter(z => !savedIds.has(z.id));
  return missing.length > 0 ? [...savedZones, ...missing] : savedZones;
}

export function useZoneConfiguration() {
  const [customZones, setCustomZones] = useState<ZoneConfig[]>(() => {
    const saved = loadZoneConfig();
    return saved ? mergeWithDefaults(saved.zones) : ZONE_CONFIGS;
  });

  const [centerPanel, setCenterPanel] = useState<CenterPanelConfig>(() => {
    const saved = loadZoneConfig();
    return saved ? saved.centerPanel : DEFAULT_CENTER_PANEL;
  });

  const [layout, setLayout] = useState<CenterPanelLayout>(() => {
    const saved = loadZoneConfig();
    return saved?.layout || DEFAULT_LAYOUT;
  });

  // Load saved movement paths on mount
  useEffect(() => {
    const saved = loadZoneConfig();
    if (saved) {
      Object.keys(MOVEMENT_PATHS).forEach(k => delete MOVEMENT_PATHS[k]);
      Object.entries(saved.paths).forEach(([k, v]) => { MOVEMENT_PATHS[k] = v; });
    }
  }, []);

  const handleSaveZones = (zones: ZoneConfig[], newCenterPanel: CenterPanelConfig, paths?: Record<string, MovementWaypoint[]>, newLayout?: CenterPanelLayout) => {
    setCustomZones(zones);
    setCenterPanel(newCenterPanel);
    if (newLayout) setLayout(newLayout);
    // Apply movement paths to the global MOVEMENT_PATHS object
    const activePaths = paths || { ...MOVEMENT_PATHS };
    if (paths) {
      Object.keys(MOVEMENT_PATHS).forEach(k => delete MOVEMENT_PATHS[k]);
      Object.entries(paths).forEach(([k, v]) => { MOVEMENT_PATHS[k] = v; });
    }
    // Persist to localStorage
    saveZoneConfig(zones, newCenterPanel, activePaths, newLayout);
    toast.success('Zone config saved to localStorage');
  };

  const handleResetZones = () => {
    clearZoneConfig();
    setCustomZones(ZONE_CONFIGS);
    setCenterPanel(DEFAULT_CENTER_PANEL);
    setLayout(DEFAULT_LAYOUT);
    Object.keys(MOVEMENT_PATHS).forEach(k => delete MOVEMENT_PATHS[k]);
    toast.success('Zone config reset to defaults');
  };

  // Get location with custom zones applied
  const getLocationWithCustomPosition = (locationId: string) => {
    const location = LOCATIONS.find(l => l.id === locationId);
    const customZone = customZones.find(z => z.id === locationId);
    if (location && customZone) {
      return {
        ...location,
        position: {
          top: `${customZone.y}%`,
          left: `${customZone.x}%`,
          width: `${customZone.width}%`,
          height: `${customZone.height}%`,
        },
      };
    }
    return location;
  };

  return {
    customZones,
    centerPanel,
    layout,
    handleSaveZones,
    handleResetZones,
    getLocationWithCustomPosition,
  };
}
