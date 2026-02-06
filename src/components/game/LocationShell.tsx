// LocationShell - Jones-style layout wrapper for all location panels
// Provides: NPC portrait (left) + tab navigation + content area (right)
// Eliminates scrolling by showing only one section at a time

import { useState, useEffect, type ReactNode, useCallback, cloneElement, isValidElement, Children } from 'react';
import type { LocationNPC } from '@/data/npcs';
import { NpcPortrait } from './NpcPortrait';
import { BanterBubble } from './BanterBubble';
import { useBanter } from '@/hooks/useBanter';
import type { LocationId } from '@/types/game.types';

export interface LocationTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  badge?: string; // e.g., "!" for notifications
  hidden?: boolean; // Hide tab (e.g., Work tab when no job here)
}

interface LocationShellProps {
  npc: LocationNPC;
  tabs: LocationTab[];
  defaultTab?: string;
  locationId: LocationId; // Needed for banter
}

export function LocationShell({ npc, tabs, defaultTab, locationId }: LocationShellProps) {
  const visibleTabs = tabs.filter(t => !t.hidden);
  const [activeTab, setActiveTab] = useState(defaultTab || visibleTabs[0]?.id || '');
  const { activeBanter, banterLocationId, tryTriggerBanter, dismissBanter } = useBanter();

  const activeContent = visibleTabs.find(t => t.id === activeTab)?.content;

  // Try to trigger banter when entering a location
  useEffect(() => {
    const timer = setTimeout(() => {
      tryTriggerBanter(locationId);
    }, 600);
    return () => clearTimeout(timer);
  }, [locationId, tryTriggerBanter]);

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

  // Check if banter should show for this location
  const showBanter = activeBanter && banterLocationId === locationId;

  return (
    <div className="flex gap-2 h-full">
      {/* NPC Portrait - Left side (Jones-style) */}
      <div className="flex-shrink-0 w-36 flex flex-col items-center relative">
        {/* Banter bubble */}
        {showBanter && (
          <BanterBubble banter={activeBanter} onDismiss={dismissBanter} />
        )}
        
        <NpcPortrait npc={npc} />
        <div className="text-center">
          <div
            className="font-display text-sm font-bold leading-tight"
            style={{ color: npc.accentColor }}
          >
            {npc.name}
          </div>
          <div className="text-[11px] text-[#8b7355] leading-tight">
            {npc.title}
          </div>
        </div>
        <div
          className="mt-1.5 text-[11px] italic text-center leading-tight px-1"
          style={{ color: '#a09080' }}
        >
          &ldquo;{npc.greeting}&rdquo;
        </div>
      </div>

      {/* Content area - Right side */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tab navigation */}
        {showTabBar && (
          <div className="flex gap-1 mb-1.5 flex-wrap">
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
                      ? 'bg-[#3d3224] text-[#e0d4b8] border-[#8b7355]'
                      : 'bg-[#2a2318] text-[#8b7355] border-[#5c4a32] hover:bg-[#342a1e] hover:text-[#c0b090]'
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

        {/* Tab content - wrapped with interaction handler */}
        <div className="flex-1 overflow-y-auto">
          {wrapWithInteractionHandler(activeContent)}
        </div>
      </div>
    </div>
  );
}
