import type { Player } from '@/types/game.types';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
} from './JonesStylePanel';
import { WorkSection } from './WorkSection';
import { GENERAL_STORE_ITEMS, getItemPrice } from '@/data/items';
import { NEWSPAPER_COST, NEWSPAPER_TIME } from '@/data/newspaper';
import { toast } from 'sonner';

interface GeneralStorePanelProps {
  player: Player;
  priceModifier: number;
  modifyGold: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
  onBuyNewspaper: () => void;
}

export function GeneralStorePanel({
  player,
  priceModifier,
  modifyGold,
  spendTime,
  modifyFood,
  modifyHappiness,
  workShift,
  onBuyNewspaper,
}: GeneralStorePanelProps) {
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
          onClick={onBuyNewspaper}
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

        {/* Work button for store employees */}
        <WorkSection
          player={player}
          locationName="General Store"
          workShift={workShift}
          variant="jones"
        />
      </JonesPanelContent>
    </JonesPanel>
  );
}
