import { useState, useRef, useCallback, useEffect } from 'react';
import { ZONE_CONFIGS, BOARD_PATH, MOVEMENT_PATHS, CENTER_PANEL_CONFIG, CENTER_PANEL_LAYOUT, MOBILE_CENTER_PANEL_CONFIG, MOBILE_CENTER_PANEL_LAYOUT, MOBILE_ZONE_CONFIGS } from '@/data/locations';
import { hasSavedZoneConfig } from '@/data/zoneStorage';
import type { ZoneConfig, LocationId, LayoutElement, LayoutElementId, CenterPanelLayout, AnimationLayerConfig, MobileZoneOverrides } from '@/types/game.types';
import type { MovementWaypoint } from '@/data/locations';

export interface CenterPanelConfig {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type EditorMode = 'zones' | 'paths' | 'layout' | 'animations' | 'mobile';

// Default animation layers — each entry is a draggable group of animated elements on the board
export const DEFAULT_ANIMATION_LAYERS: AnimationLayerConfig[] = [
  { id: 'graveyard-crows', label: 'Graveyard Crows', cx: 3.0, cy: 30, orbitRadius: 1.0, size: 1.0, speed: 1.0, visible: true },
];

// Default layout: NPC left column, text right column, item preview below NPC
export const DEFAULT_LAYOUT: CenterPanelLayout = CENTER_PANEL_LAYOUT;

export const LAYOUT_ELEMENT_LABELS: Record<LayoutElementId, { label: string; color: string; borderColor: string }> = {
  npc: { label: 'NPC Portrait', color: 'rgba(168, 85, 247, 0.3)', borderColor: '#a855f7' },
  text: { label: 'Text / Content', color: 'rgba(59, 130, 246, 0.3)', borderColor: '#3b82f6' },
  itemPreview: { label: 'Item Preview', color: 'rgba(245, 158, 11, 0.3)', borderColor: '#f59e0b' },
};

const DEFAULT_CENTER_PANEL: CenterPanelConfig = CENTER_PANEL_CONFIG;

export const DEFAULT_MOBILE_CENTER_PANEL: CenterPanelConfig = MOBILE_CENTER_PANEL_CONFIG;

export const DEFAULT_MOBILE_LAYOUT: CenterPanelLayout = MOBILE_CENTER_PANEL_LAYOUT;

// Get adjacent location pairs (edges in the ring)
export function getAdjacentPairs(): [LocationId, LocationId][] {
  const pairs: [LocationId, LocationId][] = [];
  for (let i = 0; i < BOARD_PATH.length; i++) {
    const next = (i + 1) % BOARD_PATH.length;
    pairs.push([BOARD_PATH[i], BOARD_PATH[next]]);
  }
  return pairs;
}

// Get zone center for a location
export function getZoneCenter(zones: ZoneConfig[], locationId: LocationId): [number, number] {
  const zone = zones.find(z => z.id === locationId);
  if (!zone) return [50, 50];
  return [zone.x + zone.width / 2, zone.y + zone.height - 5];
}

interface UseZoneEditorStateProps {
  onClose: () => void;
  onSave: (configs: ZoneConfig[], centerPanel: CenterPanelConfig, paths: Record<string, MovementWaypoint[]>, layout: CenterPanelLayout, animationLayers: AnimationLayerConfig[], mobileOverrides?: MobileZoneOverrides) => void;
  onReset?: () => void;
  initialCenterPanel?: CenterPanelConfig;
  initialZones?: ZoneConfig[];
  initialPaths?: Record<string, MovementWaypoint[]>;
  initialLayout?: CenterPanelLayout;
  initialAnimationLayers?: AnimationLayerConfig[];
  initialMobileOverrides?: MobileZoneOverrides;
}

export function useZoneEditorState({ onClose, onSave, onReset, initialCenterPanel, initialZones, initialPaths, initialLayout, initialAnimationLayers, initialMobileOverrides }: UseZoneEditorStateProps) {
  const [zones, setZones] = useState<ZoneConfig[]>(() => {
    if (!initialZones) return [...ZONE_CONFIGS];
    // Merge with defaults so newly added locations always appear
    const savedIds = new Set(initialZones.map(z => z.id));
    const missing = ZONE_CONFIGS.filter(z => !savedIds.has(z.id));
    return missing.length > 0 ? [...initialZones, ...missing] : [...initialZones];
  });
  const [selectedZone, setSelectedZone] = useState<LocationId | 'center-panel' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [centerPanel, setCenterPanel] = useState<CenterPanelConfig>(initialCenterPanel || DEFAULT_CENTER_PANEL);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; zone: ZoneConfig } | null>(null);
  const centerDragStartRef = useRef<{ x: number; y: number; panel: CenterPanelConfig } | null>(null);

  // Path drawing state
  const [editorMode, setEditorMode] = useState<EditorMode>('zones');
  const [paths, setPaths] = useState<Record<string, MovementWaypoint[]>>(initialPaths ? { ...initialPaths } : { ...MOVEMENT_PATHS });
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null); // "fromId_toId"
  const [draggingWaypoint, setDraggingWaypoint] = useState<number | null>(null); // index in waypoints array

  // Layout editing state (center panel sub-elements)
  const [layout, setLayout] = useState<CenterPanelLayout>(initialLayout || { ...DEFAULT_LAYOUT });
  const [selectedLayoutElement, setSelectedLayoutElement] = useState<LayoutElementId | null>(null);
  const layoutDragStartRef = useRef<{ x: number; y: number; element: LayoutElement } | null>(null);

  // Animation layer editing state
  const [animationLayers, setAnimationLayers] = useState<AnimationLayerConfig[]>(
    initialAnimationLayers || [...DEFAULT_ANIMATION_LAYERS]
  );
  const [selectedAnimationLayer, setSelectedAnimationLayer] = useState<string | null>(null);
  const animDragStartRef = useRef<{ x: number; y: number; layer: AnimationLayerConfig } | null>(null);

  // Mobile overrides state
  const [mobileZones, setMobileZones] = useState<ZoneConfig[]>(() => {
    if (initialMobileOverrides?.zones) {
      const savedIds = new Set(initialMobileOverrides.zones.map(z => z.id));
      const missing = MOBILE_ZONE_CONFIGS.filter(z => !savedIds.has(z.id));
      return missing.length > 0 ? [...initialMobileOverrides.zones, ...missing] : [...initialMobileOverrides.zones];
    }
    return [...MOBILE_ZONE_CONFIGS];
  });
  const [mobileCenterPanel, setMobileCenterPanel] = useState<CenterPanelConfig>(
    initialMobileOverrides?.centerPanel || DEFAULT_MOBILE_CENTER_PANEL
  );
  const [mobileLayout, setMobileLayout] = useState<CenterPanelLayout>(
    initialMobileOverrides?.layout || { ...DEFAULT_MOBILE_LAYOUT }
  );
  const [selectedMobileZone, setSelectedMobileZone] = useState<LocationId | 'center-panel' | null>(null);
  const [selectedMobileLayoutElement, setSelectedMobileLayoutElement] = useState<LayoutElementId | null>(null);
  const mobileDragStartRef = useRef<{ x: number; y: number; zone: ZoneConfig } | null>(null);
  const mobileCenterDragStartRef = useRef<{ x: number; y: number; panel: CenterPanelConfig } | null>(null);
  const mobileLayoutDragStartRef = useRef<{ x: number; y: number; element: LayoutElement } | null>(null);

  const adjacentPairs = getAdjacentPairs();

  const getPercentPosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  // === ZONE EDITING HANDLERS ===

  const handleMouseDown = useCallback((e: React.MouseEvent, zoneId: LocationId, mode: 'move' | 'resize') => {
    e.preventDefault();
    if (editorMode !== 'zones') return;
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;

    setSelectedZone(zoneId);
    setIsDragging(true);
    setDragMode(mode);
    const pos = getPercentPosition(e.clientX, e.clientY);
    dragStartRef.current = { x: pos.x, y: pos.y, zone: { ...zone } };
    centerDragStartRef.current = null;
  }, [zones, getPercentPosition, editorMode]);

  const handleCenterPanelMouseDown = useCallback((e: React.MouseEvent, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    if (editorMode !== 'zones') return;
    setSelectedZone('center-panel');
    setIsDragging(true);
    setDragMode(mode);
    const pos = getPercentPosition(e.clientX, e.clientY);
    centerDragStartRef.current = { x: pos.x, y: pos.y, panel: { ...centerPanel } };
    dragStartRef.current = null;
  }, [centerPanel, getPercentPosition, editorMode]);

  // === LAYOUT EDITING HANDLERS ===

  // Convert board-level mouse coords to center-panel-relative percentages
  const getBoardToCenterPanelPercent = useCallback((boardX: number, boardY: number) => {
    return {
      x: ((boardX - centerPanel.left) / centerPanel.width) * 100,
      y: ((boardY - centerPanel.top) / centerPanel.height) * 100,
    };
  }, [centerPanel]);

  const handleLayoutMouseDown = useCallback((e: React.MouseEvent, elementId: LayoutElementId, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    if (editorMode !== 'layout') return;
    setSelectedLayoutElement(elementId);
    setIsDragging(true);
    setDragMode(mode);
    const pos = getPercentPosition(e.clientX, e.clientY);
    const cpPos = getBoardToCenterPanelPercent(pos.x, pos.y);
    layoutDragStartRef.current = { x: cpPos.x, y: cpPos.y, element: { ...layout[elementId] } };
    dragStartRef.current = null;
    centerDragStartRef.current = null;
  }, [editorMode, layout, getPercentPosition, getBoardToCenterPanelPercent]);

  // === ANIMATION LAYER EDITING HANDLERS ===

  const handleAnimationLayerMouseDown = useCallback((e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (editorMode !== 'animations') return;
    const layer = animationLayers.find(l => l.id === layerId);
    if (!layer) return;
    setSelectedAnimationLayer(layerId);
    setIsDragging(true);
    setDragMode('move');
    const pos = getPercentPosition(e.clientX, e.clientY);
    animDragStartRef.current = { x: pos.x, y: pos.y, layer: { ...layer } };
    dragStartRef.current = null;
    centerDragStartRef.current = null;
    layoutDragStartRef.current = null;
  }, [editorMode, animationLayers, getPercentPosition]);

  // === MOBILE EDITING HANDLERS ===

  // Convert board-level mouse coords to mobile center-panel-relative percentages
  const getBoardToMobileCenterPanelPercent = useCallback((boardX: number, boardY: number) => {
    return {
      x: ((boardX - mobileCenterPanel.left) / mobileCenterPanel.width) * 100,
      y: ((boardY - mobileCenterPanel.top) / mobileCenterPanel.height) * 100,
    };
  }, [mobileCenterPanel]);

  const handleMobileZoneMouseDown = useCallback((e: React.MouseEvent, zoneId: LocationId, mode: 'move' | 'resize') => {
    e.preventDefault();
    if (editorMode !== 'mobile') return;
    const zone = mobileZones.find(z => z.id === zoneId);
    if (!zone) return;
    setSelectedMobileZone(zoneId);
    setIsDragging(true);
    setDragMode(mode);
    const pos = getPercentPosition(e.clientX, e.clientY);
    mobileDragStartRef.current = { x: pos.x, y: pos.y, zone: { ...zone } };
    mobileCenterDragStartRef.current = null;
    mobileLayoutDragStartRef.current = null;
  }, [mobileZones, getPercentPosition, editorMode]);

  const handleMobileCenterPanelMouseDown = useCallback((e: React.MouseEvent, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    if (editorMode !== 'mobile') return;
    setSelectedMobileZone('center-panel');
    setIsDragging(true);
    setDragMode(mode);
    const pos = getPercentPosition(e.clientX, e.clientY);
    mobileCenterDragStartRef.current = { x: pos.x, y: pos.y, panel: { ...mobileCenterPanel } };
    mobileDragStartRef.current = null;
    mobileLayoutDragStartRef.current = null;
  }, [mobileCenterPanel, getPercentPosition, editorMode]);

  const handleMobileLayoutMouseDown = useCallback((e: React.MouseEvent, elementId: LayoutElementId, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    if (editorMode !== 'mobile') return;
    setSelectedMobileLayoutElement(elementId);
    setIsDragging(true);
    setDragMode(mode);
    const pos = getPercentPosition(e.clientX, e.clientY);
    const cpPos = getBoardToMobileCenterPanelPercent(pos.x, pos.y);
    mobileLayoutDragStartRef.current = { x: cpPos.x, y: cpPos.y, element: { ...mobileLayout[elementId] } };
    mobileDragStartRef.current = null;
    mobileCenterDragStartRef.current = null;
  }, [editorMode, mobileLayout, getPercentPosition, getBoardToMobileCenterPanelPercent]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getPercentPosition(e.clientX, e.clientY);

    // Handle waypoint dragging in path mode
    if (editorMode === 'paths' && draggingWaypoint !== null && selectedEdge) {
      setPaths(prev => {
        const waypoints = [...(prev[selectedEdge] || [])];
        waypoints[draggingWaypoint] = [
          Math.max(0, Math.min(100, Math.round(pos.x * 10) / 10)),
          Math.max(0, Math.min(100, Math.round(pos.y * 10) / 10)),
        ];
        return { ...prev, [selectedEdge]: waypoints };
      });
      return;
    }

    // Handle layout element dragging
    if (editorMode === 'layout' && isDragging && selectedLayoutElement && layoutDragStartRef.current) {
      const cpPos = getBoardToCenterPanelPercent(pos.x, pos.y);
      const deltaX = cpPos.x - layoutDragStartRef.current.x;
      const deltaY = cpPos.y - layoutDragStartRef.current.y;
      const original = layoutDragStartRef.current.element;

      setLayout(prev => {
        const el = prev[selectedLayoutElement];
        if (dragMode === 'move') {
          return {
            ...prev,
            [selectedLayoutElement]: {
              ...el,
              x: Math.max(0, Math.min(100 - el.width, Math.round((original.x + deltaX) * 10) / 10)),
              y: Math.max(0, Math.min(100 - el.height, Math.round((original.y + deltaY) * 10) / 10)),
            },
          };
        } else if (dragMode === 'resize') {
          return {
            ...prev,
            [selectedLayoutElement]: {
              ...el,
              width: Math.max(5, Math.min(100 - el.x, Math.round((original.width + deltaX) * 10) / 10)),
              height: Math.max(5, Math.min(100 - el.y, Math.round((original.height + deltaY) * 10) / 10)),
            },
          };
        }
        return prev;
      });
      return;
    }

    // Handle animation layer dragging
    if (editorMode === 'animations' && isDragging && selectedAnimationLayer && animDragStartRef.current) {
      const deltaX = pos.x - animDragStartRef.current.x;
      const deltaY = pos.y - animDragStartRef.current.y;
      const original = animDragStartRef.current.layer;

      setAnimationLayers(prev => prev.map(l => {
        if (l.id !== selectedAnimationLayer) return l;
        return {
          ...l,
          cx: Math.max(0, Math.min(100, Math.round((original.cx + deltaX) * 10) / 10)),
          cy: Math.max(0, Math.min(100, Math.round((original.cy + deltaY) * 10) / 10)),
        };
      }));
      return;
    }

    // Handle mobile mode dragging
    if (editorMode === 'mobile' && isDragging) {
      // Mobile layout element dragging
      if (selectedMobileLayoutElement && mobileLayoutDragStartRef.current) {
        const cpPos = getBoardToMobileCenterPanelPercent(pos.x, pos.y);
        const deltaX = cpPos.x - mobileLayoutDragStartRef.current.x;
        const deltaY = cpPos.y - mobileLayoutDragStartRef.current.y;
        const original = mobileLayoutDragStartRef.current.element;

        setMobileLayout(prev => {
          const el = prev[selectedMobileLayoutElement];
          if (dragMode === 'move') {
            return {
              ...prev,
              [selectedMobileLayoutElement]: {
                ...el,
                x: Math.max(0, Math.min(100 - el.width, Math.round((original.x + deltaX) * 10) / 10)),
                y: Math.max(0, Math.min(100 - el.height, Math.round((original.y + deltaY) * 10) / 10)),
              },
            };
          } else if (dragMode === 'resize') {
            return {
              ...prev,
              [selectedMobileLayoutElement]: {
                ...el,
                width: Math.max(5, Math.min(100 - el.x, Math.round((original.width + deltaX) * 10) / 10)),
                height: Math.max(5, Math.min(100 - el.y, Math.round((original.height + deltaY) * 10) / 10)),
              },
            };
          }
          return prev;
        });
        return;
      }

      // Mobile center panel dragging
      if (selectedMobileZone === 'center-panel' && mobileCenterDragStartRef.current) {
        const deltaX = pos.x - mobileCenterDragStartRef.current.x;
        const deltaY = pos.y - mobileCenterDragStartRef.current.y;
        const original = mobileCenterDragStartRef.current.panel;

        if (dragMode === 'move') {
          setMobileCenterPanel({
            ...mobileCenterPanel,
            left: Math.max(0, Math.min(100 - mobileCenterPanel.width, original.left + deltaX)),
            top: Math.max(0, Math.min(100 - mobileCenterPanel.height, original.top + deltaY)),
          });
        } else if (dragMode === 'resize') {
          setMobileCenterPanel({
            ...mobileCenterPanel,
            width: Math.max(10, Math.min(100 - mobileCenterPanel.left, original.width + deltaX)),
            height: Math.max(10, Math.min(100 - mobileCenterPanel.top, original.height + deltaY)),
          });
        }
        return;
      }

      // Mobile zone dragging
      if (selectedMobileZone && selectedMobileZone !== 'center-panel' && mobileDragStartRef.current) {
        const deltaX = pos.x - mobileDragStartRef.current.x;
        const deltaY = pos.y - mobileDragStartRef.current.y;
        const originalZone = mobileDragStartRef.current.zone;

        setMobileZones(prev => prev.map(z => {
          if (z.id !== selectedMobileZone) return z;
          if (dragMode === 'move') {
            return {
              ...z,
              x: Math.max(0, Math.min(100 - z.width, originalZone.x + deltaX)),
              y: Math.max(0, Math.min(100 - z.height, originalZone.y + deltaY)),
            };
          } else if (dragMode === 'resize') {
            return {
              ...z,
              width: Math.max(5, Math.min(100 - z.x, originalZone.width + deltaX)),
              height: Math.max(5, Math.min(100 - z.y, originalZone.height + deltaY)),
            };
          }
          return z;
        }));
        return;
      }
    }

    if (!isDragging || !selectedZone || editorMode !== 'zones') return;

    // Handle center panel dragging
    if (selectedZone === 'center-panel' && centerDragStartRef.current) {
      const deltaX = pos.x - centerDragStartRef.current.x;
      const deltaY = pos.y - centerDragStartRef.current.y;
      const original = centerDragStartRef.current.panel;

      if (dragMode === 'move') {
        setCenterPanel({
          ...centerPanel,
          left: Math.max(0, Math.min(100 - centerPanel.width, original.left + deltaX)),
          top: Math.max(0, Math.min(100 - centerPanel.height, original.top + deltaY)),
        });
      } else if (dragMode === 'resize') {
        setCenterPanel({
          ...centerPanel,
          width: Math.max(10, Math.min(100 - centerPanel.left, original.width + deltaX)),
          height: Math.max(10, Math.min(100 - centerPanel.top, original.height + deltaY)),
        });
      }
      return;
    }

    // Handle zone dragging
    if (!dragStartRef.current) return;

    const deltaX = pos.x - dragStartRef.current.x;
    const deltaY = pos.y - dragStartRef.current.y;
    const originalZone = dragStartRef.current.zone;

    setZones(prev => prev.map(z => {
      if (z.id !== selectedZone) return z;

      if (dragMode === 'move') {
        return {
          ...z,
          x: Math.max(0, Math.min(100 - z.width, originalZone.x + deltaX)),
          y: Math.max(0, Math.min(100 - z.height, originalZone.y + deltaY)),
        };
      } else if (dragMode === 'resize') {
        return {
          ...z,
          width: Math.max(5, Math.min(100 - z.x, originalZone.width + deltaX)),
          height: Math.max(5, Math.min(100 - z.y, originalZone.height + deltaY)),
        };
      }
      return z;
    }));
  }, [isDragging, selectedZone, dragMode, getPercentPosition, centerPanel, editorMode, draggingWaypoint, selectedEdge]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
    setDraggingWaypoint(null);
    dragStartRef.current = null;
    centerDragStartRef.current = null;
    layoutDragStartRef.current = null;
    animDragStartRef.current = null;
    mobileDragStartRef.current = null;
    mobileCenterDragStartRef.current = null;
    mobileLayoutDragStartRef.current = null;
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp();
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleMouseUp]);

  // === PATH DRAWING HANDLERS ===

  // Click on the board to add a waypoint (only in path mode with a selected edge)
  const handleBoardClick = useCallback((e: React.MouseEvent) => {
    if (editorMode !== 'paths' || !selectedEdge) return;
    // Don't add waypoints when clicking on existing waypoints or zones
    if ((e.target as HTMLElement).dataset.waypointIndex || (e.target as HTMLElement).dataset.zoneId) return;

    const pos = getPercentPosition(e.clientX, e.clientY);
    const point: MovementWaypoint = [
      Math.round(pos.x * 10) / 10,
      Math.round(pos.y * 10) / 10,
    ];

    setPaths(prev => {
      const existing = prev[selectedEdge] || [];
      return { ...prev, [selectedEdge]: [...existing, point] };
    });
  }, [editorMode, selectedEdge, getPercentPosition]);

  const removeWaypoint = useCallback((edgeKey: string, index: number) => {
    setPaths(prev => {
      const waypoints = [...(prev[edgeKey] || [])];
      waypoints.splice(index, 1);
      return { ...prev, [edgeKey]: waypoints };
    });
  }, []);

  const clearEdgePath = useCallback((edgeKey: string) => {
    setPaths(prev => {
      const next = { ...prev };
      delete next[edgeKey];
      return next;
    });
  }, []);

  // === INPUT HANDLERS ===

  const handleZoneInput = (zoneId: LocationId, field: keyof ZoneConfig, value: number) => {
    setZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, [field]: value } : z
    ));
  };

  const handleCenterPanelInput = (field: keyof CenterPanelConfig, value: number) => {
    setCenterPanel(prev => ({ ...prev, [field]: value }));
  };

  const handleLayoutInput = (elementId: LayoutElementId, field: keyof LayoutElement, value: number) => {
    setLayout(prev => ({
      ...prev,
      [elementId]: { ...prev[elementId], [field]: value },
    }));
  };

  const handleAnimationInput = (layerId: string, field: keyof AnimationLayerConfig, value: number | boolean) => {
    setAnimationLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, [field]: value } : l
    ));
  };

  // === MOBILE INPUT HANDLERS ===

  const handleMobileZoneInput = (zoneId: LocationId, field: keyof ZoneConfig, value: number) => {
    setMobileZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, [field]: value } : z
    ));
  };

  const handleMobileCenterPanelInput = (field: keyof CenterPanelConfig, value: number) => {
    setMobileCenterPanel(prev => ({ ...prev, [field]: value }));
  };

  const handleMobileLayoutInput = (elementId: LayoutElementId, field: keyof LayoutElement, value: number) => {
    setMobileLayout(prev => ({
      ...prev,
      [elementId]: { ...prev[elementId], [field]: value },
    }));
  };

  // Copy desktop zones → mobile as starting point
  const copyDesktopToMobile = () => {
    setMobileZones(zones.map(z => ({ ...z })));
    setMobileCenterPanel({ ...centerPanel });
    setMobileLayout({ ...layout });
  };

  // === EXPORT ===

  const exportConfig = () => {
    const configStr = zones.map(z =>
      `  { id: '${z.id}', x: ${z.x.toFixed(1)}, y: ${z.y.toFixed(1)}, width: ${z.width.toFixed(1)}, height: ${z.height.toFixed(1)} },`
    ).join('\n');

    const centerPanelStr = `export const CENTER_PANEL_CONFIG = {
  top: ${centerPanel.top.toFixed(1)},
  left: ${centerPanel.left.toFixed(1)},
  width: ${centerPanel.width.toFixed(1)},
  height: ${centerPanel.height.toFixed(1)},
};`;

    // Export movement paths
    const pathEntries = Object.entries(paths).filter(([, v]) => v.length > 0);
    const pathsStr = pathEntries.length > 0
      ? `// Movement paths between adjacent locations (waypoints as [x%, y%])\nexport const MOVEMENT_PATHS: Record<string, MovementWaypoint[]> = {\n${pathEntries.map(([key, waypoints]) =>
        `  '${key}': [${waypoints.map(([x, y]) => `[${x.toFixed(1)}, ${y.toFixed(1)}]`).join(', ')}],`
      ).join('\n')}\n};`
      : `export const MOVEMENT_PATHS: Record<string, MovementWaypoint[]> = {};`;

    // Export layout config
    const layoutStr = `// Center panel layout — sub-element positions (% of center panel)
export const CENTER_PANEL_LAYOUT: CenterPanelLayout = {
  npc: { x: ${layout.npc.x.toFixed(1)}, y: ${layout.npc.y.toFixed(1)}, width: ${layout.npc.width.toFixed(1)}, height: ${layout.npc.height.toFixed(1)} },
  text: { x: ${layout.text.x.toFixed(1)}, y: ${layout.text.y.toFixed(1)}, width: ${layout.text.width.toFixed(1)}, height: ${layout.text.height.toFixed(1)} },
  itemPreview: { x: ${layout.itemPreview.x.toFixed(1)}, y: ${layout.itemPreview.y.toFixed(1)}, width: ${layout.itemPreview.width.toFixed(1)}, height: ${layout.itemPreview.height.toFixed(1)} },
};`;

    // Export mobile config
    const mobileConfigStr = mobileZones.map(z =>
      `  { id: '${z.id}', x: ${z.x.toFixed(1)}, y: ${z.y.toFixed(1)}, width: ${z.width.toFixed(1)}, height: ${z.height.toFixed(1)} },`
    ).join('\n');
    const mobileStr = `// Mobile zone overrides
export const MOBILE_ZONE_CONFIGS: ZoneConfig[] = [
${mobileConfigStr}
];

export const MOBILE_CENTER_PANEL_CONFIG = {
  top: ${mobileCenterPanel.top.toFixed(1)},
  left: ${mobileCenterPanel.left.toFixed(1)},
  width: ${mobileCenterPanel.width.toFixed(1)},
  height: ${mobileCenterPanel.height.toFixed(1)},
};

export const MOBILE_CENTER_PANEL_LAYOUT: CenterPanelLayout = {
  npc: { x: ${mobileLayout.npc.x.toFixed(1)}, y: ${mobileLayout.npc.y.toFixed(1)}, width: ${mobileLayout.npc.width.toFixed(1)}, height: ${mobileLayout.npc.height.toFixed(1)} },
  text: { x: ${mobileLayout.text.x.toFixed(1)}, y: ${mobileLayout.text.y.toFixed(1)}, width: ${mobileLayout.text.width.toFixed(1)}, height: ${mobileLayout.text.height.toFixed(1)} },
  itemPreview: { x: ${mobileLayout.itemPreview.x.toFixed(1)}, y: ${mobileLayout.itemPreview.y.toFixed(1)}, width: ${mobileLayout.itemPreview.width.toFixed(1)}, height: ${mobileLayout.itemPreview.height.toFixed(1)} },
};`;

    const fullCode = `// Zone configurations for game board locations
export const ZONE_CONFIGS: ZoneConfig[] = [
${configStr}
];

// Center info panel configuration
${centerPanelStr}

${layoutStr}

${pathsStr}

${mobileStr}`;

    navigator.clipboard.writeText(fullCode);
    alert('Full configuration copied to clipboard!\n\nIncludes:\n- ZONE_CONFIGS for locations\n- CENTER_PANEL_CONFIG for info panel\n- CENTER_PANEL_LAYOUT for sub-elements\n- MOVEMENT_PATHS for player movement\n- MOBILE_ZONE_CONFIGS, MOBILE_CENTER_PANEL_CONFIG, MOBILE_CENTER_PANEL_LAYOUT');
  };

  const selected = selectedZone && selectedZone !== 'center-panel'
    ? zones.find(z => z.id === selectedZone)
    : null;

  // Get the selected edge pair info
  const selectedEdgePair = selectedEdge
    ? adjacentPairs.find(([a, b]) => `${a}_${b}` === selectedEdge)
    : null;

  const handleReset = onReset ? () => {
    onReset();
    setZones([...ZONE_CONFIGS]);
    setCenterPanel(DEFAULT_CENTER_PANEL);
    setPaths({});
    setLayout({ ...DEFAULT_LAYOUT });
    setSelectedLayoutElement(null);
    setAnimationLayers([...DEFAULT_ANIMATION_LAYERS]);
    setSelectedAnimationLayer(null);
    setMobileZones([...MOBILE_ZONE_CONFIGS]);
    setMobileCenterPanel(DEFAULT_MOBILE_CENTER_PANEL);
    setMobileLayout({ ...DEFAULT_MOBILE_LAYOUT });
    setSelectedMobileZone(null);
    setSelectedMobileLayoutElement(null);
  } : undefined;

  const mobileOverrides: MobileZoneOverrides = {
    zones: mobileZones,
    centerPanel: mobileCenterPanel,
    layout: mobileLayout,
  };

  const handleSave = () => onSave(zones, centerPanel, paths, layout, animationLayers, mobileOverrides);

  return {
    zones,
    selectedZone,
    setSelectedZone,
    showGrid,
    setShowGrid,
    showLabels,
    setShowLabels,
    centerPanel,
    containerRef,
    editorMode,
    setEditorMode,
    paths,
    setPaths,
    selectedEdge,
    setSelectedEdge,
    setDraggingWaypoint,
    adjacentPairs,
    handleMouseDown,
    handleCenterPanelMouseDown,
    handleMouseMove,
    handleBoardClick,
    removeWaypoint,
    clearEdgePath,
    handleZoneInput,
    handleCenterPanelInput,
    exportConfig,
    selected,
    selectedEdgePair,
    handleReset,
    handleSave,
    onClose,
    hasSavedConfig: hasSavedZoneConfig(),
    // Layout state
    layout,
    setLayout,
    selectedLayoutElement,
    setSelectedLayoutElement,
    handleLayoutMouseDown,
    handleLayoutInput,
    // Animation layer state
    animationLayers,
    setAnimationLayers,
    selectedAnimationLayer,
    setSelectedAnimationLayer,
    handleAnimationLayerMouseDown,
    handleAnimationInput,
    // Mobile state
    mobileZones,
    setMobileZones,
    mobileCenterPanel,
    setMobileCenterPanel,
    mobileLayout,
    setMobileLayout,
    selectedMobileZone,
    setSelectedMobileZone,
    selectedMobileLayoutElement,
    setSelectedMobileLayoutElement,
    handleMobileZoneMouseDown,
    handleMobileCenterPanelMouseDown,
    handleMobileLayoutMouseDown,
    handleMobileZoneInput,
    handleMobileCenterPanelInput,
    handleMobileLayoutInput,
    copyDesktopToMobile,
    mobileOverrides,
    selectedMobileZoneData: selectedMobileZone && selectedMobileZone !== 'center-panel'
      ? mobileZones.find(z => z.id === selectedMobileZone) : null,
  };
}
