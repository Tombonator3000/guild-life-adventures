// RightSideTabs - Right sidebar shell/orchestrator
// Renders tab navigation and delegates content to extracted tab components
// Follows the medieval parchment aesthetic with amber-800/900 text colors

import { useState } from 'react';
import { Settings, Code, Users, Target, Coins, Smile, GraduationCap, TrendingUp, Menu, Trophy, Compass } from 'lucide-react';
import { AchievementsPanel } from './AchievementsPanel';
import { PlayersTab } from './tabs/PlayersTab';
import { OptionsTab } from './tabs/OptionsTab';
import { DeveloperTab } from './tabs/DeveloperTab';
import type { Player, GoalSettings } from '@/types/game.types';

type TabId = 'players' | 'achievements' | 'options' | 'developer';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'players', label: 'PLAYERS', icon: <Users className="w-4 h-4" /> },
  { id: 'achievements', label: 'ACHIEVE', icon: <Trophy className="w-4 h-4" /> },
  { id: 'options', label: 'OPTIONS', icon: <Settings className="w-4 h-4" /> },
  { id: 'developer', label: 'DEV', icon: <Code className="w-4 h-4" /> },
];

interface RightSideTabsProps {
  players: Player[];
  currentPlayerIndex: number;
  week: number;
  goalSettings: GoalSettings;
  onOpenSaveMenu: () => void;
  onToggleDebugOverlay: () => void;
  onToggleZoneEditor: () => void;
  showDebugOverlay: boolean;
  aiIsThinking: boolean;
  aiSpeedMultiplier: number;
  onSetAISpeed: (speed: number) => void;
  onSkipAITurn: () => void;
}

export function RightSideTabs({
  players,
  currentPlayerIndex,
  week,
  goalSettings,
  onOpenSaveMenu,
  onToggleDebugOverlay,
  onToggleZoneEditor,
  showDebugOverlay,
  aiIsThinking,
  aiSpeedMultiplier,
  onSetAISpeed,
  onSkipAITurn,
}: RightSideTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('players');

  return (
    <div className="h-full flex flex-col bg-parchment rounded-lg border-2 border-wood-dark/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 bg-gradient-to-b from-wood-dark to-wood border-b-2 border-wood-light">
        <Menu className="w-4 h-4 text-parchment" />
        <h3 className="font-display text-xs font-bold text-parchment">
          Week {week}
        </h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 flex justify-center gap-0.5 p-1 bg-gradient-to-b from-wood to-wood-light">
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
      <div className="flex-1 overflow-y-auto p-2 min-h-0 bg-parchment">
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

      {/* Goals Summary */}
      <GoalsSummary goalSettings={goalSettings} />
    </div>
  );
}

function TabButton({ tab, isActive, onClick }: { tab: TabConfig; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        w-12 h-10 rounded-t transition-all duration-200
        ${isActive
          ? 'bg-parchment text-amber-900 border border-b-0 border-wood-dark -mb-[1px] z-10'
          : 'bg-wood-light/50 text-parchment/90 hover:bg-wood-light hover:text-parchment border border-transparent'
        }
      `}
      title={tab.label}
    >
      <div className={`${isActive ? 'text-amber-700' : 'text-parchment/80'}`}>
        {tab.icon}
      </div>
      <span className={`text-[6px] font-display font-bold uppercase tracking-wide leading-tight ${isActive ? 'text-amber-900' : ''}`}>
        {tab.label}
      </span>
    </button>
  );
}

function GoalsSummary({ goalSettings }: { goalSettings: GoalSettings }) {
  return (
    <div className="flex-shrink-0 p-2 border-t-2 border-wood-light bg-amber-100/50">
      <h4 className="text-[9px] text-amber-800 font-display flex items-center gap-1 mb-1">
        <Target className="w-3 h-3" /> Goals to Win
      </h4>
      <div className="grid grid-cols-2 gap-1 text-[9px]">
        <div className="flex items-center gap-1 text-amber-900">
          <Coins className="w-3 h-3 text-amber-700" />
          <span>{goalSettings.wealth}g</span>
        </div>
        <div className="flex items-center gap-1 text-amber-900">
          <Smile className="w-3 h-3 text-amber-700" />
          <span>{goalSettings.happiness}%</span>
        </div>
        <div className="flex items-center gap-1 text-amber-900">
          <GraduationCap className="w-3 h-3 text-amber-700" />
          <span>Lvl {goalSettings.education}</span>
        </div>
        <div className="flex items-center gap-1 text-amber-900">
          <TrendingUp className="w-3 h-3 text-amber-700" />
          <span>Dep {goalSettings.career}</span>
        </div>
        {(goalSettings.adventure ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-amber-900 col-span-2">
            <Compass className="w-3 h-3 text-amber-700" />
            <span>Adv {goalSettings.adventure}</span>
          </div>
        )}
      </div>
    </div>
  );
}
