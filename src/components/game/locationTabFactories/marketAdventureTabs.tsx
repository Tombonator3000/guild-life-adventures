import type { LocationId } from '@/types/game.types';
import type { LocationTab } from '../LocationShell';
import type { LocationTabContext, LocationTabFactoryMap } from '../locationTabContext';
import { useGameStore } from '@/store/gameStore';
import { NEWSPAPER_COST, generateNewspaper } from '@/data/newspaper';
import { playSFX } from '@/audio/sfxManager';
import { toast } from 'sonner';
import { PawnShopPanel } from '../PawnShopPanel';
import { ShadowMarketPanel } from '../ShadowMarketPanel';
import { ActionButton } from '../ActionButton';
import { GraveyardPanel } from '../GraveyardPanel';
import { GraveyardHexPanel } from '../GraveyardHexPanel';
import { CavePanel } from '../CavePanel';
import { HexShopPanel } from '../HexShopPanel';
import { SabotagePanel } from '../SabotagePanel';
import { FenceProtectionPanel } from '../FenceProtectionPanel';
import { getGameOption } from '@/data/gameOptions';
import { getShadowMarketHexStock } from '@/data/hexes';

function shadowMarketTabs(ctx: LocationTabContext): LocationTab[] {
  const {
    player,
    players,
    priceModifier,
    economyTrend,
    week,
    weeklyNewsEvents,
    onShowNewspaper,
  } = ctx;
  const shadowNewspaperPrice = Math.round(NEWSPAPER_COST * priceModifier * 0.5);
  const shadowMarketProps = { player, priceModifier };
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
              const result = useGameStore.getState().purchaseNewspaper(player.id, 'shadow-market');
              if (result && !result.success) {
                toast.error(result.message);
                return;
              }
              const newspaper = generateNewspaper(week, priceModifier, economyTrend, weeklyNewsEvents);
              onShowNewspaper(newspaper);
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
      id: 'scholar',
      label: 'Scholar Texts',
      content: <ShadowMarketPanel {...shadowMarketProps} section="scholar" />,
    },
    {
      id: 'appliances',
      label: 'Magical Items',
      content: <ShadowMarketPanel {...shadowMarketProps} section="appliances" />,
    },
  ];

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

  const aliveRivals = players.filter(candidate => !candidate.isGameOver && candidate.id !== player.id);
  if (aliveRivals.length > 0) {
    tabs.push({
      id: 'sabotage',
      label: 'Sabotage',
      content: (
        <SabotagePanel
          player={player}
          rivals={aliveRivals}
          priceModifier={priceModifier}
          onSabotage={(targetId, option) => {
            const result = useGameStore.getState().sabotagePlayer(player.id, targetId, option.id);
            if (result && !result.success) toast.error(result.message);
          }}
        />
      ),
    });
  }

  return tabs;
}

function fenceTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, players, priceModifier, week } = ctx;
  const fenceProps = { player, priceModifier, week };
  const aliveRivals = players.filter(candidate => !candidate.isGameOver && candidate.id !== player.id);
  const tabs: LocationTab[] = [
    { id: 'trade', label: 'Used Goods', content: <PawnShopPanel {...fenceProps} section="trade" /> },
    { id: 'magical', label: 'Magical Items', content: <PawnShopPanel {...fenceProps} section="magical" /> },
    { id: 'gambling', label: 'Gambling', content: <PawnShopPanel {...fenceProps} section="gambling" /> },
    {
      id: 'protection',
      label: 'Protection',
      content: (
        <FenceProtectionPanel
          player={player}
          rivals={aliveRivals}
          priceModifier={priceModifier}
          onBuyProtection={(weeks) => {
            const result = useGameStore.getState().buyProtection(player.id, weeks);
            if (result && !result.success) toast.error(result.message);
          }}
          onBuyTipOff={(targetId) => {
            const result = useGameStore.getState().buyTipOff(player.id, targetId);
            if (result && !result.success) toast.error(result.message);
          }}
        />
      ),
    },
  ];

  if (aliveRivals.length > 0) {
    tabs.push({
      id: 'sabotage',
      label: 'Shadowfingers',
      content: (
        <SabotagePanel
          player={player}
          rivals={aliveRivals}
          priceModifier={priceModifier}
          onSabotage={(targetId, option) => {
            const result = useGameStore.getState().sabotagePlayer(player.id, targetId, option.id);
            if (result && !result.success) toast.error(result.message);
          }}
        />
      ),
    });
  }

  return tabs;
}

function graveyardTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier } = ctx;
  const tabs: LocationTab[] = [{
    id: 'cemetery',
    label: 'Cemetery',
    content: <GraveyardPanel player={player} priceModifier={priceModifier} />,
  }];

  if (getGameOption('enableHexesCurses')) {
    tabs.push({
      id: 'dark-magic',
      label: 'Dark Magic',
      content: <GraveyardHexPanel player={player} priceModifier={priceModifier} />,
    });
  }

  return tabs;
}

function caveTabs(ctx: LocationTabContext): LocationTab[] {
  return [{
    id: 'dungeon',
    label: 'Dungeon',
    content: <CavePanel player={ctx.player} />,
  }];
}

export const MARKET_ADVENTURE_TAB_FACTORIES: LocationTabFactoryMap = {
  'shadow-market': shadowMarketTabs,
  fence: fenceTabs,
  graveyard: graveyardTabs,
  cave: caveTabs,
} satisfies Partial<Record<LocationId, (ctx: LocationTabContext) => LocationTab[]>>;
