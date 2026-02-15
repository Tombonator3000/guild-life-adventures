import { useZoneEditorState } from '@/hooks/useZoneEditorState';
import { ZoneEditorToolbar } from './ZoneEditorToolbar';
import { ZoneEditorBoard } from './ZoneEditorBoard';
import { ZoneEditorProperties } from './ZoneEditorProperties';
import type { ZoneConfig, CenterPanelLayout, AnimationLayerConfig, MobileZoneOverrides } from '@/types/game.types';
import type { MovementWaypoint } from '@/data/locations';

export type { CenterPanelConfig } from '@/hooks/useZoneEditorState';
import type { CenterPanelConfig } from '@/hooks/useZoneEditorState';

interface ZoneEditorProps {
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

export function ZoneEditor({ onClose, onSave, onReset, initialCenterPanel, initialZones, initialPaths, initialLayout, initialAnimationLayers, initialMobileOverrides }: ZoneEditorProps) {
  const state = useZoneEditorState({ onClose, onSave, onReset, initialCenterPanel, initialZones, initialPaths, initialLayout, initialAnimationLayers, initialMobileOverrides });

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
          animationLayers={state.animationLayers}
          selectedAnimationLayer={state.selectedAnimationLayer}
          handleAnimationLayerMouseDown={state.handleAnimationLayerMouseDown}
          setSelectedAnimationLayer={state.setSelectedAnimationLayer}
          mobileZones={state.mobileZones}
          mobileCenterPanel={state.mobileCenterPanel}
          mobileLayout={state.mobileLayout}
          selectedMobileZone={state.selectedMobileZone}
          selectedMobileLayoutElement={state.selectedMobileLayoutElement}
          handleMobileZoneMouseDown={state.handleMobileZoneMouseDown}
          handleMobileCenterPanelMouseDown={state.handleMobileCenterPanelMouseDown}
          handleMobileLayoutMouseDown={state.handleMobileLayoutMouseDown}
          setSelectedMobileLayoutElement={state.setSelectedMobileLayoutElement}
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
          animationLayers={state.animationLayers}
          setAnimationLayers={state.setAnimationLayers}
          selectedAnimationLayer={state.selectedAnimationLayer}
          setSelectedAnimationLayer={state.setSelectedAnimationLayer}
          handleAnimationInput={state.handleAnimationInput}
          mobileZones={state.mobileZones}
          mobileCenterPanel={state.mobileCenterPanel}
          mobileLayout={state.mobileLayout}
          setMobileLayout={state.setMobileLayout}
          selectedMobileZone={state.selectedMobileZone}
          setSelectedMobileZone={state.setSelectedMobileZone}
          selectedMobileLayoutElement={state.selectedMobileLayoutElement}
          setSelectedMobileLayoutElement={state.setSelectedMobileLayoutElement}
          selectedMobileZoneData={state.selectedMobileZoneData}
          handleMobileZoneInput={state.handleMobileZoneInput}
          handleMobileCenterPanelInput={state.handleMobileCenterPanelInput}
          handleMobileLayoutInput={state.handleMobileLayoutInput}
          copyDesktopToMobile={state.copyDesktopToMobile}
        />
      </div>

      <div className="bg-gray-900 p-2 text-center text-gray-400 text-sm">
        {state.editorMode === 'zones'
          ? 'Click a zone to select | Drag to move | Drag corner to resize | Yellow area = center info panel'
          : state.editorMode === 'paths'
            ? 'Select an edge from the list | Click on the board to add waypoints | Drag waypoints to reposition | Right-click to remove'
            : state.editorMode === 'animations'
              ? 'Select a layer | Drag the center dot to reposition | Edit properties in the right panel'
              : state.editorMode === 'mobile'
                ? 'Mobile layout: Drag zones, center panel, and layout elements | Green = mobile-specific positions'
                : 'Select a layout element | Drag to move | Drag corner to resize | Positions are % of center panel'
        }
      </div>
    </div>
  );
}
