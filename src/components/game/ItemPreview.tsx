// Item Preview System
// Provides a React context for sharing preview data between shop items and the preview panel.
// LocationShell provides the context; JonesMenuItem and custom buttons can set preview on hover.
// The ItemPreviewPanel renders below the NPC portrait in the left column.

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Item, Appliance } from '@/data/items';
import { getItemImage } from '@/assets/items';

export interface PreviewStat {
  label: string;
  value: string;
  color?: string; // Tailwind color class or hex
}

export interface PreviewData {
  name: string;
  description: string;
  category?: string;
  stats?: PreviewStat[];
  tags?: string[]; // e.g., "Durable", "Stealable", "Appliance", "Consumable"
  effect?: string; // Short effect summary like "+25 Food" or "+10 DEF"
  imageUrl?: string; // AI-generated item image
}

interface ItemPreviewContextValue {
  preview: PreviewData | null;
  setPreview: (data: PreviewData | null) => void;
}

const ItemPreviewContext = createContext<ItemPreviewContextValue>({
  preview: null,
  setPreview: () => {},
});

export function ItemPreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreviewState] = useState<PreviewData | null>(null);
  const setPreview = useCallback((data: PreviewData | null) => {
    setPreviewState(data);
  }, []);

  return (
    <ItemPreviewContext.Provider value={{ preview, setPreview }}>
      {children}
    </ItemPreviewContext.Provider>
  );
}

export function useItemPreview() {
  return useContext(ItemPreviewContext);
}

// Tag color mapping
const TAG_COLORS: Record<string, string> = {
  'Durable': 'bg-[#5a7a5a] text-white',
  'Stealable': 'bg-[#8b4a4a] text-white',
  'Unstealable': 'bg-[#4a5a8b] text-white',
  'Appliance': 'bg-[#6b5a8b] text-white',
  'Consumable': 'bg-[#8b7a4a] text-white',
  'Equipment': 'bg-[#7a4a4a] text-white',
  'Food': 'bg-[#5a7a4a] text-white',
  'Fresh Food': 'bg-[#4a8b5a] text-white',
  'Clothing': 'bg-[#4a6b8b] text-white',
  'Magic': 'bg-[#6b4a8b] text-white',
  'Education': 'bg-[#4a7a7a] text-white',
  'Luxury': 'bg-[#8b6b4a] text-white',
  'Ticket': 'bg-[#7a5a7a] text-white',
};

interface ItemPreviewPanelProps {
  accentColor?: string;
}

export function ItemPreviewPanel({ accentColor = '#8b7355' }: ItemPreviewPanelProps) {
  const { preview } = useItemPreview();

  if (!preview) {
    return (
      <div
        className="mt-2 border rounded p-2 text-center"
        style={{
          borderColor: accentColor,
          backgroundColor: 'rgba(224, 212, 184, 0.5)',
        }}
      >
        <div className="text-[10px] text-[#8b7355] italic">
          Hover over an item to preview
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-2 border rounded overflow-hidden transition-all"
      style={{
        borderColor: accentColor,
        backgroundColor: '#f5efe5',
      }}
    >
      {/* Header with item name */}
      <div
        className="px-2 py-1 text-center"
        style={{
          background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
        }}
      >
        <div className="font-display text-xs font-bold text-white leading-tight truncate">
          {preview.name}
        </div>
        {preview.category && (
          <div className="text-[9px] text-white/70 uppercase tracking-wider">
            {preview.category}
          </div>
        )}
      </div>

      {/* Item image */}
      {preview.imageUrl && (
        <div className="flex justify-center py-2" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
          <img
            src={preview.imageUrl}
            alt={preview.name}
            className="w-24 h-24 object-contain rounded"
            loading="lazy"
          />
        </div>
      )}

      {/* Body */}
      <div className="px-2 py-1.5">
        {/* Effect summary */}
        {preview.effect && (
          <div className="text-xs font-mono font-bold text-[#2a5c3a] text-center mb-1">
            {preview.effect}
          </div>
        )}

        {/* Stats */}
        {preview.stats && preview.stats.length > 0 && (
          <div className="space-y-0.5 mb-1">
            {preview.stats.map((stat, i) => (
              <div key={i} className="flex justify-between text-[10px] font-mono">
                <span className="text-[#6b5a42]">{stat.label}</span>
                <span className="font-bold" style={{ color: stat.color || '#3d2a14' }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="text-[10px] text-[#6b5a42] leading-tight italic">
          {preview.description}
        </div>

        {/* Tags */}
        {preview.tags && preview.tags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {preview.tags.map((tag) => (
              <span
                key={tag}
                className={`text-[8px] px-1 py-0 rounded font-bold uppercase tracking-wide ${TAG_COLORS[tag] || 'bg-[#8b7355] text-white'}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// === Helper functions to create PreviewData from game data ===

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  clothing: 'Clothing',
  appliance: 'Appliance',
  luxury: 'Luxury',
  weapon: 'Weapon',
  armor: 'Armor',
  shield: 'Shield',
  magic: 'Magic Item',
  education: 'Scholar Item',
};

/** Build PreviewData from an Item object */
export function itemToPreview(item: Item): PreviewData {
  const stats: PreviewStat[] = [];
  const tags: string[] = [];
  const effectParts: string[] = [];

  // Effect
  if (item.effect) {
    const val = item.effect.value;
    const type = item.effect.type;
    if (type === 'food') effectParts.push(`+${val} Food`);
    else if (type === 'health') effectParts.push(`+${val} Health`);
    else if (type === 'happiness') effectParts.push(`+${val} Happiness`);
    else if (type === 'clothing') effectParts.push(`+${val} Clothing`);
    else if (type === 'relaxation') effectParts.push(`+${val} Relaxation`);
  }

  // Equipment stats
  if (item.equipStats) {
    if (item.equipStats.attack) {
      stats.push({ label: 'Attack', value: `+${item.equipStats.attack}`, color: '#c44' });
    }
    if (item.equipStats.defense) {
      stats.push({ label: 'Defense', value: `+${item.equipStats.defense}`, color: '#44c' });
    }
    if (item.equipStats.blockChance) {
      stats.push({ label: 'Block', value: `${Math.round(item.equipStats.blockChance * 100)}%`, color: '#a90' });
    }
  }

  // Fresh food
  if (item.isFreshFood && item.freshFoodUnits) {
    stats.push({ label: 'Storage', value: `${item.freshFoodUnits} units` });
  }

  // Requirements
  if (item.requiresFloorCleared) {
    stats.push({ label: 'Requires', value: `Floor ${item.requiresFloorCleared} cleared`, color: '#8b4a4a' });
  }

  // Tags
  if (item.isFreshFood) tags.push('Fresh Food');
  else if (item.category === 'food') tags.push('Consumable');
  if (item.isDurable) tags.push('Durable');
  if (item.isAppliance) tags.push('Appliance');
  if (item.isDurable && !item.isUnstealable) tags.push('Stealable');
  if (item.isUnstealable) tags.push('Unstealable');
  if (item.equipSlot) tags.push('Equipment');
  if (item.isLotteryTicket) tags.push('Lottery');
  if (item.isTicket) tags.push('Ticket');
  if (item.givesPerTurnBonus) effectParts.push('+1 Food/turn');
  if (item.canGenerateIncome) effectParts.push('Income generation');

  return {
    name: item.name,
    description: item.description,
    category: CATEGORY_LABELS[item.category] || item.category,
    stats: stats.length > 0 ? stats : undefined,
    tags: tags.length > 0 ? tags : undefined,
    effect: effectParts.length > 0 ? effectParts.join(' | ') : undefined,
    imageUrl: getItemImage(item.id),
  };
}

/** Build PreviewData from an Appliance object */
export function applianceToPreview(appliance: Appliance, source: 'enchanter' | 'market'): PreviewData {
  const stats: PreviewStat[] = [];
  const tags: string[] = ['Appliance', 'Durable', 'Stealable'];
  const effectParts: string[] = [];

  const happiness = source === 'enchanter' ? appliance.happinessEnchanter : appliance.happinessMarket;
  if (happiness > 0) {
    effectParts.push(`+${happiness} Happiness`);
  }
  if (appliance.givesPerTurnBonus) {
    effectParts.push('+1 Food/turn');
  }
  if (appliance.canGenerateIncome) {
    effectParts.push('Random income');
  }

  const breakChance = source === 'enchanter' ? '1/51 (~2%)' : '1/36 (~3%)';
  stats.push({ label: 'Break chance', value: breakChance, color: '#8b4a4a' });
  stats.push({ label: 'Source', value: source === 'enchanter' ? 'Enchanter' : 'Market' });

  return {
    name: appliance.name,
    description: appliance.description,
    category: 'Appliance',
    stats,
    tags,
    effect: effectParts.length > 0 ? effectParts.join(' | ') : undefined,
    imageUrl: getItemImage(appliance.id),
  };
}
