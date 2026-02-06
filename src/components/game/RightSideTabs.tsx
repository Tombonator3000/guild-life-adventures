// RightSideTabs - Right sidebar with Options, Load/Save, and Developer tabs
// Follows the medieval parchment aesthetic with amber-800/900 text colors

import { useState } from 'react';
import { Settings, Save, Code, Users, Target, Coins, Smile, GraduationCap, TrendingUp, Crown, Skull, Bot, Play, FastForward, SkipForward, Menu, Volume2, VolumeX, Music, Sparkles } from 'lucide-react';
import { useAudioSettings } from '@/hooks/useMusic';
import { useSFXSettings } from '@/hooks/useSFX';
import type { Player, GoalSettings } from '@/types/game.types';
import { GUILD_RANK_NAMES, GUILD_RANK_INDEX, HOURS_PER_TURN } from '@/types/game.types';

type TabId = 'players' | 'options' | 'developer';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'players', label: 'PLAYERS', icon: <Users className="w-4 h-4" /> },
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
            <span>Rank {goalSettings.career}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps) {
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

// ============================================
// PLAYERS TAB - Turn Order and Progress
// ============================================
function PlayersTab({ 
  players, 
  currentPlayerIndex,
  goalSettings 
}: { 
  players: Player[]; 
  currentPlayerIndex: number;
  goalSettings: GoalSettings;
}) {
  return (
    <div className="space-y-1.5">
      {players.map((player, index) => {
        const isCurrentTurn = index === currentPlayerIndex;
        const isDead = player.health <= 0;

        // Calculate goal progress
        const wealthProgress = Math.min(100, ((player.gold + player.savings + player.investments) / goalSettings.wealth) * 100);
        const happinessProgress = Math.min(100, (player.happiness / goalSettings.happiness) * 100);
        const educationTotal = player.completedDegrees.length * 9;
        const educationProgress = Math.min(100, (educationTotal / goalSettings.education) * 100);
        const careerProgress = Math.min(100, (GUILD_RANK_INDEX[player.guildRank] / goalSettings.career) * 100);
        const overallProgress = (wealthProgress + happinessProgress + educationProgress + careerProgress) / 4;

        return (
          <div
            key={player.id}
            className={`p-1.5 rounded transition-all border ${
              isCurrentTurn
                ? 'bg-amber-200/50 border-amber-600'
                : isDead
                ? 'bg-red-100/50 border-red-300 opacity-60'
                : 'bg-amber-100/30 border-amber-300/50'
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Turn indicator */}
              <div className="w-5 h-5 flex items-center justify-center">
                {isCurrentTurn ? (
                  <Crown className="w-4 h-4 text-amber-600 animate-pulse" />
                ) : isDead ? (
                  <Skull className="w-4 h-4 text-red-600" />
                ) : (
                  <span className="text-xs text-amber-700 font-bold">{index + 1}</span>
                )}
              </div>

              {/* Player color dot */}
              <div
                className="w-4 h-4 rounded-full border-2 border-amber-700/30 flex-shrink-0"
                style={{ backgroundColor: player.color }}
              />

              {/* Name and status */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-display font-bold text-amber-900 truncate ${isDead ? 'line-through' : ''}`}>
                    {player.name}
                  </span>
                  {player.isAI && (
                    <Bot className="w-3 h-3 text-amber-700" />
                  )}
                </div>
                {!isDead && (
                  <div className="flex items-center gap-2 text-[10px] text-amber-800">
                    <span>{player.gold}g</span>
                    <span>{player.timeRemaining}h</span>
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              {!isDead && (
                <div className="w-8 h-8 relative">
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-amber-200"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${overallProgress * 0.754} 100`}
                      className="text-amber-600"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-amber-900">
                    {Math.round(overallProgress)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Game Tip */}
      <div className="pt-2 mt-2 border-t border-amber-300/50">
        <p className="text-[10px] text-amber-700 text-center italic">
          Click locations to travel directly
        </p>
      </div>
    </div>
  );
}

// ============================================
// OPTIONS TAB - Save/Load and Settings
// ============================================
function OptionsTab({
  onOpenSaveMenu,
  aiIsThinking,
  aiSpeedMultiplier,
  onSetAISpeed,
  onSkipAITurn,
}: {
  onOpenSaveMenu: () => void;
  aiIsThinking: boolean;
  aiSpeedMultiplier: number;
  onSetAISpeed: (speed: number) => void;
  onSkipAITurn: () => void;
}) {
  const { musicVolume, musicMuted, setVolume, toggleMute } = useAudioSettings();
  const sfx = useSFXSettings();

  return (
    <div className="space-y-2">
      {/* Save/Load Section */}
      <OptionSection title="Save / Load">
        <button
          onClick={onOpenSaveMenu}
          className="w-full flex items-center justify-center gap-2 p-2 bg-amber-200/50 hover:bg-amber-200 rounded border border-amber-600/50 text-amber-900 font-display text-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          Open Save Menu
        </button>
        <p className="text-[9px] text-amber-700 text-center mt-1">
          Press ESC for quick access
        </p>
      </OptionSection>

      {/* Music Controls */}
      <OptionSection title="Music">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-1.5 rounded border text-xs transition-colors ${
              musicMuted
                ? 'bg-red-100 border-red-300 text-red-700'
                : 'bg-amber-200/50 border-amber-600/50 text-amber-900'
            }`}
            title={musicMuted ? 'Unmute music' : 'Mute music'}
          >
            {musicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={musicMuted ? 0 : Math.round(musicVolume * 100)}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10) / 100;
              setVolume(v);
              if (musicMuted && v > 0) toggleMute();
            }}
            className="flex-1 h-2 accent-amber-700 cursor-pointer"
            title={`Music volume: ${Math.round(musicVolume * 100)}%`}
          />
          <span className="text-[10px] text-amber-800 font-display w-7 text-right">
            {musicMuted ? '0' : Math.round(musicVolume * 100)}%
          </span>
        </div>
      </OptionSection>

      {/* SFX Controls */}
      <OptionSection title="Sound Effects">
        <div className="flex items-center gap-2">
          <button
            onClick={sfx.toggleMute}
            className={`p-1.5 rounded border text-xs transition-colors ${
              sfx.sfxMuted
                ? 'bg-red-100 border-red-300 text-red-700'
                : 'bg-amber-200/50 border-amber-600/50 text-amber-900'
            }`}
            title={sfx.sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {sfx.sfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={sfx.sfxMuted ? 0 : Math.round(sfx.sfxVolume * 100)}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10) / 100;
              sfx.setVolume(v);
              if (sfx.sfxMuted && v > 0) sfx.toggleMute();
            }}
            className="flex-1 h-2 accent-amber-700 cursor-pointer"
            title={`SFX volume: ${Math.round(sfx.sfxVolume * 100)}%`}
          />
          <span className="text-[10px] text-amber-800 font-display w-7 text-right">
            {sfx.sfxMuted ? '0' : Math.round(sfx.sfxVolume * 100)}%
          </span>
        </div>
      </OptionSection>

      {/* AI Speed Controls */}
      <OptionSection title="AI Speed">
        <div className="flex gap-1">
          {[
            { speed: 1, icon: <Play className="w-3 h-3" />, label: '1x' },
            { speed: 2, icon: <FastForward className="w-3 h-3" />, label: '2x' },
            { speed: 4, icon: <SkipForward className="w-3 h-3" />, label: '4x' },
          ].map(({ speed, icon, label }) => (
            <button
              key={speed}
              onClick={() => onSetAISpeed(speed)}
              className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded border text-[10px] font-display transition-all ${
                aiSpeedMultiplier === speed
                  ? 'bg-amber-200 border-amber-600 text-amber-900'
                  : 'bg-amber-100/30 border-amber-300/50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
        {aiIsThinking && (
          <button
            onClick={onSkipAITurn}
            className="w-full mt-1 p-1.5 bg-red-100 hover:bg-red-200 rounded border border-red-300 text-red-700 font-display text-[10px] transition-colors"
          >
            Skip AI Turn (Space)
          </button>
        )}
      </OptionSection>

      {/* Keyboard Shortcuts */}
      <OptionSection title="Shortcuts">
        <div className="space-y-0.5 text-[9px] text-amber-800">
          <ShortcutRow keys="ESC" action="Game Menu" />
          <ShortcutRow keys="E" action="End Turn" />
          <ShortcutRow keys="T" action="Toggle Tutorial" />
          <ShortcutRow keys="Space" action="Skip AI Turn" />
          <ShortcutRow keys="M" action="Mute Music" />
        </div>
      </OptionSection>
    </div>
  );
}

function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex justify-between">
      <kbd className="px-1 bg-amber-200/50 rounded text-amber-900 font-mono text-[8px]">{keys}</kbd>
      <span className="text-amber-700">{action}</span>
    </div>
  );
}

// ============================================
// DEVELOPER TAB - Debug and Zone Editor
// ============================================
function DeveloperTab({
  showDebugOverlay,
  onToggleDebugOverlay,
  onToggleZoneEditor,
}: {
  showDebugOverlay: boolean;
  onToggleDebugOverlay: () => void;
  onToggleZoneEditor: () => void;
}) {
  return (
    <div className="space-y-2">
      <OptionSection title="Debug Tools">
        <button
          onClick={onToggleDebugOverlay}
          className={`w-full flex items-center justify-center gap-2 p-2 rounded border font-display text-xs transition-colors ${
            showDebugOverlay
              ? 'bg-amber-300 border-amber-600 text-amber-900'
              : 'bg-amber-100/30 border-amber-300/50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          Debug Overlay {showDebugOverlay ? 'ON' : 'OFF'}
        </button>
        <p className="text-[9px] text-amber-700 text-center mt-1">
          Ctrl+Shift+D
        </p>
      </OptionSection>

      <OptionSection title="Zone Editor">
        <button
          onClick={onToggleZoneEditor}
          className="w-full flex items-center justify-center gap-2 p-2 bg-amber-100/30 hover:bg-amber-100 rounded border border-amber-300/50 text-amber-700 font-display text-xs transition-colors"
        >
          Open Zone Editor
        </button>
        <p className="text-[9px] text-amber-700 text-center mt-1">
          Ctrl+Shift+Z
        </p>
      </OptionSection>

      <OptionSection title="SFX Generator">
        <a
          href="/admin/sfx"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 p-2 bg-amber-100/30 hover:bg-amber-100 rounded border border-amber-300/50 text-amber-700 font-display text-xs transition-colors"
        >
          Open SFX Generator
        </a>
        <p className="text-[9px] text-amber-700 text-center mt-1">
          Generate sound effects with ElevenLabs
        </p>
      </OptionSection>

      <OptionSection title="Shortcuts">
        <div className="space-y-0.5 text-[9px] text-amber-800">
          <ShortcutRow keys="Ctrl+Shift+D" action="Debug Overlay" />
          <ShortcutRow keys="Ctrl+Shift+Z" action="Zone Editor" />
        </div>
      </OptionSection>
    </div>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================
function OptionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-amber-100/50 rounded p-2 border border-amber-700/30">
      <h3 className="font-display text-[10px] font-bold text-amber-900 mb-1.5 uppercase tracking-wide border-b border-amber-700/30 pb-0.5">
        {title}
      </h3>
      {children}
    </div>
  );
}
