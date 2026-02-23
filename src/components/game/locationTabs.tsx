// Location tab factory functions
// Extracted from LocationPanel.tsx to reduce the 514-line getLocationTabs() switch statement
// Each location has its own factory function that returns LocationTab[]

import type { ReactNode } from 'react';
import type { LocationId, Player } from '@/types/game.types';
import type { LocationTab, WorkInfo } from './LocationShell';
import type { GameStore } from '@/store/storeTypes';
import { getJob } from '@/data/jobs';
import { getAvailableQuests } from '@/data/quests';
import { NEWSPAPER_COST, generateNewspaper } from '@/data/newspaper';
import { playSFX } from '@/audio/sfxManager';
import { toast } from 'sonner';
import { Briefcase, TrendingUp } from 'lucide-react';
import { GuildHallPanel } from './GuildHallPanel';
import { ForgePanel } from './ForgePanel';
import { QuestPanel } from './QuestPanel';
import { BountyBoardPanel } from './BountyBoardPanel';
import { HealerPanel } from './HealerPanel';
import { PawnShopPanel } from './PawnShopPanel';
import { EnchanterPanel } from './EnchanterPanel';
import { ShadowMarketPanel } from './ShadowMarketPanel';
import { ActionButton } from './ActionButton';
import { TavernPanel } from './TavernPanel';
import { BankPanel } from './BankPanel';
import { GeneralStorePanel } from './GeneralStorePanel';
import { ArmoryPanel } from './ArmoryPanel';
import { AcademyPanel } from './AcademyPanel';
import { LandlordPanel } from './LandlordPanel';
import { CavePanel } from './CavePanel';
import { GraveyardPanel } from './GraveyardPanel';
import { HexShopPanel } from './HexShopPanel';
import { GraveyardHexPanel } from './GraveyardHexPanel';
import { getGameOption } from '@/data/gameOptions';
import { getEnchanterHexStock, getShadowMarketHexStock, isLocationHexed, getHexById } from '@/data/hexes';
import type { ActiveLocationHex } from '@/data/hexes';
import { isPlayerRuined } from '@/store/helpers/hexHelpers';


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

/** Context passed to each location tab factory */
export interface LocationTabContext {
  player: Player;
  players: Player[];
  priceModifier: number;
  economyTrend: number;
  week: number;
  weeklyNewsEvents: GameStore['weeklyNewsEvents'];
  stockPrices: GameStore['stockPrices'];
  stockPriceHistory: GameStore['stockPriceHistory'];
  // Store actions (subset used by location panels)
  modifyGold: GameStore['modifyGold'];
  modifyHappiness: GameStore['modifyHappiness'];
  modifyHealth: GameStore['modifyHealth'];
  modifyFood: GameStore['modifyFood'];
  modifyClothing: GameStore['modifyClothing'];
  modifyMaxHealth: GameStore['modifyMaxHealth'];
  modifyRelaxation: GameStore['modifyRelaxation'];
  spendTime: GameStore['spendTime'];
  workShift: GameStore['workShift'];
  studyDegree: GameStore['studyDegree'];
  completeDegree: GameStore['completeDegree'];
  prepayRent: GameStore['prepayRent'];
  moveToHousing: GameStore['moveToHousing'];
  begForMoreTime: GameStore['begForMoreTime'];
  depositToBank: GameStore['depositToBank'];
  withdrawFromBank: GameStore['withdrawFromBank'];
  takeQuest: GameStore['takeQuest'];
  completeQuest: GameStore['completeQuest'];
  abandonQuest: GameStore['abandonQuest'];
  completeLocationObjective: GameStore['completeLocationObjective'];
  takeChainQuest: GameStore['takeChainQuest'];
  takeNonLinearChain: GameStore['takeNonLinearChain'];
  makeNLChainChoice: GameStore['makeNLChainChoice'];
  takeBounty: GameStore['takeBounty'];
  buyGuildPass: GameStore['buyGuildPass'];
  sellItem: GameStore['sellItem'];
  setJob: GameStore['setJob'];
  requestRaise: GameStore['requestRaise'];
  negotiateRaise: GameStore['negotiateRaise'];
  buyDurable: GameStore['buyDurable'];
  equipItem: GameStore['equipItem'];
  unequipItem: GameStore['unequipItem'];
  clearDungeonFloor: GameStore['clearDungeonFloor'];
  applyRareDrop: GameStore['applyRareDrop'];
  buyStock: GameStore['buyStock'];
  sellStock: GameStore['sellStock'];
  takeLoan: GameStore['takeLoan'];
  repayLoan: GameStore['repayLoan'];
  buyFreshFood: GameStore['buyFreshFood'];
  buyFoodWithSpoilage: GameStore['buyFoodWithSpoilage'];
  buyLotteryTicket: GameStore['buyLotteryTicket'];
  buyTicket: GameStore['buyTicket'];
  cureSickness: GameStore['cureSickness'];
  temperEquipment: GameStore['temperEquipment'];
  forgeRepairAppliance: GameStore['forgeRepairAppliance'];
  forgeRepairEquipment: GameStore['forgeRepairEquipment'];
  salvageEquipment: GameStore['salvageEquipment'];
  // Gameplay state for hex checking (passed reactively, not via getState)
  locationHexes: GameStore['locationHexes'];
  // Callbacks for newspaper modal (owned by LocationPanel)
  onBuyNewspaper: () => void;
  onShowNewspaper: (newspaper: ReturnType<typeof generateNewspaper>) => void;
  setEventMessage: GameStore['setEventMessage'];
}

/** Build work info for the standardized footer bar */
export function getWorkInfo(locationId: LocationId, ctx: LocationTabContext): WorkInfo | null {
  const { player, workShift } = ctx;
  const currentJobData = player.currentJob ? getJob(player.currentJob) : null;
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
      const worked = workShift(player.id, currentJobData.hoursPerShift, player.currentWage);
      if (worked) {
        toast.success(`Worked a shift at ${currentJobData.name}!`);
      } else {
        toast.error('Unable to work — not enough time or improper attire.');
      }
    },
  };
}

// ── Location tab factories ─────────────────────────────────────────

function guildHallTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, players, priceModifier, week, setJob, negotiateRaise, spendTime,
    takeQuest, completeQuest, abandonQuest, takeChainQuest, takeNonLinearChain, makeNLChainChoice, takeBounty, buyGuildPass, requestRaise } = ctx;
  const currentJobData = player.currentJob ? getJob(player.currentJob) : null;
  const availableQuests = getAvailableQuests(player.guildRank);
  const canWorkAtGuildHall = currentJobData && currentJobData.location === 'Guild Hall';
  const MIN_SHIFTS_FOR_RAISE = 3;
  const hasActiveBounty = player.activeQuest?.startsWith('bounty:') ?? false;
  const hasActiveQuestOrChain = player.activeQuest && !hasActiveBounty;

  const tabs: LocationTab[] = [
    {
      id: 'employment',
      label: 'Jobs',
      content: (
        <GuildHallPanel
          player={player}
          allPlayers={players}
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
    },
    {
      id: 'bounties',
      label: 'Bounties',
      badge: hasActiveBounty ? '!' : undefined,
      content: (
        <BountyBoardPanel
          player={player}
          week={week}
          onTakeBounty={(bountyId) => takeBounty(player.id, bountyId)}
          onCompleteQuest={() => completeQuest(player.id)}
          onAbandonQuest={() => abandonQuest(player.id)}
          onBuyGuildPass={() => {
            playSFX('success');
            buyGuildPass(player.id);
            toast.success('Guild Pass acquired! You can now take quests.');
          }}
        />
      ),
    },
    {
      id: 'quests',
      label: 'Quests',
      badge: hasActiveQuestOrChain ? '!' : undefined,
      hidden: !player.hasGuildPass,
      content: (
        <QuestPanel
          quests={availableQuests}
          player={player}
          week={week}
          onTakeQuest={(questId) => takeQuest(player.id, questId)}
          onCompleteQuest={() => completeQuest(player.id)}
          onAbandonQuest={() => abandonQuest(player.id)}
          onTakeChainQuest={(chainId) => takeChainQuest(player.id, chainId)}
          onTakeBounty={(bountyId) => takeBounty(player.id, bountyId)}
          onTakeNonLinearChain={(chainId) => takeNonLinearChain(player.id, chainId)}
          onMakeNLChainChoice={(choiceId) => makeNLChainChoice(player.id, choiceId)}
        />
      ),
    },
    {
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
    },
  ];

  return tabs;
}

function tavernTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, modifyGold, spendTime, modifyFood, modifyHappiness, modifyHealth, setEventMessage } = ctx;
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
        modifyHealth={modifyHealth}
        setEventMessage={setEventMessage}
      />
    ),
  }];
}

function forgeTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, spendTime, modifyHappiness, temperEquipment, forgeRepairAppliance, forgeRepairEquipment, salvageEquipment } = ctx;
  const forgeProps = {
    player,
    priceModifier,
    spendTime: (id: string, hours: number) => spendTime(id, hours),
    modifyHappiness: (id: string, amount: number) => modifyHappiness(id, amount),
    temperEquipment,
    forgeRepairAppliance,
    forgeRepairEquipment,
    salvageEquipment,
  };
  return [
    { id: 'smithing', label: 'Smithing', content: <ForgePanel {...forgeProps} section="smithing" /> },
    { id: 'repairs', label: 'Repairs', content: <ForgePanel {...forgeProps} section="repairs" /> },
    { id: 'salvage', label: 'Salvage', content: <ForgePanel {...forgeProps} section="salvage" /> },
  ];
}

function academyTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, studyDegree, completeDegree } = ctx;
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
}

function bankTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, depositToBank, withdrawFromBank, buyStock, sellStock, takeLoan, repayLoan, stockPrices, stockPriceHistory } = ctx;
  return [{
    id: 'banking',
    label: 'Services',
    content: (
      <BankPanel
        player={player}
        depositToBank={depositToBank}
        withdrawFromBank={withdrawFromBank}
        buyStock={buyStock}
        sellStock={sellStock}
        takeLoan={takeLoan}
        repayLoan={repayLoan}
        stockPrices={stockPrices}
        stockPriceHistory={stockPriceHistory}
      />
    ),
  }];
}

function generalStoreTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, modifyGold, spendTime, modifyFood, modifyHappiness,
    onBuyNewspaper, buyFreshFood, buyFoodWithSpoilage, buyLotteryTicket } = ctx;
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
        onBuyNewspaper={onBuyNewspaper}
        buyFreshFood={buyFreshFood}
        buyFoodWithSpoilage={buyFoodWithSpoilage}
        buyLotteryTicket={buyLotteryTicket}
      />
    ),
  }];
}

function armoryTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, modifyGold, spendTime, modifyClothing, modifyHappiness,
    buyDurable, equipItem, unequipItem } = ctx;
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
    { id: 'clothing', label: 'Clothing', content: <ArmoryPanel {...armoryProps} section="clothing" /> },
    { id: 'weapons', label: 'Weapons', content: <ArmoryPanel {...armoryProps} section="weapons" /> },
    { id: 'armor', label: 'Armor', content: <ArmoryPanel {...armoryProps} section="armor" /> },
    { id: 'shields', label: 'Shields', content: <ArmoryPanel {...armoryProps} section="shields" /> },
  ];
}

function enchanterTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, players, priceModifier, modifyGold, modifyHealth, spendTime, cureSickness, modifyMaxHealth } = ctx;
  const hexesEnabled = getGameOption('enableHexesCurses');
  const enchanterHexes = hexesEnabled ? getEnchanterHexStock(player) : [];
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
  ];

  // Forbidden Scrolls tab (only when hexes enabled)
  if (hexesEnabled) {
    tabs.push({
      id: 'hexes',
      label: 'Dark Scrolls',
      content: (
        <HexShopPanel
          player={player}
          players={players}
          priceModifier={priceModifier}
          availableHexes={enchanterHexes}
          showDefense={true}
          variant="enchanter"
        />
      ),
    });
  }

  return tabs;
}

function landlordTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, spendTime, prepayRent, moveToHousing, begForMoreTime, week } = ctx;
  const isRentWeek = (week + 1) % 4 === 0;
  const hasUrgentRent = player.weeksSinceRent >= 3;
  const isLandlordOpen = isRentWeek || hasUrgentRent;

  if (!isLandlordOpen) {
    const weeksUntilRentWeek = (4 - ((week + 1) % 4)) % 4 || 4;
    return [{
      id: 'housing',
      label: 'Housing',
      content: (
        <div className="h-full flex flex-col overflow-hidden select-none" style={{ background: '#1a1410' }}>
          <div
            className="flex-1 relative overflow-hidden flex items-center justify-center"
            style={{
              backgroundImage: `url(${import.meta.env.BASE_URL}locations/closed.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
            <div className="relative z-10 text-center p-4">
              <h2
                className="font-display text-xl font-bold mb-2"
                style={{ color: '#f0e8d8', textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
              >
                Office Closed
              </h2>
              <p
                className="text-sm mb-1"
                style={{ color: '#d4c8a0', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
              >
                The Landlord&apos;s office is only open during rent collection weeks.
              </p>
              <p
                className="text-xs"
                style={{ color: '#c8bc9a', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
              >
                Next rent week in <strong>{weeksUntilRentWeek}</strong> week{weeksUntilRentWeek !== 1 ? 's' : ''}.
              </p>
              {player.rentPrepaidWeeks > 0 && (
                <p
                  className="text-xs mt-1"
                  style={{ color: '#7adb7a', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
                >
                  You have {player.rentPrepaidWeeks} prepaid week{player.rentPrepaidWeeks !== 1 ? 's' : ''} remaining.
                </p>
              )}
            </div>
          </div>
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
        begForMoreTime={begForMoreTime}
      />
    ),
  }];
}

function shadowMarketTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, players, priceModifier, spendTime, modifyGold, modifyHappiness, modifyFood,
    buyLotteryTicket, buyTicket, economyTrend, week, weeklyNewsEvents, onShowNewspaper } = ctx;
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

  const hexesEnabled = getGameOption('enableHexesCurses');
  const shadowHexes = hexesEnabled ? getShadowMarketHexStock(week) : [];

  const tabs: LocationTab[] = [
    {
      id: 'goods',
      label: 'Goods',
      content: (
        <div className="space-y-3">
          <ActionButton
            label="Buy Newspaper (Discount)"
            cost={shadowNewspaperPrice}
            time={0}
            disabled={player.gold < shadowNewspaperPrice}
            onClick={() => {
              playSFX('item-buy');
              modifyGold(player.id, -shadowNewspaperPrice);
              const newspaper = generateNewspaper(week, priceModifier, economyTrend, weeklyNewsEvents);
              onShowNewspaper(newspaper);
            }}
          />
          <ShadowMarketPanel {...shadowMarketProps} section="goods" />
        </div>
      ),
    },
    { id: 'lottery', label: "Fortune's Wheel", content: <ShadowMarketPanel {...shadowMarketProps} section="lottery" /> },
    { id: 'tickets', label: 'Weekend', content: <ShadowMarketPanel {...shadowMarketProps} section="tickets" /> },
    { id: 'scholar', label: 'Scholar Texts', content: <ShadowMarketPanel {...shadowMarketProps} section="scholar" /> },
    { id: 'appliances', label: 'Magical Items', content: <ShadowMarketPanel {...shadowMarketProps} section="appliances" /> },
  ];

  // Dirty Tricks tab (only when hexes enabled)
  if (hexesEnabled) {
    tabs.push({
      id: 'hexes',
      label: 'Dirty Tricks',
      content: (
        <HexShopPanel
          player={player}
          players={players}
          priceModifier={priceModifier}
          availableHexes={shadowHexes}
          showDefense={false}
          variant="shadow-market"
        />
      ),
    });
  }

  return tabs;
}

// Used item effect handlers by item ID
const USED_ITEM_EFFECTS: Record<string, (ctx: LocationTabContext) => void> = {
  'used-clothes': (ctx) => ctx.modifyClothing(ctx.player.id, 50),
  'used-blanket': (ctx) => ctx.modifyHappiness(ctx.player.id, 3),
  'used-sword': (ctx) => {
    ctx.buyDurable(ctx.player.id, 'sword', 0);
    ctx.equipItem(ctx.player.id, 'sword', 'weapon');
    toast.success('Equipped Used Sword!');
  },
  'used-shield': (ctx) => {
    ctx.buyDurable(ctx.player.id, 'shield', 0);
    ctx.equipItem(ctx.player.id, 'shield', 'shield');
    toast.success('Equipped Dented Shield!');
  },
};

// Gambling odds/payouts by stake amount
const GAMBLE_TABLE: Record<number, { chance: number; payout: number; winHappiness: number; loseHappiness: number; time: number }> = {
  10:  { chance: 0.4, payout: 25,  winHappiness: 5,  loseHappiness: -3,  time: 2 },
  50:  { chance: 0.3, payout: 150, winHappiness: 15, loseHappiness: -10, time: 2 },
  100: { chance: 0.2, payout: 400, winHappiness: 25, loseHappiness: -20, time: 3 },
};

function fenceTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, sellItem, modifyGold, modifyHappiness, spendTime } = ctx;
  const fenceProps = {
    player,
    priceModifier,
    onSellItem: (itemId: string, price: number) => {
      sellItem(player.id, itemId, price);
    },
    onBuyUsedItem: (itemId: string, price: number) => {
      modifyGold(player.id, -price);
      USED_ITEM_EFFECTS[itemId]?.(ctx);
    },
    onGamble: (stake: number) => {
      const odds = GAMBLE_TABLE[stake] ?? GAMBLE_TABLE[10];
      modifyGold(player.id, -stake);
      spendTime(player.id, odds.time);
      if (Math.random() < odds.chance) {
        modifyGold(player.id, odds.payout);
        modifyHappiness(player.id, odds.winHappiness);
      } else {
        modifyHappiness(player.id, odds.loseHappiness);
      }
    },
    onSpendTime: (hours: number) => spendTime(player.id, hours),
  };
  return [
    { id: 'trade', label: 'Used Goods', content: <PawnShopPanel {...fenceProps} section="trade" /> },
    { id: 'magical', label: 'Magical Items', content: <PawnShopPanel {...fenceProps} section="magical" /> },
    { id: 'gambling', label: 'Gambling', content: <PawnShopPanel {...fenceProps} section="gambling" /> },
  ];
}

function graveyardTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, modifyGold, modifyHappiness, modifyRelaxation, modifyMaxHealth, spendTime } = ctx;
  const hexesEnabled = getGameOption('enableHexesCurses');
  const tabs: LocationTab[] = [{
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

  // Dark Magic tab (only when hexes enabled)
  if (hexesEnabled) {
    tabs.push({
      id: 'dark-magic',
      label: 'Dark Magic',
      content: (
        <GraveyardHexPanel
          player={player}
          priceModifier={priceModifier}
        />
      ),
    });
  }

  return tabs;
}

function caveTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, spendTime, modifyGold, modifyHealth, modifyHappiness, clearDungeonFloor, applyRareDrop } = ctx;
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
}

function defaultTabs(): LocationTab[] {
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

// ── Factory lookup record ──────────────────────────────────────────

type TabFactory = (ctx: LocationTabContext) => LocationTab[];

const TAB_FACTORIES: Partial<Record<LocationId, TabFactory>> = {
  'guild-hall': guildHallTabs,
  'rusty-tankard': tavernTabs,
  'forge': forgeTabs,
  'academy': academyTabs,
  'bank': bankTabs,
  'general-store': generalStoreTabs,
  'armory': armoryTabs,
  'enchanter': enchanterTabs,
  'landlord': landlordTabs,
  'shadow-market': shadowMarketTabs,
  'fence': fenceTabs,
  'graveyard': graveyardTabs,
  'cave': caveTabs,
};

/** Get location tabs for a given location. Returns null if player is not at the location. */
export function getLocationTabs(locationId: LocationId, isHere: boolean, ctx: LocationTabContext): LocationTab[] | null {
  if (!isHere) return null;

  // Check for location hex or Hex of Ruin blockage
  if (getGameOption('enableHexesCurses')) {
    const locationHexes = ctx.locationHexes;
    const activeHex = isLocationHexed(locationId, ctx.player.id, locationHexes);
    const isRuined = isPlayerRuined(ctx.player);

    if (activeHex || isRuined) {
      const hexName = activeHex ? (getHexById(activeHex.hexId)?.name || 'Unknown Hex') : 'Hex of Ruin';
      const casterName = activeHex ? activeHex.casterName : 'dark forces';
      const weeksLeft = activeHex ? activeHex.weeksRemaining : (ctx.player.activeCurses?.find(c => c.effectType === 'legendary-ruin')?.weeksRemaining || 1);
      return [{
        id: 'hexed',
        label: 'Sealed',
        content: (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="font-display text-lg font-bold text-red-800 mb-2">Location Sealed!</h3>
            <p className="text-sm text-red-700 mb-1">
              <strong>{hexName}</strong> cast by {casterName}
            </p>
            <p className="text-xs text-[#6b5a42]">
              This location is blocked by dark magic. {weeksLeft > 0 ? `Expires in ${weeksLeft} week${weeksLeft > 1 ? 's' : ''}.` : ''}
            </p>
            <p className="text-xs text-[#6b5a42] mt-2">
              Visit the Enchanter to buy a Dispel Scroll, or wait for the hex to expire.
            </p>
          </div>
        ),
      }];
    }
  }

  const factory = TAB_FACTORIES[locationId];
  return factory ? factory(ctx) : defaultTabs();
}
