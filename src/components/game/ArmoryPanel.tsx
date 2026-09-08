import { useState } from 'react';
import type { Player, EquipmentSlot } from '@/types/game.types';
import { ARMORY_ITEMS, getItemPrice, calculateCombatStats, getClothingTier, CLOTHING_TIER_LABELS, MAX_DURABILITY } from '@/data/items';
import { itemToPreview, useItemPreview } from './ItemPreview';
import { ItemIcon } from './ItemIcon';
import { useGameStore } from '@/store/gameStore';
import { useTranslation } from '@/i18n';
import { toast } from 'sonner';
import './player-experience.css';

export type ArmorySection = 'clothing' | 'weapons' | 'armor' | 'shields';
interface ArmoryPanelProps {
  player: Player;
  priceModifier: number;
  equipItem: (playerId: string, itemId: string, slot: EquipmentSlot) => void;
  unequipItem: (playerId: string, slot: EquipmentSlot) => void;
  section?: ArmorySection;
}

export function ArmoryPanel({ player, priceModifier, equipItem, unequipItem, section = 'clothing' }: ArmoryPanelProps) {
  const { t } = useTranslation();
  const { setPreview } = useItemPreview();
  const purchase = useGameStore(s => s.purchaseEquipmentItem);
  const [backup, setBackup] = useState(false);
  const stats = calculateCombatStats(player.equippedWeapon, player.equippedArmor, player.equippedShield, player.temperedItems, player.equipmentDurability);
  const slot = section === 'weapons' ? 'weapon' : section === 'shields' ? 'shield' : 'armor';
  const equipped = slot === 'weapon' ? player.equippedWeapon : slot === 'armor' ? player.equippedArmor : player.equippedShield;
  const items = ARMORY_ITEMS.filter(item => section === 'clothing' ? item.effect?.type === 'clothing' : item.equipSlot === slot);

  return <section className="armory-catalog" aria-label={`Armory ${section}`}>
    <div className="armory-summary">
      {section === 'clothing' ? <>
        <p>Wearing <strong>{CLOTHING_TIER_LABELS[getClothingTier(player.clothingCondition)]} · {player.clothingCondition}%</strong></p>
        <label><input type="checkbox" checked={backup} onChange={e => setBackup(e.target.checked)} /> Buy for wardrobe {player.backupOutfit != null && `(${player.backupOutfit}% stored)`}</label>
      </> : <><p><strong>{stats.attack} ATK · {stats.defense} DEF{stats.blockChance > 0 && ` · ${Math.round(stats.blockChance * 100)}% block`}</strong></p><p>Purchases equip immediately. Your old gear stays in your inventory.</p></>}
    </div>
    {items.map(item => {
      const price = getItemPrice(item, priceModifier);
      const clothing = section === 'clothing';
      const owns = !clothing && (player.durables[item.id] ?? 0) > 0;
      const active = owns && equipped === item.id;
      const floorLocked = !!item.requiresFloorCleared && !player.dungeonFloorsCleared.includes(item.requiresFloorCleared);
      const improves = !clothing || (item.effect?.value ?? 0) > (backup ? player.backupOutfit ?? 0 : player.clothingCondition);
      const reason = floorLocked ? `Clear Cave floor ${item.requiresFloorCleared}` : !owns && player.gold < price ? 'Not enough gold' : !improves ? 'Already have this quality or better' : undefined;
      const name = t(`items.${item.id}.name`) || item.name;
      const durability = player.equipmentDurability?.[item.id] ?? MAX_DURABILITY;
      const detail = clothing ? `${CLOTHING_TIER_LABELS[getClothingTier(item.effect?.value ?? 0)]} · ${item.effect?.value}% condition`
        : [item.equipStats?.attack && `+${item.equipStats.attack} ATK`, item.equipStats?.defense && `+${item.equipStats.defense} DEF`, item.equipStats?.blockChance && `${Math.round(item.equipStats.blockChance * 100)}% block`, owns && durability < MAX_DURABILITY && `${durability}% condition`].filter(Boolean).join(' · ');
      return <div key={item.id} className="armory-item" data-equipped={active} onMouseEnter={() => setPreview(itemToPreview(item))} onMouseLeave={() => setPreview(null)} onFocus={() => setPreview(itemToPreview(item))} onBlur={() => setPreview(null)}>
        <ItemIcon itemId={item.id} size={44} />
        <div className="armory-item-copy"><strong>{name}</strong><span>{detail}</span>{reason && <small>{reason}</small>}</div>
        <button disabled={!!reason} aria-label={`${owns ? active ? 'Unequip' : 'Equip' : backup && clothing ? 'Store' : 'Buy'} ${name}${!owns ? ` for ${price}g` : ''}`} onClick={() => {
          if (owns) {
            if (active) unequipItem(player.id, slot); else equipItem(player.id, item.id, slot);
          } else {
            const result = purchase(player.id, 'armory', item.id, clothing && backup ? 'backup' : 'primary');
            if (!result) return;
            if (result.success) toast.success(result.message); else if (result) toast.error(result.message);
          }
        }}>{owns ? active ? 'Equipped ✓' : 'Equip' : <>{price}g <small>{clothing && backup ? 'Store' : 'Buy & wear'}</small></>}</button>
      </div>;
    })}
  </section>;
}
