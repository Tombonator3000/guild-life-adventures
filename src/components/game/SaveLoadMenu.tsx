import { GuildDialog } from '@/components/ui/GuildDialog';
import { useShallow } from 'zustand/react/shallow';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Save, FolderOpen, Trash2, Home, Settings, BookOpen } from 'lucide-react';
import { getSaveSlots, formatSaveDate, deleteSave } from '@/data/saveLoad';
import type { SaveSlotInfo } from '@/data/saveLoad';
import { toast } from 'sonner';
import { OptionsMenu } from '@/components/game/OptionsMenu';
import { UserManual } from '@/components/game/UserManual';
import { useTranslation } from '@/i18n';
import { leaveActiveOnlineGame } from '@/network/leaveActiveOnlineGame';

interface SaveLoadMenuProps {
  onClose: () => void;
}

export function SaveLoadMenu({ onClose }: SaveLoadMenuProps) {
  const { saveToSlot, loadFromSlot, setPhase, networkMode } = useGameStore(useShallow(state => ({
    saveToSlot: state.saveToSlot,
    loadFromSlot: state.loadFromSlot,
    setPhase: state.setPhase,
    networkMode: state.networkMode,
  })));
  const { t } = useTranslation();
  const [mode, setMode] = useState<'save' | 'load'>('save');
  const [showOptions, setShowOptions] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [slots, setSlots] = useState<SaveSlotInfo[]>(() => getSaveSlots());

  const [pending, setPending] = useState<{ slot: number; action: 'save' | 'delete' } | null>(null);

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
    if (networkMode !== 'local') {
      leaveActiveOnlineGame(networkMode === 'host' ? 'Host closed the room' : 'Player left the game');
      return;
    }

    // Auto-save before quitting a local game.
    saveToSlot(0);
    setPhase('title');
    onClose();
  };

  const quitLabel = networkMode === 'host'
    ? 'Close Online Room'
    : networkMode === 'guest'
      ? 'Leave Online Game'
      : t('saveLoad.saveReturn');

  return <>
    <GuildDialog title={t('saveLoad.gameMenu')} onClose={onClose} icon={<Save />} className="guild-dialog--compact"
      description="Keep your progress safe, or return to an earlier chapter."
      navigation={<nav className="guild-tabs" aria-label="Save and load">
        <button aria-pressed={mode === 'save'} onClick={() => { setMode('save'); setPending(null); }}><Save />{t('saveLoad.saveGame')}</button>
        <button aria-pressed={mode === 'load'} onClick={() => { setMode('load'); setPending(null); refreshSlots(); }}><FolderOpen />{t('saveLoad.loadGame')}</button>
      </nav>}
      footer={<div className="guild-save-footer">
        <button className="guild-button guild-button--gold" onClick={onClose}>Resume Adventure</button>
        <div>
          <button onClick={() => setShowOptions(true)} className="guild-button"><Settings />{t('common.options')}</button>
          <button onClick={() => setShowManual(true)} className="guild-button"><BookOpen />{t('common.manual')}</button>
        </div>
        <button onClick={handleQuitToTitle} className="guild-button guild-button--quiet"><Home />{quitLabel}</button>
      </div>}>
      <div className="guild-save-slots">
        {slots.map(s => <div key={s.slot} className="guild-save-slot">
          <div>
            <div className="font-display font-semibold">{s.slotName}</div>
            <div className="text-sm text-muted-foreground">{s.exists
              ? `${t('board.week')} ${s.week} · ${s.playerNames.join(', ')} · ${formatSaveDate(s.timestamp)}`
              : t('common.empty')}</div>
            {s.slot === 0 && <div className="text-xs text-muted-foreground">{t('setup.automatic')}</div>}
          </div>
          <div className="guild-save-actions">
            {mode === 'save' && s.slot !== 0 && <button className="guild-button" onClick={() => s.exists ? setPending({slot:s.slot,action:'save'}) : handleSave(s.slot)}>{t('common.save')}</button>}
            {mode === 'load' && s.exists && <button className="guild-button guild-button--gold" onClick={() => handleLoad(s.slot)}>{t('common.load')}</button>}
            {s.exists && s.slot !== 0 && <button className="guild-button guild-button--danger guild-button--icon" aria-label={`Delete ${s.slotName}`} onClick={() => setPending({slot:s.slot,action:'delete'})}><Trash2 /></button>}
          </div>
          {pending?.slot === s.slot && <div className="w-full" role="group" aria-label="Confirm save change">
            <p className="text-sm mb-2">{pending.action === 'delete' ? 'Delete this saved adventure?' : 'Replace this save with your current adventure?'}</p>
            <div className="guild-save-actions">
              <button className="guild-button guild-button--danger" onClick={() => { if (pending.action === 'delete') handleDelete(s.slot); else handleSave(s.slot); setPending(null); }}>{pending.action === 'delete' ? 'Confirm delete' : 'Confirm overwrite'}</button>
              <button className="guild-button" onClick={() => setPending(null)}>{t('common.cancel')}</button>
            </div>
          </div>}
        </div>)}
      </div>
    </GuildDialog>
    {showOptions && <OptionsMenu onClose={() => setShowOptions(false)} />}
    {showManual && <UserManual onClose={() => setShowManual(false)} />}
  </>;
}
