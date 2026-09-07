// All visits remain inside the original board's central frame.
import { useState, useEffect, useLayoutEffect, useRef, useId, type ReactNode, type CSSProperties } from 'react';
import { Briefcase, BookOpen, Hammer, ShoppingBag, Sparkles, ScrollText } from 'lucide-react';
import type { LocationNPC } from '@/data/npcs';
import { NpcPortrait } from './NpcPortrait';
import { useBanter } from '@/hooks/useBanter';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import type { LocationId } from '@/types/game.types';
import { ItemPreviewProvider, ItemPreviewPanel } from './ItemPreview';
import { LOCATION_BACKGROUNDS } from '@/assets/locations';
import { getReputationGreeting } from '@/data/reputation';
import { useGameOptions } from '@/hooks/useGameOptions';
import { useEnvironmentActivity } from '@/hooks/useEnvironmentActivity';
import type { getWorkPreview } from '@/store/helpers/workEducationHelpers';
import type { SFXId } from '@/audio/sfxManager';
import './location-shell.css';
import { WorkplaceCard } from './WorkplaceCard';

export interface LocationTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  badge?: string;
  hidden?: boolean;
}

export interface WorkInfo {
  jobName: string;
  wage: number;
  hoursPerShift: number;
  fullShiftHours: number;
  earnings: number;
  preview: ReturnType<typeof getWorkPreview>;
  blockedReason: string | null;
  canWork: boolean;
  onWork: () => void;
}

interface LocationShellProps {
  npc: LocationNPC;
  tabs: LocationTab[];
  defaultTab?: string;
  locationId: LocationId;
  locationName: string;
  largePortrait?: boolean;
  xlPortrait?: boolean;
  workInfo?: WorkInfo | null;
}

function serviceSound(location: LocationId, tab: string | undefined): SFXId {
  if (tab === 'your-shift' || tab === 'work' || tab === 'jobs' || tab === 'renown' || tab === 'reputation') return 'button-click';
  if (location === 'forge' || location === 'armory') return 'item-equip';
  if (location === 'bank' || location === 'general-store' || location === 'shadow-market' || location === 'fence') return 'coin-spend';
  if (location === 'academy') return 'study';
  if (location === 'enchanter' && tab === 'healing') return 'heal';
  return 'button-click';
}

function tabIcon(id: string) {
  if (/work|employment|your-shift/.test(id)) return <Briefcase />;
  if (/repair|smith|salvage/.test(id)) return <Hammer />;
  if (/course|library|scholar/.test(id)) return <BookOpen />;
  if (/quest|bount/.test(id)) return <ScrollText />;
  if (/renown|reputation|hex|magic/.test(id)) return <Sparkles />;
  return <ShoppingBag />;
}

export function LocationShell({ npc, tabs, defaultTab, locationId, locationName, workInfo }: LocationShellProps) {
  const hasWork = !!workInfo && !tabs.some(tab => tab.id === 'hexed');
  const services = tabs.filter(tab => !tab.hidden && !(hasWork && locationId === 'guild-hall' && tab.id === 'work'));
  const visibleTabs: LocationTab[] = hasWork ? [{ id: 'your-shift', label: 'Work', content: <WorkplaceCard work={workInfo!} /> }, ...services.map(tab => tab.id === 'work' ? { ...tab, label: 'Careers' } : tab)] : services;
  const [selectedTab, setSelectedTab] = useState(defaultTab || visibleTabs[0]?.id || '');
  const activeTab = visibleTabs.some(tab => tab.id === selectedTab) ? selectedTab : visibleTabs[0]?.id;
  const activeContent = visibleTabs.find(tab => tab.id === activeTab)?.content;
  const { tryTriggerBanter } = useBanter();
  const player = useCurrentPlayer();
  const players = useGameStore(state => state.players);
  const { options } = useGameOptions();
  const { reducedMotion, visible } = useEnvironmentActivity();
  const id = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const animated = options.environmentDetail === 'full' && !reducedMotion && visible;
  const greeting = player ? getReputationGreeting(locationId, player.fame ?? 0, player.infamy ?? 0) : null;

  useLayoutEffect(() => {
    // Both layouts have a scroll owner: content on desktop, menu on shallow phones.
    // A newly selected service should open at its heading, not the previous tab's offset.
    if (contentRef.current) contentRef.current.scrollTop = 0;
    if (menuRef.current) menuRef.current.scrollTop = 0;
  }, [activeTab, locationId]);

  useEffect(() => {
    if (hasWork && !defaultTab) setSelectedTab('your-shift');
  }, [hasWork, locationId, defaultTab]);

  useEffect(() => {
    const timer = setTimeout(() => tryTriggerBanter(locationId, player ?? undefined, players), 600);
    return () => clearTimeout(timer);
  }, [locationId, tryTriggerBanter, player, players]);

  return (
    <ItemPreviewProvider>
      <section className="location-shell" data-location={locationId} data-animated={animated} aria-label={locationName}
        style={{ '--location-accent': npc.accentColor, '--location-dark': npc.frameDark, '--location-frame': npc.frameColor } as CSSProperties}>
        <header className="location-heading">
          <span className="font-display">{locationName}</span>
          <span>{npc.subtitle}</span>
        </header>
        <div className="location-body">
          <aside className="location-scene" aria-label={`${npc.name}, ${npc.title}`}>
            <div className="location-scene-backdrop" style={{ backgroundImage: `url(${LOCATION_BACKGROUNDS[locationId]})` }} />
            <NpcPortrait key={npc.name} npc={npc} scene />
            {options.environmentDetail !== 'off' && <div className="location-scene-light" aria-hidden="true" />}
            {animated && <div className="location-motes" aria-hidden="true"><i /><i /><i /><i /><i /></div>}
            <div className="location-npc-name"><strong className="font-display">{npc.name}</strong><span>{npc.title}</span></div>
            <p className="location-greeting">“{greeting ?? npc.greeting}”</p>
            <div className="location-item-preview"><ItemPreviewPanel accentColor={npc.accentColor} /></div>
          </aside>
          <div ref={menuRef} className="location-menu">
            {visibleTabs.length > 1 && <nav className="location-tabs" aria-label={`${locationName} services`}>
              {visibleTabs.map(tab => (
                <button key={tab.id} type="button" data-ui-sound="menu-open" aria-pressed={activeTab === tab.id} aria-controls={`${id}-content`}
                  onClick={() => setSelectedTab(tab.id)}>
                  <span aria-hidden="true">{tab.icon ?? tabIcon(tab.id)}</span>
                  {tab.label}{tab.badge && <b className="location-tab-badge">{tab.badge}</b>}
                </button>
              ))}
            </nav>}
            <div ref={contentRef} id={`${id}-content`} className="location-content" data-ui-sound={serviceSound(locationId, activeTab)} onClick={() => tryTriggerBanter(locationId)}>
              {activeContent}
            </div>
            {hasWork && activeTab !== 'your-shift' && <button className="workplace-return" data-ui-sound="menu-open" onClick={() => setSelectedTab('your-shift')}>Your shift · {workInfo!.hoursPerShift}h · +{workInfo!.earnings}g →</button>}
          </div>
        </div>
      </section>
    </ItemPreviewProvider>
  );
}
