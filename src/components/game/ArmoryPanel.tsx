import type { Player } from '@/types/game.types';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
} from './JonesStylePanel';
import { WorkSection } from './WorkSection';
import { ARMORY_ITEMS, getItemPrice } from '@/data/items';
import { toast } from 'sonner';

interface ArmoryPanelProps {
  player: Player;
  priceModifier: number;
  modifyGold: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyClothing: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
}

export function ArmoryPanel({
  player,
  priceModifier,
  modifyGold,
  spendTime,
  modifyClothing,
  modifyHappiness,
  workShift,
}: ArmoryPanelProps) {
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

        {/* Work button for armory employees */}
        <WorkSection
          player={player}
          locationName="Armory"
          workShift={workShift}
          variant="jones"
        />
      </JonesPanelContent>
    </JonesPanel>
  );
}
