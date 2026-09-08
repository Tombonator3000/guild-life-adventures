import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { SideInfoTabs } from './SideInfoTabs';
import type { Player } from '@/types/game.types';

interface CharacterPanelProps { player: Player; onClose: () => void; }

/** The sidebar's character information, with live values and touch-sized tabs. */
export function CharacterPanel({ player, onClose }: CharacterPanelProps) {
  const livePlayer = useGameStore(state => state.players.find(candidate => candidate.id === player.id)) ?? player;
  const goals = useGameStore(state => state.goalSettings);
  const currentId = useGameStore(state => state.players[state.currentPlayerIndex]?.id);
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const panel = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = panel.current, trigger = opener.current;
    back.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', escape, true);
    return () => {
      window.removeEventListener('keydown', escape, true);
      if (element?.contains(document.activeElement) || document.activeElement === document.body) trigger?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return <section ref={panel} className="character-panel" data-character-panel aria-label={`Character record: ${livePlayer.name}`}>
    <header className="character-panel-heading">
      <h2>Character record</h2>
      <button ref={back} onClick={onClose}><ArrowLeft aria-hidden="true" /> Back to game</button>
    </header>
    <SideInfoTabs key={livePlayer.id} compact player={livePlayer} goals={goals} isCurrentPlayer={livePlayer.id === currentId} />
  </section>;
}
