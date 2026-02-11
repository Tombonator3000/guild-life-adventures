import { useState, useRef, useCallback, useEffect } from 'react';
import { ZONE_CONFIGS, BOARD_PATH, MOVEMENT_PATHS } from '@/data/locations';
import { hasSavedZoneConfig } from '@/data/zoneStorage';
import type { ZoneConfig, LocationId, LayoutElement, LayoutElementId, CenterPanelLayout } from '@/types/game.types';
import type { MovementWaypoint } from '@/data/locations';

export interface CenterPanelConfig {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type EditorMode = 'zones' | 'paths' | 'layout';

// Default layout: NPC left column, text right column, item preview below NPC
export const DEFAULT_LAYOUT: CenterPanelLayout = {
  npc: { x: 0, y: 0, width: 25, height: 100 },
  text: { x: 27, y: 0, width: 73, height: 100 },
  itemPreview: { x: 0, y: 60, width: 25, height: 40 },
};

export const LAYOUT_ELEMENT_LABELS: Record<LayoutElementId, { label: string; color: string; borderColor: string }> = {
  npc: { label: 'NPC Portrait', color: 'rgba(168, 85, 247, 0.3)', borderColor: '#a855f7' },
  text: { label: 'Text / Content', color: 'rgba(59, 130, 246, 0.3)', borderColor: '#3b82f6' },
  itemPreview: { label: 'Item Preview', color: 'rgba(245, 158, 11, 0.3)', borderColor: '#f59e0b' },
};

const DEFAULT_CENTER_PANEL: CenterPanelConfig = {
  top: 22.6,
  left: 22.0,
  width: 56.4,
  height: 53.6,
};

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
  onSave: (configs: ZoneConfig[], centerPanel: CenterPanelConfig, paths: Record<string, MovementWaypoint[]>, layout: CenterPanelLayout) => void;
  onReset?: () => void;
  initialCenterPanel?: CenterPanelConfig;
  initialZones?: ZoneConfig[];
  initialPaths?: Record<string, MovementWaypoint[]>;
  initialLayout?: CenterPanelLayout;
}

export function useZoneEditorState({ onClose, onSave, onReset, initialCenterPanel, initialZones, initialPaths, initialLayout }: UseZoneEditorStateProps) {
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

    const fullCode = `// Zone configurations for game board locations
export const ZONE_CONFIGS: ZoneConfig[] = [
${configStr}
];

// Center info panel configuration
${centerPanelStr}

${layoutStr}

${pathsStr}`;

    navigator.clipboard.writeText(fullCode);
    alert('Full configuration copied to clipboard!\n\nIncludes:\n- ZONE_CONFIGS for locations\n- CENTER_PANEL_CONFIG for info panel\n- CENTER_PANEL_LAYOUT for sub-elements\n- MOVEMENT_PATHS for player movement');
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
  } : undefined;

  const handleSave = () => onSave(zones, centerPanel, paths, layout);

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
  };
}
