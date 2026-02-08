import type { ZoneConfig, LocationId } from '@/types/game.types';
import type { MovementWaypoint } from '@/data/locations';
import type { CenterPanelConfig, EditorMode } from '@/hooks/useZoneEditorState';

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
  );
}
