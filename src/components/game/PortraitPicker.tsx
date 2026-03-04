import { useRef } from 'react';
import { PLAYER_PORTRAITS, type PortraitDefinition } from '@/data/portraits';
import { CharacterPortrait } from './CharacterPortrait';
import { X, Upload } from 'lucide-react';

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

          {/* Upload your own photo */}
          <UploadPortraitTile
            selectedPortraitId={selectedPortraitId}
            onSelect={onSelect}
          />
        </div>

        <p className="text-xs text-amber-700/60 text-center">
          Click a portrait to select it, or upload your own photo.
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

/** Tile that lets the player upload their own photo as a portrait (session-only). */
function UploadPortraitTile({
  selectedPortraitId,
  onSelect,
}: {
  selectedPortraitId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isCustomSelected = selectedPortraitId?.startsWith('data:') ?? false;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Resize and square-crop to 200×200 for compact storage
        const canvas = document.createElement('canvas');
        const TARGET = 200;
        canvas.width = TARGET;
        canvas.height = TARGET;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const scale = Math.max(TARGET / img.width, TARGET / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (TARGET - w) / 2, (TARGET - h) / 2, w, h);
        onSelect(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be picked again if needed
    e.target.value = '';
  };

  return (
    <button
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
        isCustomSelected
          ? 'bg-primary/20 ring-2 ring-primary'
          : 'hover:bg-amber-100/50'
      }`}
      title="Upload your own photo"
    >
      {isCustomSelected ? (
        <img
          src={selectedPortraitId!}
          alt="Custom portrait"
          className="w-16 h-16 rounded-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-700/50 flex items-center justify-center bg-amber-50/50">
          <Upload className="w-6 h-6 text-amber-700/60" />
        </div>
      )}
      <span className="text-xs text-amber-900 font-display truncate w-full text-center">
        Upload
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </button>
  );
}
