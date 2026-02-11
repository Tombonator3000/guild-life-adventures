// LocationShell - Standardized location layout wrapper
// Design: Colored header bar (top) + NPC portrait (left) + parchment content (right) + colored footer bar (bottom)
// Every location uses the same visual structure with location-specific frame colors
// Footer bar shows work shift button when player has a job at this location

import { useState, useEffect, type ReactNode, useCallback, isValidElement } from 'react';
import type { LocationNPC } from '@/data/npcs';
import { NpcPortrait } from './NpcPortrait';
import { useBanter } from '@/hooks/useBanter';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import type { LocationId } from '@/types/game.types';
import { ItemPreviewProvider, ItemPreviewPanel } from './ItemPreview';

export interface LocationTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  badge?: string; // e.g., "!" for notifications
  hidden?: boolean; // Hide tab (e.g., Work tab when no job here)
}

export interface WorkInfo {
  jobName: string;
  wage: number;
  hoursPerShift: number;
  earnings: number;
  canWork: boolean;
  onWork: () => void;
}

interface LocationShellProps {
  npc: LocationNPC;
  tabs: LocationTab[];
  defaultTab?: string;
  locationId: LocationId;
  locationName: string; // Display name for header bar
  largePortrait?: boolean;
  xlPortrait?: boolean;
  workInfo?: WorkInfo | null; // Work section for footer bar
}

export function LocationShell({
  npc,
  tabs,
  defaultTab,
  locationId,
  locationName,
  largePortrait = false,
  xlPortrait = false,
  workInfo,
}: LocationShellProps) {
  const visibleTabs = tabs.filter(t => !t.hidden);
  const [activeTab, setActiveTab] = useState(defaultTab || visibleTabs[0]?.id || '');
  const { tryTriggerBanter } = useBanter();
  const isMobile = useIsMobile();
  const currentPlayer = useCurrentPlayer();
  const players = useGameStore(s => s.players);

  const activeContent = visibleTabs.find(t => t.id === activeTab)?.content;

  // Try to trigger banter when entering a location (with player context for context-aware lines)
  useEffect(() => {
    const timer = setTimeout(() => {
      tryTriggerBanter(locationId, currentPlayer ?? undefined, players);
    }, 600);
    return () => clearTimeout(timer);
  }, [locationId, tryTriggerBanter, currentPlayer, players]);

  // If only one tab, skip the tab bar entirely
  const showTabBar = visibleTabs.length > 1;

  // Handle interaction - potentially trigger banter
  const handleInteraction = useCallback(() => {
    tryTriggerBanter(locationId);
  }, [tryTriggerBanter, locationId]);

  // Wrap content to capture clicks and trigger banter
  const wrapWithInteractionHandler = (content: ReactNode): ReactNode => {
    if (!isValidElement(content)) return content;

    return (
      <div onClick={handleInteraction} className="contents">
        {content}
      </div>
    );
  };

  return (
    <ItemPreviewProvider>
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#1a1410' }}>
      {/* === HEADER BAR === Location-specific colored frame with name */}
      <div
        className="shrink-0 text-center py-1.5 font-bold tracking-widest uppercase text-white"
        style={{
          background: `linear-gradient(180deg, ${npc.frameColor} 0%, ${npc.frameDark} 100%)`,
          borderBottom: `2px solid ${npc.frameBorder}`,
          fontSize: 'clamp(0.7rem, 1.5vw, 1rem)',
        }}
      >
        <div className="font-display">{locationName}</div>
        <div
          className="font-normal tracking-wider opacity-80"
          style={{ fontSize: 'clamp(0.45rem, 0.9vw, 0.65rem)' }}
        >
          {npc.subtitle}
        </div>
      </div>

      {/* === CONTENT AREA === NPC portrait (left) + parchment content (right) */}
      <div
        className="flex-1 flex gap-2 overflow-hidden p-2"
        style={{
          background: 'linear-gradient(180deg, #f0e8d8 0%, #e8dcc8 100%)',
        }}
      >
        {/* NPC Portrait - Left side, hidden on mobile */}
        {!isMobile && (
          <div className={`flex-shrink-0 ${xlPortrait ? 'w-56' : largePortrait ? 'w-44' : 'w-36'} flex flex-col items-center relative`}>
            <NpcPortrait npc={npc} size={xlPortrait ? 'xl' : largePortrait ? 'large' : 'normal'} />
            <div className="text-center">
              <div
                className="font-display text-sm font-bold leading-tight"
                style={{ color: npc.accentColor }}
              >
                {npc.name}
              </div>
              <div className="text-[11px] text-[#6b5a42] leading-tight">
                {npc.title}
              </div>
            </div>
            <div
              className="mt-1.5 text-[11px] italic text-center leading-tight px-1"
              style={{ color: '#8b7355' }}
            >
              &ldquo;{npc.greeting}&rdquo;
            </div>
            {/* Item Preview Panel - below NPC info */}
            <ItemPreviewPanel accentColor={npc.accentColor} />
          </div>
        )}

        {/* Content area - Right side (full width on mobile) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile: compact NPC header inline with tabs */}
          {isMobile && (
            <div className="flex items-center gap-2 mb-1 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden"
                style={{
                  backgroundColor: npc.bgColor,
                  borderColor: npc.accentColor,
                }}
              >
                {npc.portraitImage ? (
                  <img
                    src={`${import.meta.env.BASE_URL}${npc.portraitImage}`}
                    alt={npc.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm">{npc.portrait}</span>
                )}
              </div>
              <span
                className="font-display text-xs font-bold truncate"
                style={{ color: npc.accentColor }}
              >
                {npc.name}
              </span>
            </div>
          )}

          {/* Tab navigation - parchment-colored tabs */}
          {showTabBar && (
            <div className="flex gap-1 mb-1.5 flex-wrap flex-shrink-0">
              {visibleTabs.map(tab => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative flex items-center gap-1 px-3 py-1.5 rounded-t text-xs font-display font-bold
                      transition-colors border border-b-0
                      ${isActive
                        ? 'bg-[#f5efe5] text-[#3d2a14] border-[#8b7355]'
                        : 'bg-[#e0d4b8] text-[#6b5a42] border-[#a09080] hover:bg-[#e8dcc8] hover:text-[#3d2a14]'
                      }
                    `}
                  >
                    {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
                    {tab.label}
                    {tab.badge && (
                      <span className="absolute -top-1 -right-1 bg-[#c9a227] text-[#2d1f0f] text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {wrapWithInteractionHandler(activeContent)}
          </div>
        </div>
      </div>

      {/* === FOOTER BAR === Work section (if player has job here) */}
      {workInfo && (
        <div
          className="shrink-0 flex items-center justify-between gap-2 px-3 py-2"
          style={{
            background: `linear-gradient(180deg, ${npc.frameDark} 0%, ${npc.frameColor} 100%)`,
            borderTop: `2px solid ${npc.frameBorder}`,
          }}
        >
          <div className="text-white min-w-0">
            <div
              className="font-bold uppercase tracking-wider"
              style={{ fontSize: 'clamp(0.5rem, 1vw, 0.7rem)' }}
            >
              Work
            </div>
            <div
              className="opacity-70 truncate"
              style={{ fontSize: 'clamp(0.4rem, 0.8vw, 0.55rem)' }}
            >
              Current Job: {workInfo.jobName} ({workInfo.wage}g/hr)
            </div>
          </div>
          <button
            onClick={workInfo.onWork}
            disabled={!workInfo.canWork}
            className="font-bold uppercase tracking-wider transition-colors shrink-0"
            style={{
              background: workInfo.canWork
                ? 'linear-gradient(180deg, #c9a227 0%, #a08520 100%)'
                : '#3a3a2a',
              color: workInfo.canWork ? '#2d1f0f' : '#6b6b5a',
              border: `2px solid ${workInfo.canWork ? '#d4b33c' : '#4a4a3a'}`,
              borderRadius: '3px',
              padding: 'clamp(3px, 0.6vw, 8px) clamp(10px, 2vw, 24px)',
              fontSize: 'clamp(0.55rem, 1.1vw, 0.8rem)',
              cursor: workInfo.canWork ? 'pointer' : 'not-allowed',
              opacity: workInfo.canWork ? 1 : 0.6,
            }}
          >
            Work Shift (+{workInfo.earnings}g)
          </button>
          <div
            className="text-white opacity-60 shrink-0"
            style={{ fontSize: 'clamp(0.4rem, 0.8vw, 0.55rem)' }}
          >
            {workInfo.hoursPerShift} hours per shift
          </div>
        </div>
      )}
    </div>
    </ItemPreviewProvider>
  );
}
