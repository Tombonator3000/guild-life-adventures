import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getLocation, getMovementCost, getPath } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
import { GUILD_PASS_COST } from '@/types/game.types';
import { MapPin, Clock, ArrowRight, X, Briefcase, Newspaper, TrendingUp, ScrollText, Scroll, Sword, ShieldHalf, Heart, Sparkles, Package, ShoppingBag, Dices, Coins, Home, GraduationCap, Hammer } from 'lucide-react';
import { getJob } from '@/data/jobs';
import { GuildHallPanel } from './GuildHallPanel';
import { ForgePanel } from './ForgePanel';
import { NEWSPAPER_COST, NEWSPAPER_TIME, generateNewspaper } from '@/data/newspaper';
import { QuestPanel } from './QuestPanel';
import { HealerPanel } from './HealerPanel';
import { PawnShopPanel } from './PawnShopPanel';
import { EnchanterPanel } from './EnchanterPanel';
import { ShadowMarketPanel } from './ShadowMarketPanel';
import { getAvailableQuests } from '@/data/quests';
import { ActionButton } from './ActionButton';
import { TavernPanel } from './TavernPanel';
import { BankPanel } from './BankPanel';
import { GeneralStorePanel } from './GeneralStorePanel';
import { ArmoryPanel } from './ArmoryPanel';
import { AcademyPanel } from './AcademyPanel';
import { LandlordPanel } from './LandlordPanel';
import { CavePanel } from './CavePanel';
import { GraveyardPanel } from './GraveyardPanel';
import { HomePanel } from './HomePanel';
import { LocationShell, type LocationTab, type WorkInfo } from './LocationShell';
import { LOCATION_NPCS } from '@/data/npcs';
import { useState } from 'react';
import { NewspaperModal } from './NewspaperModal';
import { toast } from 'sonner';

interface LocationPanelProps {
  locationId: LocationId;
}

// Map location ID to the job location name used in jobs.ts
const JOB_LOCATION_MAP: Record<string, string> = {
  'guild-hall': 'Guild Hall',
  'bank': 'Bank',
  'forge': 'Forge',
  'academy': 'Academy',
  'general-store': 'General Store',
  'armory': 'Armory',
  'enchanter': 'Enchanter',
  'shadow-market': 'Shadow Market',
  'rusty-tankard': 'Rusty Tankard',
  'fence': 'Fence',
};

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
    takeChainQuest,
    takeBounty,
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
    temperEquipment,
    forgeRepairAppliance,
    salvageEquipment,
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

  // Check if player has a job at this location (for footer work bar)
  const currentJobData = player.currentJob ? getJob(player.currentJob) : null;

  // Build work info for the standardized footer bar
  const getWorkInfo = (): WorkInfo | null => {
    const jobLocationName = JOB_LOCATION_MAP[locationId];
    if (!currentJobData || !jobLocationName || currentJobData.location !== jobLocationName) return null;
    const earnings = Math.floor(currentJobData.hoursPerShift * player.currentWage * 1.15);
    return {
      jobName: currentJobData.name,
      wage: player.currentWage,
      hoursPerShift: currentJobData.hoursPerShift,
      earnings,
      canWork: player.timeRemaining >= currentJobData.hoursPerShift,
      onWork: () => {
        workShift(player.id, currentJobData.hoursPerShift, player.currentWage);
        toast.success(`Worked a shift at ${currentJobData.name}!`);
      },
    };
  };

  // Build tabs for each location
  const getLocationTabs = (): LocationTab[] | null => {
    if (!isHere) return null;

    switch (locationId) {
      case 'guild-hall': {
        const availableQuests = getAvailableQuests(player.guildRank);
        const canWorkAtGuildHall = currentJobData && currentJobData.location === 'Guild Hall';
        const MIN_SHIFTS_FOR_RAISE = 3;

        const tabs: LocationTab[] = [];

        // Quest tab — bounties always visible, quests/chains require Guild Pass
        tabs.push({
          id: 'quests',
          label: 'Quests',
          badge: player.activeQuest ? '!' : undefined,
          content: (
            <div className="space-y-3">
              {!player.hasGuildPass && (
                <div className="space-y-2 mb-3">
                  <p className="text-sm text-[#6b5a42]">
                    <span className="font-bold text-[#c9a227]">Guild Pass</span> required for quests and chains. Bounties are free!
                  </p>
                  <div className="text-center bg-[#e0d4b8] p-2 rounded border border-[#8b7355]">
                    <span className="text-xs text-[#6b5a42]">Guild Pass Cost:</span>
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
              )}
              <QuestPanel
                quests={availableQuests}
                player={player}
                week={week}
                onTakeQuest={(questId) => takeQuest(player.id, questId)}
                onCompleteQuest={() => completeQuest(player.id)}
                onAbandonQuest={() => abandonQuest(player.id)}
                onTakeChainQuest={(chainId) => takeChainQuest(player.id, chainId)}
                onTakeBounty={(bountyId) => takeBounty(player.id, bountyId)}
              />
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
              week={week}
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

        // Work tab (only if job is at Guild Hall) - shows raise option
        tabs.push({
          id: 'work',
          label: 'Work',
          hidden: !canWorkAtGuildHall,
          content: canWorkAtGuildHall && currentJobData ? (
            <div className="space-y-3">
              <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-3">
                <h4 className="font-display text-sm text-[#3d2a14] flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4" /> {currentJobData.name}
                </h4>
                <div className="flex justify-between text-sm font-mono mb-1">
                  <span className="text-[#6b5a42]">Wage:</span>
                  <span className="font-bold text-[#c9a227]">{player.currentWage}g/hour</span>
                </div>
                <div className="flex justify-between text-sm font-mono mb-3">
                  <span className="text-[#6b5a42]">Shift earnings:</span>
                  <span className="font-bold text-[#c9a227]">{Math.floor(currentJobData.hoursPerShift * player.currentWage * 1.15)}g</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const result = requestRaise(player.id);
                      toast(result.success ? result.message : result.message);
                    }}
                    className="gold-button text-xs py-1 px-2 flex items-center gap-1"
                    disabled={player.dependability < 40 || (player.shiftsWorkedSinceHire || 0) < MIN_SHIFTS_FOR_RAISE}
                    title={(player.shiftsWorkedSinceHire || 0) < MIN_SHIFTS_FOR_RAISE ? `Work ${MIN_SHIFTS_FOR_RAISE} shifts first (${player.shiftsWorkedSinceHire || 0}/${MIN_SHIFTS_FOR_RAISE})` : 'Request a raise'}
                  >
                    <TrendingUp className="w-3 h-3" /> Request Raise
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
            />
          ),
        }];

      case 'forge': {
        const forgeProps = {
          player,
          priceModifier,
          spendTime: (id: string, hours: number) => spendTime(id, hours),
          modifyHappiness: (id: string, amount: number) => modifyHappiness(id, amount),
          temperEquipment,
          forgeRepairAppliance,
          salvageEquipment,
        };

        return [
          {
            id: 'smithing',
            label: 'Smithing',
            content: <ForgePanel {...forgeProps} section="smithing" />,
          },
          {
            id: 'repairs',
            label: 'Repairs',
            content: <ForgePanel {...forgeProps} section="repairs" />,
          },
          {
            id: 'salvage',
            label: 'Salvage',
            content: <ForgePanel {...forgeProps} section="salvage" />,
          },
        ];
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
              depositToBank={depositToBank}
              withdrawFromBank={withdrawFromBank}
              invest={invest}
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
              onBuyNewspaper={handleBuyNewspaper}
              buyFreshFood={buyFreshFood}
              buyLotteryTicket={buyLotteryTicket}
            />
          ),
        }];

      case 'armory': {
        const armoryProps = {
          player,
          priceModifier,
          modifyGold,
          spendTime,
          modifyClothing,
          modifyHappiness,
          buyDurable,
          equipItem,
          unequipItem,
        };
        return [
          {
            id: 'clothing',
            label: 'Clothing',
            content: <ArmoryPanel {...armoryProps} section="clothing" />,
          },
          {
            id: 'weapons',
            label: 'Weapons',
            content: <ArmoryPanel {...armoryProps} section="weapons" />,
          },
          {
            id: 'armor',
            label: 'Armor',
            content: <ArmoryPanel {...armoryProps} section="armor" />,
          },
          {
            id: 'shields',
            label: 'Shields',
            content: <ArmoryPanel {...armoryProps} section="shields" />,
          },
        ];
      }

      case 'enchanter': {
        return [
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
        ];
      }

      case 'landlord': {
        // Landlord is only open during rent weeks (every 4th week cycle)
        // This makes garnished wages punishment effective if player forgets/can't visit in time
        const isRentWeek = (week + 1) % 4 === 0;
        const hasUrgentRent = player.weeksSinceRent >= 3; // Behind on rent — allow emergency visit
        const isLandlordOpen = isRentWeek || hasUrgentRent;

        if (!isLandlordOpen) {
          const weeksUntilRentWeek = (4 - ((week + 1) % 4)) % 4 || 4;
          return [{
            id: 'housing',
            label: 'Housing',
            content: (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Home className="w-10 h-10 text-[#8b7355] opacity-50" />
                <h4 className="font-display text-lg text-[#3d2a14]">Office Closed</h4>
                <p className="text-sm text-[#6b5a42] text-center max-w-xs">
                  The Landlord&apos;s office is only open during rent collection weeks.
                </p>
                <p className="text-xs text-[#8b7355] text-center">
                  Next rent week in <strong>{weeksUntilRentWeek}</strong> week{weeksUntilRentWeek !== 1 ? 's' : ''}.
                </p>
                {player.rentPrepaidWeeks > 0 && (
                  <p className="text-xs text-[#2a7a2a] text-center">
                    You have {player.rentPrepaidWeeks} prepaid week{player.rentPrepaidWeeks !== 1 ? 's' : ''} remaining.
                  </p>
                )}
              </div>
            ),
          }];
        }

        return [{
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
        }];
      }

      case 'shadow-market': {
        const shadowNewspaperPrice = Math.round(NEWSPAPER_COST * priceModifier * 0.5);
        const shadowMarketProps = {
          player,
          priceModifier,
          onSpendTime: (hours: number) => spendTime(player.id, hours),
          onModifyGold: (amount: number) => modifyGold(player.id, amount),
          onModifyHappiness: (amount: number) => modifyHappiness(player.id, amount),
          onModifyFood: (amount: number) => modifyFood(player.id, amount),
          buyLotteryTicket,
          buyTicket,
        };

        return [
          {
            id: 'goods',
            label: 'Goods',
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
                <ShadowMarketPanel {...shadowMarketProps} section="goods" />
              </div>
            ),
          },
          {
            id: 'lottery',
            label: "Fortune's Wheel",
            content: <ShadowMarketPanel {...shadowMarketProps} section="lottery" />,
          },
          {
            id: 'tickets',
            label: 'Weekend',
            content: <ShadowMarketPanel {...shadowMarketProps} section="tickets" />,
          },
          {
            id: 'appliances',
            label: 'Magical Items',
            content: <ShadowMarketPanel {...shadowMarketProps} section="appliances" />,
          },
        ];
      }

      case 'fence': {
        const fenceProps = {
          player,
          priceModifier,
          onSellItem: (itemId: string, price: number) => {
            sellItem(player.id, itemId, price);
            spendTime(player.id, 1);
          },
          onBuyUsedItem: (itemId: string, price: number) => {
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
          },
          onGamble: (stake: number) => {
            modifyGold(player.id, -stake);
            spendTime(player.id, stake >= 100 ? 3 : 2);

            const winChance = stake === 10 ? 0.4 : stake === 50 ? 0.3 : 0.2;
            const winAmount = stake === 10 ? 25 : stake === 50 ? 150 : 400;

            if (Math.random() < winChance) {
              modifyGold(player.id, winAmount);
              modifyHappiness(player.id, stake >= 100 ? 25 : stake >= 50 ? 15 : 5);
            } else {
              modifyHappiness(player.id, stake >= 100 ? -20 : stake >= 50 ? -10 : -3);
            }
          },
          onSpendTime: (hours: number) => spendTime(player.id, hours),
        };
        return [
          {
            id: 'trade',
            label: 'Used Goods',
            content: <PawnShopPanel {...fenceProps} section="trade" />,
          },
          {
            id: 'magical',
            label: 'Magical Items',
            content: <PawnShopPanel {...fenceProps} section="magical" />,
          },
          {
            id: 'gambling',
            label: 'Gambling',
            content: <PawnShopPanel {...fenceProps} section="gambling" />,
          },
        ];
      }

      case 'graveyard':
        return [{
          id: 'cemetery',
          label: 'Cemetery',
          content: (
            <GraveyardPanel
              player={player}
              priceModifier={priceModifier}
              onPray={(cost, happinessGain, time) => {
                modifyGold(player.id, -cost);
                modifyHappiness(player.id, happinessGain);
                spendTime(player.id, time);
              }}
              onMourn={(cost, relaxationGain, time) => {
                modifyGold(player.id, -cost);
                modifyRelaxation(player.id, relaxationGain);
                spendTime(player.id, time);
              }}
              onBlessMaxHealth={(cost, maxHealthGain, time) => {
                modifyGold(player.id, -cost);
                modifyMaxHealth(player.id, maxHealthGain);
                spendTime(player.id, time);
              }}
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
            <p className="text-[#6b5a42] text-center py-4">
              This location is under construction...
            </p>
          ),
        }];
    }
  };

  // Home locations get a full-panel visual room display (special case)
  const isHomeLocation = locationId === 'noble-heights' || locationId === 'slums';
  if (isHomeLocation && isHere) {
    return (
      <div className="h-full">
        <HomePanel
          player={player}
          locationId={locationId}
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
  const workInfo = isHere ? getWorkInfo() : null;

  return (
    <>
      <div className={`h-full flex flex-col overflow-hidden ${isHere ? '' : 'parchment-panel p-3'}`}>
        {/* When at location: full LocationShell with header/footer */}
        {isHere && npc && tabs ? (
          <LocationShell
            key={locationId}
            npc={npc}
            tabs={tabs}
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
                onClick={() => selectLocation(null)}
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
        onClose={() => { setShowNewspaper(false); setCurrentNewspaper(null); }}
      />
    </>
  );
}
