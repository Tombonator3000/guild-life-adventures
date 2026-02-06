import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getLocation, getMovementCost, getPath } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
import { GUILD_PASS_COST } from '@/types/game.types';
import { MapPin, Clock, ArrowRight, X, Briefcase, Newspaper, TrendingUp, ScrollText, Scroll, Sword, ShieldHalf, Heart, Sparkles, Package, ShoppingBag, Dices, Coins, Home, GraduationCap, Hammer } from 'lucide-react';
import { getJob } from '@/data/jobs';
import { GuildHallPanel } from './GuildHallPanel';
import { NEWSPAPER_COST, NEWSPAPER_TIME, generateNewspaper } from '@/data/newspaper';
import { QuestPanel } from './QuestPanel';
import { HealerPanel } from './HealerPanel';
import { PawnShopPanel } from './PawnShopPanel';
import { EnchanterPanel } from './EnchanterPanel';
import { ShadowMarketPanel } from './ShadowMarketPanel';
import { getAvailableQuests } from '@/data/quests';
import { ActionButton } from './ActionButton';
import { WorkSection } from './WorkSection';
import { TavernPanel } from './TavernPanel';
import { BankPanel } from './BankPanel';
import { GeneralStorePanel } from './GeneralStorePanel';
import { ArmoryPanel } from './ArmoryPanel';
import { AcademyPanel } from './AcademyPanel';
import { LandlordPanel } from './LandlordPanel';
import { CavePanel } from './CavePanel';
import { HomePanel } from './HomePanel';
import { LocationShell, type LocationTab } from './LocationShell';
import { LOCATION_NPCS } from '@/data/npcs';
import { useState } from 'react';
import { NewspaperModal } from './NewspaperModal';
import { toast } from 'sonner';

interface LocationPanelProps {
  locationId: LocationId;
}

export function LocationPanel({ locationId }: LocationPanelProps) {
  const {
    selectLocation,
    movePlayer,
    modifyGold,
    modifyHappiness,
    modifyHealth,
    modifyFood,
    modifyClothing,
    modifyMaxHealth,
    modifyRelaxation,
    spendTime,
    workShift,
    studyDegree,
    completeDegree,
    prepayRent,
    moveToHousing,
    depositToBank,
    withdrawFromBank,
    invest,
    priceModifier,
    economyTrend,
    week,
    takeQuest,
    completeQuest,
    abandonQuest,
    buyGuildPass,
    sellItem,
    setJob,
    requestRaise,
    negotiateRaise,
    buyDurable,
    equipItem,
    unequipItem,
    clearDungeonFloor,
    applyRareDrop,
    buyStock,
    sellStock,
    takeLoan,
    repayLoan,
    buyFreshFood,
    buyLotteryTicket,
    buyTicket,
    stockPrices,
    cureSickness,
    endTurn,
  } = useGameStore();
  const player = useCurrentPlayer();
  const location = getLocation(locationId);
  const [showNewspaper, setShowNewspaper] = useState(false);
  const [currentNewspaper, setCurrentNewspaper] = useState<ReturnType<typeof generateNewspaper> | null>(null);

  if (!location || !player) return null;

  const moveCost = getMovementCost(player.currentLocation, locationId);
  const isHere = player.currentLocation === locationId;
  const canAffordMove = player.timeRemaining >= moveCost;

  const canPartialTravel = !canAffordMove && player.timeRemaining > 0 && !isHere;

  const handleTravel = () => {
    if (isHere) return;
    if (canAffordMove) {
      movePlayer(player.id, locationId, moveCost);
    } else if (canPartialTravel) {
      // Partial travel: walk as far as possible, then end turn
      const fullPath = getPath(player.currentLocation, locationId);
      const stepsCanTake = player.timeRemaining;
      if (stepsCanTake > 0 && fullPath.length > 1) {
        const partialPath = fullPath.slice(0, stepsCanTake + 1);
        const partialDestination = partialPath[partialPath.length - 1];
        movePlayer(player.id, partialDestination, player.timeRemaining);
        toast.info('Not enough time to reach destination. Turn ended.');
        selectLocation(null);
        setTimeout(() => endTurn(), 300);
      }
    }
  };

  const handleBuyNewspaper = () => {
    const price = Math.round(NEWSPAPER_COST * priceModifier);
    modifyGold(player.id, -price);
    spendTime(player.id, NEWSPAPER_TIME);
    const newspaper = generateNewspaper(week, priceModifier, economyTrend);
    setCurrentNewspaper(newspaper);
    setShowNewspaper(true);
  };

  // Check if player has a job at this location (for Work tab)
  const currentJobData = player.currentJob ? getJob(player.currentJob) : null;

  // Build tabs for each location
  const getLocationTabs = (): LocationTab[] | null => {
    if (!isHere) return null;

    switch (locationId) {
      case 'guild-hall': {
        const availableQuests = getAvailableQuests(player.guildRank);
        const canWorkAtGuildHall = currentJobData && currentJobData.location === 'Guild Hall';
        const MIN_SHIFTS_FOR_RAISE = 3;

        const tabs: LocationTab[] = [];

        // Quest tab
        tabs.push({
          id: 'quests',
          label: 'Quests',
          badge: player.activeQuest ? '!' : undefined,
          content: player.hasGuildPass ? (
            <QuestPanel
              quests={availableQuests}
              player={player}
              onTakeQuest={(questId) => takeQuest(player.id, questId)}
              onCompleteQuest={() => completeQuest(player.id)}
              onAbandonQuest={() => abandonQuest(player.id)}
            />
          ) : (
            <div className="space-y-3">
              <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
                <ScrollText className="w-4 h-4" /> Guild Quest Board
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                You need a <span className="font-bold text-[#c9a227]">Guild Pass</span> to access the quest board.
              </p>
              <div className="text-center bg-black/20 p-2 rounded mb-2">
                <span className="text-xs text-muted-foreground">Guild Pass Cost:</span>
                <span className="font-bold text-[#c9a227] ml-2">{GUILD_PASS_COST}g</span>
              </div>
              <button
                onClick={() => {
                  buyGuildPass(player.id);
                  toast.success('Guild Pass acquired! You can now take quests.');
                }}
                disabled={player.gold < GUILD_PASS_COST}
                className="w-full gold-button py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {player.gold < GUILD_PASS_COST
                  ? `Need ${GUILD_PASS_COST - player.gold}g more`
                  : `Buy Guild Pass (${GUILD_PASS_COST}g)`}
              </button>
            </div>
          ),
        });

        // Employment tab
        tabs.push({
          id: 'employment',
          label: 'Jobs',
          content: (
            <GuildHallPanel
              player={player}
              priceModifier={priceModifier}
              onHireJob={(jobId, wage) => {
                setJob(player.id, jobId, wage);
                const job = getJob(jobId);
                toast.success(`You are now employed as ${job?.name}!`);
              }}
              onNegotiateRaise={(newWage) => {
                negotiateRaise(player.id, newWage);
                toast.success(`Salary increased to ${newWage}g/hour!`);
              }}
              onSpendTime={(hours) => spendTime(player.id, hours)}
            />
          ),
        });

        // Work tab (only if job is at Guild Hall)
        tabs.push({
          id: 'work',
          label: 'Work',
          hidden: !canWorkAtGuildHall,
          content: canWorkAtGuildHall && currentJobData ? (
            <div className="space-y-3">
              <div className="bg-[#3d3224] border border-[#8b7355] rounded p-3">
                <h4 className="font-display text-sm text-[#e0d4b8] flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4" /> {currentJobData.name}
                </h4>
                <div className="flex justify-between text-sm font-mono mb-1">
                  <span className="text-[#a09080]">Wage:</span>
                  <span className="font-bold text-[#c9a227]">{player.currentWage}g/hour</span>
                </div>
                <div className="flex justify-between text-sm font-mono mb-3">
                  <span className="text-[#a09080]">Shift earnings:</span>
                  <span className="font-bold text-[#c9a227]">{Math.ceil(currentJobData.hoursPerShift * 1.33 * player.currentWage)}g</span>
                </div>
                <div className="flex gap-2">
                  <ActionButton
                    label={`Work Shift (+${Math.ceil(currentJobData.hoursPerShift * 1.33 * player.currentWage)}g)`}
                    cost={0}
                    time={currentJobData.hoursPerShift}
                    disabled={player.timeRemaining < currentJobData.hoursPerShift}
                    onClick={() => {
                      workShift(player.id, currentJobData.hoursPerShift, player.currentWage);
                    }}
                  />
                  <button
                    onClick={() => {
                      const result = requestRaise(player.id);
                      toast(result.success ? result.message : result.message, {
                        description: result.success ? '🎉' : '😔',
                      });
                    }}
                    className="gold-button text-xs py-1 px-2 flex items-center gap-1"
                    disabled={player.dependability < 40 || (player.shiftsWorkedSinceHire || 0) < MIN_SHIFTS_FOR_RAISE}
                    title={(player.shiftsWorkedSinceHire || 0) < MIN_SHIFTS_FOR_RAISE ? `Work ${MIN_SHIFTS_FOR_RAISE} shifts first (${player.shiftsWorkedSinceHire || 0}/${MIN_SHIFTS_FOR_RAISE})` : 'Request a raise'}
                  >
                    <TrendingUp className="w-3 h-3" /> Raise
                  </button>
                </div>
              </div>
            </div>
          ) : null,
        });

        return tabs;
      }

      case 'rusty-tankard':
        return [{
          id: 'menu',
          label: 'Menu',
          content: (
            <TavernPanel
              player={player}
              priceModifier={priceModifier}
              modifyGold={modifyGold}
              spendTime={spendTime}
              modifyFood={modifyFood}
              modifyHappiness={modifyHappiness}
              workShift={workShift}
            />
          ),
        }];

      case 'forge': {
        const canWorkAtForge = currentJobData && currentJobData.location === 'Forge';
        const tabs: LocationTab[] = [];

        // Work tab (only if player has a Forge job via Guild Hall)
        tabs.push({
          id: 'work',
          label: 'Work',
          hidden: !canWorkAtForge,
          content: canWorkAtForge ? (
            <WorkSection
              player={player}
              locationName="Forge"
              workShift={workShift}
              variant="wood-frame"
            />
          ) : null,
        });

        // If no forge job, show info message
        if (!canWorkAtForge) {
          tabs.push({
            id: 'info',
            label: 'Forge',
            content: (
              <div className="space-y-3">
                <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
                  <Hammer className="w-4 h-4" /> The Forge
                </h4>
                <p className="text-xs text-muted-foreground">
                  Industrial work. Hard labor but steady pay.
                </p>
                <div className="bg-[#2d1f0f] border border-[#8b7355] rounded p-3 text-center">
                  <p className="text-sm text-[#e0d4b8] font-display mb-2">
                    No Forge Job
                  </p>
                  <p className="text-xs text-[#a09080]">
                    Visit the <span className="text-[#c9a227] font-bold">Guild Hall</span> to apply for a Forge position first.
                  </p>
                </div>
              </div>
            ),
          });
        }

        return tabs;
      }

      case 'academy':
        return [{
          id: 'courses',
          label: 'Courses',
          content: (
            <AcademyPanel
              player={player}
              priceModifier={priceModifier}
              studyDegree={studyDegree}
              completeDegree={completeDegree}
              workShift={workShift}
            />
          ),
        }];

      case 'bank':
        return [{
          id: 'banking',
          label: 'Services',
          content: (
            <BankPanel
              player={player}
              spendTime={spendTime}
              depositToBank={depositToBank}
              withdrawFromBank={withdrawFromBank}
              invest={invest}
              workShift={workShift}
              buyStock={buyStock}
              sellStock={sellStock}
              takeLoan={takeLoan}
              repayLoan={repayLoan}
              stockPrices={stockPrices}
            />
          ),
        }];

      case 'general-store':
        return [{
          id: 'shop',
          label: 'Shop',
          content: (
            <GeneralStorePanel
              player={player}
              priceModifier={priceModifier}
              modifyGold={modifyGold}
              spendTime={spendTime}
              modifyFood={modifyFood}
              modifyHappiness={modifyHappiness}
              workShift={workShift}
              onBuyNewspaper={handleBuyNewspaper}
              buyFreshFood={buyFreshFood}
            />
          ),
        }];

      case 'armory':
        return [{
          id: 'equipment',
          label: 'Equipment',
          content: (
            <ArmoryPanel
              player={player}
              priceModifier={priceModifier}
              modifyGold={modifyGold}
              spendTime={spendTime}
              modifyClothing={modifyClothing}
              modifyHappiness={modifyHappiness}
              workShift={workShift}
              buyDurable={buyDurable}
              equipItem={equipItem}
              unequipItem={unequipItem}
            />
          ),
        }];

      case 'enchanter': {
        const tabs: LocationTab[] = [
          {
            id: 'healing',
            label: 'Healing',
            content: (
              <HealerPanel
                player={player}
                priceModifier={priceModifier}
                onHeal={(cost, healthGain, time) => {
                  modifyGold(player.id, -cost);
                  modifyHealth(player.id, healthGain);
                  spendTime(player.id, time);
                }}
                onCureSickness={(cost, time) => {
                  modifyGold(player.id, -cost);
                  spendTime(player.id, time);
                  cureSickness(player.id);
                }}
                onBlessHealth={(cost, time) => {
                  modifyGold(player.id, -cost);
                  modifyMaxHealth(player.id, 10);
                  spendTime(player.id, time);
                }}
              />
            ),
          },
          {
            id: 'appliances',
            label: 'Appliances',
            content: (
              <EnchanterPanel
                player={player}
                priceModifier={priceModifier}
                onSpendTime={(hours) => spendTime(player.id, hours)}
              />
            ),
          },
          {
            id: 'work',
            label: 'Work',
            hidden: !(currentJobData && currentJobData.location === 'Enchanter'),
            content: (
              <WorkSection
                player={player}
                locationName="Enchanter"
                workShift={workShift}
                variant="jones"
              />
            ),
          },
        ];
        return tabs;
      }

      case 'landlord': {
        const tabs: LocationTab[] = [
          {
            id: 'housing',
            label: 'Housing',
            content: (
              <LandlordPanel
                player={player}
                priceModifier={priceModifier}
                spendTime={spendTime}
                prepayRent={prepayRent}
                moveToHousing={moveToHousing}
              />
            ),
          },
        ];
        return tabs;
      }

      case 'shadow-market': {
        const shadowNewspaperPrice = Math.round(NEWSPAPER_COST * priceModifier * 0.5);

        const tabs: LocationTab[] = [
          {
            id: 'market',
            label: 'Market',
            content: (
              <div className="space-y-3">
                <ActionButton
                  label="Buy Newspaper (Discount)"
                  cost={shadowNewspaperPrice}
                  time={NEWSPAPER_TIME}
                  disabled={player.gold < shadowNewspaperPrice || player.timeRemaining < NEWSPAPER_TIME}
                  onClick={() => {
                    modifyGold(player.id, -shadowNewspaperPrice);
                    spendTime(player.id, NEWSPAPER_TIME);
                    const newspaper = generateNewspaper(week, priceModifier, economyTrend);
                    setCurrentNewspaper(newspaper);
                    setShowNewspaper(true);
                  }}
                />
                <ShadowMarketPanel
                  player={player}
                  priceModifier={priceModifier}
                  onSpendTime={(hours) => spendTime(player.id, hours)}
                  onModifyGold={(amount) => modifyGold(player.id, amount)}
                  onModifyHappiness={(amount) => modifyHappiness(player.id, amount)}
                  onModifyFood={(amount) => modifyFood(player.id, amount)}
                  buyLotteryTicket={buyLotteryTicket}
                  buyTicket={buyTicket}
                />
              </div>
            ),
          },
          {
            id: 'work',
            label: 'Work',
            hidden: !(currentJobData && currentJobData.location === 'Shadow Market'),
            content: (
              <WorkSection
                player={player}
                locationName="Shadow Market"
                workShift={workShift}
                variant="jones"
              />
            ),
          },
        ];
        return tabs;
      }

      case 'fence':
        return [{
          id: 'fence',
          label: 'Trade',
          content: (
            <PawnShopPanel
              player={player}
              priceModifier={priceModifier}
              onSellItem={(itemId, price) => {
                sellItem(player.id, itemId, price);
                spendTime(player.id, 1);
              }}
              onBuyUsedItem={(itemId, price) => {
                modifyGold(player.id, -price);
                spendTime(player.id, 1);
                if (itemId === 'used-clothes') {
                  modifyClothing(player.id, 50);
                } else if (itemId === 'used-blanket') {
                  modifyHappiness(player.id, 3);
                } else if (itemId === 'used-sword') {
                  buyDurable(player.id, 'sword', 0);
                  equipItem(player.id, 'sword', 'weapon');
                  toast.success('Equipped Used Sword!');
                } else if (itemId === 'used-shield') {
                  buyDurable(player.id, 'shield', 0);
                  equipItem(player.id, 'shield', 'shield');
                  toast.success('Equipped Dented Shield!');
                }
              }}
              onGamble={(stake) => {
                modifyGold(player.id, -stake);
                spendTime(player.id, stake >= 100 ? 3 : 2);

                let winChance = stake === 10 ? 0.4 : stake === 50 ? 0.3 : 0.2;
                let winAmount = stake === 10 ? 25 : stake === 50 ? 150 : 400;

                if (Math.random() < winChance) {
                  modifyGold(player.id, winAmount);
                  modifyHappiness(player.id, stake >= 100 ? 25 : stake >= 50 ? 15 : 5);
                } else {
                  modifyHappiness(player.id, stake >= 100 ? -20 : stake >= 50 ? -10 : -3);
                }
              }}
              onSpendTime={(hours) => spendTime(player.id, hours)}
            />
          ),
        }];

      case 'cave':
        return [{
          id: 'dungeon',
          label: 'Dungeon',
          content: (
            <CavePanel
              player={player}
              spendTime={spendTime}
              modifyGold={modifyGold}
              modifyHealth={modifyHealth}
              modifyHappiness={modifyHappiness}
              clearDungeonFloor={clearDungeonFloor}
              applyRareDrop={applyRareDrop}
            />
          ),
        }];

      default:
        return [{
          id: 'default',
          label: 'Info',
          content: (
            <p className="text-muted-foreground text-center py-4">
              This location is under construction...
            </p>
          ),
        }];
    }
  };

  // Home locations get a full-panel visual room display (Jones-style)
  const isHomeLocation = locationId === 'noble-heights' || locationId === 'slums';
  if (isHomeLocation && isHere) {
    return (
      <div className="h-full">
        <HomePanel
          player={player}
          spendTime={spendTime}
          modifyHappiness={modifyHappiness}
          modifyHealth={modifyHealth}
          modifyRelaxation={modifyRelaxation}
          onDone={() => selectLocation(null)}
        />
      </div>
    );
  }

  const npc = LOCATION_NPCS[locationId];
  const tabs = getLocationTabs();

  return (
    <>
      <div className={`parchment-panel h-full flex flex-col overflow-hidden ${isHere ? 'p-2' : 'p-3'}`}>
        {/* Header - compact single line when at location, full when traveling */}
        <div className={`flex items-center justify-between ${isHere ? 'mb-1' : 'mb-2'}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <h2 className={`font-display font-bold text-card-foreground leading-tight truncate ${isHere ? 'text-sm' : 'text-lg'}`}>
              {location.name}
            </h2>
            {isHere && (
              <span className="text-muted-foreground text-[11px] truncate hidden sm:inline">{location.description}</span>
            )}
          </div>
          <button
            onClick={() => selectLocation(null)}
            className="p-1 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {!isHere && (
          <p className="text-muted-foreground text-xs mb-2 ml-6">{location.description}</p>
        )}

        {/* Travel or Actions */}
        <div className="flex-1 overflow-hidden">
          {isHere && npc && tabs ? (
            <LocationShell key={locationId} npc={npc} tabs={tabs} locationId={locationId} />
          ) : isHere && tabs ? (
            <div className="overflow-y-auto h-full">
              {tabs[0]?.content}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
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
          )}
        </div>
      </div>

      <NewspaperModal
        newspaper={currentNewspaper}
        onClose={() => { setShowNewspaper(false); setCurrentNewspaper(null); }}
      />
    </>
  );
}
