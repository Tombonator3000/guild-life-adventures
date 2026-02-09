import { PLAYER_PORTRAITS, type PortraitDefinition } from '@/data/portraits';
import { CharacterPortrait } from './CharacterPortrait';
import { X } from 'lucide-react';

interface PortraitPickerProps {
  selectedPortraitId: string | null;
  playerColor: string;
  playerName: string;
  onSelect: (portraitId: string | null) => void;
  onClose: () => void;
}

/**
 * Modal overlay for selecting a character portrait.
 * Shows all available portraits in a grid with the current selection highlighted.
 */
export function PortraitPicker({
  selectedPortraitId,
  playerColor,
  playerName,
  onSelect,
  onClose,
}: PortraitPickerProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="parchment-panel p-5 max-w-md w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-amber-700 hover:text-amber-900"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display text-lg text-amber-900 mb-4">
          Choose Your Portrait
        </h3>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* "No portrait" option — plain color circle */}
          <PortraitOption
            portrait={null}
            isSelected={selectedPortraitId === null}
            playerColor={playerColor}
            playerName={playerName}
            onSelect={() => onSelect(null)}
          />

          {/* All available portraits */}
          {PLAYER_PORTRAITS.map((portrait) => (
            <PortraitOption
              key={portrait.id}
              portrait={portrait}
              isSelected={selectedPortraitId === portrait.id}
              playerColor={playerColor}
              playerName={playerName}
              onSelect={() => onSelect(portrait.id)}
            />
          ))}
        </div>

        <p className="text-xs text-amber-700/60 text-center">
          Click a portrait to select it. This will appear on the game board.
        </p>
      </div>
    </div>
  );
}

function PortraitOption({
  portrait,
  isSelected,
  playerColor,
  playerName,
  onSelect,
}: {
  portrait: PortraitDefinition | null;
  isSelected: boolean;
  playerColor: string;
  playerName: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
        isSelected
          ? 'bg-primary/20 ring-2 ring-primary'
          : 'hover:bg-amber-100/50'
      }`}
    >
      <CharacterPortrait
        portraitId={portrait?.id || null}
        playerColor={playerColor}
        playerName={playerName}
        size={64}
        isAI={false}
      />
      <span className="text-xs text-amber-900 font-display truncate w-full text-center">
        {portrait?.name || 'None'}
      </span>
    </button>
  );
}
