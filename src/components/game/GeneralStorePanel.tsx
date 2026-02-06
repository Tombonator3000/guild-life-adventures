import type { Player } from '@/types/game.types';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
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
  buyFreshFood: (playerId: string, units: number, cost: number) => void;
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
  buyFreshFood,
}: GeneralStorePanelProps) {
  const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);

  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  const hasFrostChest = player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken;
  const maxFreshFood = hasFrostChest ? 12 : hasPreservationBox ? 6 : 0;

  return (
    <JonesPanel>
      <JonesPanelHeader title="General Store" subtitle="Provisions & Sundries" />
      <JonesPanelContent>
        <JonesSectionHeader title="FOOD & PROVISIONS" />
        {GENERAL_STORE_ITEMS.filter(item => item.effect?.type === 'food' && !item.isFreshFood).map(item => {
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

        {/* Fresh Food Section - only show if player has Preservation Box */}
        {hasPreservationBox && (
          <>
            <JonesSectionHeader title="FRESH FOOD (STORED)" />
            <JonesInfoRow label="Stored:" value={`${player.freshFood}/${maxFreshFood} units`} />
            {GENERAL_STORE_ITEMS.filter(item => item.isFreshFood).map(item => {
              const price = getItemPrice(item, priceModifier);
              const units = item.freshFoodUnits || 0;
              const spaceLeft = maxFreshFood - player.freshFood;
              const canAfford = player.gold >= price && player.timeRemaining >= 1 && spaceLeft > 0;
              return (
                <JonesMenuItem
                  key={item.id}
                  label={`${item.name} (+${units} units)`}
                  price={price}
                  disabled={!canAfford}
                  onClick={() => {
                    buyFreshFood(player.id, units, price);
                    spendTime(player.id, 1);
                    toast.success(`Stored ${Math.min(units, spaceLeft)} fresh food units!`);
                  }}
                />
              );
            })}
            <div className="text-xs text-[#8b7355] px-2 mb-1">
              Fresh food prevents starvation. Auto-consumed weekly.
            </div>
          </>
        )}

        <JonesSectionHeader title="OTHER ITEMS" />
        <JonesMenuItem
          label="Newspaper"
          price={newspaperPrice}
          disabled={player.gold < newspaperPrice || player.timeRemaining < NEWSPAPER_TIME}
          onClick={onBuyNewspaper}
        />
        {GENERAL_STORE_ITEMS.filter(item => item.effect?.type !== 'food' && !item.isFreshFood).slice(0, 3).map(item => {
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
