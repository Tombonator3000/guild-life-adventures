// ItemIcon - SVG icons for all game items with medieval style
// Used in inventory grid, shops, and tooltips

import type { ItemCategory } from '@/data/items';

interface ItemIconProps {
  itemId: string;
  category?: ItemCategory;
  size?: number;
  className?: string;
}

// SVG icons for items - rendered inline for better performance
export function ItemIcon({ itemId, category, size = 32, className = '' }: ItemIconProps) {
  const iconSize = size;
  const strokeWidth = size > 24 ? 1.5 : 1;

  // Get icon based on item ID
  const IconComponent = getIconForItem(itemId, category);
  
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ width: iconSize, height: iconSize }}
    >
      <IconComponent size={iconSize * 0.8} strokeWidth={strokeWidth} />
    </div>
  );
}

// Icon component type
type IconFn = React.FC<{ size: number; strokeWidth: number }>;

// Map item IDs to icon components
function getIconForItem(itemId: string, category?: ItemCategory): IconFn {
  // Weapons
  if (itemId === 'dagger') return DaggerIcon;
  if (itemId === 'sword' || itemId === 'steel-sword') return SwordIcon;
  if (itemId === 'enchanted-blade') return EnchantedBladeIcon;
  
  // Armor
  if (itemId === 'leather-armor') return LeatherArmorIcon;
  if (itemId === 'chainmail') return ChainmailIcon;
  if (itemId === 'plate-armor' || itemId === 'enchanted-plate') return PlateArmorIcon;
  
  // Shields
  if (itemId === 'shield') return WoodShieldIcon;
  if (itemId === 'iron-shield') return IronShieldIcon;
  if (itemId === 'tower-shield') return TowerShieldIcon;
  
  // Food
  if (itemId === 'bread') return BreadIcon;
  if (itemId === 'cheese') return CheeseIcon;
  if (itemId === 'fresh-meat') return MeatIcon;
  if (itemId === 'fresh-provisions') return ProvisionsIcon;
  if (itemId === 'fresh-vegetables') return VegetablesIcon;
  if (itemId === 'mystery-meat') return MysteryMeatIcon;
  if (itemId === 'ale') return AleIcon;
  if (itemId === 'stew') return StewIcon;
  if (itemId === 'roast') return RoastIcon;
  
  // Clothing
  if (itemId === 'peasant-garb') return PeasantGarbIcon;
  if (itemId === 'common-clothes') return CommonClothesIcon;
  if (itemId === 'fine-clothes') return FineClothesIcon;
  if (itemId === 'noble-attire') return NobleAttireIcon;
  if (itemId === 'guild-uniform') return GuildUniformIcon;
  
  // Appliances
  if (itemId === 'candles') return CandlesIcon;
  if (itemId === 'blanket') return BlanketIcon;
  if (itemId === 'stereo' || itemId === 'music-box') return MusicBoxIcon;
  if (itemId === 'furniture') return FurnitureIcon;
  if (itemId === 'scrying-mirror' || itemId === 'simple-scrying-glass') return MirrorIcon;
  if (itemId === 'memory-crystal') return CrystalIcon;
  if (itemId === 'cooking-fire') return CookingFireIcon;
  if (itemId === 'preservation-box') return PreservationBoxIcon;
  if (itemId === 'frost-chest') return FrostChestIcon;
  if (itemId === 'arcane-tome') return TomeIcon;
  
  // Magic items
  if (itemId === 'glow-orb') return GlowOrbIcon;
  if (itemId === 'warmth-stone') return WarmthStoneIcon;
  if (itemId === 'healing-potion') return PotionIcon;
  
  // Tickets
  if (itemId === 'lottery-ticket') return LotteryTicketIcon;
  if (itemId.includes('ticket')) return TicketIcon;
  
  // Fallback by category
  if (category === 'weapon') return SwordIcon;
  if (category === 'armor') return LeatherArmorIcon;
  if (category === 'shield') return WoodShieldIcon;
  if (category === 'food') return BreadIcon;
  if (category === 'clothing') return CommonClothesIcon;
  if (category === 'appliance') return CandlesIcon;
  if (category === 'magic') return GlowOrbIcon;
  if (category === 'luxury') return LuxuryIcon;
  
  return GenericItemIcon;
}

// ====== WEAPON ICONS ======

const DaggerIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18L12 12M12 12L18 6M12 12L8 8" stroke="#8B7355" strokeWidth={strokeWidth} strokeLinecap="round"/>
    <path d="M18 6L20 4M4 20L6 18" stroke="#5C4033" strokeWidth={strokeWidth} strokeLinecap="round"/>
    <circle cx="5" cy="19" r="2" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const SwordIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20L9 15M9 15L20 4L18 6L9 15Z" fill="#C0C0C0" stroke="#6B6B6B" strokeWidth={strokeWidth}/>
    <path d="M9 15L4 20" stroke="#8B7355" strokeWidth={strokeWidth * 1.5} strokeLinecap="round"/>
    <rect x="7" y="13" width="4" height="2" rx="0.5" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth * 0.5} transform="rotate(-45 9 14)"/>
  </svg>
);

const EnchantedBladeIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20L9 15M9 15L20 4L18 6L9 15Z" fill="url(#enchantGrad)" stroke="#4A90D9" strokeWidth={strokeWidth}/>
    <path d="M9 15L4 20" stroke="#8B7355" strokeWidth={strokeWidth * 1.5} strokeLinecap="round"/>
    <circle cx="14" cy="10" r="1" fill="#A0D8EF"/>
    <circle cx="16" cy="8" r="0.5" fill="#A0D8EF"/>
    <defs>
      <linearGradient id="enchantGrad" x1="4" y1="20" x2="20" y2="4">
        <stop offset="0%" stopColor="#6BB3F8"/>
        <stop offset="100%" stopColor="#C0C0C0"/>
      </linearGradient>
    </defs>
  </svg>
);

// ====== ARMOR ICONS ======

const LeatherArmorIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 6C7 6 8 4 12 4C16 4 17 6 17 6V18C17 18 15 20 12 20C9 20 7 18 7 18V6Z" fill="#A0522D" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <path d="M9 8H15" stroke="#5C4033" strokeWidth={strokeWidth * 0.7}/>
    <path d="M9 11H15" stroke="#5C4033" strokeWidth={strokeWidth * 0.7}/>
    <path d="M10 14H14" stroke="#5C4033" strokeWidth={strokeWidth * 0.7}/>
  </svg>
);

const ChainmailIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 6C7 6 8 4 12 4C16 4 17 6 17 6V18C17 18 15 20 12 20C9 20 7 18 7 18V6Z" fill="#A9A9A9" stroke="#696969" strokeWidth={strokeWidth}/>
    {[0,1,2,3].map(row => (
      [0,1,2].map(col => (
        <circle key={`${row}-${col}`} cx={9 + col * 2 + (row % 2)} cy={7 + row * 3} r="0.8" fill="none" stroke="#696969" strokeWidth={strokeWidth * 0.5}/>
      ))
    ))}
  </svg>
);

const PlateArmorIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 5C6 5 8 3 12 3C16 3 18 5 18 5V19C18 19 15 21 12 21C9 21 6 19 6 19V5Z" fill="url(#plateGrad)" stroke="#4A4A4A" strokeWidth={strokeWidth}/>
    <path d="M9 7L12 9L15 7" stroke="#4A4A4A" strokeWidth={strokeWidth * 0.8}/>
    <path d="M9 11H15" stroke="#4A4A4A" strokeWidth={strokeWidth * 0.6}/>
    <path d="M10 14H14" stroke="#4A4A4A" strokeWidth={strokeWidth * 0.6}/>
    <defs>
      <linearGradient id="plateGrad" x1="6" y1="3" x2="18" y2="21">
        <stop offset="0%" stopColor="#D4D4D4"/>
        <stop offset="50%" stopColor="#A9A9A9"/>
        <stop offset="100%" stopColor="#808080"/>
      </linearGradient>
    </defs>
  </svg>
);

// ====== SHIELD ICONS ======

const WoodShieldIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 5L12 3L19 5V12C19 16 12 21 12 21C12 21 5 16 5 12V5Z" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <path d="M12 6V18" stroke="#5C4033" strokeWidth={strokeWidth * 0.6}/>
    <path d="M8 8H16" stroke="#5C4033" strokeWidth={strokeWidth * 0.6}/>
  </svg>
);

const IronShieldIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 5L12 3L19 5V12C19 16 12 21 12 21C12 21 5 16 5 12V5Z" fill="#A9A9A9" stroke="#696969" strokeWidth={strokeWidth}/>
    <path d="M12 7V16" stroke="#696969" strokeWidth={strokeWidth}/>
    <path d="M8 10H16" stroke="#696969" strokeWidth={strokeWidth}/>
    <circle cx="12" cy="10" r="2" fill="none" stroke="#696969" strokeWidth={strokeWidth * 0.7}/>
  </svg>
);

const TowerShieldIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 4H18V18C18 18 15 21 12 21C9 21 6 18 6 18V4Z" fill="url(#towerGrad)" stroke="#4A4A4A" strokeWidth={strokeWidth}/>
    <path d="M12 6V18" stroke="#4A4A4A" strokeWidth={strokeWidth}/>
    <path d="M8 8L12 6L16 8" stroke="#4A4A4A" strokeWidth={strokeWidth * 0.7}/>
    <circle cx="12" cy="11" r="2.5" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth * 0.5}/>
    <defs>
      <linearGradient id="towerGrad" x1="6" y1="4" x2="18" y2="21">
        <stop offset="0%" stopColor="#C0C0C0"/>
        <stop offset="100%" stopColor="#808080"/>
      </linearGradient>
    </defs>
  </svg>
);

// ====== FOOD ICONS ======

const BreadIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="14" rx="8" ry="5" fill="#DEB887" stroke="#8B7355" strokeWidth={strokeWidth}/>
    <path d="M6 12C6 10 8 8 12 8C16 8 18 10 18 12" stroke="#8B7355" strokeWidth={strokeWidth * 0.7}/>
    <path d="M9 11L9.5 13" stroke="#8B7355" strokeWidth={strokeWidth * 0.5}/>
    <path d="M14 11L14.5 13" stroke="#8B7355" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const CheeseIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 16L12 8L20 16H4Z" fill="#FFD700" stroke="#DAA520" strokeWidth={strokeWidth}/>
    <circle cx="9" cy="14" r="1.5" fill="#DAA520"/>
    <circle cx="14" cy="13" r="1" fill="#DAA520"/>
    <circle cx="11" cy="11" r="0.8" fill="#DAA520"/>
  </svg>
);

const MeatIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="14" cy="12" rx="6" ry="5" fill="#CD5C5C" stroke="#8B4513" strokeWidth={strokeWidth}/>
    <circle cx="6" cy="12" r="3" fill="#F5DEB3" stroke="#8B7355" strokeWidth={strokeWidth}/>
    <path d="M10 10C10 10 12 9 14 10" stroke="#8B4513" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const ProvisionsIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="8" width="14" height="10" rx="1" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <path d="M8 8V6C8 5 10 4 12 4C14 4 16 5 16 6V8" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <rect x="7" y="10" width="4" height="3" fill="#DEB887"/>
    <rect x="13" y="10" width="4" height="3" fill="#CD5C5C"/>
    <rect x="10" y="14" width="4" height="2" fill="#FFD700"/>
  </svg>
);

const FeastIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="16" rx="9" ry="4" fill="#C0C0C0" stroke="#808080" strokeWidth={strokeWidth}/>
    <ellipse cx="12" cy="14" rx="5" ry="3" fill="#CD5C5C" stroke="#8B4513" strokeWidth={strokeWidth * 0.7}/>
    <circle cx="8" cy="12" r="1.5" fill="#FFD700"/>
    <circle cx="16" cy="12" r="1.5" fill="#90EE90"/>
    <path d="M10 10L12 8L14 10" stroke="#8B4513" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const VegetablesIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="8" cy="14" rx="3" ry="4" fill="#FFA500" stroke="#8B4513" strokeWidth={strokeWidth}/>
    <ellipse cx="14" cy="15" rx="3" ry="3" fill="#228B22" stroke="#006400" strokeWidth={strokeWidth}/>
    <path d="M7 10C7 10 8 8 8 6" stroke="#228B22" strokeWidth={strokeWidth}/>
    <ellipse cx="18" cy="12" rx="2" ry="4" fill="#DC143C" stroke="#8B0000" strokeWidth={strokeWidth * 0.7}/>
  </svg>
);

const MysteryMeatIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="13" rx="6" ry="5" fill="#808080" stroke="#4A4A4A" strokeWidth={strokeWidth}/>
    <text x="12" y="15" textAnchor="middle" fontSize="8" fill="#4A4A4A">?</text>
  </svg>
);

const AleIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 6H15V18C15 19 14 20 11 20C8 20 7 19 7 18V6Z" fill="#DAA520" stroke="#8B7355" strokeWidth={strokeWidth}/>
    <rect x="15" y="9" width="3" height="6" rx="1" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth * 0.7}/>
    <ellipse cx="11" cy="8" rx="3" ry="2" fill="#FFFACD"/>
  </svg>
);

const StewIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="15" rx="7" ry="4" fill="#8B4513" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <ellipse cx="12" cy="13" rx="6" ry="3" fill="#D2691E"/>
    <circle cx="9" cy="13" r="1" fill="#FFA500"/>
    <circle cx="14" cy="12" r="1" fill="#228B22"/>
    <path d="M10 9C10 9 11 7 12 7C13 7 14 9 14 9" stroke="#808080" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const RoastIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="14" rx="8" ry="5" fill="#C0C0C0" stroke="#808080" strokeWidth={strokeWidth}/>
    <ellipse cx="12" cy="12" rx="5" ry="4" fill="#8B4513" stroke="#5C4033" strokeWidth={strokeWidth * 0.7}/>
    <ellipse cx="12" cy="11" rx="3" ry="2" fill="#CD5C5C"/>
  </svg>
);

// ====== CLOTHING ICONS ======

const PeasantGarbIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 6L12 4L16 6V10L18 10V18H6V10L8 10V6Z" fill="#A0522D" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <path d="M10 8H14" stroke="#5C4033" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const CommonClothesIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5L12 3L16 5V9L19 9V19H5V9L8 9V5Z" fill="#6B8E23" stroke="#556B2F" strokeWidth={strokeWidth}/>
    <path d="M10 7H14" stroke="#556B2F" strokeWidth={strokeWidth * 0.5}/>
    <path d="M9 11H15" stroke="#556B2F" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const FineClothesIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5L12 3L16 5V9L19 9V19H5V9L8 9V5Z" fill="#4169E1" stroke="#00008B" strokeWidth={strokeWidth}/>
    <path d="M11 7L12 5L13 7" stroke="#FFD700" strokeWidth={strokeWidth * 0.7}/>
    <circle cx="12" cy="10" r="1" fill="#FFD700"/>
    <circle cx="12" cy="14" r="1" fill="#FFD700"/>
  </svg>
);

const NobleAttireIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 4L12 2L17 4V9L20 9V20H4V9L7 9V4Z" fill="#800080" stroke="#4B0082" strokeWidth={strokeWidth}/>
    <path d="M10 6L12 4L14 6" stroke="#FFD700" strokeWidth={strokeWidth}/>
    <path d="M9 10H15" stroke="#FFD700" strokeWidth={strokeWidth * 0.7}/>
    <circle cx="12" cy="14" r="1.5" fill="#FFD700"/>
  </svg>
);

const GuildUniformIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5L12 3L16 5V9L19 9V19H5V9L8 9V5Z" fill="#8B0000" stroke="#4A0000" strokeWidth={strokeWidth}/>
    <path d="M10 8L12 6L14 8L12 10L10 8Z" fill="#FFD700" stroke="#DAA520" strokeWidth={strokeWidth * 0.5}/>
    <path d="M9 13H15" stroke="#FFD700" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

// ====== APPLIANCE ICONS ======

const CandlesIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="10" width="3" height="8" fill="#FFFACD" stroke="#DAA520" strokeWidth={strokeWidth}/>
    <rect x="13" y="12" width="3" height="6" fill="#FFFACD" stroke="#DAA520" strokeWidth={strokeWidth}/>
    <ellipse cx="9.5" cy="8" rx="1.5" ry="2" fill="#FFA500"/>
    <ellipse cx="14.5" cy="10" rx="1.5" ry="2" fill="#FFA500"/>
  </svg>
);

const BlanketIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="16" height="10" rx="2" fill="#8B4513" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <path d="M4 11H20" stroke="#5C4033" strokeWidth={strokeWidth * 0.5}/>
    <path d="M4 14H20" stroke="#5C4033" strokeWidth={strokeWidth * 0.5}/>
    <path d="M6 8V18M10 8V18M14 8V18M18 8V18" stroke="#5C4033" strokeWidth={strokeWidth * 0.3}/>
  </svg>
);

const MusicBoxIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="10" width="14" height="8" rx="1" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <ellipse cx="12" cy="6" rx="4" ry="2" fill="#C0C0C0" stroke="#808080" strokeWidth={strokeWidth}/>
    <path d="M12 8V10" stroke="#808080" strokeWidth={strokeWidth}/>
    <path d="M16 7C17 8 18 9 18 10" stroke="#4A90D9" strokeWidth={strokeWidth * 0.5}/>
    <path d="M17 5C18 6 19 8 19 9" stroke="#4A90D9" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const FurnitureIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="10" width="16" height="6" rx="1" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <rect x="6" y="8" width="12" height="4" rx="1" fill="#A0522D" stroke="#5C4033" strokeWidth={strokeWidth * 0.7}/>
    <rect x="5" y="16" width="2" height="4" fill="#5C4033"/>
    <rect x="17" y="16" width="2" height="4" fill="#5C4033"/>
  </svg>
);

const MirrorIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="11" rx="6" ry="7" fill="url(#mirrorGrad)" stroke="#8B7355" strokeWidth={strokeWidth}/>
    <rect x="10" y="18" width="4" height="3" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth * 0.7}/>
    <defs>
      <linearGradient id="mirrorGrad" x1="6" y1="4" x2="18" y2="18">
        <stop offset="0%" stopColor="#E0FFFF"/>
        <stop offset="50%" stopColor="#B0E0E6"/>
        <stop offset="100%" stopColor="#87CEEB"/>
      </linearGradient>
    </defs>
  </svg>
);

const CrystalIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L18 10L12 21L6 10L12 3Z" fill="url(#crystalGrad)" stroke="#8A2BE2" strokeWidth={strokeWidth}/>
    <path d="M12 3L12 21" stroke="#8A2BE2" strokeWidth={strokeWidth * 0.5}/>
    <path d="M6 10L18 10" stroke="#8A2BE2" strokeWidth={strokeWidth * 0.5}/>
    <defs>
      <linearGradient id="crystalGrad" x1="6" y1="3" x2="18" y2="21">
        <stop offset="0%" stopColor="#E6E6FA"/>
        <stop offset="50%" stopColor="#DDA0DD"/>
        <stop offset="100%" stopColor="#9370DB"/>
      </linearGradient>
    </defs>
  </svg>
);

const CookingFireIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18C6 18 6 14 8 11C10 8 12 6 12 6C12 6 14 8 16 11C18 14 18 18 18 18" fill="url(#fireGrad)" stroke="#FF4500" strokeWidth={strokeWidth}/>
    <ellipse cx="12" cy="19" rx="6" ry="2" fill="#808080" stroke="#4A4A4A" strokeWidth={strokeWidth}/>
    <defs>
      <linearGradient id="fireGrad" x1="12" y1="6" x2="12" y2="18">
        <stop offset="0%" stopColor="#FFFF00"/>
        <stop offset="50%" stopColor="#FFA500"/>
        <stop offset="100%" stopColor="#FF4500"/>
      </linearGradient>
    </defs>
  </svg>
);

const PreservationBoxIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="7" width="14" height="12" rx="1" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <path d="M5 10H19" stroke="#5C4033" strokeWidth={strokeWidth}/>
    <circle cx="12" cy="14" r="2" fill="#4A90D9" stroke="#2C5282" strokeWidth={strokeWidth * 0.5}/>
    <path d="M12 12V14H14" stroke="#2C5282" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const FrostChestIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="16" height="14" rx="1" fill="url(#frostGrad)" stroke="#4A90D9" strokeWidth={strokeWidth}/>
    <path d="M4 10H20" stroke="#4A90D9" strokeWidth={strokeWidth}/>
    <rect x="10" y="7" width="4" height="2" fill="#2C5282"/>
    <path d="M12 13L14 15L12 17L10 15L12 13Z" fill="#A0D8EF"/>
    <defs>
      <linearGradient id="frostGrad" x1="4" y1="6" x2="20" y2="20">
        <stop offset="0%" stopColor="#E0FFFF"/>
        <stop offset="100%" stopColor="#87CEEB"/>
      </linearGradient>
    </defs>
  </svg>
);

const TomeIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="4" width="14" height="16" rx="1" fill="#800080" stroke="#4B0082" strokeWidth={strokeWidth}/>
    <path d="M7 4V20" stroke="#4B0082" strokeWidth={strokeWidth}/>
    <path d="M9 8H17" stroke="#FFD700" strokeWidth={strokeWidth * 0.5}/>
    <path d="M9 11H17" stroke="#FFD700" strokeWidth={strokeWidth * 0.5}/>
    <path d="M9 14H14" stroke="#FFD700" strokeWidth={strokeWidth * 0.5}/>
    <circle cx="15" cy="16" r="2" fill="#FFD700"/>
  </svg>
);

// ====== MAGIC ICONS ======

const GlowOrbIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="6" fill="url(#glowGrad)" stroke="#FFD700" strokeWidth={strokeWidth}/>
    <circle cx="10" cy="10" r="1.5" fill="white" opacity="0.7"/>
    <defs>
      <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFACD"/>
        <stop offset="100%" stopColor="#FFD700"/>
      </radialGradient>
    </defs>
  </svg>
);

const WarmthStoneIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="14" rx="7" ry="5" fill="url(#warmthGrad)" stroke="#8B4513" strokeWidth={strokeWidth}/>
    <path d="M9 11C9 11 11 9 12 9C13 9 15 11 15 11" stroke="#FF4500" strokeWidth={strokeWidth * 0.5}/>
    <path d="M10 8C10 8 11 6 12 6C13 6 14 8 14 8" stroke="#FF4500" strokeWidth={strokeWidth * 0.5}/>
    <defs>
      <radialGradient id="warmthGrad" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FF6347"/>
        <stop offset="100%" stopColor="#8B4513"/>
      </radialGradient>
    </defs>
  </svg>
);

const PotionIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 4H15V8L18 14V18C18 19 16 20 12 20C8 20 6 19 6 18V14L9 8V4Z" fill="url(#potionGrad)" stroke="#8B0000" strokeWidth={strokeWidth}/>
    <rect x="9" y="3" width="6" height="2" fill="#8B7355" stroke="#5C4033" strokeWidth={strokeWidth * 0.5}/>
    <ellipse cx="12" cy="15" rx="3" ry="2" fill="white" opacity="0.3"/>
    <defs>
      <linearGradient id="potionGrad" x1="6" y1="4" x2="18" y2="20">
        <stop offset="0%" stopColor="#FF6B6B"/>
        <stop offset="100%" stopColor="#C41E3A"/>
      </linearGradient>
    </defs>
  </svg>
);

// ====== MISC ICONS ======

const LotteryTicketIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="8" width="18" height="8" rx="1" fill="#FFD700" stroke="#DAA520" strokeWidth={strokeWidth}/>
    <path d="M7 8V16" stroke="#DAA520" strokeWidth={strokeWidth} strokeDasharray="2 1"/>
    <path d="M17 8V16" stroke="#DAA520" strokeWidth={strokeWidth} strokeDasharray="2 1"/>
    <text x="12" y="14" textAnchor="middle" fontSize="6" fill="#8B4513" fontWeight="bold">★</text>
  </svg>
);

const TicketIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="8" width="18" height="8" rx="1" fill="#DEB887" stroke="#8B7355" strokeWidth={strokeWidth}/>
    <path d="M7 8V16" stroke="#8B7355" strokeWidth={strokeWidth} strokeDasharray="2 1"/>
    <path d="M9 10H19" stroke="#8B7355" strokeWidth={strokeWidth * 0.5}/>
    <path d="M9 14H15" stroke="#8B7355" strokeWidth={strokeWidth * 0.5}/>
  </svg>
);

const LuxuryIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L14 9H20L15 13L17 19L12 15L7 19L9 13L4 9H10L12 3Z" fill="#FFD700" stroke="#DAA520" strokeWidth={strokeWidth}/>
  </svg>
);

const GenericItemIcon: IconFn = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="14" height="14" rx="2" fill="#A9A9A9" stroke="#696969" strokeWidth={strokeWidth}/>
    <circle cx="12" cy="12" r="3" fill="none" stroke="#696969" strokeWidth={strokeWidth}/>
  </svg>
);
