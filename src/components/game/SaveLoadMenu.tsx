import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Save, FolderOpen, Trash2, X, Home, Settings, BookOpen } from 'lucide-react';
import { getSaveSlots, formatSaveDate, deleteSave } from '@/data/saveLoad';
import type { SaveSlotInfo } from '@/data/saveLoad';
import { toast } from 'sonner';
import { OptionsMenu } from '@/components/game/OptionsMenu';
import { UserManual } from '@/components/game/UserManual';
import { useTranslation } from '@/i18n';

interface SaveLoadMenuProps {
  onClose: () => void;
}

export function SaveLoadMenu({ onClose }: SaveLoadMenuProps) {
  const { saveToSlot, loadFromSlot, setPhase } = useGameStore();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'save' | 'load'>('save');
  const [showOptions, setShowOptions] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [slots, setSlots] = useState<SaveSlotInfo[]>(() => getSaveSlots());

  const refreshSlots = () => setSlots(getSaveSlots());

  const handleSave = (slot: number) => {
    if (slot === 0) return; // Can't manually save to auto-save slot
    const success = saveToSlot(slot);
    if (success) {
      toast.success(t('saveLoad.gameSaved', { n: slot }));
      refreshSlots();
    } else {
      toast.error(t('saveLoad.saveFailed'));
    }
  };

  const handleLoad = (slot: number) => {
    const success = loadFromSlot(slot);
    if (success) {
      toast.success(t('saveLoad.gameLoaded'));
      onClose();
    } else {
      toast.error(t('saveLoad.loadFailed'));
    }
  };

  const handleDelete = (slot: number) => {
    deleteSave(slot);
    toast.info(t('saveLoad.saveDeleted'));
    refreshSlots();
  };

  const handleQuitToTitle = () => {
    // Auto-save before quitting
    saveToSlot(0);
    setPhase('title');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative parchment-panel p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-card-foreground">{t('saveLoad.gameMenu')}</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('save')}
            className={`flex-1 p-2.5 rounded font-display text-sm font-semibold flex items-center justify-center gap-2 ${
              mode === 'save'
                ? 'bg-primary/20 text-primary border border-primary'
                : 'bg-background/50 text-wood border border-border hover:border-primary/50 hover:text-wood-dark'
            }`}
          >
            <Save className="w-4 h-4" /> {t('saveLoad.saveGame')}
          </button>
          <button
            onClick={() => { setMode('load'); refreshSlots(); }}
            className={`flex-1 p-2.5 rounded font-display text-sm font-semibold flex items-center justify-center gap-2 ${
              mode === 'load'
                ? 'bg-primary/20 text-primary border border-primary'
                : 'bg-background/50 text-wood border border-border hover:border-primary/50 hover:text-wood-dark'
            }`}
          >
            <FolderOpen className="w-4 h-4" /> {t('saveLoad.loadGame')}
          </button>
        </div>

        {/* Slots */}
        <div className="space-y-2">
          {slots.map((s) => {
            const isAutoSave = s.slot === 0;
            return (
              <div
                key={s.slot}
                className={`flex items-center gap-3 p-3 rounded border ${
                  s.exists
                    ? 'border-border bg-background/50'
                    : 'border-border/30 bg-background/20'
                } ${isAutoSave && mode === 'save' ? 'opacity-50' : ''}`}
              >
                <div className="flex-1">
                  <div className="font-display text-base font-semibold text-wood-dark">
                    {s.slotName}
                    {isAutoSave && <span className="text-xs font-normal text-wood-light ml-2">{t('setup.automatic')}</span>}
                  </div>
                  {s.exists ? (
                    <div className="text-sm text-wood">
                      {t('board.week')} {s.week} &middot; {s.playerNames.join(', ')} &middot; {formatSaveDate(s.timestamp)}
                    </div>
                  ) : (
                    <div className="text-sm text-wood-light">{t('common.empty')}</div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {mode === 'save' && !isAutoSave && (
                    <button
                      onClick={() => handleSave(s.slot)}
                      className="px-3 py-1.5 text-sm font-display font-semibold bg-primary/20 text-primary rounded hover:bg-primary/30"
                    >
                      {t('common.save')}
                    </button>
                  )}
                  {mode === 'load' && s.exists && (
                    <button
                      onClick={() => handleLoad(s.slot)}
                      className="px-3 py-1.5 text-sm font-display font-semibold bg-primary/20 text-primary rounded hover:bg-primary/30"
                    >
                      {t('common.load')}
                    </button>
                  )}
                  {s.exists && !isAutoSave && (
                    <button
                      onClick={() => handleDelete(s.slot)}
                      className="p-1 text-destructive/60 hover:text-destructive"
                      title={t('saveLoad.deleteSave')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Options + Manual + Quit */}
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowOptions(true)}
              className="flex-1 p-2.5 rounded border border-border bg-background/50 text-wood hover:text-wood-dark hover:border-foreground/30 font-display text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" /> {t('common.options')}
            </button>
            <button
              onClick={() => setShowManual(true)}
              className="flex-1 p-2.5 rounded border border-border bg-background/50 text-wood hover:text-wood-dark hover:border-foreground/30 font-display text-sm font-semibold flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> {t('common.manual')}
            </button>
          </div>
          <button
            onClick={handleQuitToTitle}
            className="w-full p-2.5 rounded border border-border bg-background/50 text-wood hover:text-wood-dark hover:border-foreground/30 font-display text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> {t('saveLoad.saveReturn')}
          </button>
        </div>

        {/* Options Modal (rendered on top of game menu) */}
        {showOptions && (
          <OptionsMenu onClose={() => setShowOptions(false)} />
        )}
        {/* Manual Modal (rendered on top of game menu) */}
        {showManual && (
          <UserManual onClose={() => setShowManual(false)} />
        )}
      </div>
    </div>
  );
}
