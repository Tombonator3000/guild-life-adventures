import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getLocation, getMovementCost } from '@/data/locations';
import type { LocationId, EducationPath, HousingTier } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { MapPin, Clock, ArrowRight, X, Utensils, GraduationCap, Briefcase, Coins, ShoppingBag, Home, Sparkles, Hammer, Newspaper, Scroll, Heart, TrendingUp, Lock } from 'lucide-react';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
  JonesListItem,
  JonesInfoRow,
  JonesButton,
} from './JonesStylePanel';
import { EDUCATION_PATHS, getCourse, getNextCourse, getAvailableDegrees, DEGREES, getDegree, type DegreeId } from '@/data/education';
import { getAvailableJobs, JOBS, FORGE_JOBS, getJob, ALL_JOBS, getEntryLevelJobs, getJobOffers, type JobOffer } from '@/data/jobs';
import { GuildHallPanel } from './GuildHallPanel';
import { GENERAL_STORE_ITEMS, TAVERN_ITEMS, ARMORY_ITEMS, ENCHANTER_ITEMS, SHADOW_MARKET_ITEMS, getItemPrice } from '@/data/items';
import { HOUSING_DATA, HOUSING_TIERS } from '@/data/housing';
import { QuestPanel } from './QuestPanel';
import { HealerPanel } from './HealerPanel';
import { PawnShopPanel } from './PawnShopPanel';
import { EnchanterPanel } from './EnchanterPanel';
import { ShadowMarketPanel } from './ShadowMarketPanel';
import { getAvailableQuests } from '@/data/quests';
import { NEWSPAPER_COST, NEWSPAPER_TIME, generateNewspaper } from '@/data/newspaper';
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
    spendTime,
    workShift,
    studySession,
    completeEducationLevel,
    studyDegree,
    completeDegree,
    setHousing,
    payRent,
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
          <JonesPanel>
            <JonesPanelHeader title="The Rusty Tankard" subtitle="Tavern & Eatery" />
            <JonesPanelContent>
              {TAVERN_ITEMS.map(item => {
                const price = getItemPrice(item, priceModifier);
                const canAfford = player.gold >= price && player.timeRemaining >= 1;
                return (
                  <JonesMenuItem
                    key={item.id}
                    label={item.name}
                    price={price}
                    disabled={!canAfford}
                    onClick={() => {
                      modifyGold(player.id, -price);
                      spendTime(player.id, 1);
                      if (item.effect?.type === 'food') {
                        modifyFood(player.id, item.effect.value);
                      }
                      if (item.effect?.type === 'happiness') {
                        modifyHappiness(player.id, item.effect.value);
                      }
                      toast.success(`Purchased ${item.name}`);
                    }}
                  />
                );
              })}
              <div className="mt-2 text-xs text-[#8b7355] px-2">
                1 hour per purchase
              </div>
            </JonesPanelContent>
          </JonesPanel>
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
        // Get forge job offers with economy-based wages
        const forgeJobOffers = getJobOffers(
          player.completedDegrees as DegreeId[],
          player.clothingCondition,
          player.experience,
          player.dependability,
          priceModifier
        ).filter(j => FORGE_JOBS.some(fj => fj.id === j.id));

        return (
          <div className="space-y-2">
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Hammer className="w-4 h-4" /> Forge Work
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              Apply for forge jobs or work your current shift
            </p>
            {forgeJobOffers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No forge positions available. Need Trade Guild or Combat Training certificates.
              </p>
            ) : (
              forgeJobOffers.map(offer => {
                const earnings = Math.ceil(offer.hoursPerShift * 1.33 * offer.offeredWage);
                return (
                  <div key={offer.id} className="wood-frame p-2 text-card">
                    <div className="flex justify-between items-center">
                      <span className="font-display font-semibold text-sm">{offer.name}</span>
                      <span className="text-gold font-bold">{offer.offeredWage}g/h</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-muted-foreground">
                        {offer.hoursPerShift}h shift → {earnings}g
                      </span>
                      <button
                        onClick={() => {
                          setJob(player.id, offer.id, offer.offeredWage);
                          workShift(player.id, offer.hoursPerShift, offer.offeredWage);
                          modifyHappiness(player.id, -3); // Forge work is hard
                        }}
                        disabled={player.timeRemaining < offer.hoursPerShift}
                        className="gold-button text-xs py-1 px-2 disabled:opacity-50"
                      >
                        Work
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );

      case 'academy':
        // Get available degrees based on completed degrees
        const availableDegrees = getAvailableDegrees(player.completedDegrees as DegreeId[]);
        const completedCount = player.completedDegrees.length;

        return (
          <JonesPanel>
            <JonesPanelHeader title="Academy" subtitle="Higher Education" />
            <JonesPanelContent>
              <JonesInfoRow label="Degrees Earned:" value={`${completedCount} / 11`} />
              {completedCount > 0 && (
                <div className="text-xs text-[#8b7355] px-2 mb-2">
                  {player.completedDegrees.map(id => DEGREES[id as DegreeId]?.name).join(', ')}
                </div>
              )}

              <JonesSectionHeader title="AVAILABLE COURSES" />

              {availableDegrees.length === 0 ? (
                <div className="text-sm text-[#a09080] text-center py-2 px-2">
                  You have completed all available degrees!
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {availableDegrees.map(degree => {
                    const progress = player.degreeProgress[degree.id as DegreeId] || 0;
                    const price = getItemPrice({ basePrice: degree.costPerSession } as any, priceModifier);
                    const isComplete = progress >= degree.sessionsRequired;
                    const canAfford = player.gold >= price && player.timeRemaining >= degree.hoursPerSession;

                    return (
                      <div key={degree.id} className="bg-[#2a2318] p-2 rounded mb-1">
                        <div className="flex justify-between items-baseline">
                          <span className="font-mono text-sm text-[#e0d4b8]">{degree.name}</span>
                          <span className="font-mono text-xs text-[#8b7355]">{progress}/{degree.sessionsRequired}</span>
                        </div>
                        {isComplete ? (
                          <JonesButton
                            label="Graduate! (+5 Hap, +5 Dep)"
                            onClick={() => completeDegree(player.id, degree.id as DegreeId)}
                            variant="primary"
                            className="w-full mt-1"
                          />
                        ) : (
                          <JonesMenuItem
                            label={`Attend Class (${degree.hoursPerSession}h)`}
                            price={price}
                            disabled={!canAfford}
                            onClick={() => {
                              studyDegree(player.id, degree.id as DegreeId, price, degree.hoursPerSession);
                              toast.success(`Attended ${degree.name} class!`);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Show locked degrees as preview */}
              {completedCount > 0 && completedCount < 11 && (
                <>
                  <JonesSectionHeader title="LOCKED (NEED PREREQUISITES)" />
                  <div className="text-xs text-[#6b5a45] px-2">
                    {Object.values(DEGREES)
                      .filter(d => !player.completedDegrees.includes(d.id) && !availableDegrees.some(a => a.id === d.id))
                      .slice(0, 3)
                      .map(d => (
                        <div key={d.id} className="py-0.5">
                          {d.name} - <span className="text-[#8b7355]">{d.prerequisites.map(p => DEGREES[p]?.name || p).join(', ')}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </JonesPanelContent>
          </JonesPanel>
        );

      case 'bank':
        return (
          <JonesPanel>
            <JonesPanelHeader title="Bank" subtitle="Financial Services" />
            <JonesPanelContent>
              <JonesInfoRow label="Savings:" value={`${player.savings}g`} />
              <JonesInfoRow label="Investments:" value={`${player.investments}g`} />

              <JonesSectionHeader title="BANKING SERVICES" />
              <JonesMenuItem
                label="Deposit 50 Gold"
                price={50}
                disabled={player.gold < 50 || player.timeRemaining < 1}
                onClick={() => {
                  depositToBank(player.id, 50);
                  spendTime(player.id, 1);
                  toast.success('Deposited 50 gold!');
                }}
              />
              <JonesMenuItem
                label="Withdraw 50 Gold"
                disabled={player.savings < 50 || player.timeRemaining < 1}
                onClick={() => {
                  withdrawFromBank(player.id, 50);
                  spendTime(player.id, 1);
                  toast.success('Withdrew 50 gold!');
                }}
              />
              <JonesMenuItem
                label="Invest 100 Gold"
                price={100}
                disabled={player.gold < 100 || player.timeRemaining < 1}
                onClick={() => {
                  invest(player.id, 100);
                  spendTime(player.id, 1);
                  toast.success('Invested 100 gold!');
                }}
              />
              <div className="mt-2 text-xs text-[#8b7355] px-2">
                1 hour per transaction
              </div>
            </JonesPanelContent>
          </JonesPanel>
        );

      case 'general-store':
        const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);
        return (
          <JonesPanel>
            <JonesPanelHeader title="General Store" subtitle="Provisions & Sundries" />
            <JonesPanelContent>
              <JonesSectionHeader title="FOOD & PROVISIONS" />
              {GENERAL_STORE_ITEMS.filter(item => item.effect?.type === 'food').map(item => {
                const price = getItemPrice(item, priceModifier);
                const canAfford = player.gold >= price && player.timeRemaining >= 1;
                return (
                  <JonesMenuItem
                    key={item.id}
                    label={item.name}
                    price={price}
                    disabled={!canAfford}
                    onClick={() => {
                      modifyGold(player.id, -price);
                      spendTime(player.id, 1);
                      if (item.effect?.type === 'food') {
                        modifyFood(player.id, item.effect.value);
                      }
                      toast.success(`Purchased ${item.name}`);
                    }}
                  />
                );
              })}

              <JonesSectionHeader title="OTHER ITEMS" />
              <JonesMenuItem
                label="Newspaper"
                price={newspaperPrice}
                disabled={player.gold < newspaperPrice || player.timeRemaining < NEWSPAPER_TIME}
                onClick={handleBuyNewspaper}
              />
              {GENERAL_STORE_ITEMS.filter(item => item.effect?.type !== 'food').slice(0, 3).map(item => {
                const price = getItemPrice(item, priceModifier);
                const canAfford = player.gold >= price && player.timeRemaining >= 1;
                return (
                  <JonesMenuItem
                    key={item.id}
                    label={item.name}
                    price={price}
                    disabled={!canAfford}
                    onClick={() => {
                      modifyGold(player.id, -price);
                      spendTime(player.id, 1);
                      if (item.effect?.type === 'happiness') {
                        modifyHappiness(player.id, item.effect.value);
                      }
                      toast.success(`Purchased ${item.name}`);
                    }}
                  />
                );
              })}
              <div className="mt-2 text-xs text-[#8b7355] px-2">
                1 hour per purchase
              </div>
            </JonesPanelContent>
          </JonesPanel>
        );

      case 'armory':
        return (
          <JonesPanel>
            <JonesPanelHeader title="Armory" subtitle="Clothing & Weapons" />
            <JonesPanelContent>
              <JonesSectionHeader title="CLOTHING" />
              {ARMORY_ITEMS.filter(item => item.effect?.type === 'clothing').map(item => {
                const price = getItemPrice(item, priceModifier);
                const canAfford = player.gold >= price && player.timeRemaining >= 1;
                return (
                  <JonesMenuItem
                    key={item.id}
                    label={item.name}
                    price={price}
                    disabled={!canAfford}
                    onClick={() => {
                      modifyGold(player.id, -price);
                      spendTime(player.id, 1);
                      if (item.effect?.type === 'clothing') {
                        modifyClothing(player.id, item.effect.value);
                      }
                      toast.success(`Purchased ${item.name}!`);
                    }}
                  />
                );
              })}

              <JonesSectionHeader title="OTHER ITEMS" />
              {ARMORY_ITEMS.filter(item => item.effect?.type !== 'clothing').slice(0, 3).map(item => {
                const price = getItemPrice(item, priceModifier);
                const canAfford = player.gold >= price && player.timeRemaining >= 1;
                return (
                  <JonesMenuItem
                    key={item.id}
                    label={item.name}
                    price={price}
                    disabled={!canAfford}
                    onClick={() => {
                      modifyGold(player.id, -price);
                      spendTime(player.id, 1);
                      if (item.effect?.type === 'happiness') {
                        modifyHappiness(player.id, item.effect.value);
                      }
                      toast.success(`Purchased ${item.name}!`);
                    }}
                  />
                );
              })}
              <div className="mt-2 text-xs text-[#8b7355] px-2">
                1 hour per purchase
              </div>
            </JonesPanelContent>
          </JonesPanel>
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
          </div>
        );

      case 'landlord':
        // Calculate effective rent (locked or current market rate)
        const baseRent = RENT_COSTS[player.housing];
        const marketRent = Math.round(baseRent * priceModifier);
        const effectiveRent = player.lockedRent > 0 ? player.lockedRent : marketRent;

        return (
          <div className="space-y-4">
            <div className="wood-frame p-3 text-card">
              <div className="flex justify-between mb-2">
                <span>Current Housing:</span>
                <span className="font-bold">{HOUSING_DATA[player.housing].name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Weekly Rent:</span>
                <div className="text-right">
                  <span className="font-bold">{effectiveRent}g</span>
                  {player.lockedRent > 0 && (
                    <span className="text-xs text-secondary ml-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>
              </div>
              {player.lockedRent > 0 && marketRent !== player.lockedRent && (
                <div className="flex justify-between mb-2 text-xs">
                  <span>Market Rate:</span>
                  <span className={marketRent > player.lockedRent ? 'text-secondary' : 'text-destructive'}>
                    {marketRent}g {marketRent > player.lockedRent ? '(saving!)' : '(could be cheaper)'}
                  </span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span>Prepaid Weeks:</span>
                <span className="font-bold text-secondary">{player.rentPrepaidWeeks}</span>
              </div>
              <div className="flex justify-between">
                <span>Weeks Since Payment:</span>
                <span className={`font-bold ${player.weeksSinceRent >= 4 ? 'text-destructive' : ''}`}>
                  {player.weeksSinceRent}
                </span>
              </div>
              {player.weeksSinceRent >= 4 && (
                <p className="text-destructive text-xs mt-2">⚠️ Eviction warning! Pay rent now!</p>
              )}
            </div>

            {/* Rent Payment Options */}
            {player.housing !== 'homeless' && (
              <>
                <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2">
                  <Coins className="w-4 h-4" /> Pay Rent
                </h4>
                <div className="space-y-2">
                  <ActionButton
                    label={`Pay 1 Week (${effectiveRent}g)`}
                    cost={effectiveRent}
                    time={1}
                    disabled={player.gold < effectiveRent || player.timeRemaining < 1}
                    onClick={() => {
                      prepayRent(player.id, 1, effectiveRent);
                      spendTime(player.id, 1);
                      toast.success('Rent paid for 1 week!');
                    }}
                  />
                  <ActionButton
                    label={`Pay 4 Weeks (${effectiveRent * 4}g)`}
                    cost={effectiveRent * 4}
                    time={1}
                    disabled={player.gold < effectiveRent * 4 || player.timeRemaining < 1}
                    onClick={() => {
                      prepayRent(player.id, 4, effectiveRent * 4);
                      spendTime(player.id, 1);
                      toast.success('Rent prepaid for 4 weeks!');
                    }}
                  />
                  <ActionButton
                    label={`Pay 8 Weeks (${effectiveRent * 8}g)`}
                    cost={effectiveRent * 8}
                    time={1}
                    disabled={player.gold < effectiveRent * 8 || player.timeRemaining < 1}
                    onClick={() => {
                      prepayRent(player.id, 8, effectiveRent * 8);
                      spendTime(player.id, 1);
                      toast.success('Rent prepaid for 8 weeks!');
                    }}
                  />
                </div>
              </>
            )}

            {/* Housing Options */}
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2">
              <Home className="w-4 h-4" /> Move to New Housing
            </h4>
            <p className="text-xs text-muted-foreground">
              Moving locks in the current market rent rate.
            </p>
            <div className="space-y-2">
              {HOUSING_TIERS.filter(t => t !== player.housing && t !== 'homeless').map(tier => {
                const housing = HOUSING_DATA[tier];
                const tierMarketRent = Math.round(housing.weeklyRent * priceModifier);
                const moveCost = tierMarketRent * 2; // First month + deposit
                const isCheaper = player.lockedRent > 0 && tierMarketRent < player.lockedRent;

                return (
                  <div key={tier} className="wood-frame p-2 text-card">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-display font-semibold text-sm">{housing.name}</span>
                      <span className="text-gold font-bold">{tierMarketRent}g/week</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {housing.description}
                      {tier === 'noble' && <span className="text-secondary ml-1">(Safe from Shadowfingers!)</span>}
                      {isCheaper && <span className="text-secondary ml-1">(Cheaper than current!)</span>}
                    </div>
                    <button
                      onClick={() => {
                        moveToHousing(player.id, tier, moveCost, tierMarketRent);
                        spendTime(player.id, 4);
                        toast.success(`Moved to ${housing.name}! Rent locked at ${tierMarketRent}g/week.`);
                      }}
                      disabled={player.gold < moveCost || player.timeRemaining < 4}
                      className="w-full gold-button text-xs py-1 disabled:opacity-50"
                    >
                      Move In ({moveCost}g deposit, 4h)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'noble-heights':
      case 'slums':
        if (player.housing === 'homeless') {
          return (
            <p className="text-muted-foreground text-center py-4">
              You need to rent a place first. Visit the Landlord's Office.
            </p>
          );
        }
        const housingData = HOUSING_DATA[player.housing];
        return (
          <div className="space-y-2">
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Home className="w-4 h-4" /> Rest and Relaxation
            </h4>
            <ActionButton
              label="Rest (Restore Happiness)"
              cost={0}
              time={housingData.relaxationRate}
              disabled={player.timeRemaining < housingData.relaxationRate || housingData.relaxationRate === 0}
              onClick={() => {
                spendTime(player.id, housingData.relaxationRate);
                modifyHappiness(player.id, 10);
              }}
            />
            <ActionButton
              label="Sleep Well (Full Rest)"
              cost={0}
              time={8}
              disabled={player.timeRemaining < 8}
              onClick={() => {
                spendTime(player.id, 8);
                modifyHappiness(player.id, 20);
                modifyHealth(player.id, 10);
              }}
            />
          </div>
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
          <div className="space-y-4">
            <h4 className="font-display text-lg text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Mysterious Cave
            </h4>
            <p className="text-sm text-muted-foreground">
              A dark cave entrance beckons. Who knows what treasures... or dangers... await within?
            </p>
            <div className="space-y-2">
              <ActionButton
                label="Explore the Cave"
                description="Risk: Low health damage, Reward: Chance to find gold or items"
                cost={0}
                time={4}
                disabled={player.timeRemaining < 4}
                onClick={() => {
                  spendTime(player.id, 4);
                  // Random exploration outcome
                  const roll = Math.random();
                  if (roll < 0.3) {
                    // Found treasure!
                    const goldFound = Math.floor(Math.random() * 50) + 20;
                    modifyGold(player.id, goldFound);
                    modifyHappiness(player.id, 10);
                    toast.success(`You found ${goldFound} gold in the cave!`);
                  } else if (roll < 0.5) {
                    // Found a hidden spring
                    modifyHealth(player.id, 15);
                    modifyHappiness(player.id, 5);
                    toast.success('You found a healing spring deep in the cave!');
                  } else if (roll < 0.7) {
                    // Got lost
                    modifyHappiness(player.id, -5);
                    toast.info('You wandered around but found nothing of interest.');
                  } else {
                    // Encountered danger
                    const damage = Math.floor(Math.random() * 10) + 5;
                    modifyHealth(player.id, -damage);
                    modifyHappiness(player.id, -10);
                    toast.error(`You encountered a creature and took ${damage} damage!`);
                  }
                }}
              />
              <ActionButton
                label="Rest in the Cave"
                description="A quiet place to recover. Restore some health."
                cost={0}
                time={6}
                disabled={player.timeRemaining < 6 || player.health >= player.maxHealth}
                onClick={() => {
                  spendTime(player.id, 6);
                  const healAmount = Math.min(20, player.maxHealth - player.health);
                  modifyHealth(player.id, healAmount);
                  modifyHappiness(player.id, 3);
                  toast.success(`You rested and recovered ${healAmount} health.`);
                }}
              />
            </div>
          </div>
        );

      default:
        return (
          <p className="text-muted-foreground text-center py-4">
            This location is under construction...
          </p>
        );
    }
  };

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

interface ActionButtonProps {
  label: string;
  cost: number;
  time: number;
  reward?: number;
  disabled: boolean;
  onClick: () => void;
}

function ActionButton({ label, cost, time, reward, disabled, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full p-2 wood-frame text-card flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    >
      <span className="font-display font-semibold">{label}</span>
      <div className="flex items-center gap-3 text-xs">
        {cost > 0 && (
          <span className="text-gold">-{cost}g</span>
        )}
        {reward && (
          <span className="text-secondary">+{reward}g</span>
        )}
        <span className="text-time">{time}h</span>
      </div>
    </button>
  );
}
