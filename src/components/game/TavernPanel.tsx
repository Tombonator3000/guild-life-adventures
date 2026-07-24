import type { Player } from '@/types/game.types';
import { JonesMenuItem } from './JonesStylePanel';
import { TAVERN_ITEMS, getItemPrice } from '@/data/items';
import { itemToPreview } from './ItemPreview';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { useGameStore } from '@/store/gameStore';

interface TavernPanelProps {
  player: Player;
  priceModifier: number;
}

export function TavernPanel({ player, priceModifier }: TavernPanelProps) {
  const { t } = useTranslation();
  const purchaseTavernItem = useGameStore(state => state.purchaseTavernItem);
  const alesDrunk = player.tavernAlesDrunkThisTurn ?? 0;

  return (
    <div>
      {alesDrunk > 0 && (
        <div className="mb-2 px-2 py-1 text-xs text-[#6b5a42] bg-[#d4c4a0] border border-[#8b7355] rounded">
          Ale this turn: <strong>{alesDrunk}</strong>
          {alesDrunk >= 6 && <span className="text-[#8b4a4a] ml-2">Brawl risk!</span>}
        </div>
      )}
      <div className="space-y-1">
        {TAVERN_ITEMS.map(item => {
          const price = getItemPrice(item, priceModifier);
          const canAfford = player.gold >= price;
          return (
            <JonesMenuItem
              key={item.id}
              label={t(`items.${item.id}.name`) || item.name}
              price={price}
              disabled={!canAfford}
              darkText
              largeText
              previewData={itemToPreview(item)}
              onClick={() => {
                const result = purchaseTavernItem(player.id, item.id);
                if (!result) return;
                if (result.success) toast.success(result.message);
                else toast.error(result.message);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
