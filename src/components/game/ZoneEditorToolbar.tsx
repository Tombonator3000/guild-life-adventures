import type { EditorMode } from '@/hooks/useZoneEditorState';

interface ZoneEditorToolbarProps {
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  exportConfig: () => void;
  handleReset?: () => void;
  hasSavedConfig: boolean;
  handleSave: () => void;
  onClose: () => void;
}

export function ZoneEditorToolbar({
  editorMode,
  setEditorMode,
  showGrid,
  setShowGrid,
  showLabels,
  setShowLabels,
  exportConfig,
  handleReset,
  hasSavedConfig,
  handleSave,
  onClose,
}: ZoneEditorToolbarProps) {
  return (
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
        {handleReset && hasSavedConfig && (
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Reset Defaults
          </button>
        )}
        <button
          onClick={handleSave}
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
  );
}
