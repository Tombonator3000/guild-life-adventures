import { useState } from 'react';
import type { Player } from '@/types/game.types';
import {
  JonesMenuItem,
  JonesSectionHeader,
} from './JonesStylePanel';
import { TAVERN_ITEMS, getItemPrice } from '@/data/items';
import { itemToPreview } from './ItemPreview';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

interface TavernPanelProps {
  player: Player;
  priceModifier: number;
  modifyGold: (playerId: string, amount: number) => void;
  spendTime: (playerId: string, hours: number) => void;
  modifyFood: (playerId: string, amount: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  setEventMessage: (message: string) => void;
}

const BRAWL_MESSAGES = [
  (dmg: number) =>
    `Tavern Brawl!\n\nAle number seven loosened your tongue — specifically, the part that called a dwarf's beard "second-rate shrubbery." The whole tavern disagreed. Loudly.\n\nChairs flew. Magnus ducked behind the bar. You did not.\n\n-${dmg} health. The barkeep found two of your teeth near the fireplace.`,
  (dmg: number) =>
    `Tavern Brawl!\n\nYou challenged the largest man in the room to an arm-wrestling contest. He accepted. Then his brothers joined in. Then his cousins.\n\nMagnus threw you out personally, which, honestly, was the kindest thing anyone did to you all evening.\n\n-${dmg} health. Several teeth are now optional.`,
  (dmg: number) =>
    `Tavern Brawl!\n\nYou stood on a table and declared yourself "the greatest warrior in the realm." The regulars took this as a personal affront. Empirical testing followed.\n\nThe results were not in your favour.\n\n-${dmg} health. Your pride, also critically injured.`,
  (dmg: number) =>
    `Tavern Brawl!\n\nSomebody's ale got knocked over. Somebody pointed at you. Somebody threw a punch. You threw one back — at the wrong person.\n\nIt escalated from there.\n\n-${dmg} health. You'll remember this more clearly tomorrow when the swelling goes down.`,
  (dmg: number) =>
    `Tavern Brawl!\n\nYou tried to start a sing-along. The song was offensive to at least three separate professions, one religion, and all dwarves present.\n\nThe response was immediate and physical.\n\n-${dmg} health. Magnus has banned the song. And possibly you.`,
];

function pickBrawlMessage(damage: number): string {
  return BRAWL_MESSAGES[Math.floor(Math.random() * BRAWL_MESSAGES.length)](damage);
}

export function TavernPanel({
  player,
  priceModifier,
  modifyGold,
  spendTime,
  modifyFood,
  modifyHappiness,
  modifyHealth,
  setEventMessage,
}: TavernPanelProps) {
  const { t } = useTranslation();
  const [alesDrunk, setAlesDrunk] = useState(0);

  return (
    <div>
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
                modifyGold(player.id, -price);
                if (item.effect?.type === 'food') {
                  modifyFood(player.id, item.effect.value);
                }
                if (item.effect?.type === 'happiness') {
                  modifyHappiness(player.id, item.effect.value);
                }
                toast.success(t('panelStore.purchased', { name: t(`items.${item.id}.name`) || item.name }));

                // Tavern brawl: track ale consumption and roll for brawl after 6th mug
                if (item.id === 'ale') {
                  const newCount = alesDrunk + 1;
                  setAlesDrunk(newCount);
                  if (newCount > 6 && Math.random() < 0.35) {
                    const damage = 5 + Math.floor(Math.random() * 11); // 5–15 damage
                    modifyHealth(player.id, -damage);
                    setEventMessage(pickBrawlMessage(damage));
                  }
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
