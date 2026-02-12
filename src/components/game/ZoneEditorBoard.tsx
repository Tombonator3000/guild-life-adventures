import { BOARD_ASPECT_RATIO } from '@/data/locations';
import type { ZoneConfig, LocationId, CenterPanelLayout, LayoutElementId, AnimationLayerConfig } from '@/types/game.types';
import type { MovementWaypoint } from '@/data/locations';
import type { CenterPanelConfig, EditorMode } from '@/hooks/useZoneEditorState';
import { getAdjacentPairs, getZoneCenter, LAYOUT_ELEMENT_LABELS } from '@/hooks/useZoneEditorState';
import gameBoard from '@/assets/game-board.jpeg';

interface ZoneEditorBoardProps {
  containerRef: React.RefObject<HTMLDivElement>;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleBoardClick: (e: React.MouseEvent) => void;
  showGrid: boolean;
  showLabels: boolean;
  editorMode: EditorMode;
  zones: ZoneConfig[];
  selectedZone: LocationId | 'center-panel' | null;
  centerPanel: CenterPanelConfig;
  handleMouseDown: (e: React.MouseEvent, zoneId: LocationId, mode: 'move' | 'resize') => void;
  handleCenterPanelMouseDown: (e: React.MouseEvent, mode: 'move' | 'resize') => void;
  paths: Record<string, MovementWaypoint[]>;
  selectedEdge: string | null;
  setSelectedEdge: (edge: string | null) => void;
  setDraggingWaypoint: (index: number | null) => void;
  removeWaypoint: (edgeKey: string, index: number) => void;
  // Layout props
  layout: CenterPanelLayout;
  selectedLayoutElement: LayoutElementId | null;
  handleLayoutMouseDown: (e: React.MouseEvent, elementId: LayoutElementId, mode: 'move' | 'resize') => void;
  setSelectedLayoutElement: (id: LayoutElementId | null) => void;
  // Animation layer props
  animationLayers: AnimationLayerConfig[];
  selectedAnimationLayer: string | null;
  handleAnimationLayerMouseDown: (e: React.MouseEvent, layerId: string) => void;
  setSelectedAnimationLayer: (id: string | null) => void;
}

const LAYOUT_ELEMENT_IDS: LayoutElementId[] = ['npc', 'text', 'itemPreview'];

export function ZoneEditorBoard({
  containerRef,
  handleMouseMove,
  handleBoardClick,
  showGrid,
  showLabels,
  editorMode,
  zones,
  selectedZone,
  centerPanel,
  handleMouseDown,
  handleCenterPanelMouseDown,
  paths,
  selectedEdge,
  setSelectedEdge,
  setDraggingWaypoint,
  removeWaypoint,
  layout,
  selectedLayoutElement,
  handleLayoutMouseDown,
  setSelectedLayoutElement,
  animationLayers,
  selectedAnimationLayer,
  handleAnimationLayerMouseDown,
  setSelectedAnimationLayer,
}: ZoneEditorBoardProps) {
  const adjacentPairs = getAdjacentPairs();

  // SVG path lines for visualization
  const renderPaths = () => {
    return adjacentPairs.map(([from, to]) => {
      const key = `${from}_${to}`;
      const fromCenter = getZoneCenter(zones, from);
      const toCenter = getZoneCenter(zones, to);
      const waypoints = paths[key] || [];
      const isSelected = selectedEdge === key;

      // Build the full point list: fromCenter -> waypoints -> toCenter
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

        {/* Layout mode: center panel outline + draggable sub-elements */}
        {editorMode === 'layout' && (
          <div
            className="absolute border-2 border-dashed border-yellow-400/60"
            style={{
              top: `${centerPanel.top}%`,
              left: `${centerPanel.left}%`,
              width: `${centerPanel.width}%`,
              height: `${centerPanel.height}%`,
            }}
            onClick={(e) => {
              // Deselect when clicking empty area of center panel
              if (e.target === e.currentTarget) {
                setSelectedLayoutElement(null);
              }
            }}
          >
            <span className="absolute -top-5 left-0 text-[10px] text-yellow-400/80 bg-black/50 px-1 rounded">
              CENTER PANEL
            </span>

            {/* Render layout elements inside center panel */}
            {LAYOUT_ELEMENT_IDS.map(id => {
              const el = layout[id];
              const meta = LAYOUT_ELEMENT_LABELS[id];
              const isSelected = selectedLayoutElement === id;

              return (
                <div
                  key={id}
                  className={`absolute border-2 cursor-move transition-colors ${
                    isSelected
                      ? 'border-white shadow-lg'
                      : 'hover:brightness-125'
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    height: `${el.height}%`,
                    backgroundColor: meta.color,
                    borderColor: isSelected ? '#fff' : meta.borderColor,
                    zIndex: isSelected ? 10 : 1,
                  }}
                  onMouseDown={e => handleLayoutMouseDown(e, id, 'move')}
                >
                  {/* Label */}
                  <span
                    className="absolute top-0.5 left-0.5 text-[10px] font-bold px-1 rounded"
                    style={{
                      backgroundColor: meta.borderColor,
                      color: '#fff',
                    }}
                  >
                    {meta.label}
                  </span>

                  {/* Size info */}
                  <span className="absolute bottom-0.5 left-0.5 text-[9px] text-white/70 bg-black/40 px-0.5 rounded">
                    {el.width.toFixed(0)}% x {el.height.toFixed(0)}%
                  </span>

                  {/* Resize handle */}
                  <div
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize"
                    style={{ backgroundColor: `${meta.borderColor}cc` }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      handleLayoutMouseDown(e, id, 'resize');
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Animation layer markers (animations mode) */}
        {editorMode === 'animations' && animationLayers.map(layer => {
          const isSelected = selectedAnimationLayer === layer.id;
          const orbitPx = 30 * layer.orbitRadius;
          return (
            <div
              key={layer.id}
              className="absolute cursor-move"
              style={{
                left: `${layer.cx}%`,
                top: `${layer.cy}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 20 : 10,
              }}
              onMouseDown={e => handleAnimationLayerMouseDown(e, layer.id)}
            >
              {/* Orbit radius preview ellipse */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: `${orbitPx * 2}px`,
                  height: `${orbitPx * 1.1}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  border: `2px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? '#f97316' : '#fb923c80'}`,
                }}
              />
              {/* Center dot */}
              <div
                className="w-5 h-5 rounded-full border-2"
                style={{
                  backgroundColor: isSelected ? '#f97316' : '#fb923c80',
                  borderColor: isSelected ? '#fff' : '#f97316',
                }}
              />
              {/* Label */}
              {showLabels && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-orange-400 bg-black/70 px-1 whitespace-nowrap rounded">
                  {layer.label}
                </span>
              )}
              {/* Visibility indicator */}
              {!layer.visible && (
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-red-400 bg-black/70 px-1 rounded">
                  hidden
                </span>
              )}
            </div>
          );
        })}

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
                    : editorMode === 'layout'
                      ? 'border-gray-500/20 bg-transparent pointer-events-none'
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
              {showLabels && editorMode !== 'layout' && (
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
  );
}
