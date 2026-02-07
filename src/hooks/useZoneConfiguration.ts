import { useState, useEffect } from 'react';
import type { ZoneConfig, LocationId } from '@/types/game.types';
import type { CenterPanelConfig } from '@/components/game/ZoneEditor';
import type { MovementWaypoint } from '@/data/locations';
import { ZONE_CONFIGS, LOCATIONS, MOVEMENT_PATHS } from '@/data/locations';
import { loadZoneConfig, saveZoneConfig, clearZoneConfig } from '@/data/zoneStorage';
import { toast } from 'sonner';

const DEFAULT_CENTER_PANEL: CenterPanelConfig = {
  top: 22.6,
  left: 20.8,
  width: 58.5,
  height: 54.7,
};

export function useZoneConfiguration() {
  const [customZones, setCustomZones] = useState<ZoneConfig[]>(() => {
    const saved = loadZoneConfig();
    return saved ? saved.zones : ZONE_CONFIGS;
  });

  const [centerPanel, setCenterPanel] = useState<CenterPanelConfig>(() => {
    const saved = loadZoneConfig();
    return saved ? saved.centerPanel : DEFAULT_CENTER_PANEL;
  });

  // Load saved movement paths on mount
  useEffect(() => {
    const saved = loadZoneConfig();
    if (saved) {
      Object.keys(MOVEMENT_PATHS).forEach(k => delete MOVEMENT_PATHS[k]);
      Object.entries(saved.paths).forEach(([k, v]) => { MOVEMENT_PATHS[k] = v; });
    }
  }, []);

  const handleSaveZones = (zones: ZoneConfig[], newCenterPanel: CenterPanelConfig, paths?: Record<string, MovementWaypoint[]>) => {
    setCustomZones(zones);
    setCenterPanel(newCenterPanel);
    // Apply movement paths to the global MOVEMENT_PATHS object
    const activePaths = paths || { ...MOVEMENT_PATHS };
    if (paths) {
      Object.keys(MOVEMENT_PATHS).forEach(k => delete MOVEMENT_PATHS[k]);
      Object.entries(paths).forEach(([k, v]) => { MOVEMENT_PATHS[k] = v; });
    }
    // Persist to localStorage
    saveZoneConfig(zones, newCenterPanel, activePaths);
    toast.success('Zone config saved to localStorage');
  };

  const handleResetZones = () => {
    clearZoneConfig();
    setCustomZones(ZONE_CONFIGS);
    setCenterPanel(DEFAULT_CENTER_PANEL);
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
    handleSaveZones,
    handleResetZones,
    getLocationWithCustomPosition,
  };
}
