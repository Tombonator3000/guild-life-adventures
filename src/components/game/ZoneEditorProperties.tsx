import type { ZoneConfig, LocationId, CenterPanelLayout, LayoutElementId, LayoutElement, AnimationLayerConfig } from '@/types/game.types';
import type { MovementWaypoint } from '@/data/locations';
import type { CenterPanelConfig, EditorMode } from '@/hooks/useZoneEditorState';
import { LAYOUT_ELEMENT_LABELS, DEFAULT_LAYOUT, DEFAULT_ANIMATION_LAYERS, DEFAULT_MOBILE_CENTER_PANEL, DEFAULT_MOBILE_LAYOUT } from '@/hooks/useZoneEditorState';

const LAYOUT_ELEMENT_IDS: LayoutElementId[] = ['npc', 'text', 'itemPreview'];

interface ZoneEditorPropertiesProps {
  editorMode: EditorMode;
  zones: ZoneConfig[];
  selectedZone: LocationId | 'center-panel' | null;
  setSelectedZone: (zone: LocationId | 'center-panel' | null) => void;
  selected: ZoneConfig | null | undefined;
  centerPanel: CenterPanelConfig;
  handleZoneInput: (zoneId: LocationId, field: keyof ZoneConfig, value: number) => void;
  handleCenterPanelInput: (field: keyof CenterPanelConfig, value: number) => void;
  paths: Record<string, MovementWaypoint[]>;
  setPaths: React.Dispatch<React.SetStateAction<Record<string, MovementWaypoint[]>>>;
  selectedEdge: string | null;
  setSelectedEdge: (edge: string | null) => void;
  selectedEdgePair: [LocationId, LocationId] | null | undefined;
  adjacentPairs: [LocationId, LocationId][];
  clearEdgePath: (edgeKey: string) => void;
  removeWaypoint: (edgeKey: string, index: number) => void;
  // Layout props
  layout: CenterPanelLayout;
  setLayout: React.Dispatch<React.SetStateAction<CenterPanelLayout>>;
  selectedLayoutElement: LayoutElementId | null;
  setSelectedLayoutElement: (id: LayoutElementId | null) => void;
  handleLayoutInput: (elementId: LayoutElementId, field: keyof LayoutElement, value: number) => void;
  // Animation layer props
  animationLayers: AnimationLayerConfig[];
  setAnimationLayers: React.Dispatch<React.SetStateAction<AnimationLayerConfig[]>>;
  selectedAnimationLayer: string | null;
  setSelectedAnimationLayer: (id: string | null) => void;
  handleAnimationInput: (layerId: string, field: keyof AnimationLayerConfig, value: number | boolean) => void;
  // Mobile props
  mobileZones: ZoneConfig[];
  mobileCenterPanel: CenterPanelConfig;
  mobileLayout: CenterPanelLayout;
  setMobileLayout: React.Dispatch<React.SetStateAction<CenterPanelLayout>>;
  selectedMobileZone: LocationId | 'center-panel' | null;
  setSelectedMobileZone: (zone: LocationId | 'center-panel' | null) => void;
  selectedMobileLayoutElement: LayoutElementId | null;
  setSelectedMobileLayoutElement: (id: LayoutElementId | null) => void;
  selectedMobileZoneData: ZoneConfig | null | undefined;
  handleMobileZoneInput: (zoneId: LocationId, field: keyof ZoneConfig, value: number) => void;
  handleMobileCenterPanelInput: (field: keyof CenterPanelConfig, value: number) => void;
  handleMobileLayoutInput: (elementId: LayoutElementId, field: keyof LayoutElement, value: number) => void;
  copyDesktopToMobile: () => void;
}

export function ZoneEditorProperties({
  editorMode,
  zones,
  selectedZone,
  setSelectedZone,
  selected,
  centerPanel,
  handleZoneInput,
  handleCenterPanelInput,
  paths,
  setPaths,
  selectedEdge,
  setSelectedEdge,
  selectedEdgePair,
  adjacentPairs,
  clearEdgePath,
  removeWaypoint,
  layout,
  setLayout,
  selectedLayoutElement,
  setSelectedLayoutElement,
  handleLayoutInput,
  animationLayers,
  setAnimationLayers,
  selectedAnimationLayer,
  setSelectedAnimationLayer,
  handleAnimationInput,
  mobileZones,
  mobileCenterPanel,
  mobileLayout,
  setMobileLayout,
  selectedMobileZone,
  setSelectedMobileZone,
  selectedMobileLayoutElement,
  setSelectedMobileLayoutElement,
  selectedMobileZoneData,
  handleMobileZoneInput,
  handleMobileCenterPanelInput,
  handleMobileLayoutInput,
  copyDesktopToMobile,
}: ZoneEditorPropertiesProps) {
  return (
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
      ) : editorMode === 'paths' ? (
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
      ) : editorMode === 'layout' ? (
        <>
          {/* Layout Panel */}
          <h3 className="text-lg font-bold text-purple-400 mb-2">Panel Layout</h3>
          <p className="text-gray-400 text-xs mb-4">
            Position and resize sub-elements inside the center panel.
            Drag to move, drag corner to resize.
          </p>

          {/* Element selector buttons */}
          <div className="space-y-1 mb-4">
            {LAYOUT_ELEMENT_IDS.map(id => {
              const meta = LAYOUT_ELEMENT_LABELS[id];
              const isSelected = selectedLayoutElement === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedLayoutElement(id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                    isSelected ? 'text-white ring-1 ring-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  style={{
                    backgroundColor: isSelected ? meta.borderColor : '#1f2937',
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: meta.borderColor }}
                  />
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Selected element properties */}
          {selectedLayoutElement && (
            <div
              className="mb-4 p-3 bg-gray-800 rounded border"
              style={{ borderColor: `${LAYOUT_ELEMENT_LABELS[selectedLayoutElement].borderColor}80` }}
            >
              <h4
                className="font-bold mb-3 text-sm"
                style={{ color: LAYOUT_ELEMENT_LABELS[selectedLayoutElement].borderColor }}
              >
                {LAYOUT_ELEMENT_LABELS[selectedLayoutElement].label}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-white text-sm">
                  X (%)
                  <input
                    type="number"
                    value={layout[selectedLayoutElement].x.toFixed(1)}
                    onChange={e => handleLayoutInput(selectedLayoutElement, 'x', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Y (%)
                  <input
                    type="number"
                    value={layout[selectedLayoutElement].y.toFixed(1)}
                    onChange={e => handleLayoutInput(selectedLayoutElement, 'y', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Width (%)
                  <input
                    type="number"
                    value={layout[selectedLayoutElement].width.toFixed(1)}
                    onChange={e => handleLayoutInput(selectedLayoutElement, 'width', parseFloat(e.target.value) || 5)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Height (%)
                  <input
                    type="number"
                    value={layout[selectedLayoutElement].height.toFixed(1)}
                    onChange={e => handleLayoutInput(selectedLayoutElement, 'height', parseFloat(e.target.value) || 5)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
              </div>
            </div>
          )}

          <hr className="border-gray-700 my-3" />

          {/* All elements summary */}
          <h4 className="text-sm font-bold text-white mb-2">All Elements</h4>
          <div className="space-y-2 text-xs">
            {LAYOUT_ELEMENT_IDS.map(id => {
              const el = layout[id];
              const meta = LAYOUT_ELEMENT_LABELS[id];
              return (
                <div key={id} className="bg-gray-800 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: meta.borderColor }}
                    />
                    <span className="font-bold text-gray-200">{meta.label}</span>
                  </div>
                  <div className="text-gray-400 font-mono">
                    pos: ({el.x.toFixed(1)}, {el.y.toFixed(1)}) | size: {el.width.toFixed(1)}% x {el.height.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          <hr className="border-gray-700 my-3" />

          {/* Reset layout button */}
          <button
            onClick={() => {
              setLayout({ ...DEFAULT_LAYOUT });
              setSelectedLayoutElement(null);
            }}
            className="w-full px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
          >
            Reset Layout to Defaults
          </button>
        </>
      ) : editorMode === 'animations' ? (
        <>
          {/* Animations Panel */}
          <h3 className="text-lg font-bold text-orange-400 mb-2">Animated Layers</h3>
          <p className="text-gray-400 text-xs mb-4">
            Position animated layer groups on the game board.
            Drag the center dot to move. Edit properties below.
          </p>

          {/* Layer selector buttons */}
          <div className="space-y-1 mb-4">
            {animationLayers.map(layer => {
              const isSelected = selectedAnimationLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => setSelectedAnimationLayer(layer.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                    isSelected ? 'bg-orange-600 text-white ring-1 ring-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isSelected ? '#fff' : '#f97316' }}
                  />
                  {layer.label}
                  {!layer.visible && <span className="text-red-400 text-[10px] ml-auto">(hidden)</span>}
                </button>
              );
            })}
          </div>

          {/* Selected layer properties */}
          {selectedAnimationLayer && (() => {
            const layer = animationLayers.find(l => l.id === selectedAnimationLayer);
            if (!layer) return null;
            return (
              <div className="mb-4 p-3 bg-gray-800 rounded border border-orange-500/50">
                <h4 className="text-orange-400 font-bold mb-3 text-sm">{layer.label}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-white text-sm">
                    Center X (%)
                    <input
                      type="number"
                      value={layer.cx.toFixed(1)}
                      onChange={e => handleAnimationInput(layer.id, 'cx', parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                      step="0.5"
                    />
                  </label>
                  <label className="text-white text-sm">
                    Center Y (%)
                    <input
                      type="number"
                      value={layer.cy.toFixed(1)}
                      onChange={e => handleAnimationInput(layer.id, 'cy', parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                      step="0.5"
                    />
                  </label>
                  <label className="text-white text-sm">
                    Orbit Radius
                    <input
                      type="number"
                      value={layer.orbitRadius.toFixed(2)}
                      onChange={e => handleAnimationInput(layer.id, 'orbitRadius', parseFloat(e.target.value) || 0.1)}
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                      step="0.1"
                      min="0.1"
                      max="5.0"
                    />
                  </label>
                  <label className="text-white text-sm">
                    Size
                    <input
                      type="number"
                      value={layer.size.toFixed(2)}
                      onChange={e => handleAnimationInput(layer.id, 'size', parseFloat(e.target.value) || 0.5)}
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                      step="0.1"
                      min="0.1"
                      max="5.0"
                    />
                  </label>
                  <label className="text-white text-sm">
                    Speed
                    <input
                      type="number"
                      value={layer.speed.toFixed(2)}
                      onChange={e => handleAnimationInput(layer.id, 'speed', parseFloat(e.target.value) || 0.5)}
                      className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                      step="0.1"
                      min="0.1"
                      max="5.0"
                    />
                  </label>
                  <label className="text-white text-sm flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={e => handleAnimationInput(layer.id, 'visible', e.target.checked)}
                    />
                    Visible
                  </label>
                </div>
              </div>
            );
          })()}

          <hr className="border-gray-700 my-3" />

          {/* All layers summary */}
          <h4 className="text-sm font-bold text-white mb-2">All Layers</h4>
          <div className="space-y-2 text-xs">
            {animationLayers.map(layer => (
              <div key={layer.id} className="bg-gray-800 rounded p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-orange-500" />
                  <span className="font-bold text-gray-200">{layer.label}</span>
                  {!layer.visible && <span className="text-red-400 text-[10px] ml-auto">(hidden)</span>}
                </div>
                <div className="text-gray-400 font-mono">
                  pos: ({layer.cx.toFixed(1)}, {layer.cy.toFixed(1)}) | orbit: {layer.orbitRadius.toFixed(1)}x | size: {layer.size.toFixed(1)}x | speed: {layer.speed.toFixed(1)}x
                </div>
              </div>
            ))}
          </div>

          <hr className="border-gray-700 my-3" />

          {/* Reset animations button */}
          <button
            onClick={() => {
              setAnimationLayers([...DEFAULT_ANIMATION_LAYERS]);
              setSelectedAnimationLayer(null);
            }}
            className="w-full px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
          >
            Reset Animations to Defaults
          </button>
        </>
      ) : editorMode === 'mobile' ? (
        <>
          {/* Mobile Layout Panel */}
          <h3 className="text-lg font-bold text-emerald-400 mb-2">Mobile Layout</h3>
          <p className="text-gray-400 text-xs mb-3">
            Configure zone positions, center panel, and layout for mobile (&lt;1024px) viewports.
          </p>

          {/* Copy from Desktop button */}
          <button
            onClick={copyDesktopToMobile}
            className="w-full px-3 py-1.5 bg-emerald-700 text-emerald-100 rounded text-sm hover:bg-emerald-600 mb-4"
          >
            Copy Desktop Config to Mobile
          </button>

          {/* Mobile Center Panel */}
          <h4 className="text-sm font-bold text-yellow-400 mb-2">Center Panel</h4>
          <button
            onClick={() => setSelectedMobileZone('center-panel')}
            className={`w-full text-left px-2 py-1 rounded text-sm mb-2 ${
              selectedMobileZone === 'center-panel'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-800 text-yellow-300 hover:bg-gray-700'
            }`}
          >
            Info Panel (yellow)
          </button>

          {selectedMobileZone === 'center-panel' && (
            <div className="mb-4 p-3 bg-gray-800 rounded border border-yellow-500/50">
              <h4 className="text-yellow-400 font-bold mb-3 text-sm">Mobile Center Panel</h4>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-white text-sm">
                  Left (%)
                  <input
                    type="number"
                    value={mobileCenterPanel.left.toFixed(1)}
                    onChange={e => handleMobileCenterPanelInput('left', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Top (%)
                  <input
                    type="number"
                    value={mobileCenterPanel.top.toFixed(1)}
                    onChange={e => handleMobileCenterPanelInput('top', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Width (%)
                  <input
                    type="number"
                    value={mobileCenterPanel.width.toFixed(1)}
                    onChange={e => handleMobileCenterPanelInput('width', parseFloat(e.target.value) || 10)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Height (%)
                  <input
                    type="number"
                    value={mobileCenterPanel.height.toFixed(1)}
                    onChange={e => handleMobileCenterPanelInput('height', parseFloat(e.target.value) || 10)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
              </div>
            </div>
          )}

          <hr className="border-gray-700 my-3" />

          {/* Mobile Layout Elements */}
          <h4 className="text-sm font-bold text-purple-400 mb-2">Layout Elements</h4>
          <div className="space-y-1 mb-3">
            {LAYOUT_ELEMENT_IDS.map(id => {
              const meta = LAYOUT_ELEMENT_LABELS[id];
              const isSelected = selectedMobileLayoutElement === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedMobileLayoutElement(id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                    isSelected ? 'text-white ring-1 ring-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  style={{
                    backgroundColor: isSelected ? meta.borderColor : '#1f2937',
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: meta.borderColor }}
                  />
                  {meta.label}
                </button>
              );
            })}
          </div>

          {selectedMobileLayoutElement && (
            <div
              className="mb-4 p-3 bg-gray-800 rounded border"
              style={{ borderColor: `${LAYOUT_ELEMENT_LABELS[selectedMobileLayoutElement].borderColor}80` }}
            >
              <h4
                className="font-bold mb-3 text-sm"
                style={{ color: LAYOUT_ELEMENT_LABELS[selectedMobileLayoutElement].borderColor }}
              >
                {LAYOUT_ELEMENT_LABELS[selectedMobileLayoutElement].label}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-white text-sm">
                  X (%)
                  <input
                    type="number"
                    value={mobileLayout[selectedMobileLayoutElement].x.toFixed(1)}
                    onChange={e => handleMobileLayoutInput(selectedMobileLayoutElement, 'x', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Y (%)
                  <input
                    type="number"
                    value={mobileLayout[selectedMobileLayoutElement].y.toFixed(1)}
                    onChange={e => handleMobileLayoutInput(selectedMobileLayoutElement, 'y', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Width (%)
                  <input
                    type="number"
                    value={mobileLayout[selectedMobileLayoutElement].width.toFixed(1)}
                    onChange={e => handleMobileLayoutInput(selectedMobileLayoutElement, 'width', parseFloat(e.target.value) || 5)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Height (%)
                  <input
                    type="number"
                    value={mobileLayout[selectedMobileLayoutElement].height.toFixed(1)}
                    onChange={e => handleMobileLayoutInput(selectedMobileLayoutElement, 'height', parseFloat(e.target.value) || 5)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
              </div>
            </div>
          )}

          <hr className="border-gray-700 my-3" />

          {/* Mobile Location Zones */}
          <h4 className="text-sm font-bold text-white mb-2">Location Zones</h4>

          {selectedMobileZoneData && (
            <div className="mb-4 p-3 bg-gray-800 rounded">
              <h4 className="text-emerald-400 font-bold mb-3 text-sm">{selectedMobileZoneData.id}</h4>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-white text-sm">
                  X (%)
                  <input
                    type="number"
                    value={selectedMobileZoneData.x.toFixed(1)}
                    onChange={e => handleMobileZoneInput(selectedMobileZoneData.id, 'x', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Y (%)
                  <input
                    type="number"
                    value={selectedMobileZoneData.y.toFixed(1)}
                    onChange={e => handleMobileZoneInput(selectedMobileZoneData.id, 'y', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Width (%)
                  <input
                    type="number"
                    value={selectedMobileZoneData.width.toFixed(1)}
                    onChange={e => handleMobileZoneInput(selectedMobileZoneData.id, 'width', parseFloat(e.target.value) || 5)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
                <label className="text-white text-sm">
                  Height (%)
                  <input
                    type="number"
                    value={selectedMobileZoneData.height.toFixed(1)}
                    onChange={e => handleMobileZoneInput(selectedMobileZoneData.id, 'height', parseFloat(e.target.value) || 5)}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                    step="0.5"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {mobileZones.map(zone => (
              <button
                key={zone.id}
                onClick={() => setSelectedMobileZone(zone.id)}
                className={`w-full text-left px-2 py-1 rounded text-sm ${
                  selectedMobileZone === zone.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {zone.id}
              </button>
            ))}
          </div>

          <hr className="border-gray-700 my-3" />

          {/* Reset mobile to defaults */}
          <button
            onClick={() => {
              setMobileLayout({ ...DEFAULT_MOBILE_LAYOUT });
              setSelectedMobileLayoutElement(null);
              setSelectedMobileZone(null);
            }}
            className="w-full px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
          >
            Reset Mobile to Defaults
          </button>
        </>
      ) : null}
    </div>
  );
}
