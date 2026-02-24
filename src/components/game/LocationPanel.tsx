import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getLocation, getMovementCost, getPath } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
import { playSFX } from '@/audio/sfxManager';
import { MapPin, Clock, ArrowRight, X, Swords } from 'lucide-react';
import { HomePanel } from './HomePanel';
import { LocationShell } from './LocationShell';
import { LOCATION_NPCS } from '@/data/npcs';
import { useState } from 'react';
import { NewspaperModal } from './NewspaperModal';
import { toast } from 'sonner';
import { NEWSPAPER_COST, generateNewspaper } from '@/data/newspaper';
import { getLocationTabs, getWorkInfo } from './locationTabs';
import type { LocationTabContext } from './locationTabs';
import { getQuestLocationObjectives } from '@/data/quests';

interface LocationPanelProps {
  locationId: LocationId;
}

export function LocationPanel({ locationId }: LocationPanelProps) {
  const store = useGameStore();
  const player = useCurrentPlayer();
  const location = getLocation(locationId);
  const [currentNewspaper, setCurrentNewspaper] = useState<ReturnType<typeof generateNewspaper> | null>(null);

  if (!location || !player) return null;

  const moveCost = getMovementCost(player.currentLocation, locationId);
  const isHere = player.currentLocation === locationId;
  const canAffordMove = player.timeRemaining >= moveCost;
  const canPartialTravel = !canAffordMove && player.timeRemaining > 0 && !isHere;

  const handleTravel = () => {
    if (isHere) return;
    if (canAffordMove) {
      store.movePlayer(player.id, locationId, moveCost);
    } else if (canPartialTravel) {
      const fullPath = getPath(player.currentLocation, locationId);
      const stepsCanTake = player.timeRemaining;
      if (stepsCanTake > 0 && fullPath.length > 1) {
        const partialPath = fullPath.slice(0, stepsCanTake + 1);
        const partialDestination = partialPath[partialPath.length - 1];
        store.movePlayer(player.id, partialDestination, player.timeRemaining);
        toast.info('Not enough time to reach destination. Turn ended.');
        store.selectLocation(null);
        setTimeout(() => store.endTurn(), 300);
      }
    }
  };

  const handleBuyNewspaper = () => {
    const price = Math.round(NEWSPAPER_COST * store.priceModifier);
    // M32 FIX: Check gold before purchasing
    if (player.gold < price) return;
    playSFX('item-buy');
    store.modifyGold(player.id, -price);
    const newspaper = generateNewspaper(store.week, store.priceModifier, store.economyTrend, store.weeklyNewsEvents);
    setCurrentNewspaper(newspaper);
  };

  const handleShowNewspaper = (newspaper: ReturnType<typeof generateNewspaper>) => {
    setCurrentNewspaper(newspaper);
  };

  // Build context for location tab factories
  const ctx: LocationTabContext = {
    player,
    players: store.players,
    priceModifier: store.priceModifier,
    economyTrend: store.economyTrend,
    week: store.week,
    weeklyNewsEvents: store.weeklyNewsEvents,
    stockPrices: store.stockPrices,
    stockPriceHistory: store.stockPriceHistory || {},
    modifyGold: store.modifyGold,
    modifyHappiness: store.modifyHappiness,
    modifyHealth: store.modifyHealth,
    modifyFood: store.modifyFood,
    modifyClothing: store.modifyClothing,
    modifyMaxHealth: store.modifyMaxHealth,
    modifyRelaxation: store.modifyRelaxation,
    spendTime: store.spendTime,
    workShift: store.workShift,
    studyDegree: store.studyDegree,
    completeDegree: store.completeDegree,
    prepayRent: store.prepayRent,
    moveToHousing: store.moveToHousing,
    begForMoreTime: store.begForMoreTime,
    depositToBank: store.depositToBank,
    withdrawFromBank: store.withdrawFromBank,
    takeQuest: store.takeQuest,
    completeQuest: store.completeQuest,
    abandonQuest: store.abandonQuest,
    completeLocationObjective: store.completeLocationObjective,
    takeChainQuest: store.takeChainQuest,
    takeNonLinearChain: store.takeNonLinearChain,
    makeNLChainChoice: store.makeNLChainChoice,
    takeBounty: store.takeBounty,
    buyGuildPass: store.buyGuildPass,
    sellItem: store.sellItem,
    setJob: store.setJob,
    requestRaise: store.requestRaise,
    negotiateRaise: store.negotiateRaise,
    buyDurable: store.buyDurable,
    equipItem: store.equipItem,
    unequipItem: store.unequipItem,
    clearDungeonFloor: store.clearDungeonFloor,
    applyRareDrop: store.applyRareDrop,
    buyStock: store.buyStock,
    sellStock: store.sellStock,
    takeLoan: store.takeLoan,
    repayLoan: store.repayLoan,
    buyFreshFood: store.buyFreshFood,
    buyFoodWithSpoilage: store.buyFoodWithSpoilage,
    buyLotteryTicket: store.buyLotteryTicket,
    buyTicket: store.buyTicket,
    cureSickness: store.cureSickness,
    temperEquipment: store.temperEquipment,
    forgeRepairAppliance: store.forgeRepairAppliance,
    forgeRepairEquipment: store.forgeRepairEquipment,
    salvageEquipment: store.salvageEquipment,
    locationHexes: store.locationHexes,
    onBuyNewspaper: handleBuyNewspaper,
    onShowNewspaper: handleShowNewspaper,
    setEventMessage: store.setEventMessage,
  };

  // Home locations get a full-panel visual room display (special case)
  const isHomeLocation = locationId === 'noble-heights' || locationId === 'slums';
  if (isHomeLocation && isHere) {
    return (
      <div className="h-full">
        <HomePanel
          player={player}
          locationId={locationId}
          spendTime={store.spendTime}
          modifyHappiness={store.modifyHappiness}
          modifyHealth={store.modifyHealth}
          modifyRelaxation={store.modifyRelaxation}
          onDone={() => store.selectLocation(null)}
        />
      </div>
    );
  }

  const npc = LOCATION_NPCS[locationId];
  const tabs = getLocationTabs(locationId, isHere, ctx);
  const workInfo = isHere ? getWorkInfo(locationId, ctx) : null;

  // Auto-select the active quest/bounty tab at Guild Hall
  const defaultTab = locationId === 'guild-hall' && player.activeQuest
    ? (player.activeQuest.startsWith('bounty:') ? 'bounties' : 'quests')
    : undefined;

  // LOQ: Check if current location has a pending quest objective
  const questObjectives = getQuestLocationObjectives(player.activeQuest, player.questChainProgress);
  const questProgress = player.questLocationProgress ?? [];
  const pendingObjectiveHere = isHere
    ? questObjectives.find(o => o.locationId === locationId && !questProgress.includes(o.id))
    : null;

  const handleCompleteObjective = () => {
    if (!pendingObjectiveHere) return;
    playSFX('quest-complete');
    store.completeLocationObjective(player.id, pendingObjectiveHere.id);
  };

  return (
    <>
      <div className={`h-full flex flex-col overflow-hidden ${isHere ? '' : 'parchment-panel p-3'}`}>
        {/* LOQ: Quest objective banner — shown when at an objective location */}
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
        {/* When at location: full LocationShell with header/footer */}
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
          /* Travel view - not at location */
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
                {canAffordMove ? `Travel to ${location.name}` : canPartialTravel ? `Head toward ${location.name}` : `Travel to ${location.name}`}
                <ArrowRight className="w-5 h-5" />
              </button>
              {!canAffordMove && canPartialTravel && (
                <p className="text-amber-500 text-sm mt-2">Not enough time to arrive — will walk as far as possible and end turn.</p>
              )}
              {!canAffordMove && !canPartialTravel && (
                <p className="text-destructive text-sm mt-2">No time remaining!</p>
              )}
            </div>
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
