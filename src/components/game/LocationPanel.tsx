import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getLocation, getMovementCost } from '@/data/locations';
import type { LocationId, EducationPath, HousingTier } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { MapPin, Clock, ArrowRight, X, Utensils, GraduationCap, Briefcase, Coins, ShoppingBag, Home, Sparkles, Hammer, Newspaper, Scroll, Heart } from 'lucide-react';
import { EDUCATION_PATHS, getCourse, getNextCourse } from '@/data/education';
import { getAvailableJobs, JOBS, FORGE_JOBS } from '@/data/jobs';
import { GENERAL_STORE_ITEMS, TAVERN_ITEMS, ARMORY_ITEMS, ENCHANTER_ITEMS, SHADOW_MARKET_ITEMS, getItemPrice } from '@/data/items';
import { HOUSING_DATA, HOUSING_TIERS } from '@/data/housing';
import { QuestPanel } from './QuestPanel';
import { HealerPanel } from './HealerPanel';
import { PawnShopPanel } from './PawnShopPanel';
import { getAvailableQuests } from '@/data/quests';
import { NEWSPAPER_COST, NEWSPAPER_TIME, generateNewspaper } from '@/data/newspaper';
import { useState } from 'react';
import { NewspaperModal } from './NewspaperModal';

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
    setHousing,
    payRent,
    depositToBank,
    withdrawFromBank,
    invest,
    priceModifier,
    week,
    takeQuest,
    completeQuest,
    abandonQuest,
    sellItem,
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
          <div className="space-y-2">
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4" /> Food and Drink
            </h4>
            {TAVERN_ITEMS.map(item => {
              const price = getItemPrice(item, priceModifier);
              return (
                <ActionButton
                  key={item.id}
                  label={item.name}
                  cost={price}
                  time={1}
                  disabled={player.gold < price || player.timeRemaining < 1}
                  onClick={() => {
                    modifyGold(player.id, -price);
                    spendTime(player.id, 1);
                    if (item.effect?.type === 'food') {
                      modifyFood(player.id, item.effect.value);
                    }
                    if (item.effect?.type === 'happiness') {
                      modifyHappiness(player.id, item.effect.value);
                    }
                  }}
                />
              );
            })}
          </div>
        );
      
      case 'guild-hall':
        const availableJobs = getAvailableJobs(player.education, player.clothingCondition);
        const availableQuests = getAvailableQuests(player.guildRank);
        return (
          <div className="space-y-4">
            {/* Quest System */}
            <QuestPanel
              quests={availableQuests}
              player={player}
              onTakeQuest={(questId) => takeQuest(player.id, questId)}
              onCompleteQuest={() => completeQuest(player.id)}
              onAbandonQuest={() => abandonQuest(player.id)}
            />
            
            {/* Jobs */}
            <div>
              <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4" /> Available Jobs
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {JOBS.slice(0, 4).map(job => {
                  const canWork = availableJobs.some(j => j.id === job.id);
                  return (
                    <ActionButton
                      key={job.id}
                      label={`${job.name} (${job.hoursPerShift}h)`}
                      cost={0}
                      time={job.hoursPerShift}
                      reward={job.hourlyWage * job.hoursPerShift}
                      disabled={!canWork || player.timeRemaining < job.hoursPerShift}
                      onClick={() => {
                        workShift(player.id, job.hoursPerShift, job.hourlyWage);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'forge':
        const forgeJobs = getAvailableJobs(player.education, player.clothingCondition)
          .filter(j => FORGE_JOBS.some(fj => fj.id === j.id));
        return (
          <div className="space-y-2">
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Hammer className="w-4 h-4" /> Forge Work
            </h4>
            {FORGE_JOBS.map(job => {
              const canWork = forgeJobs.some(j => j.id === job.id);
              return (
                <ActionButton
                  key={job.id}
                  label={`${job.name} (${job.hoursPerShift}h)`}
                  cost={0}
                  time={job.hoursPerShift}
                  reward={job.hourlyWage * job.hoursPerShift}
                  disabled={!canWork || player.timeRemaining < job.hoursPerShift}
                  onClick={() => {
                    workShift(player.id, job.hoursPerShift, job.hourlyWage);
                    modifyHappiness(player.id, -3); // Forge work is hard
                  }}
                />
              );
            })}
          </div>
        );

      case 'academy':
        return (
          <div className="space-y-4">
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <GraduationCap className="w-4 h-4" /> Education Paths
            </h4>
            {(Object.keys(EDUCATION_PATHS) as EducationPath[]).map(path => {
              const pathData = EDUCATION_PATHS[path];
              const currentLevel = player.education[path] || 0;
              const progress = player.educationProgress[path] || 0;
              const nextCourse = getNextCourse(path, currentLevel);
              
              if (!nextCourse) return (
                <div key={path} className="text-sm text-muted-foreground">
                  {pathData.name}: Completed!
                </div>
              );
              
              const price = getItemPrice({ basePrice: nextCourse.costPerSession } as any, priceModifier);
              const isComplete = progress >= nextCourse.sessionsRequired;
              
              return (
                <div key={path} className="wood-frame p-2 text-card">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-display font-semibold text-sm">{nextCourse.name}</span>
                    <span className="text-xs">{progress}/{nextCourse.sessionsRequired} sessions</span>
                  </div>
                  {isComplete ? (
                    <button
                      onClick={() => completeEducationLevel(player.id, path)}
                      className="w-full gold-button text-sm py-1"
                    >
                      Complete Degree!
                    </button>
                  ) : (
                    <ActionButton
                      label="Attend Class"
                      cost={price}
                      time={nextCourse.hoursPerSession}
                      disabled={player.gold < price || player.timeRemaining < nextCourse.hoursPerSession}
                      onClick={() => {
                        studySession(player.id, path, price, nextCourse.hoursPerSession);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'bank':
        return (
          <div className="space-y-4">
            <div className="wood-frame p-3 text-card">
              <div className="flex justify-between mb-2">
                <span>Savings:</span>
                <span className="font-bold">{player.savings}g</span>
              </div>
              <div className="flex justify-between">
                <span>Investments:</span>
                <span className="font-bold">{player.investments}g</span>
              </div>
            </div>
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4" /> Banking Services
            </h4>
            <div className="space-y-2">
              <ActionButton
                label="Deposit 50 Gold"
                cost={50}
                time={1}
                disabled={player.gold < 50 || player.timeRemaining < 1}
                onClick={() => {
                  depositToBank(player.id, 50);
                  spendTime(player.id, 1);
                }}
              />
              <ActionButton
                label="Withdraw 50 Gold"
                cost={0}
                time={1}
                reward={50}
                disabled={player.savings < 50 || player.timeRemaining < 1}
                onClick={() => {
                  withdrawFromBank(player.id, 50);
                  spendTime(player.id, 1);
                }}
              />
              <ActionButton
                label="Invest 100 Gold"
                cost={100}
                time={1}
                disabled={player.gold < 100 || player.timeRemaining < 1}
                onClick={() => {
                  invest(player.id, 100);
                  spendTime(player.id, 1);
                }}
              />
            </div>
          </div>
        );

      case 'general-store':
        const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);
        return (
          <div className="space-y-2">
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Newspaper className="w-4 h-4" /> The Guildholm Herald
            </h4>
            <ActionButton
              label="Buy Newspaper"
              cost={newspaperPrice}
              time={NEWSPAPER_TIME}
              disabled={player.gold < newspaperPrice || player.timeRemaining < NEWSPAPER_TIME}
              onClick={handleBuyNewspaper}
            />
            
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2 mt-4">
              <ShoppingBag className="w-4 h-4" /> Food and Supplies
            </h4>
            {GENERAL_STORE_ITEMS.slice(0, 5).map(item => {
              const price = getItemPrice(item, priceModifier);
              return (
                <ActionButton
                  key={item.id}
                  label={item.name}
                  cost={price}
                  time={1}
                  disabled={player.gold < price || player.timeRemaining < 1}
                  onClick={() => {
                    modifyGold(player.id, -price);
                    spendTime(player.id, 1);
                    if (item.effect?.type === 'food') {
                      modifyFood(player.id, item.effect.value);
                    }
                    if (item.effect?.type === 'happiness') {
                      modifyHappiness(player.id, item.effect.value);
                    }
                  }}
                />
              );
            })}
          </div>
        );

      case 'armory':
        return (
          <div className="space-y-2">
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <ShoppingBag className="w-4 h-4" /> Clothing and Weapons
            </h4>
            {ARMORY_ITEMS.slice(0, 5).map(item => {
              const price = getItemPrice(item, priceModifier);
              return (
                <ActionButton
                  key={item.id}
                  label={item.name}
                  cost={price}
                  time={1}
                  disabled={player.gold < price || player.timeRemaining < 1}
                  onClick={() => {
                    modifyGold(player.id, -price);
                    spendTime(player.id, 1);
                    if (item.effect?.type === 'clothing') {
                      modifyClothing(player.id, item.effect.value);
                    }
                    if (item.effect?.type === 'happiness') {
                      modifyHappiness(player.id, item.effect.value);
                    }
                  }}
                />
              );
            })}
          </div>
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
                // Would need to add setSickness to store
              }}
              onBlessHealth={(cost, time) => {
                modifyGold(player.id, -cost);
                modifyMaxHealth(player.id, 10);
                spendTime(player.id, time);
              }}
            />
            
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" /> Magical Items
            </h4>
            {ENCHANTER_ITEMS.slice(0, 3).map(item => {
              const price = getItemPrice(item, priceModifier);
              return (
                <ActionButton
                  key={item.id}
                  label={item.name}
                  cost={price}
                  time={1}
                  disabled={player.gold < price || player.timeRemaining < 1}
                  onClick={() => {
                    modifyGold(player.id, -price);
                    spendTime(player.id, 1);
                    if (item.effect?.type === 'happiness') {
                      modifyHappiness(player.id, item.effect.value);
                    }
                    if (item.effect?.type === 'health') {
                      modifyHealth(player.id, item.effect.value);
                    }
                  }}
                />
              );
            })}
          </div>
        );

      case 'landlord':
        const currentRent = RENT_COSTS[player.housing];
        return (
          <div className="space-y-4">
            <div className="wood-frame p-3 text-card">
              <div className="flex justify-between mb-2">
                <span>Current Housing:</span>
                <span className="font-bold">{HOUSING_DATA[player.housing].name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Weekly Rent:</span>
                <span className="font-bold">{currentRent}g</span>
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
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2">
              <Home className="w-4 h-4" /> Housing Options
            </h4>
            <div className="space-y-2">
              {player.housing !== 'homeless' && (
                <ActionButton
                  label={`Pay Rent (${currentRent}g)`}
                  cost={currentRent}
                  time={1}
                  disabled={player.gold < currentRent || player.timeRemaining < 1}
                  onClick={() => {
                    payRent(player.id);
                    spendTime(player.id, 1);
                  }}
                />
              )}
              {HOUSING_TIERS.filter(t => t !== player.housing && t !== 'homeless').map(tier => {
                const housing = HOUSING_DATA[tier];
                const moveCost = housing.weeklyRent * 2; // First + deposit
                return (
                  <ActionButton
                    key={tier}
                    label={`Move to ${housing.name}`}
                    cost={moveCost}
                    time={4}
                    disabled={player.gold < moveCost || player.timeRemaining < 4}
                    onClick={() => {
                      modifyGold(player.id, -moveCost);
                      setHousing(player.id, tier);
                      spendTime(player.id, 4);
                    }}
                  />
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
          <div className="space-y-2">
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
            
            <h4 className="font-display text-sm text-muted-foreground flex items-center gap-2 mb-2 mt-4">
              <ShoppingBag className="w-4 h-4" /> Black Market Goods
            </h4>
            {SHADOW_MARKET_ITEMS.map(item => {
              const price = getItemPrice(item, priceModifier * 0.7); // Cheaper prices
              if (item.id === 'lottery-ticket') {
                return (
                  <ActionButton
                    key={item.id}
                    label={`${item.name} (Try your luck!)`}
                    cost={price}
                    time={1}
                    disabled={player.gold < price || player.timeRemaining < 1}
                    onClick={() => {
                      modifyGold(player.id, -price);
                      spendTime(player.id, 1);
                      // 10% chance to win big
                      if (Math.random() < 0.1) {
                        modifyGold(player.id, 200);
                        modifyHappiness(player.id, 20);
                      } else if (Math.random() < 0.3) {
                        modifyGold(player.id, 20);
                        modifyHappiness(player.id, 5);
                      }
                    }}
                  />
                );
              }
              return (
                <ActionButton
                  key={item.id}
                  label={item.name}
                  cost={price}
                  time={1}
                  disabled={player.gold < price || player.timeRemaining < 1}
                  onClick={() => {
                    modifyGold(player.id, -price);
                    spendTime(player.id, 1);
                    if (item.effect?.type === 'food') {
                      modifyFood(player.id, item.effect.value);
                    }
                    if (item.effect?.type === 'happiness') {
                      modifyHappiness(player.id, item.effect.value);
                    }
                  }}
                />
              );
            })}
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
