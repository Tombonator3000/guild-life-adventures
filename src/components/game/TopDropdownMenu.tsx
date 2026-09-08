import { useRef, useState } from 'react';
import { Clock, CloudSun, Coins, Heart, Hourglass, LayoutDashboard, Maximize, Menu, Minimize, Settings, Users, Utensils } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useFullscreen } from '@/hooks/useFullscreen';
import { CharacterPortrait } from './CharacterPortrait';
import { RightSideTabs } from './RightSideTabs';
import { ResourceValue } from './ResourceValue';
import type { Player, GoalSettings } from '@/types/game.types';
import type { WeatherState } from '@/data/weather';

interface TopDropdownMenuProps {
  player: Player;
  goals: GoalSettings;
  players: Player[];
  currentPlayerIndex: number;
  onOpenSaveMenu: () => void;
  onToggleDebugOverlay: () => void;
  onToggleZoneEditor: () => void;
  showDebugOverlay: boolean;
  aiIsThinking: boolean;
  aiSpeedMultiplier: number;
  onSetAISpeed: (speed: number) => void;
  onSkipAITurn: () => void;
  week: number;
  priceModifier: number;
  economyTrend: number;
  weather: WeatherState | null;
  onExitFullboard: () => void;
  onOpenPlayer: () => void;
}

/** A quiet board header. Information opens deliberately, one readable panel at a time. */
export function TopDropdownMenu({ player, goals, players, currentPlayerIndex, onOpenSaveMenu,
  onToggleDebugOverlay, onToggleZoneEditor, showDebugOverlay, aiIsThinking, aiSpeedMultiplier,
  onSetAISpeed, onSkipAITurn, week, priceModifier, economyTrend, weather, onExitFullboard, onOpenPlayer,
}: TopDropdownMenuProps) {
  const [section, setSection] = useState<'players' | 'options' | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const openMenu = () => { setSection(null); onOpenSaveMenu(); };

  return <>
    <header className="immersive-topbar" aria-label="Game toolbar" data-fx-protect>
      <button className="immersive-player" onClick={onOpenPlayer} aria-label={`View ${player.name}'s character`} aria-haspopup="dialog">
        <CharacterPortrait portraitId={player.portraitId} playerName={player.name} playerColor={player.color}
          size={40} isAI={player.isAI} hasCurse={(player.activeCurses?.length ?? 0) > 0}
          isToad={player.activeCurses?.some(c => c.effectType === 'toad-transformation') ?? false} curses={player.activeCurses} />
        <span><strong aria-live="polite">{player.name}'s Turn</strong><small>Character · items · goals</small></span>
      </button>

      <div className="immersive-resources" aria-label="Current player resources">
        <span title="Gold"><Coins /><b><ResourceValue value={player.gold} identity={player.id} />g</b></span>
        <span title="Hours remaining" data-warning={player.timeRemaining <= 10}><Hourglass /><b><ResourceValue value={player.timeRemaining} identity={player.id} />h</b></span>
        <span title="Health" data-warning={player.health <= 20}><Heart /><b>{player.health}</b></span>
        <span title="Food" data-warning={player.foodLevel <= 25}><Utensils /><b>{player.foodLevel}%</b></span>
      </div>

      <div className="immersive-world">
        <strong><Clock /> Week {week}</strong>
        <small>Market {Math.round(priceModifier * 100)}% {economyTrend > 0 ? '↑' : economyTrend < 0 ? '↓' : '↔'}
          {weather && <span title={weather.description}><CloudSun /> {weather.name}</span>}
        </small>
      </div>

      <nav className="immersive-actions" aria-label="Board controls">
        <button onClick={event => { opener.current = event.currentTarget; setSection('players'); }} aria-label="Players and awards" aria-haspopup="dialog"><Users /><span>Players</span></button>
        <button onClick={event => { opener.current = event.currentTarget; setSection('options'); }} aria-label="Options" aria-haspopup="dialog"><Settings /><span>Options</span></button>
        <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-pressed={isFullscreen}>{isFullscreen ? <Minimize /> : <Maximize />}</button>
        <button onClick={onExitFullboard} title="Show sidebars (B)" aria-label="Show sidebars"><LayoutDashboard /><span>Sidebars</span></button>
        <button onClick={onOpenSaveMenu} aria-label="Game Menu" title="Game menu, save and manual (Esc)"><Menu /></button>
      </nav>
    </header>

    <Dialog open={section !== null} onOpenChange={open => { if (!open) setSection(null); }}>
      <DialogContent data-fx-protect overlayClassName="immersive-backdrop" className="immersive-sheet immersive-ledger" aria-describedby={undefined}
        onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
        <DialogTitle className="immersive-sheet-title">Guild ledger <span>Players · awards · options</span></DialogTitle>
        {section && <RightSideTabs key={section} compact initialTab={section} players={players} currentPlayerIndex={currentPlayerIndex}
          goalSettings={goals} onOpenSaveMenu={openMenu} onToggleDebugOverlay={onToggleDebugOverlay}
          onToggleZoneEditor={() => { setSection(null); onToggleZoneEditor(); }} showDebugOverlay={showDebugOverlay}
          aiIsThinking={aiIsThinking} aiSpeedMultiplier={aiSpeedMultiplier} onSetAISpeed={onSetAISpeed} onSkipAITurn={onSkipAITurn} />}
      </DialogContent>
    </Dialog>
  </>;
}
