// DeveloperTab - Debug tools, teleport, weather/festival/resource controls
// Developer-only panel for testing game events and state

import { useGameStore } from '@/store/gameStore';
import { OptionSection, ShortcutRow } from './OptionSection';
import type { LocationId } from '@/types/game.types';

interface DeveloperTabProps {
  showDebugOverlay: boolean;
  onToggleDebugOverlay: () => void;
  onToggleZoneEditor: () => void;
}

const DEBUG_BTN = 'w-full flex items-center justify-center gap-1 p-1.5 bg-amber-100/30 hover:bg-amber-200 rounded border border-amber-300/50 text-amber-700 font-display text-[10px] transition-colors';
const SMALL_BTN = 'flex-1 p-1 bg-amber-100/30 hover:bg-amber-200 rounded border border-amber-300/50 text-amber-700 font-display text-[9px] transition-colors text-center';

const WEATHER_OPTIONS = [
  ['clear', 'Clear'],
  ['snowstorm', 'Snow'],
  ['thunderstorm', 'Storm'],
  ['drought', 'Drought'],
  ['enchanted-fog', 'Fog'],
  ['harvest-rain', 'Rain'],
] as const;

const FESTIVAL_OPTIONS = [
  ['harvest-festival', 'Harvest'],
  ['winter-solstice', 'Solstice'],
  ['spring-tournament', 'Tourney'],
  ['midsummer-fair', 'Fair'],
] as const;

const LOCATIONS_LIST = [
  { id: 'noble-heights', name: 'Noble Heights', short: 'Noble' },
  { id: 'graveyard', name: 'The Graveyard', short: 'Grave' },
  { id: 'general-store', name: 'General Store', short: 'Store' },
  { id: 'bank', name: 'Guildholm Bank', short: 'Bank' },
  { id: 'forge', name: 'The Forge', short: 'Forge' },
  { id: 'guild-hall', name: 'Guild Hall', short: 'Guild' },
  { id: 'cave', name: 'The Cave', short: 'Cave' },
  { id: 'academy', name: 'The Academy', short: 'Acad' },
  { id: 'enchanter', name: "Enchanter's Workshop", short: 'Ench' },
  { id: 'armory', name: 'The Armory', short: 'Armor' },
  { id: 'rusty-tankard', name: 'The Rusty Tankard', short: 'Tavern' },
  { id: 'shadow-market', name: 'Shadow Market', short: 'Shadow' },
  { id: 'fence', name: 'The Fence', short: 'Fence' },
  { id: 'slums', name: 'The Slums', short: 'Slums' },
  { id: 'landlord', name: "Landlord's Office", short: 'Landl' },
];

export function DeveloperTab({
  showDebugOverlay,
  onToggleDebugOverlay,
  onToggleZoneEditor,
}: DeveloperTabProps) {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const currentPlayer = players[currentPlayerIndex];
  const playerId = currentPlayer?.id;

  return (
    <div className="space-y-2">
      <OptionSection title="Debug Tools">
        <button
          onClick={onToggleDebugOverlay}
          className={`w-full flex items-center justify-center gap-2 p-1.5 rounded border font-display text-[10px] transition-colors ${
            showDebugOverlay
              ? 'bg-amber-300 border-amber-600 text-amber-900'
              : 'bg-amber-100/30 border-amber-300/50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          Debug Overlay {showDebugOverlay ? 'ON' : 'OFF'}
        </button>
        <p className="text-[8px] text-amber-700 text-center">Ctrl+Shift+D</p>
      </OptionSection>

      <OptionSection title="Zone Editor">
        <button onClick={onToggleZoneEditor} className={DEBUG_BTN}>
          Open Zone Editor
        </button>
        <p className="text-[8px] text-amber-700 text-center">Ctrl+Shift+Z</p>
      </OptionSection>

      <WeatherSection />
      <VictoryAndGameSection playerId={playerId} />
      <FestivalSection />
      <ResourceSection playerId={playerId} />
      <EventSection playerId={playerId} />
      <PlayerStateSection playerId={playerId} />
      <TeleportSection playerId={playerId} currentLocation={currentPlayer?.currentLocation} />

      <OptionSection title="SFX Generator">
        <a
          href={`${import.meta.env.BASE_URL}admin/sfx`}
          target="_blank"
          rel="noopener noreferrer"
          className={DEBUG_BTN}
        >
          Open SFX Generator
        </a>
      </OptionSection>

      <OptionSection title="Shortcuts">
        <div className="space-y-0.5 text-[8px] text-amber-800">
          <ShortcutRow keys="Ctrl+Shift+D" action="Debug Overlay" />
          <ShortcutRow keys="Ctrl+Shift+Z" action="Zone Editor" />
        </div>
      </OptionSection>
    </div>
  );
}

// --- Sub-sections for DeveloperTab ---

function WeatherSection() {
  const weather = useGameStore(s => s.weather);
  const setDebugWeather = useGameStore(s => s.setDebugWeather);

  return (
    <OptionSection title="Weather">
      <div className="grid grid-cols-3 gap-1">
        {WEATHER_OPTIONS.map(([type, label]) => (
          <button
            key={type}
            onClick={() => setDebugWeather(type)}
            className={`${SMALL_BTN} ${weather?.type === type ? 'bg-amber-300 border-amber-600 text-amber-900' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
    </OptionSection>
  );
}

function VictoryAndGameSection({ playerId }: { playerId: string | undefined }) {
  const modifyGold = useGameStore(s => s.modifyGold);
  const modifyHappiness = useGameStore(s => s.modifyHappiness);
  const checkVictory = useGameStore(s => s.checkVictory);
  const processWeekEnd = useGameStore(s => s.processWeekEnd);
  const startTurn = useGameStore(s => s.startTurn);
  const endTurn = useGameStore(s => s.endTurn);

  return (
    <OptionSection title="Victory & Game">
      <div className="space-y-1">
        <button
          onClick={() => {
            if (playerId) {
              modifyGold(playerId, 10000);
              modifyHappiness(playerId, 1000);
              checkVictory(playerId);
            }
          }}
          className={DEBUG_BTN}
        >
          Trigger Win (Current Player)
        </button>
        <button
          onClick={() => { if (playerId) checkVictory(playerId); }}
          className={DEBUG_BTN}
        >
          Check Victory
        </button>
        <button onClick={() => processWeekEnd()} className={DEBUG_BTN}>
          Force Week End
        </button>
        <button
          onClick={() => { if (playerId) startTurn(playerId); }}
          className={DEBUG_BTN}
        >
          Force Start Turn
        </button>
        <button onClick={() => endTurn()} className={DEBUG_BTN}>
          Force End Turn
        </button>
      </div>
    </OptionSection>
  );
}

function FestivalSection() {
  const activeFestival = useGameStore(s => s.activeFestival);
  const setDebugFestival = useGameStore(s => s.setDebugFestival);

  return (
    <OptionSection title="Festivals">
      <div className="grid grid-cols-2 gap-1">
        {FESTIVAL_OPTIONS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setDebugFestival(id)}
            className={`${SMALL_BTN} ${activeFestival === id ? 'bg-amber-300 border-amber-600' : ''}`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setDebugFestival(null)}
          className={`${SMALL_BTN} col-span-2`}
        >
          Clear Festival
        </button>
      </div>
    </OptionSection>
  );
}

function ResourceSection({ playerId }: { playerId: string | undefined }) {
  const modifyGold = useGameStore(s => s.modifyGold);
  const modifyHealth = useGameStore(s => s.modifyHealth);
  const modifyHappiness = useGameStore(s => s.modifyHappiness);
  const modifyFood = useGameStore(s => s.modifyFood);
  const modifyClothing = useGameStore(s => s.modifyClothing);
  const spendTime = useGameStore(s => s.spendTime);
  const modifyRelaxation = useGameStore(s => s.modifyRelaxation);

  if (!playerId) return null;

  return (
    <OptionSection title="Resources (Current Player)">
      <div className="space-y-1">
        <div className="grid grid-cols-3 gap-1">
          <button onClick={() => modifyGold(playerId, 500)} className={SMALL_BTN}>+500g</button>
          <button onClick={() => modifyGold(playerId, -500)} className={SMALL_BTN}>-500g</button>
          <button onClick={() => modifyGold(playerId, 5000)} className={SMALL_BTN}>+5000g</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button onClick={() => modifyHealth(playerId, 50)} className={SMALL_BTN}>+50 HP</button>
          <button onClick={() => modifyHealth(playerId, -50)} className={SMALL_BTN}>-50 HP</button>
          <button onClick={() => modifyHealth(playerId, 100)} className={SMALL_BTN}>Full HP</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button onClick={() => modifyHappiness(playerId, 50)} className={SMALL_BTN}>+50 Hap</button>
          <button onClick={() => modifyFood(playerId, 50)} className={SMALL_BTN}>+50 Food</button>
          <button onClick={() => modifyClothing(playerId, 50)} className={SMALL_BTN}>+50 Cloth</button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button onClick={() => spendTime(playerId, -20)} className={SMALL_BTN}>+20 Hours</button>
          <button onClick={() => modifyRelaxation(playerId, 20)} className={SMALL_BTN}>+20 Relax</button>
        </div>
      </div>
    </OptionSection>
  );
}

function EventSection({ playerId }: { playerId: string | undefined }) {
  const setEventMessage = useGameStore(s => s.setEventMessage);
  const setPhase = useGameStore(s => s.setPhase);
  const modifyGold = useGameStore(s => s.modifyGold);
  const modifyHealth = useGameStore(s => s.modifyHealth);
  const dismissEvent = useGameStore(s => s.dismissEvent);

  return (
    <OptionSection title="Events">
      <div className="space-y-1">
        <button
          onClick={() => {
            setEventMessage('DEBUG: Test event message.\nThis is a multi-line event for testing.');
            setPhase('event');
          }}
          className={DEBUG_BTN}
        >
          Trigger Event Message
        </button>
        <button
          onClick={() => {
            if (playerId) {
              setEventMessage(`Shadowfingers struck! DEBUG robbery test.\nYou lost 50 gold to a street thief!`);
              setPhase('event');
              modifyGold(playerId, -50);
            }
          }}
          className={DEBUG_BTN}
        >
          Trigger Robbery Event
        </button>
        <button
          onClick={() => {
            setEventMessage('Weekend: You enjoyed a relaxing weekend at the Rusty Tankard!\n+5 Happiness from the festivities.');
            setPhase('event');
          }}
          className={DEBUG_BTN}
        >
          Trigger Weekend Event
        </button>
        <button
          onClick={() => {
            if (playerId) {
              modifyHealth(playerId, -30);
              setEventMessage('You fell ill! The doctor charged you 100g for treatment.\n-30 Health, -100 Gold.');
              setPhase('event');
              modifyGold(playerId, -100);
            }
          }}
          className={DEBUG_BTN}
        >
          Trigger Doctor Visit
        </button>
        <button onClick={() => dismissEvent()} className={DEBUG_BTN}>
          Dismiss Event
        </button>
      </div>
    </OptionSection>
  );
}

function PlayerStateSection({ playerId }: { playerId: string | undefined }) {
  const cureSickness = useGameStore(s => s.cureSickness);
  const modifyMaxHealth = useGameStore(s => s.modifyMaxHealth);
  const buyGuildPass = useGameStore(s => s.buyGuildPass);
  const promoteGuildRank = useGameStore(s => s.promoteGuildRank);

  if (!playerId) return null;

  return (
    <OptionSection title="Player State">
      <div className="space-y-1">
        <button onClick={() => cureSickness(playerId)} className={DEBUG_BTN}>
          Cure Sickness
        </button>
        <button onClick={() => modifyMaxHealth(playerId, 20)} className={DEBUG_BTN}>
          +20 Max Health
        </button>
        <button onClick={() => buyGuildPass(playerId)} className={DEBUG_BTN}>
          Buy Guild Pass
        </button>
        <button onClick={() => promoteGuildRank(playerId)} className={DEBUG_BTN}>
          Promote Guild Rank
        </button>
      </div>
    </OptionSection>
  );
}

function TeleportSection({ playerId, currentLocation }: { playerId: string | undefined; currentLocation: string | undefined }) {
  const movePlayer = useGameStore(s => s.movePlayer);
  const selectLocation = useGameStore(s => s.selectLocation);

  if (!playerId) return null;

  return (
    <OptionSection title="Teleport">
      <div className="grid grid-cols-3 gap-1">
        {LOCATIONS_LIST.map(loc => (
          <button
            key={loc.id}
            onClick={() => {
              movePlayer(playerId, loc.id as LocationId, 0);
              selectLocation(loc.id as LocationId);
            }}
            className={`${SMALL_BTN} ${currentLocation === loc.id ? 'bg-amber-300 border-amber-600' : ''}`}
            title={loc.name}
          >
            {loc.short}
          </button>
        ))}
      </div>
    </OptionSection>
  );
}
