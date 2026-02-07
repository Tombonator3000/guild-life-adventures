import { useState, useRef, useCallback, useEffect } from 'react';
import { ZONE_CONFIGS, BOARD_PATH, MOVEMENT_PATHS, BOARD_ASPECT_RATIO } from '@/data/locations';
import { hasSavedZoneConfig } from '@/data/zoneStorage';
import type { ZoneConfig, LocationId } from '@/types/game.types';
import type { MovementWaypoint } from '@/data/locations';
import gameBoard from '@/assets/game-board.jpeg';

export interface CenterPanelConfig {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ZoneEditorProps {
  onClose: () => void;
  onSave: (configs: ZoneConfig[], centerPanel: CenterPanelConfig, paths: Record<string, MovementWaypoint[]>) => void;
  onReset?: () => void;
  initialCenterPanel?: CenterPanelConfig;
  initialZones?: ZoneConfig[];
  initialPaths?: Record<string, MovementWaypoint[]>;
}

const DEFAULT_CENTER_PANEL: CenterPanelConfig = {
  top: 22.5,
  left: 26.7,
  width: 46.5,
  height: 55.5,
};

// Get adjacent location pairs (edges in the ring)
function getAdjacentPairs(): [LocationId, LocationId][] {
  const pairs: [LocationId, LocationId][] = [];
  for (let i = 0; i < BOARD_PATH.length; i++) {
    const next = (i + 1) % BOARD_PATH.length;
    pairs.push([BOARD_PATH[i], BOARD_PATH[next]]);
  }
  return pairs;
}

// Get zone center for a location
function getZoneCenter(zones: ZoneConfig[], locationId: LocationId): [number, number] {
  const zone = zones.find(z => z.id === locationId);
  if (!zone) return [50, 50];
  return [zone.x + zone.width / 2, zone.y + zone.height - 5];
}

type EditorMode = 'zones' | 'paths';

export function ZoneEditor({ onClose, onSave, onReset, initialCenterPanel, initialZones, initialPaths }: ZoneEditorProps) {
  const [zones, setZones] = useState<ZoneConfig[]>(initialZones ? [...initialZones] : [...ZONE_CONFIGS]);
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

    const fullCode = `// Zone configurations for game board locations
export const ZONE_CONFIGS: ZoneConfig[] = [
${configStr}
];

// Center info panel configuration
${centerPanelStr}

${pathsStr}`;

    navigator.clipboard.writeText(fullCode);
    alert('Full configuration copied to clipboard!\n\nIncludes:\n- ZONE_CONFIGS for locations\n- CENTER_PANEL_CONFIG for info panel\n- MOVEMENT_PATHS for player movement');
  };

  const selected = selectedZone && selectedZone !== 'center-panel'
    ? zones.find(z => z.id === selectedZone)
    : null;

  // Get the selected edge pair info
  const selectedEdgePair = selectedEdge
    ? adjacentPairs.find(([a, b]) => `${a}_${b}` === selectedEdge)
    : null;

  // SVG path lines for visualization
  const renderPaths = () => {
    return adjacentPairs.map(([from, to]) => {
      const key = `${from}_${to}`;
      const fromCenter = getZoneCenter(zones, from);
      const toCenter = getZoneCenter(zones, to);
      const waypoints = paths[key] || [];
      const isSelected = selectedEdge === key;

      // Build the full point list: fromCenter → waypoints → toCenter
      const allPoints: [number, number][] = [fromCenter, ...waypoints, toCenter];

      return (
        <g key={key}>
          {/* The connecting line */}
          <polyline
            points={allPoints.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            stroke={isSelected ? '#22d3ee' : waypoints.length > 0 ? '#4ade80' : '#6b7280'}
            strokeWidth={isSelected ? 0.4 : 0.25}
            strokeDasharray={waypoints.length > 0 ? 'none' : '1 0.5'}
            opacity={isSelected ? 1 : 0.7}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              if (editorMode === 'paths') setSelectedEdge(key);
            }}
          />
          {/* Waypoint dots (only when this edge is selected) */}
          {isSelected && waypoints.map(([x, y], idx) => (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={0.8}
              fill="#22d3ee"
              stroke="#fff"
              strokeWidth={0.2}
              style={{ cursor: 'grab' }}
              data-waypoint-index={idx}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDraggingWaypoint(idx);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeWaypoint(key, idx);
              }}
            />
          ))}
          {/* Show non-selected edge waypoint dots faintly */}
          {!isSelected && waypoints.map(([x, y], idx) => (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={0.4}
              fill="#4ade80"
              opacity={0.5}
            />
          ))}
        </g>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Zone Editor</h2>
        <div className="flex items-center gap-4">
          {/* Mode toggle */}
          <div className="flex bg-gray-800 rounded overflow-hidden">
            <button
              onClick={() => setEditorMode('zones')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                editorMode === 'zones'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Zones
            </button>
            <button
              onClick={() => setEditorMode('paths')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                editorMode === 'paths'
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Paths
            </button>
          </div>
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={e => setShowGrid(e.target.checked)}
            />
            Show Grid
          </label>
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={e => setShowLabels(e.target.checked)}
            />
            Show Labels
          </label>
          <button
            onClick={exportConfig}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Copy Config
          </button>
          {onReset && hasSavedZoneConfig() && (
            <button
              onClick={() => {
                onReset();
                setZones([...ZONE_CONFIGS]);
                setCenterPanel(DEFAULT_CENTER_PANEL);
                setPaths({});
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Reset Defaults
            </button>
          )}
          <button
            onClick={() => onSave(zones, centerPanel, paths)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Apply & Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Board view */}
        <div className="flex-1 p-4 flex items-center justify-center">
          <div
            ref={containerRef}
            className="relative w-full max-w-[1400px] bg-no-repeat cursor-crosshair"
            style={{ backgroundImage: `url(${gameBoard})`, backgroundSize: '100% 100%', aspectRatio: BOARD_ASPECT_RATIO }}
            onMouseMove={handleMouseMove}
            onClick={handleBoardClick}
          >
            {/* Grid overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute top-0 bottom-0 border-l border-white/20"
                    style={{ left: `${(i + 1) * 10}%` }}
                  />
                ))}
                {[...Array(10)].map((_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute left-0 right-0 border-t border-white/20"
                    style={{ top: `${(i + 1) * 10}%` }}
                  />
                ))}
              </div>
            )}

            {/* SVG overlay for path drawing */}
            {editorMode === 'paths' && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ pointerEvents: 'none' }}
              >
                <g style={{ pointerEvents: 'auto' }}>
                  {renderPaths()}
                </g>
              </svg>
            )}

            {/* Center panel - editable (zone mode only) */}
            {editorMode === 'zones' && (
              <div
                className={`absolute border-2 cursor-move transition-colors ${
                  selectedZone === 'center-panel'
                    ? 'border-green-400 bg-green-400/30'
                    : 'border-yellow-400 bg-yellow-400/20 hover:border-yellow-300 hover:bg-yellow-300/30'
                }`}
                style={{
                  top: `${centerPanel.top}%`,
                  left: `${centerPanel.left}%`,
                  width: `${centerPanel.width}%`,
                  height: `${centerPanel.height}%`,
                }}
                onMouseDown={e => handleCenterPanelMouseDown(e, 'move')}
              >
                <span className="absolute top-1 left-1 text-xs text-yellow-400 bg-black/50 px-1">
                  CENTER PANEL (info)
                </span>
                {/* Resize handle */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-400/80 cursor-se-resize"
                  onMouseDown={e => {
                    e.stopPropagation();
                    handleCenterPanelMouseDown(e, 'resize');
                  }}
                />
              </div>
            )}

            {/* Zone overlays */}
            {zones.map(zone => {
              const isSelected = editorMode === 'zones' && selectedZone === zone.id;
              const hasPath = editorMode === 'paths';
              return (
                <div
                  key={zone.id}
                  data-zone-id={zone.id}
                  className={`absolute border-2 transition-colors ${
                    editorMode === 'zones'
                      ? isSelected
                        ? 'border-green-400 bg-green-400/30 cursor-move'
                        : 'border-red-500/70 bg-red-500/20 hover:border-red-400 hover:bg-red-400/30 cursor-move'
                      : hasPath
                        ? 'border-blue-400/40 bg-blue-400/10 cursor-default'
                        : 'border-gray-500/30 bg-gray-500/5 cursor-default'
                  }`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                  onMouseDown={e => {
                    if (editorMode === 'zones') handleMouseDown(e, zone.id, 'move');
                  }}
                >
                  {showLabels && (
                    <span className="absolute top-0 left-0 text-xs text-white bg-black/70 px-1 truncate max-w-full">
                      {zone.id}
                    </span>
                  )}
                  {/* Resize handle (zone mode only) */}
                  {editorMode === 'zones' && (
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-white/80 cursor-se-resize"
                      onMouseDown={e => {
                        e.stopPropagation();
                        handleMouseDown(e, zone.id, 'resize');
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Properties panel */}
        <div className="w-80 bg-gray-900 p-4 overflow-y-auto">
          {editorMode === 'zones' ? (
            <>
              {/* Center Panel Section */}
              <h3 className="text-lg font-bold text-yellow-400 mb-2">Center Panel</h3>
              <button
                onClick={() => setSelectedZone('center-panel')}
                className={`w-full text-left px-2 py-1 rounded text-sm mb-2 ${
                  selectedZone === 'center-panel'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-800 text-yellow-300 hover:bg-gray-700'
                }`}
              >
                Info Panel (yellow)
              </button>

              {selectedZone === 'center-panel' && (
                <div className="mb-4 p-3 bg-gray-800 rounded border border-yellow-500/50">
                  <h4 className="text-yellow-400 font-bold mb-3">Center Panel</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-white text-sm">
                      Left (%)
                      <input
                        type="number"
                        value={centerPanel.left.toFixed(1)}
                        onChange={e => handleCenterPanelInput('left', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                        step="0.5"
                      />
                    </label>
                    <label className="text-white text-sm">
                      Top (%)
                      <input
                        type="number"
                        value={centerPanel.top.toFixed(1)}
                        onChange={e => handleCenterPanelInput('top', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                        step="0.5"
                      />
                    </label>
                    <label className="text-white text-sm">
                      Width (%)
                      <input
                        type="number"
                        value={centerPanel.width.toFixed(1)}
                        onChange={e => handleCenterPanelInput('width', parseFloat(e.target.value) || 10)}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                        step="0.5"
                      />
                    </label>
                    <label className="text-white text-sm">
                      Height (%)
                      <input
                        type="number"
                        value={centerPanel.height.toFixed(1)}
                        onChange={e => handleCenterPanelInput('height', parseFloat(e.target.value) || 10)}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                        step="0.5"
                      />
                    </label>
                  </div>
                </div>
              )}

              <hr className="border-gray-700 my-4" />

              {/* Location Zones Section */}
              <h3 className="text-lg font-bold text-white mb-4">Location Zones</h3>

              {selected && (
                <div className="mb-6 p-3 bg-gray-800 rounded">
                  <h4 className="text-green-400 font-bold mb-3">{selected.id}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-white text-sm">
                      X (%)
                      <input
                        type="number"
                        value={selected.x.toFixed(1)}
                        onChange={e => handleZoneInput(selected.id, 'x', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                        step="0.5"
                      />
                    </label>
                    <label className="text-white text-sm">
                      Y (%)
                      <input
                        type="number"
                        value={selected.y.toFixed(1)}
                        onChange={e => handleZoneInput(selected.id, 'y', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                        step="0.5"
                      />
                    </label>
                    <label className="text-white text-sm">
                      Width (%)
                      <input
                        type="number"
                        value={selected.width.toFixed(1)}
                        onChange={e => handleZoneInput(selected.id, 'width', parseFloat(e.target.value) || 5)}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                        step="0.5"
                      />
                    </label>
                    <label className="text-white text-sm">
                      Height (%)
                      <input
                        type="number"
                        value={selected.height.toFixed(1)}
                        onChange={e => handleZoneInput(selected.id, 'height', parseFloat(e.target.value) || 5)}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                        step="0.5"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {zones.map(zone => (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(zone.id)}
                    className={`w-full text-left px-2 py-1 rounded text-sm ${
                      selectedZone === zone.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {zone.id}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Path Drawing Panel */}
              <h3 className="text-lg font-bold text-cyan-400 mb-2">Movement Paths</h3>
              <p className="text-gray-400 text-xs mb-4">
                Select an edge, then click on the board to add waypoints.
                Drag waypoints to adjust. Right-click to remove.
              </p>

              {/* Selected edge info */}
              {selectedEdgePair && (
                <div className="mb-4 p-3 bg-gray-800 rounded border border-cyan-500/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-cyan-400 font-bold text-sm">
                      {selectedEdgePair[0]} → {selectedEdgePair[1]}
                    </h4>
                    <button
                      onClick={() => clearEdgePath(selectedEdge!)}
                      className="text-xs px-2 py-0.5 bg-red-600/50 text-red-200 rounded hover:bg-red-600"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="text-xs text-gray-300 mb-2">
                    {(paths[selectedEdge!] || []).length} waypoints
                  </div>
                  {/* Waypoint list */}
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {(paths[selectedEdge!] || []).map(([x, y], idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="text-cyan-300 w-4">{idx + 1}.</span>
                        <input
                          type="number"
                          value={x.toFixed(1)}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setPaths(prev => {
                              const wp = [...(prev[selectedEdge!] || [])];
                              wp[idx] = [val, wp[idx][1]];
                              return { ...prev, [selectedEdge!]: wp };
                            });
                          }}
                          className="w-16 bg-gray-700 text-white px-1 py-0.5 rounded"
                          step="0.5"
                        />
                        <span className="text-gray-500">,</span>
                        <input
                          type="number"
                          value={y.toFixed(1)}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setPaths(prev => {
                              const wp = [...(prev[selectedEdge!] || [])];
                              wp[idx] = [wp[idx][0], val];
                              return { ...prev, [selectedEdge!]: wp };
                            });
                          }}
                          className="w-16 bg-gray-700 text-white px-1 py-0.5 rounded"
                          step="0.5"
                        />
                        <button
                          onClick={() => removeWaypoint(selectedEdge!, idx)}
                          className="text-red-400 hover:text-red-300 px-1"
                          title="Remove waypoint"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="border-gray-700 my-3" />

              {/* Edge list */}
              <h4 className="text-sm font-bold text-white mb-2">Adjacent Edges</h4>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {adjacentPairs.map(([from, to]) => {
                  const key = `${from}_${to}`;
                  const waypointCount = (paths[key] || []).length;
                  const isSelected = selectedEdge === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedEdge(key)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <span className="truncate">{from} → {to}</span>
                      {waypointCount > 0 && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                          isSelected ? 'bg-cyan-500' : 'bg-green-600/50 text-green-300'
                        }`}>
                          {waypointCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 p-2 text-center text-gray-400 text-sm">
        {editorMode === 'zones'
          ? 'Click a zone to select | Drag to move | Drag corner to resize | Yellow area = center info panel'
          : 'Select an edge from the list | Click on the board to add waypoints | Drag waypoints to reposition | Right-click to remove'
        }
      </div>
    </div>
  );
}
