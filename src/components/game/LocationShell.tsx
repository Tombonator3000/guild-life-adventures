// All visits remain inside the original board's central frame.
import { useState, useEffect, useId, type ReactNode, type CSSProperties } from 'react';
import { Briefcase, Clock, Coins, BookOpen, Hammer, ShoppingBag, Sparkles, ScrollText } from 'lucide-react';
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
import './location-shell.css';

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

function tabIcon(id: string) {
  if (/work|employment/.test(id)) return <Briefcase />;
  if (/repair|smith|salvage/.test(id)) return <Hammer />;
  if (/course|library|scholar/.test(id)) return <BookOpen />;
  if (/quest|bount/.test(id)) return <ScrollText />;
  if (/renown|reputation|hex|magic/.test(id)) return <Sparkles />;
  return <ShoppingBag />;
}

export function LocationShell({ npc, tabs, defaultTab, locationId, locationName, workInfo }: LocationShellProps) {
  const visibleTabs = tabs.filter(tab => !tab.hidden);
  const [selectedTab, setSelectedTab] = useState(defaultTab || visibleTabs[0]?.id || '');
  const activeTab = visibleTabs.some(tab => tab.id === selectedTab) ? selectedTab : visibleTabs[0]?.id;
  const activeContent = visibleTabs.find(tab => tab.id === activeTab)?.content;
  const { tryTriggerBanter } = useBanter();
  const player = useCurrentPlayer();
  const players = useGameStore(state => state.players);
  const { options } = useGameOptions();
  const { reducedMotion, visible } = useEnvironmentActivity();
  const id = useId();
  const animated = options.environmentDetail === 'full' && !reducedMotion && visible;
  const greeting = player ? getReputationGreeting(locationId, player.fame ?? 0, player.infamy ?? 0) : null;

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
          <div className="location-menu">
            {visibleTabs.length > 1 && <nav className="location-tabs" aria-label={`${locationName} services`}>
              {visibleTabs.map(tab => (
                <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} aria-controls={`${id}-content`}
                  onClick={() => setSelectedTab(tab.id)}>
                  <span aria-hidden="true">{tab.icon ?? tabIcon(tab.id)}</span>
                  {tab.label}{tab.badge && <b className="location-tab-badge">{tab.badge}</b>}
                </button>
              ))}
            </nav>}
            <div id={`${id}-content`} className="location-content" onClick={() => tryTriggerBanter(locationId)}>
              {activeContent}
            </div>
            {workInfo && <WorkplaceAction work={workInfo} />}
          </div>
        </div>
      </section>
    </ItemPreviewProvider>
  );
}

function WorkplaceAction({ work }: { work: WorkInfo }) {
  const short = work.hoursPerShift < work.fullShiftHours;
  return (
    <section className="location-work" aria-label="Your work shift">
      <div className="location-work-title"><Briefcase aria-hidden="true" /><strong>{work.jobName}</strong><span>{work.wage}g/h</span></div>
      <button className="location-work-button" onClick={work.onWork} disabled={!work.canWork} aria-describedby="work-shift-outcome">
        <span><Clock aria-hidden="true" />{short ? 'Short shift' : 'Work shift'} · {work.hoursPerShift}h</span>
        <span><Coins aria-hidden="true" />+{work.earnings}g</span>
      </button>
      <p id="work-shift-outcome" className={work.blockedReason ? 'location-work-warning' : 'location-work-outcome'}>
        {work.blockedReason ?? `After shift: ${work.preview.hoursAfter}h left · ${work.preview.goldAfter}g · ${work.preview.happinessLoss > 0 ? `−${work.preview.happinessLoss} happiness` : 'no happiness loss'}`}
      </p>
      {work.canWork && work.preview.deductions > 0 && <p className="location-work-deductions">{work.preview.gross}g earned − {work.preview.deductions}g withheld for overdue payments.</p>}
    </section>
  );
}
