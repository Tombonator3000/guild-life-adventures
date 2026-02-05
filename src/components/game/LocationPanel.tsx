import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getLocation, getMovementCost } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
import { MapPin, Clock, ArrowRight, X, Briefcase, Newspaper, TrendingUp } from 'lucide-react';
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
import { ForgePanel } from './ForgePanel';
import { HomePanel } from './HomePanel';
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
    week,
    takeQuest,
    completeQuest,
    abandonQuest,
    sellItem,
    setJob,
    requestRaise,
  } = useGameStore();
  const player = useCurrentPlayer();
  const location = getLocation(locationId);
  const [showNewspaper, setShowNewspaper] = useState(false);
  const [currentNewspaper, setCurrentNewspaper] = useState<ReturnType<typeof generateNewspaper> | null>(null);

  if (!location || !player) return null;

  const moveCost = getMovementCost(player.currentLocation, locationId);
  const isHere = player.currentLocation === locationId;
  const canAffordMove = player.timeRemaining >= moveCost;

  const handleTravel = () => {
    if (canAffordMove && !isHere) {
      movePlayer(player.id, locationId, moveCost);
    }
  };

  const handleBuyNewspaper = () => {
    const price = Math.round(NEWSPAPER_COST * priceModifier);
    modifyGold(player.id, -price);
    spendTime(player.id, NEWSPAPER_TIME);
    const newspaper = generateNewspaper(week, priceModifier);
    setCurrentNewspaper(newspaper);
    setShowNewspaper(true);
  };

  // Location-specific actions
  const getLocationActions = () => {
    if (!isHere) return null;

    switch (locationId) {
      case 'rusty-tankard':
        return (
          <TavernPanel
            player={player}
            priceModifier={priceModifier}
            modifyGold={modifyGold}
            spendTime={spendTime}
            modifyFood={modifyFood}
            modifyHappiness={modifyHappiness}
            workShift={workShift}
          />
        );

      case 'guild-hall':
        const availableQuests = getAvailableQuests(player.guildRank);
        const currentJobData = player.currentJob ? getJob(player.currentJob) : null;

        return (
          <div className="space-y-4">
            {/* Current Job Status - Show work button if employed */}
            {player.currentJob && currentJobData && (
              <div className="wood-frame p-3 text-card">
                <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4" /> Current Job: {currentJobData.name}
                </h4>
                <div className="flex justify-between mb-1">
                  <span>Wage:</span>
                  <span className="font-bold text-gold">{player.currentWage}g/hour</span>
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
                    disabled={player.dependability < 40}
                  >
                    <TrendingUp className="w-3 h-3" /> Raise
                  </button>
                </div>
              </div>
            )}

            {/* Quest System */}
            <QuestPanel
              quests={availableQuests}
              player={player}
              onTakeQuest={(questId) => takeQuest(player.id, questId)}
              onCompleteQuest={() => completeQuest(player.id)}
              onAbandonQuest={() => abandonQuest(player.id)}
            />

            {/* Guild Hall - Seek Employment */}
            <GuildHallPanel
              player={player}
              priceModifier={priceModifier}
              onHireJob={(jobId, wage) => {
                setJob(player.id, jobId, wage);
                const job = getJob(jobId);
                toast.success(`You are now employed as ${job?.name}!`);
              }}
              onSpendTime={(hours) => spendTime(player.id, hours)}
            />
          </div>
        );

      case 'forge':
        return (
          <ForgePanel
            player={player}
            priceModifier={priceModifier}
            setJob={setJob}
            workShift={workShift}
            modifyHappiness={modifyHappiness}
          />
        );

      case 'academy':
        return (
          <AcademyPanel
            player={player}
            priceModifier={priceModifier}
            studyDegree={studyDegree}
            completeDegree={completeDegree}
            workShift={workShift}
          />
        );

      case 'bank':
        return (
          <BankPanel
            player={player}
            spendTime={spendTime}
            depositToBank={depositToBank}
            withdrawFromBank={withdrawFromBank}
            invest={invest}
            workShift={workShift}
          />
        );

      case 'general-store':
        return (
          <GeneralStorePanel
            player={player}
            priceModifier={priceModifier}
            modifyGold={modifyGold}
            spendTime={spendTime}
            modifyFood={modifyFood}
            modifyHappiness={modifyHappiness}
            workShift={workShift}
            onBuyNewspaper={handleBuyNewspaper}
          />
        );

      case 'armory':
        return (
          <ArmoryPanel
            player={player}
            priceModifier={priceModifier}
            modifyGold={modifyGold}
            spendTime={spendTime}
            modifyClothing={modifyClothing}
            modifyHappiness={modifyHappiness}
            workShift={workShift}
          />
        );

      case 'enchanter':
        return (
          <div className="space-y-4">
            {/* Healer's Sanctuary */}
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
              }}
              onBlessHealth={(cost, time) => {
                modifyGold(player.id, -cost);
                modifyMaxHealth(player.id, 10);
                spendTime(player.id, time);
              }}
            />

            {/* Enchanter's Workshop - Appliance Shop (Socket City equivalent) */}
            <EnchanterPanel
              player={player}
              priceModifier={priceModifier}
              onSpendTime={(hours) => spendTime(player.id, hours)}
            />

            {/* Work button for enchanter employees */}
            <WorkSection
              player={player}
              locationName="Enchanter"
              workShift={workShift}
              variant="wood-frame"
            />
          </div>
        );

      case 'landlord':
        return (
          <LandlordPanel
            player={player}
            priceModifier={priceModifier}
            spendTime={spendTime}
            prepayRent={prepayRent}
            moveToHousing={moveToHousing}
          />
        );

      case 'noble-heights':
      case 'slums':
        return (
          <HomePanel
            player={player}
            spendTime={spendTime}
            modifyHappiness={modifyHappiness}
            modifyHealth={modifyHealth}
            modifyRelaxation={modifyRelaxation}
            onDone={() => selectLocation(null)}
          />
        );

      case 'shadow-market':
        const shadowNewspaperPrice = Math.round(NEWSPAPER_COST * priceModifier * 0.5); // Cheaper here

        return (
          <div className="space-y-4">
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Newspaper className="w-4 h-4" /> Black Market Info
            </h4>
            <ActionButton
              label="Buy Newspaper (Discount)"
              cost={shadowNewspaperPrice}
              time={NEWSPAPER_TIME}
              disabled={player.gold < shadowNewspaperPrice || player.timeRemaining < NEWSPAPER_TIME}
              onClick={() => {
                modifyGold(player.id, -shadowNewspaperPrice);
                spendTime(player.id, NEWSPAPER_TIME);
                const newspaper = generateNewspaper(week, priceModifier);
                setCurrentNewspaper(newspaper);
                setShowNewspaper(true);
              }}
            />

            {/* Shadow Market Panel - Z-Mart equivalent with used appliances */}
            <ShadowMarketPanel
              player={player}
              priceModifier={priceModifier}
              onSpendTime={(hours) => spendTime(player.id, hours)}
              onModifyGold={(amount) => modifyGold(player.id, amount)}
              onModifyHappiness={(amount) => modifyHappiness(player.id, amount)}
              onModifyFood={(amount) => modifyFood(player.id, amount)}
            />

            {/* Work button for shadow market employees */}
            <WorkSection
              player={player}
              locationName="Shadow Market"
              workShift={workShift}
              variant="wood-frame"
            />
          </div>
        );

      case 'fence':
        return (
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
              // Apply effects based on item
              if (itemId === 'used-clothes') {
                modifyClothing(player.id, 50);
              } else if (itemId === 'used-blanket') {
                modifyHappiness(player.id, 3);
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
        );

      case 'cave':
        return (
          <CavePanel
            player={player}
            spendTime={spendTime}
            modifyGold={modifyGold}
            modifyHealth={modifyHealth}
            modifyHappiness={modifyHappiness}
          />
        );

      default:
        return (
          <p className="text-muted-foreground text-center py-4">
            This location is under construction...
          </p>
        );
    }
  };

  // Home locations get a full-panel visual room display (Jones-style)
  const isHomeLocation = locationId === 'noble-heights' || locationId === 'slums';
  if (isHomeLocation && isHere) {
    return (
      <div className="h-full">
        {getLocationActions()}
      </div>
    );
  }

  return (
    <>
      <div className="parchment-panel h-full p-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold text-card-foreground">
                {location.name}
              </h2>
              <p className="text-muted-foreground text-sm">{location.description}</p>
            </div>
          </div>
          <button
            onClick={() => selectLocation(null)}
            className="p-1 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Travel or Actions */}
        <div className="flex-1 overflow-y-auto">
          {isHere ? (
            <div>
              {getLocationActions()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Clock className="w-5 h-5" />
                <span>Travel time: {moveCost} hours</span>
              </div>
              <button
                onClick={handleTravel}
                disabled={!canAffordMove}
                className="gold-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Travel to {location.name}
                <ArrowRight className="w-5 h-5" />
              </button>
              {!canAffordMove && (
                <p className="text-destructive text-sm mt-2">Not enough time!</p>
              )}
            </div>
          )}
        </div>
      </div>

      <NewspaperModal
        newspaper={currentNewspaper}
        onClose={() => setShowNewspaper(false)}
      />
    </>
  );
}
