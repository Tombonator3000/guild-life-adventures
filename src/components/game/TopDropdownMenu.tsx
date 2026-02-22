// TopDropdownMenu - Jones-style top pulldown menu for fullboard mode
// A thin trigger bar sits at the top of the screen. Hovering or clicking it
// slides down a panel with all the information from both sidebars.
// Clicking any tab opens the FULL panel (both sidebars side-by-side) at 80vh.
// Inspired by the original Jones in the Fast Lane menu system.

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  BarChart3, Package, Target, Users, Trophy, Settings, Code,
  Coins, Clock, CloudSun, ChevronDown, X, LayoutDashboard
} from 'lucide-react';
import { SideInfoTabs } from './SideInfoTabs';
import { RightSideTabs } from './RightSideTabs';
import type { Player, GoalSettings } from '@/types/game.types';
import type { WeatherState } from '@/data/weather';
import { useTranslation } from '@/i18n';

type PanelSection = 'stats' | 'inventory' | 'goals' | 'players' | 'achievements' | 'options' | 'developer';
type LeftTabId = 'stats' | 'inventory' | 'goals';
type RightTabId = 'players' | 'achievements' | 'options' | 'developer';

interface TopDropdownMenuProps {
  // Player / left sidebar
  player: Player;
  goals: GoalSettings;
  // Right sidebar
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
  // Header info
  week: number;
  priceModifier: number;
  economyTrend: number;
  weather: WeatherState | null;
  // End turn
  onEndTurn: () => void;
  endTurnDisabled: boolean;
  // Toggle fullboard mode off
  onExitFullboard: () => void;
}

function getWeatherIcon(type: string): string {
  switch (type) {
    case 'snowstorm': return '❄️';
    case 'thunderstorm': return '⛈️';
    case 'drought': return '☀️';
    case 'enchanted-fog': return '🌫️';
    case 'harvest-rain': return '🌧️';
    default: return '🌤️';
  }
}

// Left sidebar tab ids - matches SideInfoTabs internal tabs
const LEFT_SECTIONS: { id: PanelSection; label: string; icon: React.ReactNode }[] = [
  { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: 'inventory', label: 'Items', icon: <Package className="w-3.5 h-3.5" /> },
  { id: 'goals', label: 'Goals', icon: <Target className="w-3.5 h-3.5" /> },
];

const RIGHT_SECTIONS: { id: PanelSection; label: string; icon: React.ReactNode }[] = [
  { id: 'players', label: 'Players', icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'achievements', label: 'Awards', icon: <Trophy className="w-3.5 h-3.5" /> },
  { id: 'options', label: 'Options', icon: <Settings className="w-3.5 h-3.5" /> },
  { id: 'developer', label: 'Dev', icon: <Code className="w-3.5 h-3.5" /> },
];

// Which internal tab each section maps to
const LEFT_TAB_MAP: Record<string, LeftTabId> = {
  stats: 'stats',
  inventory: 'inventory',
  goals: 'goals',
};

const RIGHT_TAB_MAP: Record<string, RightTabId> = {
  players: 'players',
  achievements: 'achievements',
  options: 'options',
  developer: 'developer',
};

export function TopDropdownMenu({
  player,
  goals,
  players,
  currentPlayerIndex,
  onOpenSaveMenu,
  onToggleDebugOverlay,
  onToggleZoneEditor,
  showDebugOverlay,
  aiIsThinking,
  aiSpeedMultiplier,
  onSetAISpeed,
  onSkipAITurn,
  week,
  priceModifier,
  economyTrend,
  weather,
  onEndTurn,
  endTurnDisabled,
  onExitFullboard,
}: TopDropdownMenuProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<PanelSection>('stats');

  // Left and right tabs are tracked independently so clicking a right-side tab
  // does not remount the left sidebar (and vice versa).
  const [leftTab, setLeftTab] = useState<LeftTabId>('stats');
  const [rightTab, setRightTab] = useState<RightTabId>('players');

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => setIsExpanded(false), 350);
  }, [cancelHide]);

  // Open when cursor is within 8px of the top edge
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 8) {
        cancelHide();
        setIsExpanded(true);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [cancelHide]);

  // Cleanup on unmount
  useEffect(() => () => { cancelHide(); }, [cancelHide]);

  const handleSectionClick = (sectionId: PanelSection) => {
    // Clicking the active section again collapses the panel
    if (activeSection === sectionId && isExpanded) {
      setIsExpanded(false);
      return;
    }
    setActiveSection(sectionId);
    setIsExpanded(true);
    cancelHide();

    // Update the relevant sidebar tab
    if (sectionId in LEFT_TAB_MAP) {
      setLeftTab(LEFT_TAB_MAP[sectionId]);
    } else if (sectionId in RIGHT_TAB_MAP) {
      setRightTab(RIGHT_TAB_MAP[sectionId]);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 z-[60] select-none"
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
    >
      {/* ── Trigger bar (always visible) ─────────────────────────────── */}
      <div className="w-full h-8 bg-gradient-to-b from-wood-dark to-wood flex items-center px-2 gap-2 border-b border-wood-light/40 shadow-md">

        {/* Left: week / weather / market */}
        <div className="flex items-center gap-3 text-parchment text-[11px] font-display flex-shrink-0">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-300" />
            {t('board.week')} <strong className="text-amber-200">{week}</strong>
          </span>
          <span className="text-parchment/40">|</span>
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-amber-300" />
            <span className={priceModifier > 1 ? 'text-red-300' : 'text-green-300'}>
              {(priceModifier * 100).toFixed(0)}%
            </span>
            <span className="text-[9px]">
              {economyTrend === 1 ? '↑' : economyTrend === -1 ? '↓' : '↔'}
            </span>
          </span>
          {weather && weather.type !== 'clear' && (
            <>
              <span className="text-parchment/40">|</span>
              <span className="flex items-center gap-1" title={weather.description}>
                <CloudSun className="w-3 h-3 text-amber-300" />
                <span className="max-w-[80px] truncate">{weather.name}</span>
              </span>
            </>
          )}
        </div>

        {/* Center: section tab buttons — all 7 in one row */}
        <div className="flex-1 flex items-center justify-center gap-0.5">
          <span className="text-parchment/30 text-xs mr-1">│</span>

          {LEFT_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => handleSectionClick(s.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-display transition-colors ${
                activeSection === s.id && isExpanded
                  ? 'bg-parchment text-amber-900'
                  : 'text-parchment/80 hover:bg-white/15 hover:text-parchment'
              }`}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}

          <span className="text-parchment/30 text-xs mx-1">│</span>

          {RIGHT_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => handleSectionClick(s.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-display transition-colors ${
                activeSection === s.id && isExpanded
                  ? 'bg-parchment text-amber-900'
                  : 'text-parchment/80 hover:bg-white/15 hover:text-parchment'
              }`}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}

          <span className="text-parchment/30 text-xs ml-1">│</span>
        </div>

        {/* Right: End Turn + exit fullboard */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onEndTurn}
            disabled={endTurnDisabled}
            className="px-3 py-0.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-parchment text-[10px] font-display font-bold rounded transition-colors border border-amber-500"
          >
            End Turn (E)
          </button>

          <button
            onClick={onExitFullboard}
            title="Exit fullboard mode (B)"
            className="flex items-center gap-1 px-2 py-0.5 bg-wood-dark/60 hover:bg-wood-dark text-parchment/70 hover:text-parchment text-[10px] font-display rounded transition-colors border border-wood-light/30"
          >
            <LayoutDashboard className="w-3 h-3" />
            <span>Sidebars</span>
          </button>

          <ChevronDown
            className={`w-3.5 h-3.5 text-parchment/50 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* ── Dropdown panel — FULL WIDTH, both sidebars always visible ── */}
      <div
        className={`
          overflow-hidden transition-all duration-250 ease-out
          ${isExpanded ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}
        `}
      >
        <div
          className="bg-parchment/97 border-b-2 border-wood-dark shadow-2xl flex w-full"
          style={{ height: 'min(80vh, 650px)' }}
        >
          {/* Left column: Stats / Items / Goals — fixed width */}
          <div className="w-72 flex-shrink-0 border-r-2 border-wood-dark/30 overflow-hidden">
            <SideInfoTabs
              key={`left-${leftTab}`}
              player={player}
              goals={goals}
              isCurrentPlayer={true}
              initialTab={leftTab}
            />
          </div>

          {/* Right column: Players / Awards / Options / Dev — fills remaining space */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <RightSideTabs
              key={`right-${rightTab}`}
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              goalSettings={goals}
              onOpenSaveMenu={onOpenSaveMenu}
              onToggleDebugOverlay={onToggleDebugOverlay}
              onToggleZoneEditor={onToggleZoneEditor}
              showDebugOverlay={showDebugOverlay}
              aiIsThinking={aiIsThinking}
              aiSpeedMultiplier={aiSpeedMultiplier}
              onSetAISpeed={onSetAISpeed}
              onSkipAITurn={onSkipAITurn}
              initialTab={rightTab}
            />
          </div>

          {/* Close handle at right edge */}
          <div className="flex items-start pt-2 pl-1 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-wood/20 text-wood-dark/50 hover:text-wood-dark transition-colors"
              title="Close menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
