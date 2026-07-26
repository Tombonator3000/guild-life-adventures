import { useState } from 'react';
import { X, ChevronDown, ChevronRight, Sparkles, Bug, Wrench, Swords, Globe, Palette } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChangelogEntry {
  icon: React.ReactNode;
  text: string;
}

interface Version {
  version: string;
  date: string;
  title: string;
  highlights: ChangelogEntry[];
}

const ICON_STYLE = 'w-3.5 h-3.5 shrink-0 mt-0.5';

const feat = (text: string): ChangelogEntry => ({ icon: <Sparkles className={`${ICON_STYLE} text-amber-400`} />, text });
const fix = (text: string): ChangelogEntry => ({ icon: <Bug className={`${ICON_STYLE} text-red-400`} />, text });
const improve = (text: string): ChangelogEntry => ({ icon: <Wrench className={`${ICON_STYLE} text-blue-400`} />, text });
const ai = (text: string): ChangelogEntry => ({ icon: <Swords className={`${ICON_STYLE} text-purple-400`} />, text });
const multi = (text: string): ChangelogEntry => ({ icon: <Globe className={`${ICON_STYLE} text-green-400`} />, text });
const visual = (text: string): ChangelogEntry => ({ icon: <Palette className={`${ICON_STYLE} text-pink-400`} />, text });

const CHANGELOG: Version[] = [
  {
  version: 'v0.10.3',
  date: 'July 26, 2026',
  title: 'Phase 16Y: Audited Audio Integrity',
  highlights: [
    improve('Measured every packaged MP3 with FFprobe and FFmpeg instead of assuming that a file extension meant usable audio'),
    fix('Removed 21 invalid files that were identical placeholder payloads across unrelated ambient and sound-effect names'),
    fix('Removed the duplicate Study MP3; Study now uses its distinct procedural sound'),
    improve('Effects without verified files are now intentionally synth-first and no longer request broken or missing MP3 URLs'),
    improve('Five locations use the verified town-street ambient fallback until dedicated audited loops are available'),
    fix('Removed nonexistent music variant references and the missing curse-cast file request'),
    improve('CI now rejects invalid, silent or exact duplicate packaged MP3 files and publishes an audio audit report'),
  ],
},
  {
    version: 'v0.10.2',
    date: 'July 26, 2026',
    title: 'Phase 16Y: AI Failure Recovery',
    highlights: [
      ai('AI failure memory now tracks the complete requested action and the relevant player state instead of a permanent turn-wide blacklist'),
      fix('Actions rejected for insufficient gold, wrong location, missing education or equipment can be tried again after those prerequisites change'),
      fix('Identical rejected actions remain blocked while the relevant state is unchanged, preventing repeated failure loops'),
      ai('Normal AI turns and Skip AI Turn now use the same dependency-aware failure cache'),
      fix('The AI no longer falls back to a known rejected action when no viable alternative remains'),
      improve('Failure records are isolated per AI player and include structured reason and attempt data for easier diagnosis'),
    ],
  },
  {
    version: 'v0.10.1',
    date: 'July 26, 2026',
    title: 'Phase 16Y: Rules Truth Pass',
    highlights: [
      improve('Rebuilt the tutorial and Adventurer’s Manual around the current executable game rules'),
      improve('Added shared player-facing rule data so important explanations no longer drift independently from the engine'),
      fix('Corrected starvation, healer, food storage, movement, rent, Career, Education and Adventure explanations'),
      fix('Removed the retired generic Investments account from active setup and statistics text; The Broker is now explained as the only active investment system'),
      fix('Corrected Fortune’s Wheel from the obsolete 5,000g claim to the actual 500g grand prize'),
      fix('Clarified that The Guildholm Herald is bought at the General Store and can be reread free for the rest of the week'),
      improve('Added regression tests that detect future rule-text drift across tutorial, manual, setup, newspaper, movement and lottery surfaces'),
    ],
  },
  {
    version: 'v0.10.0',
    date: 'July 26, 2026',
    title: 'Final Results, Hall of Fame & Permadeath Recovery',
    highlights: [
      feat('Redesigned final-results screen with the actual victory goals, live end-state values and pass/fail markers for every player'),
      feat('Victory Race Winner and Overall MVP are now separate awards, so winning the goal race does not hide the strongest total performance'),
      feat('Local Hall of Fame with custom player names and persistent scores stored on the current device'),
      multi('Optional Community World Ranking with voluntary submission, validation, rate limiting and clear unverified-score labelling'),
      feat('Hall of Fame button added directly to the title screen, with local and world tabs plus goal-profile filtering'),
      fix('Goal completion starts at 0% instead of showing pre-filled progress before the player has achieved anything'),
      fix('Permadeath no longer leaves the eliminated player holding the active turn and freezing the match'),
      fix('Eliminated players can no longer move around or perform actions'),
      multi('Dead online players now choose between Spectate Game and leaving; the host automatically continues remaining human or AI turns'),
      fix('Solo games now end correctly when no player survives'),
      feat('The Broker is now the single investment system, with Buy 1/5/Max, Sell 1/All, position values and exact dividend information'),
      improve('Legacy Investments balances migrate safely into Savings with no withdrawal penalty'),
      fix('Fractional stock dividends now carry forward instead of disappearing when a weekly payout is below 1g'),
      fix('The Guildholm Herald can be opened after purchase and read again throughout the week'),
      improve("Updated What's New so recent gameplay, ranking and multiplayer fixes are no longer hidden behind the March changelog"),
    ],
  },
  {
    version: 'v0.9.0',
    date: 'March 17, 2026',
    title: 'Sabotage & Dynamic Economy',
    highlights: [
      feat('Player Sabotage system at Shadow Market — hire operatives against rivals (pickpocket, distraction, mudslinger)'),
      feat('Dynamic bank interest rates — savings/loan rates scale with market conditions'),
      ai('AI Trash Talk — personality-specific banter bubbles after successful actions'),
      ai('AI Strategic Location Blocking — Hard AI races to block rival key locations'),
      ai('AI Dynamic Personality — gambling/rivalry/caution adjust based on wealth position'),
    ],
  },
  {
    version: 'v0.8.0',
    date: 'March 13, 2026',
    title: 'Photo-Realistic Locations',
    highlights: [
      visual('13 location backgrounds replaced with photo-realistic AI art'),
      fix('SpectatorPanel career progress display when unemployed'),
      fix('4 bugs found via parallel bug hunt (358/358 tests passing)'),
    ],
  },
  {
    version: 'v0.7.0',
    date: 'March 9, 2026',
    title: 'Portraits, Animations & Quality of Life',
    highlights: [
      feat('12 new player avatar portraits (23 total) with category tabs'),
      feat('Day/night panorama cycling on title screen'),
      feat('Animated NPC portraits (video support)'),
      feat('Token arrival bounce & walking wobble animations'),
      feat('Keyboard board navigation (Tab/Arrow keys + Space/Enter)'),
      feat('A/B outfit system — store and swap backup outfits'),
      feat('Book reading at Academy library for happiness'),
      feat('Short shift & cram study for partial time use'),
      feat('Home item hover tooltips with effect info'),
      visual('15 location background illustrations'),
      ai('AI handler refactor into 6 domain submodules'),
      fix('Morgath (warrior AI) not returning home at end of turn'),
      fix('Duplicate AI player ID when adding 5th opponent'),
    ],
  },
  {
    version: 'v0.6.0',
    date: 'March 6, 2026',
    title: 'AI Rebalance & Music Variants',
    highlights: [
      feat('Music track variants — 2-3 random variations per location'),
      feat('Jones-style full-course tuition — pay all sessions upfront'),
      feat('Location services preview when out of time'),
      ai('Universal happiness floor — all AIs maintain minimum happiness'),
      ai('Thornwick personality rebalance (education 0.8→1.1, social 0.7→0.9)'),
      fix('Infinite reload loop on startup (BUG-015)'),
      fix('Dungeon text contrast improvements'),
    ],
  },
  {
    version: 'v0.5.0',
    date: 'March 4, 2026',
    title: 'MQTT Discovery & AI Tuning',
    highlights: [
      multi('MQTT room browser replaces PartyKit — zero config, zero deploy'),
      feat('Portrait discoverability + custom photo upload'),
      feat('Career goal requires employment (Jones-style)'),
      feat('Entry-level jobs (careerLevel 1-2) now shareable'),
      ai('AI action limit raised (15→25 actions per turn)'),
      ai('AI cash flow forecast corrected (40→28 usable hours)'),
      ai('AI difficulty settings tightened for Hard/Master'),
      ai('9 AI parameter fixes across strategy, urgency, and planning'),
    ],
  },
  {
    version: 'v0.4.0',
    date: 'March 2, 2026',
    title: 'Pawn Shop & Bug Fixes',
    highlights: [
      feat('Pawn shop redemption — buy back pawned items within 6 weeks'),
      feat('Victory screen leaderboard for multiplayer'),
      feat('Spectator mode for eliminated players'),
      feat('Dead player tokens show grayscale + skull badge'),
      fix('AI freeze when Seraphina completes quest objectives (BUG-014-D)'),
      fix('Homeless happiness penalty not actually applied'),
      fix('AI appliance repair time wrong (1h→2h/3h)'),
      fix('Keyboard shortcuts firing inside modals blocked'),
      fix('Player name duplicate/length validation added'),
    ],
  },
  {
    version: 'v0.3.0',
    date: 'February 27, 2026',
    title: 'Multiplayer Reconnect & Chat',
    highlights: [
      multi('Page-refresh reconnection (sessionStorage)'),
      multi('Connection-lost banner with retry button'),
      multi('Lobby chat for pre-game communication'),
      multi('Spectator chat identity fix'),
      fix('Active bounty hidden after weekly rotation'),
    ],
  },
  {
    version: 'v0.2.0',
    date: 'February 24-25, 2026',
    title: 'Quest Illustrations & LOQ System',
    highlights: [
      feat('42 quest & bounty woodcut illustrations'),
      feat('Location-Based Quest Objectives (LOQ) — travel to complete quest steps'),
      feat('Complete LOQ coverage for all 18 quests + chain quests'),
      feat('NL chain multi-LOQ (2-3 objectives per step)'),
      feat('Expanded bounty pool (9→18 bounties, 4 per week)'),
      ai('AI LOQ awareness — AI travels to quest objective locations'),
      improve('Weekend message clutter reduction (max 4 messages)'),
      fix('AI oscillation prevention (visited location tracking)'),
      fix('Travel events capped to 1 per turn'),
    ],
  },
  {
    version: 'v0.1.0',
    date: 'February 5-14, 2026',
    title: 'Foundation',
    highlights: [
      feat('Core game loop — 60 hours/week turn system'),
      feat('14 board locations in ring layout with movement costs'),
      feat('37 jobs across 10 career levels with clothing requirements'),
      feat('11 degrees in 4 education paths'),
      feat('5-floor dungeon with combat, bosses, and rare drops'),
      feat('Stock market with 3 stocks + Crown Bonds'),
      feat('Loan system with forced repayment'),
      feat('Weekend ticket system (zoo, theater, ball)'),
      feat('3-tier clothing system (casual/dress/business)'),
      feat('24 achievements with cumulative stats'),
      feat('Weather system (5 types) + seasonal festivals'),
      feat('103 random events'),
      ai('4 AI opponents (Grimwald, Seraphina, Thornwick, Morgath)'),
      ai('3 difficulty levels with personality weights'),
      multi('WebRTC P2P multiplayer via PeerJS'),
      multi('Host migration + zombie player auto-skip'),
      feat('PWA with offline support'),
      feat('4-language support (EN/DE/ES/NO)'),
      visual('Medieval woodcut art style throughout'),
    ],
  },
];

function VersionBlock({ version, initialOpen }: { version: Version; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <div className="border border-border/30 rounded overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30">
        {open ? <ChevronDown className="w-4 h-4 text-primary shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display font-bold text-sm text-primary">{version.version}</span>
            <span className="text-xs text-muted-foreground">{version.date}</span>
          </div>
          <p className="font-display text-sm text-card-foreground truncate">{version.title}</p>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-border/20 pt-2">
          {version.highlights.map((entry, index) => (
            <div key={`${version.version}-${index}`} className="flex items-start gap-2">
              {entry.icon}
              <span className="text-xs text-card-foreground/80 leading-relaxed">{entry.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChangelogScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative parchment-panel p-5 w-full max-w-lg mx-4" style={{ maxHeight: '85vh' }}>
        <button onClick={onClose} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-card-foreground z-10" aria-label="Close changelog">
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-display text-xl text-card-foreground text-center mb-1">What's New</h2>
        <p className="text-xs text-muted-foreground text-center mb-4 font-display italic">Development changelog & version history</p>

        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mb-4 text-[0.6rem] text-muted-foreground">
          <span className="flex items-center gap-1"><Sparkles className="w-2.5 h-2.5 text-amber-400" /> Feature</span>
          <span className="flex items-center gap-1"><Bug className="w-2.5 h-2.5 text-red-400" /> Fix</span>
          <span className="flex items-center gap-1"><Swords className="w-2.5 h-2.5 text-purple-400" /> AI</span>
          <span className="flex items-center gap-1"><Globe className="w-2.5 h-2.5 text-green-400" /> Online</span>
          <span className="flex items-center gap-1"><Palette className="w-2.5 h-2.5 text-pink-400" /> Visual</span>
        </div>

        <ScrollArea className="pr-2" style={{ height: 'calc(85vh - 160px)' }}>
          <div className="space-y-2">
            {CHANGELOG.map((version, index) => (
              <VersionBlock key={version.version} version={version} initialOpen={index === 0} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
