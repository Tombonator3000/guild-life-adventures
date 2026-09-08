import { useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useGameStore } from '@/store/gameStore';
import { SideInfoTabs } from './SideInfoTabs';
import type { Player } from '@/types/game.types';

interface PlayerInfoModalProps { player: Player; onClose: () => void; }

/** The sidebar's character information, with live values and touch-sized tabs. */
export function PlayerInfoModal({ player, onClose }: PlayerInfoModalProps) {
  const livePlayer = useGameStore(state => state.players.find(candidate => candidate.id === player.id)) ?? player;
  const goals = useGameStore(state => state.goalSettings);
  const currentId = useGameStore(state => state.players[state.currentPlayerIndex]?.id);
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent data-fx-protect overlayClassName="immersive-backdrop" className="immersive-sheet immersive-character" aria-describedby={undefined}
      onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
      <DialogTitle className="immersive-sheet-title">Character record <span>{livePlayer.name}</span></DialogTitle>
      <SideInfoTabs compact player={livePlayer} goals={goals} isCurrentPlayer={livePlayer.id === currentId} />
    </DialogContent>
  </Dialog>;
}
