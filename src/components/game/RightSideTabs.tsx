import { GameIcon } from './GameIcon';
import { PanelDecoration } from './PanelDecoration';
// RightSideTabs - Right sidebar shell/orchestrator
// Renders tab navigation and delegates content to extracted tab components
// Follows the medieval parchment aesthetic with amber-800/900 text colors

import { useState } from 'react';
import { Settings, Code, Users, Menu, Trophy, Maximize, Minimize, Crown, LayoutDashboard } from 'lucide-react';
import { AchievementsPanel } from './AchievementsPanel';
import { PlayersTab } from './tabs/PlayersTab';
import { OptionsTab } from './tabs/OptionsTab';
import { DeveloperTab } from './tabs/DeveloperTab';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useTranslation } from '@/i18n';
import { useDevMode } from '@/hooks/useDevMode';
import type { Player, GoalSettings } from '@/types/game.types';

type TabId = 'players' | 'achievements' | 'options' | 'developer';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// Tab configs are generated per-render to support dynamic language
function getTabs(t: (key: string) => string): TabConfig[] {
  return [
    { id: 'players', label: t('sidebar.players'), icon: <Users className="w-4 h-4" /> },
    { id: 'achievements', label: t('sidebar.achieve'), icon: <Trophy className="w-4 h-4" /> },
    { id: 'options', label: t('sidebar.options'), icon: <Settings className="w-4 h-4" /> },
    { id: 'developer', label: t('sidebar.dev'), icon: <Code className="w-4 h-4" /> },
  ];
}

interface RightSideTabsProps {
  players: Player[];
  currentPlayerIndex: number;
  goalSettings: GoalSettings;
  onOpenSaveMenu: () => void;
  onToggleDebugOverlay: () => void;
  onToggleZoneEditor: () => void;
  showDebugOverlay: boolean;
  aiIsThinking: boolean;
  aiSpeedMultiplier: number;
  onSetAISpeed: (speed: number) => void;
  onSkipAITurn: () => void;
  initialTab?: TabId;
  onToggleFullboard?: () => void;
  compact?: boolean;
}

export function RightSideTabs({
  players,
  currentPlayerIndex,
  goalSettings,
  onOpenSaveMenu,
  onToggleDebugOverlay,
  onToggleZoneEditor,
  showDebugOverlay,
  aiIsThinking,
  aiSpeedMultiplier,
  onSetAISpeed,
  onSkipAITurn,
  initialTab,
  onToggleFullboard,
  compact = false,
}: RightSideTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'players');
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { t } = useTranslation();
  const devMode = useDevMode();
  const TABS = getTabs(t).filter(tab => tab.id !== 'developer' || devMode);

  return (
    <div className={`guild-sidebar ${compact ? 'guild-sidebar--compact' : ''} h-full flex flex-col bg-parchment rounded-lg border-2 border-wood-dark/50 overflow-hidden`}>
      <PanelDecoration />
      {/* Header with Current Turn & Menu/Fullscreen */}
      <div className="sidebar-heading flex items-center justify-between p-2 bg-gradient-to-b from-wood-dark to-wood border-b-2 border-wood-light">
        <div className="flex items-center gap-1.5 min-w-0">
          <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <h3 className="font-display text-xs font-bold text-parchment truncate">
            {t('sidebar.turn', { name: players[currentPlayerIndex]?.name ?? 'Unknown' })}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title={isFullscreen ? `${t('sidebar.exitFullscreen')} (F)` : `${t('sidebar.fullscreen')} (F)`}
          >
            {isFullscreen
              ? <Minimize className="w-3.5 h-3.5 text-parchment" />
              : <Maximize className="w-3.5 h-3.5 text-parchment" />
            }
          </button>
          {onToggleFullboard && (
            <button
              onClick={onToggleFullboard}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Fullboard mode – hide sidebars (B)"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-parchment" />
            </button>
          )}
          <button
            onClick={onOpenSaveMenu}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title={`${t('sidebar.gameMenu')} (Esc)`}
          >
            <Menu className="w-3.5 h-3.5 text-parchment" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sidebar-tabs flex-shrink-0 flex justify-center gap-0.5 p-1 bg-gradient-to-b from-wood to-wood-light">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab Content - Scrollable */}
      <div className="panel-content flex-1 overflow-y-auto p-2 min-h-0 bg-parchment">
        {activeTab === 'players' && (
          <PlayersTab
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            goalSettings={goalSettings}
          />
        )}
        {activeTab === 'achievements' && (
          <AchievementsPanel />
        )}
        {activeTab === 'options' && (
          <OptionsTab
            onOpenSaveMenu={onOpenSaveMenu}
            aiIsThinking={aiIsThinking}
            aiSpeedMultiplier={aiSpeedMultiplier}
            onSetAISpeed={onSetAISpeed}
            onSkipAITurn={onSkipAITurn}
          />
        )}
        {activeTab === 'developer' && (
          <DeveloperTab
            showDebugOverlay={showDebugOverlay}
            onToggleDebugOverlay={onToggleDebugOverlay}
            onToggleZoneEditor={onToggleZoneEditor}
          />
        )}
      </div>


    </div>
  );
}

function TabButton({ tab, isActive, onClick }: { tab: TabConfig; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        sidebar-tab relative flex flex-col items-center justify-center
        w-12 h-10 rounded-t transition-all duration-200
        ${isActive
          ? 'bg-parchment text-amber-900 border border-b-0 border-wood-dark -mb-[1px] z-10'
          : 'bg-wood-light/50 text-parchment/90 hover:bg-wood-light hover:text-parchment border border-transparent'
        }
      `}
      aria-pressed={isActive}
      title={tab.label}
    >
      <div className={`${isActive ? 'text-amber-700' : 'text-parchment/80'}`}>
        <GameIcon semantic={tab.id}>{tab.icon}</GameIcon>
      </div>
      <span className={`text-[6px] font-display font-bold uppercase tracking-wide leading-tight ${isActive ? 'text-amber-900' : ''}`}>
        {tab.label}
      </span>
    </button>
  );
}
