import type { LocationId } from '@/types/game.types';
import type { LocationTab } from '../LocationShell';
import type { LocationTabContext, LocationTabFactoryMap } from '../locationTabContext';
import { getJob, FORGE_JOBS, canWorkJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import { CLOTHING_TIER_LABELS, CLOTHING_THRESHOLDS } from '@/data/items';
import { getWeeklyQuests } from '@/data/quests';
import { playSFX } from '@/audio/sfxManager';
import { toast } from 'sonner';
import { Briefcase, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { GuildHallPanel } from '../GuildHallPanel';
import { ForgePanel } from '../ForgePanel';
import { QuestPanel } from '../QuestPanel';
import { BountyBoardPanel } from '../BountyBoardPanel';
import { HealerPanel } from '../HealerPanel';
import { EnchanterPanel } from '../EnchanterPanel';
import { TavernPanel } from '../TavernPanel';
import { BankPanel } from '../BankPanel';
import { GeneralStorePanel } from '../GeneralStorePanel';
import { ArmoryPanel } from '../ArmoryPanel';
import { AcademyPanel } from '../AcademyPanel';
import { LandlordPanel } from '../LandlordPanel';
import { HexShopPanel } from '../HexShopPanel';
import { getGameOption } from '@/data/gameOptions';
import { getEnchanterHexStock } from '@/data/hexes';

function guildHallTabs(ctx: LocationTabContext): LocationTab[] {
  const {
    player,
    players,
    priceModifier,
    week,
    acceptJobOffer,
    acceptMarketRaise,
    takeQuest,
    completeQuest,
    abandonQuest,
    takeChainQuest,
    takeNonLinearChain,
    makeNLChainChoice,
    takeBounty,
    buyGuildPass,
    requestRaise,
  } = ctx;
  const currentJobData = player.currentJob ? getJob(player.currentJob) : null;
  const availableQuests = getWeeklyQuests(player.guildRank, week);
  const canWorkAtGuildHall = currentJobData && currentJobData.location === 'Guild Hall';
  const MIN_SHIFTS_FOR_RAISE = 3;
  const hasActiveBounty = player.activeQuest?.startsWith('bounty:') ?? false;
  const hasActiveQuestOrChain = player.activeQuest && !hasActiveBounty;

  return [
    {
      id: 'employment',
      label: 'Jobs',
      content: (
        <GuildHallPanel
          player={player}
          allPlayers={players}
          priceModifier={priceModifier}
          week={week}
          onHireJob={(jobId) => {
            const result = acceptJobOffer(player.id, jobId);
            if (!result) return;
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
          }}
          onAcceptMarketRaise={() => {
            const result = acceptMarketRaise(player.id);
            if (!result) return;
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
          }}
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
                  toast(result.message);
                }}
                className="gold-button text-xs py-1 px-2 flex items-center gap-1"
                disabled={player.dependability < 40 || (player.shiftsWorkedSinceHire || 0) < MIN_SHIFTS_FOR_RAISE}
                title={(player.shiftsWorkedSinceHire || 0) < MIN_SHIFTS_FOR_RAISE
                  ? `Work ${MIN_SHIFTS_FOR_RAISE} shifts first (${player.shiftsWorkedSinceHire || 0}/${MIN_SHIFTS_FOR_RAISE})`
                  : 'Request a raise'}
              >
                <TrendingUp className="w-3 h-3" /> Request Raise
              </button>
            </div>
          </div>
        </div>
      ) : null,
    },
  ];
}

function tavernTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier } = ctx;
  return [{
    id: 'menu',
    label: 'Menu',
    content: <TavernPanel player={player} priceModifier={priceModifier} />,
  }];
}

function forgeTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, equipmentServiceAction, applianceServiceAction } = ctx;
  const forgeProps = { player, priceModifier, equipmentServiceAction, applianceServiceAction };
  const forgeWorkContent = (
    <div className="p-2 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Briefcase className="w-4 h-4 text-amber-700" />
        <span className="font-display text-sm font-bold text-[#3d2b1f]">Forge Employment</span>
      </div>
      <p className="text-xs text-[#6b5a42] mb-3">
        Browse available positions at the Forge. To be hired, visit the <strong>Guild Hall</strong>.
      </p>
      {FORGE_JOBS.map(job => {
        const qualified = canWorkJob(
          job,
          player.completedDegrees,
          player.clothingCondition,
          player.experience,
          player.dependability,
        );
        return (
          <div
            key={job.id}
            className={`rounded border px-2.5 py-2 ${qualified ? 'border-green-700/50 bg-green-950/20' : 'border-[#8b7355]/30 bg-[#f5e9d0]/50'}`}
          >
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-display text-xs font-bold text-[#3d2b1f]">{job.name}</span>
              <div className="flex items-center gap-1">
                {qualified
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  : <XCircle className="w-3.5 h-3.5 text-red-500/70" />}
                <span className={`text-xs font-semibold ${qualified ? 'text-green-700' : 'text-[#8b7355]'}`}>
                  {job.baseWage}g/hr · {job.hoursPerShift}h shift
                </span>
              </div>
            </div>
            <p className="text-xs text-[#6b5a42] mb-1 italic">{job.description}</p>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[#8b7355]">
              {job.requiredClothing !== 'none' && (
                <span className={player.clothingCondition < (CLOTHING_THRESHOLDS[job.requiredClothing as keyof typeof CLOTHING_THRESHOLDS] ?? 0) ? 'text-red-500' : ''}>
                  👔 {CLOTHING_TIER_LABELS[job.requiredClothing as keyof typeof CLOTHING_TIER_LABELS]}
                </span>
              )}
              {job.requiredDegrees.length > 0 && (
                <span className={!job.requiredDegrees.every(d => player.completedDegrees.includes(d as never)) ? 'text-red-500' : ''}>
                  🎓 {job.requiredDegrees.map(d => DEGREES[d as keyof typeof DEGREES]?.name ?? d).join(', ')}
                </span>
              )}
              {job.requiredExperience > 0 && (
                <span className={player.experience < job.requiredExperience ? 'text-red-500' : ''}>
                  ⚔️ Exp {job.requiredExperience}+
                </span>
              )}
              {job.requiredDependability > 0 && (
                <span className={player.dependability < job.requiredDependability ? 'text-red-500' : ''}>
                  ⭐ Dep {job.requiredDependability}%+
                </span>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-center text-[#8b7355] mt-2 pt-1 border-t border-[#8b7355]/20">
        💼 Apply for Forge positions at the <strong>Guild Hall</strong>
      </p>
    </div>
  );

  return [
    { id: 'smithing', label: 'Smithing', content: <ForgePanel {...forgeProps} section="smithing" /> },
    { id: 'repairs', label: 'Repairs', content: <ForgePanel {...forgeProps} section="repairs" /> },
    { id: 'salvage', label: 'Salvage', content: <ForgePanel {...forgeProps} section="salvage" /> },
    { id: 'work', label: 'Work', content: forgeWorkContent },
  ];
}

function academyTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, attendDegreeSession, prepayDegree, graduateDegree, readBook } = ctx;
  const bookOptions = [
    { hours: 2, cost: 5, label: 'Browse Scrolls (2h, +3 hap)' },
    { hours: 4, cost: 10, label: 'Read a Book (4h, +6 hap)' },
    { hours: 6, cost: 15, label: 'Deep Study (6h, +9 hap)' },
  ];

  return [
    {
      id: 'courses',
      label: 'Courses',
      content: (
        <AcademyPanel
          player={player}
          priceModifier={priceModifier}
          attendDegreeSession={attendDegreeSession}
          prepayDegree={prepayDegree}
          graduateDegree={graduateDegree}
        />
      ),
    },
    {
      id: 'library',
      label: '📖 Library',
      content: (
        <div>
          <div className="bg-[#e8dcc8] border border-[#8b7355] rounded p-2 mb-2">
            <div className="font-display text-xs text-[#3d2a14] font-bold mb-1">Academy Library</div>
            <div className="text-xs text-[#6b5a42] leading-snug">
              Lose yourself in the stacks of ancient tomes and scrolls. Reading for pleasure costs a small library fee but restores happiness.
            </div>
          </div>
          <div className="space-y-1">
            {bookOptions.map(option => {
              const canAfford = player.gold >= option.cost;
              const hasTime = player.timeRemaining >= option.hours;
              return (
                <div
                  key={option.hours}
                  className={`flex items-center justify-between p-2 rounded border ${canAfford && hasTime
                    ? 'bg-[#f0e8d0] border-[#8b7355] cursor-pointer hover:bg-[#e8dcc0]'
                    : 'bg-[#d8d0c0] border-[#8b7355]/40 opacity-60 cursor-not-allowed'}`}
                  onClick={() => {
                    if (!canAfford || !hasTime) return;
                    const ok = readBook(player.id, option.hours, option.cost);
                    if (ok) {
                      const happiness = Math.round(option.hours * 1.5);
                      toast.success(`Spent ${option.hours}h reading in the library (+${happiness} happiness)`);
                    }
                  }}
                >
                  <span className="font-display text-xs text-[#3d2a14]">{option.label}</span>
                  <span className="font-mono text-xs text-[#6b5a42]">{option.cost}g</span>
                </div>
              );
            })}
          </div>
          {player.timeRemaining === 0 && (
            <div className="text-xs text-amber-700 text-center mt-2 italic">No time remaining to read.</div>
          )}
        </div>
      ),
    },
  ];
}

function bankTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, stockPrices, stockPriceHistory } = ctx;
  return [{
    id: 'banking',
    label: 'Services',
    content: (
      <BankPanel
        player={player}
        priceModifier={priceModifier}
        stockPrices={stockPrices}
        stockPriceHistory={stockPriceHistory}
      />
    ),
  }];
}

function generalStoreTabs(ctx: LocationTabContext): LocationTab[] {
  return [{
    id: 'shop',
    label: 'Shop',
    content: <GeneralStorePanel player={ctx.player} priceModifier={ctx.priceModifier} />,
  }];
}

function armoryTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, equipItem, unequipItem } = ctx;
  const props = { player, priceModifier, equipItem, unequipItem };
  return [
    { id: 'clothing', label: 'Clothing', content: <ArmoryPanel {...props} section="clothing" /> },
    { id: 'weapons', label: 'Weapons', content: <ArmoryPanel {...props} section="weapons" /> },
    { id: 'armor', label: 'Armor', content: <ArmoryPanel {...props} section="armor" /> },
    { id: 'shields', label: 'Shields', content: <ArmoryPanel {...props} section="shields" /> },
  ];
}

function enchanterTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, players, priceModifier } = ctx;
  const hexesEnabled = getGameOption('enableHexesCurses');
  const enchanterHexes = hexesEnabled ? getEnchanterHexStock(player) : [];
  const tabs: LocationTab[] = [
    {
      id: 'healing',
      label: 'Healing',
      content: <HealerPanel player={player} priceModifier={priceModifier} />,
    },
    {
      id: 'appliances',
      label: 'Appliances',
      content: <EnchanterPanel player={player} priceModifier={priceModifier} />,
    },
  ];

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
          showDefense
          variant="enchanter"
        />
      ),
    });
  }

  return tabs;
}

function landlordTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, week } = ctx;
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
    content: <LandlordPanel player={player} priceModifier={priceModifier} />,
  }];
}

export const CORE_TAB_FACTORIES: LocationTabFactoryMap = {
  'guild-hall': guildHallTabs,
  'rusty-tankard': tavernTabs,
  forge: forgeTabs,
  academy: academyTabs,
  bank: bankTabs,
  'general-store': generalStoreTabs,
  armory: armoryTabs,
  enchanter: enchanterTabs,
  landlord: landlordTabs,
} satisfies Partial<Record<LocationId, (ctx: LocationTabContext) => LocationTab[]>>;
