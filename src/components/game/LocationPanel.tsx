import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { getLocation, getPath } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
import { playSFX } from '@/audio/sfxManager';
import { MapPin, Clock, ArrowRight, X, Swords } from 'lucide-react';
import { HomePanel } from './HomePanel';
import { LocationShell } from './LocationShell';
import { LOCATION_NPCS } from '@/data/npcs';
import { useState } from 'react';
import { NewspaperModal } from './NewspaperModal';
import { toast } from 'sonner';
import { generateNewspaper } from '@/data/newspaper';
import { getLocationTabs, getWorkInfo } from './locationTabs';
import type { LocationTabContext } from './locationTabs';
import { getQuestLocationObjectives } from '@/data/quests';

const LOCATION_SERVICES: Partial<Record<LocationId, string[]>> = {
  'noble-heights': ['Luxury housing (safe, expensive)', 'Relax & restore health'],
  landlord: ['Pay rent', 'Upgrade / downgrade housing', 'Prepay multiple weeks'],
  slums: ['Cheap housing (robbery risk)', 'Relax at home'],
  'shadow-market': ['Pawn items for quick gold', 'Lottery tickets', 'Buy a newspaper'],
  'general-store': ['Buy food (bread & cheese)', 'Buy supplies'],
  graveyard: ['Pray for blessings', 'Mourn the fallen'],
  'rusty-tankard': ['Buy fresh food (tavern meals)', 'Drink & socialize (+happiness)', 'Cure sickness'],
  armory: ['Buy clothing & uniforms', 'Buy weapons & armor', 'Temper equipment'],
  forge: ['Smelt & craft items', 'Repair equipment (cheaper than Enchanter)'],
  'guild-hall': ['Browse & accept jobs', 'Take quests & bounties', 'Buy a Guild Pass'],
  cave: ['Explore dungeon floors', 'Fight monsters for rare loot'],
  academy: ['Enroll in degrees', 'Attend class sessions', 'Graduate for bonus stats'],
  enchanter: ['Buy magical appliances', 'Enchant items', 'Repair appliances', 'Cast hexes'],
  bank: ['Deposit / withdraw gold', 'Take loans', 'Invest in the market'],
};

interface LocationPanelProps {
  locationId: LocationId;
}

export function LocationPanel({ locationId }: LocationPanelProps) {
  const store = useGameStore(useShallow(state => ({
    weather: state.weather,
    players: state.players,
    priceModifier: state.priceModifier,
    economyTrend: state.economyTrend,
    week: state.week,
    weeklyNewsEvents: state.weeklyNewsEvents,
    stockPrices: state.stockPrices,
    stockPriceHistory: state.stockPriceHistory,
    locationHexes: state.locationHexes,
    travelPlayer: state.travelPlayer,
    selectLocation: state.selectLocation,
    endTurn: state.endTurn,
    performWorkShift: state.performWorkShift,
    attendDegreeSession: state.attendDegreeSession,
    prepayDegree: state.prepayDegree,
    graduateDegree: state.graduateDegree,
    takeQuest: state.takeQuest,
    completeQuest: state.completeQuest,
    abandonQuest: state.abandonQuest,
    completeLocationObjective: state.completeLocationObjective,
    takeChainQuest: state.takeChainQuest,
    takeNonLinearChain: state.takeNonLinearChain,
    makeNLChainChoice: state.makeNLChainChoice,
    takeBounty: state.takeBounty,
    buyGuildPass: state.buyGuildPass,
    acceptJobOffer: state.acceptJobOffer,
    acceptMarketRaise: state.acceptMarketRaise,
    requestRaise: state.requestRaise,
    equipItem: state.equipItem,
    unequipItem: state.unequipItem,
    useEquipmentService: state.useEquipmentService,
    useApplianceService: state.useApplianceService,
    readBook: state.readBook,
  })));
  const player = useCurrentPlayer();
  const location = getLocation(locationId);
  const [currentNewspaper, setCurrentNewspaper] = useState<ReturnType<typeof generateNewspaper> | null>(null);

  if (!location || !player) return null;

  const travelPath = getPath(player.currentLocation, locationId);
  const weatherExtra = store.weather?.movementCostExtra ?? 0;
  const routeCost = (steps: number) => steps + Math.floor(steps * Math.max(0, weatherExtra));
  const moveCost = routeCost(Math.max(0, travelPath.length - 1));
  const isHere = player.currentLocation === locationId;
  let partialSteps = 0;
  for (let steps = 1; steps < travelPath.length; steps += 1) {
    if (routeCost(steps) <= player.timeRemaining) partialSteps = steps;
  }
  const canAffordMove = !isHere && player.timeRemaining >= moveCost;
  const canPartialTravel = !canAffordMove && partialSteps > 0;

  const handleTravel = () => {
    if (isHere) return;
    if (canAffordMove) {
      const result = store.travelPlayer(player.id, travelPath);
      if (result && !result.success) toast.error(result.message);
    } else if (canPartialTravel) {
      const partialPath = travelPath.slice(0, partialSteps + 1);
      const result = store.travelPlayer(player.id, partialPath);
      if (result && !result.success) {
        toast.error(result.message);
        return;
      }
      toast.info('Not enough time to reach destination. Turn ended.');
      store.selectLocation(null);
      setTimeout(() => store.endTurn(), 300);
    }
  };

  const handleShowNewspaper = (newspaper: ReturnType<typeof generateNewspaper>) => {
    setCurrentNewspaper(newspaper);
  };

  const ctx: LocationTabContext = {
    player,
    players: store.players,
    priceModifier: store.priceModifier,
    economyTrend: store.economyTrend,
    week: store.week,
    weeklyNewsEvents: store.weeklyNewsEvents,
    stockPrices: store.stockPrices,
    stockPriceHistory: store.stockPriceHistory || {},
    performWorkShift: store.performWorkShift,
    attendDegreeSession: store.attendDegreeSession,
    prepayDegree: store.prepayDegree,
    graduateDegree: store.graduateDegree,
    takeQuest: store.takeQuest,
    completeQuest: store.completeQuest,
    abandonQuest: store.abandonQuest,
    takeChainQuest: store.takeChainQuest,
    takeNonLinearChain: store.takeNonLinearChain,
    makeNLChainChoice: store.makeNLChainChoice,
    takeBounty: store.takeBounty,
    buyGuildPass: store.buyGuildPass,
    acceptJobOffer: store.acceptJobOffer,
    acceptMarketRaise: store.acceptMarketRaise,
    requestRaise: store.requestRaise,
    equipItem: store.equipItem,
    unequipItem: store.unequipItem,
    equipmentServiceAction: store.useEquipmentService,
    applianceServiceAction: store.useApplianceService,
    readBook: store.readBook,
    locationHexes: store.locationHexes,
    onShowNewspaper: handleShowNewspaper,
  };

  const isHomeLocation = locationId === 'noble-heights' || locationId === 'slums';
  if (isHomeLocation && isHere) {
    return (
      <div className="h-full">
        <HomePanel
          player={player}
          locationId={locationId}
          onDone={() => store.selectLocation(null)}
        />
      </div>
    );
  }

  const npc = LOCATION_NPCS[locationId];
  const tabs = getLocationTabs(locationId, isHere, ctx);
  const workInfo = isHere ? getWorkInfo(locationId, ctx) : null;

  const defaultTab = locationId === 'guild-hall' && player.activeQuest
    ? (player.activeQuest.startsWith('bounty:') ? 'bounties' : 'quests')
    : undefined;

  const chainProgressForLOQ = player.activeQuest?.startsWith('nlchain:')
    ? player.nlChainProgress
    : player.questChainProgress;
  const questObjectives = getQuestLocationObjectives(player.activeQuest, chainProgressForLOQ);
  const questProgress = player.questLocationProgress ?? [];
  const pendingObjectiveHere = isHere
    ? questObjectives.find(objective => objective.locationId === locationId && !questProgress.includes(objective.id))
    : null;

  const handleCompleteObjective = () => {
    if (!pendingObjectiveHere) return;
    playSFX('quest-complete');
    store.completeLocationObjective(player.id, pendingObjectiveHere.id);
  };

  return (
    <>
      <div className={`h-full flex flex-col overflow-hidden ${isHere ? '' : 'parchment-panel p-3'}`}>
        {pendingObjectiveHere && (
          <div className="flex-shrink-0 bg-amber-900/80 border border-amber-400/70 px-3 py-2 flex items-center gap-2 z-20">
            <Swords className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-amber-200 text-xs font-semibold leading-tight truncate">Quest Objective</p>
              <p className="text-amber-100/80 text-xs leading-tight truncate">{pendingObjectiveHere.description}</p>
            </div>
            <button
              onClick={handleCompleteObjective}
              className="flex-shrink-0 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded text-xs font-bold transition-colors"
            >
              {pendingObjectiveHere.actionText}
            </button>
          </div>
        )}

        {isHere && npc && tabs ? (
          <LocationShell
            key={locationId}
            npc={npc}
            tabs={tabs}
            defaultTab={defaultTab}
            locationId={locationId}
            locationName={location.name}
            xlPortrait
            workInfo={workInfo}
          />
        ) : isHere && tabs ? (
          <div className="overflow-y-auto h-full">
            {tabs[0]?.content}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <h2 className="font-display font-bold text-card-foreground leading-tight truncate text-lg">
                  {location.name}
                </h2>
              </div>
              <button
                onClick={() => store.selectLocation(null)}
                className="p-1 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground text-xs mb-2 ml-6">{location.description}</p>
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Clock className="w-5 h-5" />
                <span>Travel time: {moveCost} hours</span>
              </div>
              <button
                onClick={handleTravel}
                disabled={!canAffordMove && !canPartialTravel}
                className="gold-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canAffordMove
                  ? `Travel to ${location.name}`
                  : canPartialTravel
                    ? `Head toward ${location.name}`
                    : `Travel to ${location.name}`}
                <ArrowRight className="w-5 h-5" />
              </button>
              {!canAffordMove && canPartialTravel && (
                <p className="text-amber-500 text-sm mt-2">
                  Not enough time to arrive — will walk as far as possible and end turn.
                </p>
              )}
              {!canAffordMove && !canPartialTravel && (
                <p className="text-destructive text-sm mt-2">No time remaining!</p>
              )}
            </div>
            {!canAffordMove && !canPartialTravel && LOCATION_SERVICES[locationId] && (
              <div className="mt-4 border-t border-muted pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What's here</p>
                <ul className="space-y-1">
                  {LOCATION_SERVICES[locationId]!.map(service => (
                    <li key={service} className="flex items-start gap-1.5 text-sm text-card-foreground">
                      <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <NewspaperModal
        newspaper={currentNewspaper}
        onClose={() => { setCurrentNewspaper(null); }}
      />
    </>
  );
}
