import { useState, useRef, useCallback, useEffect } from 'react';
import { ZONE_CONFIGS } from '@/data/locations';
import type { ZoneConfig, LocationId } from '@/types/game.types';
import gameBoard from '@/assets/game-board.jpeg';

export interface CenterPanelConfig {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ZoneEditorProps {
  onClose: () => void;
  onSave: (configs: ZoneConfig[], centerPanel: CenterPanelConfig) => void;
  initialCenterPanel?: CenterPanelConfig;
}

const DEFAULT_CENTER_PANEL: CenterPanelConfig = {
  top: 23.4,
  left: 26.7,
  width: 46.5,
  height: 53.4,
};

export function ZoneEditor({ onClose, onSave, initialCenterPanel }: ZoneEditorProps) {
  const [zones, setZones] = useState<ZoneConfig[]>([...ZONE_CONFIGS]);
  const [selectedZone, setSelectedZone] = useState<LocationId | 'center-panel' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [centerPanel, setCenterPanel] = useState<CenterPanelConfig>(initialCenterPanel || DEFAULT_CENTER_PANEL);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; zone: ZoneConfig } | null>(null);
  const centerDragStartRef = useRef<{ x: number; y: number; panel: CenterPanelConfig } | null>(null);

  const getPercentPosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, zoneId: LocationId, mode: 'move' | 'resize') => {
    e.preventDefault();
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;

    setSelectedZone(zoneId);
    setIsDragging(true);
    setDragMode(mode);
    const pos = getPercentPosition(e.clientX, e.clientY);
    dragStartRef.current = { x: pos.x, y: pos.y, zone: { ...zone } };
    centerDragStartRef.current = null;
  }, [zones, getPercentPosition]);

  const handleCenterPanelMouseDown = useCallback((e: React.MouseEvent, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedZone('center-panel');
    setIsDragging(true);
    setDragMode(mode);
    const pos = getPercentPosition(e.clientX, e.clientY);
    centerDragStartRef.current = { x: pos.x, y: pos.y, panel: { ...centerPanel } };
    dragStartRef.current = null;
  }, [centerPanel, getPercentPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedZone) return;

    const pos = getPercentPosition(e.clientX, e.clientY);

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
  }, [isDragging, selectedZone, dragMode, getPercentPosition, centerPanel]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
    dragStartRef.current = null;
    centerDragStartRef.current = null;
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp();
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleMouseUp]);

  const handleZoneInput = (zoneId: LocationId, field: keyof ZoneConfig, value: number) => {
    setZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, [field]: value } : z
    ));
  };

  const handleCenterPanelInput = (field: keyof CenterPanelConfig, value: number) => {
    setCenterPanel(prev => ({ ...prev, [field]: value }));
  };

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

    const fullCode = `// Zone configurations for game board locations
export const ZONE_CONFIGS: ZoneConfig[] = [
${configStr}
];

// Center info panel configuration
${centerPanelStr}`;

    navigator.clipboard.writeText(fullCode);
    alert('Full configuration copied to clipboard!\n\nIncludes:\n- ZONE_CONFIGS for locations\n- CENTER_PANEL_CONFIG for info panel');
  };

  const selected = selectedZone && selectedZone !== 'center-panel'
    ? zones.find(z => z.id === selectedZone)
    : null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Zone Editor</h2>
        <div className="flex items-center gap-4">
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
          <button
            onClick={() => onSave(zones, centerPanel)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Apply
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
            className="relative w-full max-w-[1400px] aspect-video bg-contain bg-center bg-no-repeat cursor-crosshair"
            style={{ backgroundImage: `url(${gameBoard})` }}
            onMouseMove={handleMouseMove}
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

            {/* Center panel - editable */}
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

            {/* Zone overlays */}
            {zones.map(zone => {
              const isSelected = selectedZone === zone.id;
              return (
                <div
                  key={zone.id}
                  className={`absolute border-2 transition-colors cursor-move ${
                    isSelected
                      ? 'border-green-400 bg-green-400/30'
                      : 'border-red-500/70 bg-red-500/20 hover:border-red-400 hover:bg-red-400/30'
                  }`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                  onMouseDown={e => handleMouseDown(e, zone.id, 'move')}
                >
                  {showLabels && (
                    <span className="absolute top-0 left-0 text-xs text-white bg-black/70 px-1 truncate max-w-full">
                      {zone.id}
                    </span>
                  )}
                  {/* Resize handle */}
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 bg-white/80 cursor-se-resize"
                    onMouseDown={e => {
                      e.stopPropagation();
                      handleMouseDown(e, zone.id, 'resize');
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Properties panel */}
        <div className="w-72 bg-gray-900 p-4 overflow-y-auto">
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
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 p-2 text-center text-gray-400 text-sm">
        Click a zone to select | Drag to move | Drag corner to resize | Yellow area = center info panel
      </div>
    </div>
  );
}
