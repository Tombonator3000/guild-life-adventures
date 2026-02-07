import type { Player } from '@/types/game.types';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesMenuItem,
} from './JonesStylePanel';
import { WorkSection } from './WorkSection';
import { TAVERN_ITEMS, getItemPrice } from '@/data/items';
import { toast } from 'sonner';

interface TavernPanelProps {
  player: Player;
  priceModifier: number;
  modifyGold: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
}

export function TavernPanel({
  player,
  priceModifier,
  modifyGold,
  spendTime,
  modifyFood,
  modifyHappiness,
  workShift,
}: TavernPanelProps) {
  return (
    <JonesPanel className="h-full flex flex-col">
      <JonesPanelHeader title="The Rusty Tankard" subtitle="Tavern & Eatery" />
      <JonesPanelContent className="flex-1 flex flex-col justify-center">
        <div className="space-y-1">
          {TAVERN_ITEMS.map(item => {
            const price = getItemPrice(item, priceModifier);
            const canAfford = player.gold >= price && player.timeRemaining >= 1;
            return (
              <JonesMenuItem
                key={item.id}
                label={item.name}
                price={price}
                disabled={!canAfford}
                largeText
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
        </div>
        <div className="mt-3 text-sm text-[#8b7355] px-2">
          1 hour per purchase
        </div>

        {/* Work button for tavern employees */}
        <WorkSection
          player={player}
          locationName="Rusty Tankard"
          workShift={workShift}
          variant="jones"
        />
      </JonesPanelContent>
    </JonesPanel>
  );
}
