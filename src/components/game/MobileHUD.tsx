import { Coins, Clock, Heart, BarChart3, Users, Menu } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { CharacterPortrait } from './CharacterPortrait';
import './playability.css';
import { ResourceValue } from './ResourceValue';

interface MobileHUDProps {
  player: Player;
  week: number;
  priceModifier: number;
  economyTrend: number;
  onOpenLeftDrawer: () => void;
  onOpenRightDrawer: () => void;
  onOpenMenu: () => void;
}

export function MobileHUD({ player, week, priceModifier, onOpenLeftDrawer, onOpenRightDrawer, onOpenMenu }: MobileHUDProps) {
  return <div className="mobile-hud" style={{ borderLeft: `4px solid ${player.color}` }}>
    <div className="mobile-hud-top">
      <button className="mobile-player-portrait" aria-label={`View ${player.name}'s character`} onClick={onOpenLeftDrawer}>
        <CharacterPortrait portraitId={player.portraitId} playerColor={player.color} playerName={player.name} size={32} isAI={player.isAI} hasCurse={(player.activeCurses?.length ?? 0) > 0} curses={player.activeCurses} />
      </button>
      <span className="mobile-hud-name">{player.name}</span>
      <span aria-label={`${player.gold} gold`}><Coins /><ResourceValue value={player.gold} identity={player.id} /></span>
      <span aria-label={`${player.timeRemaining} hours remaining`}><Clock /><ResourceValue value={player.timeRemaining} identity={player.id} />h</span>
      <span aria-label={`${player.health} health`}><Heart /><ResourceValue value={player.health} identity={player.id} /></span>
    </div>
    <div className="mobile-hud-actions">
      <button title="Stats & Inventory" aria-label="Stats & Inventory" onClick={onOpenLeftDrawer}><BarChart3 /></button>
      <span className="mobile-week">Week {week}<small>Market {(priceModifier * 100).toFixed(0)}%</small></span>
      <button title="Players & Options" aria-label="Players & Options" onClick={onOpenRightDrawer}><Users /></button>
      <button title="Game Menu" aria-label="Game Menu" onClick={onOpenMenu}><Menu /></button>
    </div>
  </div>;
}
