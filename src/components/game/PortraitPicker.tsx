import { useRef, useState } from 'react';
import { PLAYER_PORTRAITS, PORTRAIT_GROUPS, type PortraitDefinition, type PortraitGroup } from '@/data/portraits';
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
 * Shows portraits grouped by category tabs.
 */
export function PortraitPicker({
  selectedPortraitId,
  playerColor,
  playerName,
  onSelect,
  onClose,
}: PortraitPickerProps) {
  const [activeGroup, setActiveGroup] = useState<PortraitGroup | 'all'>('all');

  const filteredPortraits = activeGroup === 'all'
    ? PLAYER_PORTRAITS
    : PLAYER_PORTRAITS.filter(p => p.group === activeGroup);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="parchment-panel p-5 max-w-lg w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-amber-700 hover:text-amber-900"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display text-lg text-amber-900 mb-3">
          Choose Your Portrait
        </h3>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 mb-3">
          <TabButton
            active={activeGroup === 'all'}
            onClick={() => setActiveGroup('all')}
            label="All"
          />
          {PORTRAIT_GROUPS.map(g => (
            <TabButton
              key={g.key}
              active={activeGroup === g.key}
              onClick={() => setActiveGroup(g.key)}
              label={g.label}
            />
          ))}
        </div>

        {/* Portrait grid with scroll */}
        <div className="max-h-[320px] overflow-y-auto pr-1">
          <div className="grid grid-cols-5 gap-2">
            {/* "No portrait" option — only in "All" tab */}
            {activeGroup === 'all' && (
              <PortraitOption
                portrait={null}
                isSelected={selectedPortraitId === null}
                playerColor={playerColor}
                playerName={playerName}
                onSelect={() => onSelect(null)}
              />
            )}

            {filteredPortraits.map((portrait) => (
              <PortraitOption
                key={portrait.id}
                portrait={portrait}
                isSelected={selectedPortraitId === portrait.id}
                playerColor={playerColor}
                playerName={playerName}
                onSelect={() => onSelect(portrait.id)}
              />
            ))}

            {/* Upload your own photo — only in "All" tab */}
            {activeGroup === 'all' && (
              <UploadPortraitTile
                selectedPortraitId={selectedPortraitId}
                onSelect={onSelect}
              />
            )}
          </div>
        </div>

        <p className="text-xs text-amber-700/60 text-center mt-3">
          Click a portrait to select it, or upload your own photo.
        </p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-display transition-all ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-amber-100/60 text-amber-800 hover:bg-amber-200/80'
      }`}
    >
      {label}
    </button>
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
      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
        isSelected
          ? 'bg-primary/20 ring-2 ring-primary'
          : 'hover:bg-amber-100/50'
      }`}
    >
      <CharacterPortrait
        portraitId={portrait?.id || null}
        playerColor={playerColor}
        playerName={playerName}
        size={56}
        isAI={false}
      />
      <span className="text-[10px] text-amber-900 font-display truncate w-full text-center">
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
    e.target.value = '';
  };

  return (
    <button
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
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
          className="w-14 h-14 rounded-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-amber-700/50 flex items-center justify-center bg-amber-50/50">
          <Upload className="w-5 h-5 text-amber-700/60" />
        </div>
      )}
      <span className="text-[10px] text-amber-900 font-display truncate w-full text-center">
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
