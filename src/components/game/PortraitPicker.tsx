import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  PLAYER_PORTRAITS,
  PORTRAIT_GROUPS,
  type PortraitDefinition,
  type PortraitGroup,
} from '@/data/portraits';
import { CharacterPortrait } from './CharacterPortrait';
import { useGameOptions } from '@/hooks/useGameOptions';
import { ChevronLeft, ChevronRight, X, Upload } from 'lucide-react';
import '../screens/entry-menu.css';

interface PortraitPickerProps {
  selectedPortraitId: string | null;
  playerColor: string;
  playerName: string;
  onSelect: (portraitId: string | null) => void;
  onClose: () => void;
}
const PORTRAITS_PER_PAGE = 8;

/** Paged portrait selection keeps the original artwork and custom-photo support. */
export function PortraitPicker({
  selectedPortraitId,
  playerColor,
  playerName,
  onSelect,
  onClose,
}: PortraitPickerProps) {
  const { options } = useGameOptions();
  const [activeGroup, setActiveGroup] = useState<PortraitGroup | 'all'>('all');
  const [page, setPage] = useState(() =>
    Math.floor(
      Math.max(0, PLAYER_PORTRAITS.findIndex((p) => p.id === selectedPortraitId) + 2) / PORTRAITS_PER_PAGE,
    ),
  );
  const opener = useRef(document.activeElement as HTMLElement | null);
  const filtered =
    activeGroup === 'all' ? PLAYER_PORTRAITS : PLAYER_PORTRAITS.filter((p) => p.group === activeGroup);
  const choices: (PortraitDefinition | 'none' | 'upload')[] =
    activeGroup === 'all' ? ['none', 'upload', ...filtered] : filtered;
  const pageCount = Math.ceil(choices.length / PORTRAITS_PER_PAGE);
  const changeGroup = (group: PortraitGroup | 'all') => {
    setActiveGroup(group);
    setPage(0);
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="entry-portrait-overlay" />
        <Dialog.Content
          className="entry-portrait-dialog"
          data-text-size={options.textSize}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
          }}
        >
          <div className="entry-portrait-header">
            <Dialog.Title>Choose Your Portrait</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="entry-button entry-button--icon"
                aria-label="Close portrait picker"
              >
                <X aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="entry-portrait-description">
            Choose a face for {playerName || 'your adventurer'}. Every portrait is cosmetic.
          </Dialog.Description>
          <div className="entry-portrait-groups" role="group" aria-label="Portrait categories">
            <button
              type="button"
              className="entry-button"
              aria-pressed={activeGroup === 'all'}
              onClick={() => changeGroup('all')}
            >
              All
            </button>
            {PORTRAIT_GROUPS.map((group) => (
              <button
                type="button"
                key={group.key}
                className="entry-button"
                aria-pressed={activeGroup === group.key}
                onClick={() => changeGroup(group.key)}
              >
                {group.label}
              </button>
            ))}
          </div>
          <div className="entry-portrait-grid">
            {choices
              .slice(page * PORTRAITS_PER_PAGE, (page + 1) * PORTRAITS_PER_PAGE)
              .map((choice) =>
                choice === 'upload' ? (
                  <UploadPortraitTile
                    key="upload"
                    selectedPortraitId={selectedPortraitId}
                    onSelect={onSelect}
                  />
                ) : (
                  <PortraitOption
                    key={choice === 'none' ? 'none' : choice.id}
                    portrait={choice === 'none' ? null : choice}
                    isSelected={
                      choice === 'none' ? selectedPortraitId === null : selectedPortraitId === choice.id
                    }
                    playerColor={playerColor}
                    playerName={playerName}
                    onSelect={() => onSelect(choice === 'none' ? null : choice.id)}
                  />
                ),
              )}
          </div>
          {pageCount > 1 && (
            <nav className="entry-portrait-pages" aria-label="Portrait pages">
              <button
                type="button"
                className="entry-button entry-button--icon"
                aria-label="Previous portraits"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <span aria-live="polite">
                Page {page + 1} of {pageCount}
              </span>
              <button
                type="button"
                className="entry-button entry-button--icon"
                aria-label="Next portraits"
                disabled={page === pageCount - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
      type="button"
      className="entry-portrait-option"
      aria-label={portrait?.name || 'No portrait'}
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      <CharacterPortrait
        portraitId={portrait?.id || null}
        playerColor={playerColor}
        playerName={playerName}
        size={56}
        isAI={false}
      />
      <span className="entry-portrait-name">{portrait?.name || 'None'}</span>
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
      type="button"
      aria-label="Upload your own portrait"
      aria-pressed={isCustomSelected}
      onClick={() => inputRef.current?.click()}
      className="entry-portrait-option"
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
      <span className="entry-portrait-name">Upload</span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </button>
  );
}
