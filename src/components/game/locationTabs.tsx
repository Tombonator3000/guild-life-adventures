import type { LocationId } from '@/types/game.types';
import type { LocationTab, WorkInfo } from './LocationShell';
import type { LocationTabContext, LocationTabFactoryMap } from './locationTabContext';
import { getJob } from '@/data/jobs';
import { getGameOption } from '@/data/gameOptions';
import { isLocationHexed, getHexById } from '@/data/hexes';
import { getReputationUnlocks, REPUTATION_UNLOCKS } from '@/data/reputation';
import { isPlayerRuined } from '@/store/helpers/hexHelpers';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';
import { ReputationPanel } from './ReputationPanel';
import { CORE_TAB_FACTORIES } from './locationTabFactories/coreTabs';
import { MARKET_ADVENTURE_TAB_FACTORIES } from './locationTabFactories/marketAdventureTabs';

export type { LocationTabContext } from './locationTabContext';

const JOB_LOCATION_MAP: Record<string, string> = {
  'guild-hall': 'Guild Hall',
  bank: 'Bank',
  forge: 'Forge',
  academy: 'Academy',
  'general-store': 'General Store',
  armory: 'Armory',
  enchanter: 'Enchanter',
  'shadow-market': 'Shadow Market',
  'rusty-tankard': 'Rusty Tankard',
  fence: 'Fence',
};

const TAB_FACTORIES: LocationTabFactoryMap = {
  ...CORE_TAB_FACTORIES,
  ...MARKET_ADVENTURE_TAB_FACTORIES,
};

/** Build work info for the standardized footer bar. */
export function getWorkInfo(locationId: LocationId, ctx: LocationTabContext): WorkInfo | null {
  const { player, performWorkShift } = ctx;
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
      const result = performWorkShift(player.id, 'full');
      if (!result) return;
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    },
  };
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

/** Get location tabs for a given location. Returns null if player is not there. */
export function getLocationTabs(
  locationId: LocationId,
  isHere: boolean,
  ctx: LocationTabContext,
): LocationTab[] | null {
  if (!isHere) return null;

  if (getGameOption('enableHexesCurses')) {
    const activeHex = isLocationHexed(locationId, ctx.player.id, ctx.locationHexes);
    const isRuined = isPlayerRuined(ctx.player);

    if (activeHex || isRuined) {
      const hexName = activeHex
        ? (getHexById(activeHex.hexId)?.name || 'Unknown Hex')
        : 'Hex of Ruin';
      const casterName = activeHex ? activeHex.casterName : 'dark forces';
      const weeksLeft = activeHex
        ? activeHex.weeksRemaining
        : (ctx.player.activeCurses?.find(curse => curse.effectType === 'legendary-ruin')?.weeksRemaining || 1);

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
              This location is blocked by dark magic. {weeksLeft > 0
                ? `Expires in ${weeksLeft} week${weeksLeft > 1 ? 's' : ''}.`
                : ''}
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
  const tabs = factory ? factory(ctx) : defaultTabs();

  if (REPUTATION_UNLOCKS.some(unlock => unlock.location === locationId)) {
    const player = ctx.player;
    const available = getReputationUnlocks(
      locationId,
      player.fame ?? 0,
      player.infamy ?? 0,
      player.purchasedReputationUnlocks ?? [],
    );
    tabs.push({
      id: 'reputation',
      label: 'Renown',
      badge: available.length > 0 ? `${available.length}` : undefined,
      content: (
        <ReputationPanel
          player={player}
          locationId={locationId}
          priceModifier={ctx.priceModifier}
          onPurchase={(unlockId) => {
            const result = useGameStore.getState().purchaseReputationUnlock(player.id, unlockId);
            if (result && !result.success) toast.error(result.message);
          }}
        />
      ),
    });
  }

  return tabs;
}
