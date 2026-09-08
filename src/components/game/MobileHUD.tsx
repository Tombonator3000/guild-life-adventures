import { Coins, Clock, Heart, BarChart3, Users, Menu } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { CharacterPortrait } from './CharacterPortrait';
import './playability.css';

interface MobileHUDProps {
  player: Player;
  week: number;
  priceModifier: number;
  economyTrend: number;
  onEndTurn: () => void;
  onOpenLeftDrawer: () => void;
  onOpenRightDrawer: () => void;
  onOpenMenu: () => void;
  disabled?: boolean;
}

export function MobileHUD({ player, week, priceModifier, onEndTurn, onOpenLeftDrawer, onOpenRightDrawer, onOpenMenu, disabled }: MobileHUDProps) {
  return <div className="mobile-hud" style={{ borderLeft: `4px solid ${player.color}` }}>
    <div className="mobile-hud-top">
      <CharacterPortrait portraitId={player.portraitId} playerColor={player.color} playerName={player.name} size={28} isAI={player.isAI} hasCurse={(player.activeCurses?.length ?? 0) > 0} curses={player.activeCurses} />
      <span className="mobile-hud-name">{player.name}</span>
      <span aria-label={`${player.gold} gold`}><Coins />{player.gold}</span>
      <span aria-label={`${player.timeRemaining} hours remaining`}><Clock />{player.timeRemaining}h</span>
      <span aria-label={`${player.health} health`}><Heart />{player.health}</span>
    </div>
    <div className="mobile-hud-actions">
      <button title="Stats & Inventory" aria-label="Stats & Inventory" onClick={onOpenLeftDrawer}><BarChart3 /></button>
      <span className="mobile-week">Week {week}<small>Market {(priceModifier * 100).toFixed(0)}%</small></span>
      <button className="gold-button" onClick={onEndTurn} disabled={disabled}>End Turn</button>
      <button title="Players & Options" aria-label="Players & Options" onClick={onOpenRightDrawer}><Users /></button>
      <button title="Game Menu" aria-label="Game Menu" onClick={onOpenMenu}><Menu /></button>
    </div>
  </div>;
}
