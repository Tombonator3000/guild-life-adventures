import type { ItemCategory } from '@/data/items';
import { getPaintedItem } from '@/assets/items/painted';
import { getItemImage } from '@/assets/items';
import './playability.css';

interface ItemIconProps { itemId: string; category?: ItemCategory; size?: number; className?: string }
/** One item identity across shop rows, inventory and previews. Atlas cells are never resized independently. */
export function ItemIcon({ itemId, size = 32, className = '' }: ItemIconProps) {
  const art = getPaintedItem(itemId);
  if (art) return <span className={`painted-item ${className}`} data-item-art={itemId} aria-hidden="true" style={{ width: size, height: size, backgroundImage: `url(${art.atlas})`, backgroundPosition: `${(art.cell % 4) * 100 / 3}% ${Math.floor(art.cell / 4) * 100 / 3}%` }} />;
  const image = getItemImage(itemId);
  return image ? <img className={`painted-item ${className}`} width={size} height={size} src={image} alt="" loading="lazy" /> : <span className={`painted-item item-unpictured ${className}`} aria-hidden="true" style={{ width: size, height: size }}>◆</span>;
}
