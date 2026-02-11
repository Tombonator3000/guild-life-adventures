import { useZoneEditorState } from '@/hooks/useZoneEditorState';
import { ZoneEditorToolbar } from './ZoneEditorToolbar';
import { ZoneEditorBoard } from './ZoneEditorBoard';
import { ZoneEditorProperties } from './ZoneEditorProperties';
import type { ZoneConfig, CenterPanelLayout } from '@/types/game.types';
import type { MovementWaypoint } from '@/data/locations';

export type { CenterPanelConfig } from '@/hooks/useZoneEditorState';
import type { CenterPanelConfig } from '@/hooks/useZoneEditorState';

interface ZoneEditorProps {
  onClose: () => void;
  onSave: (configs: ZoneConfig[], centerPanel: CenterPanelConfig, paths: Record<string, MovementWaypoint[]>, layout: CenterPanelLayout) => void;
  onReset?: () => void;
  initialCenterPanel?: CenterPanelConfig;
  initialZones?: ZoneConfig[];
  initialPaths?: Record<string, MovementWaypoint[]>;
  initialLayout?: CenterPanelLayout;
}

export function ZoneEditor({ onClose, onSave, onReset, initialCenterPanel, initialZones, initialPaths, initialLayout }: ZoneEditorProps) {
  const state = useZoneEditorState({ onClose, onSave, onReset, initialCenterPanel, initialZones, initialPaths, initialLayout });

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <ZoneEditorToolbar
        editorMode={state.editorMode}
        setEditorMode={state.setEditorMode}
        showGrid={state.showGrid}
        setShowGrid={state.setShowGrid}
        showLabels={state.showLabels}
        setShowLabels={state.setShowLabels}
        exportConfig={state.exportConfig}
        handleReset={state.handleReset}
        hasSavedConfig={state.hasSavedConfig}
        handleSave={state.handleSave}
        onClose={state.onClose}
      />

      <div className="flex-1 flex overflow-hidden">
        <ZoneEditorBoard
          containerRef={state.containerRef}
          handleMouseMove={state.handleMouseMove}
          handleBoardClick={state.handleBoardClick}
          showGrid={state.showGrid}
          showLabels={state.showLabels}
          editorMode={state.editorMode}
          zones={state.zones}
          selectedZone={state.selectedZone}
          centerPanel={state.centerPanel}
          handleMouseDown={state.handleMouseDown}
          handleCenterPanelMouseDown={state.handleCenterPanelMouseDown}
          paths={state.paths}
          selectedEdge={state.selectedEdge}
          setSelectedEdge={state.setSelectedEdge}
          setDraggingWaypoint={state.setDraggingWaypoint}
          removeWaypoint={state.removeWaypoint}
          layout={state.layout}
          selectedLayoutElement={state.selectedLayoutElement}
          handleLayoutMouseDown={state.handleLayoutMouseDown}
          setSelectedLayoutElement={state.setSelectedLayoutElement}
        />
        <ZoneEditorProperties
          editorMode={state.editorMode}
          zones={state.zones}
          selectedZone={state.selectedZone}
          setSelectedZone={state.setSelectedZone}
          selected={state.selected}
          centerPanel={state.centerPanel}
          handleZoneInput={state.handleZoneInput}
          handleCenterPanelInput={state.handleCenterPanelInput}
          paths={state.paths}
          setPaths={state.setPaths}
          selectedEdge={state.selectedEdge}
          setSelectedEdge={state.setSelectedEdge}
          selectedEdgePair={state.selectedEdgePair}
          adjacentPairs={state.adjacentPairs}
          clearEdgePath={state.clearEdgePath}
          removeWaypoint={state.removeWaypoint}
          layout={state.layout}
          setLayout={state.setLayout}
          selectedLayoutElement={state.selectedLayoutElement}
          setSelectedLayoutElement={state.setSelectedLayoutElement}
          handleLayoutInput={state.handleLayoutInput}
        />
      </div>

      <div className="bg-gray-900 p-2 text-center text-gray-400 text-sm">
        {state.editorMode === 'zones'
          ? 'Click a zone to select | Drag to move | Drag corner to resize | Yellow area = center info panel'
          : state.editorMode === 'paths'
            ? 'Select an edge from the list | Click on the board to add waypoints | Drag waypoints to reposition | Right-click to remove'
            : 'Select a layout element | Drag to move | Drag corner to resize | Positions are % of center panel'
        }
      </div>
    </div>
  );
}
