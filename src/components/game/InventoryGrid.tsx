// InventoryGrid - Medieval-styled grid inventory with drag-drop and tooltips
// Inspired by classic RPG inventory systems

import { useState, useRef, useCallback } from 'react';
import { ItemIcon } from './ItemIcon';
import { ARMORY_ITEMS, GENERAL_STORE_ITEMS, ENCHANTER_ITEMS, getAppliance, calculateCombatStats, TEMPER_BONUS, type Item } from '@/data/items';
import type { Player, EquipmentSlot } from '@/types/game.types';
import { useGameStore } from '@/store/gameStore';
import { getGameOption } from '@/data/gameOptions';
import { getHexById } from '@/data/hexes';
import { Scroll, MapPin, Target, Flame, Skull } from 'lucide-react';
import { toast } from 'sonner';

// Grid constants
const GRID_COLS = 5;
const GRID_ROWS = 6;
const SLOT_SIZE = 'w-11 h-11'; // Tailwind classes for slot size

interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  equipped?: boolean;
  broken?: boolean;
  tempered?: boolean;
  slot?: EquipmentSlot;
  stats?: {
    attack?: number;
    defense?: number;
    blockChance?: number;
  };
  temperedStats?: {
    attack?: number;
    defense?: number;
    blockChance?: number;
  };
  // Hex scroll fields
  isHexScroll?: boolean;
  hexId?: string;
  hexCategory?: 'location' | 'personal' | 'sabotage';
  castTime?: number;
}

interface InventoryGridProps {
  player: Player;
}

export function InventoryGrid({ player }: InventoryGridProps) {
  const store = useGameStore();
  const { equipItem, unequipItem } = store;
  const players = useGameStore(s => s.players);
  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);
  const [hoveredItem, setHoveredItem] = useState<InventoryItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [castingScroll, setCastingScroll] = useState<string | null>(null); // hexId being cast
  const gridRef = useRef<HTMLDivElement>(null);

  // Build inventory items from player data
  const inventoryItems = buildInventoryItems(player);
  const equippedItems = inventoryItems.filter(i => i.equipped);
  const bagItems = inventoryItems.filter(i => !i.equipped);
  const combatStats = getPlayerCombatStats(player);

  const rivals = players.filter(p => p.id !== player.id && !p.isGameOver);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, item: InventoryItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // Handle drop on equipment slot
  const handleEquipDrop = useCallback((slot: EquipmentSlot) => {
    if (!draggedItem || draggedItem.slot !== slot) return;
    equipItem(player.id, draggedItem.itemId, slot);
    setDraggedItem(null);
  }, [draggedItem, equipItem, player.id]);

  // Handle drop on inventory (unequip)
  const handleInventoryDrop = useCallback(() => {
    if (!draggedItem || !draggedItem.equipped || !draggedItem.slot) return;
    unequipItem(player.id, draggedItem.slot);
    setDraggedItem(null);
  }, [draggedItem, unequipItem, player.id]);

  // Handle hover for tooltip
  const handleMouseEnter = useCallback((e: React.MouseEvent, item: InventoryItem) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top });
    setHoveredItem(item);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  // Handle hex scroll click — open target picker or cast directly
  const handleScrollClick = useCallback((item: InventoryItem) => {
    if (!item.isHexScroll || !item.hexId) return;
    
    if (item.hexCategory === 'location') {
      // Location hexes cast directly (no target needed)
      const result = store.castLocationHex(player.id, item.hexId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setCastingScroll(null);
    } else {
      // Personal/sabotage — toggle target picker
      setCastingScroll(prev => prev === item.hexId ? null : item.hexId!);
    }
  }, [store, player.id]);

  // Handle casting on a target
  const handleCastOnTarget = useCallback((hexId: string, targetId: string) => {
    const result = store.castPersonalCurse(player.id, hexId, targetId);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setCastingScroll(null);
  }, [store, player.id]);

  // Get hex scroll items for the special section
  const hexScrollItems = bagItems.filter(i => i.isHexScroll);
  const regularBagItems = bagItems.filter(i => !i.isHexScroll);

  return (
    <div className="relative" ref={gridRef}>
      {/* Equipment Slots */}
      <div className="mb-3">
        <h4 className="text-[9px] font-display font-bold text-wood mb-1.5 uppercase tracking-wide">
          Equipped
        </h4>
        <div className="flex gap-1 justify-center">
          <EquipSlot
            slot="weapon"
            label="Wpn"
            item={equippedItems.find(i => i.slot === 'weapon')}
            onDrop={() => handleEquipDrop('weapon')}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            isDragTarget={draggedItem?.slot === 'weapon' && !draggedItem.equipped}
          />
          <EquipSlot
            slot="armor"
            label="Arm"
            item={equippedItems.find(i => i.slot === 'armor')}
            onDrop={() => handleEquipDrop('armor')}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            isDragTarget={draggedItem?.slot === 'armor' && !draggedItem.equipped}
          />
          <EquipSlot
            slot="shield"
            label="Shd"
            item={equippedItems.find(i => i.slot === 'shield')}
            onDrop={() => handleEquipDrop('shield')}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            isDragTarget={draggedItem?.slot === 'shield' && !draggedItem.equipped}
          />
        </div>
      </div>

      {/* Hex Scrolls Section — clickable to use */}
      {hexScrollItems.length > 0 && (
        <div className="mb-2 bg-purple-900/20 rounded p-1.5 border border-purple-700/40">
          <h4 className="text-[9px] font-display font-bold text-purple-800 mb-1 uppercase tracking-wide flex items-center gap-1">
            <Scroll className="w-3 h-3" /> Hex Scrolls
          </h4>
          <div className="space-y-1">
            {hexScrollItems.map(item => {
              const isActive = castingScroll === item.hexId;
              const canCast = player.timeRemaining >= (item.castTime || 0);
              const categoryIcon = item.hexCategory === 'location' 
                ? <MapPin className="w-3 h-3" />
                : item.hexCategory === 'sabotage'
                  ? <Flame className="w-3 h-3" />
                  : <Target className="w-3 h-3" />;
              
              return (
                <div key={item.hexId}>
                  <button
                    onClick={() => handleScrollClick(item)}
                    disabled={!canCast}
                    className={`
                      w-full flex items-center justify-between text-[10px] rounded px-1.5 py-1 transition-all
                      ${isActive 
                        ? 'bg-purple-700 text-purple-100 ring-1 ring-purple-400' 
                        : 'bg-purple-100/80 text-purple-900 hover:bg-purple-200 border border-purple-300/50'
                      }
                      disabled:opacity-40 disabled:cursor-not-allowed
                    `}
                    title={`${item.name} — ${item.description} (${item.castTime}h)`}
                  >
                    <span className="flex items-center gap-1 font-semibold truncate">
                      {categoryIcon}
                      {item.name}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="opacity-70">×{item.quantity}</span>
                      <span className="text-[8px] opacity-60">({item.castTime}h)</span>
                    </span>
                  </button>

                  {/* Target picker (shown when scroll is selected) */}
                  {isActive && (item.hexCategory === 'personal' || item.hexCategory === 'sabotage') && (
                    <div className="mt-1 ml-2 space-y-0.5">
                      <div className="text-[8px] text-purple-300 font-semibold uppercase">Cast on:</div>
                      {rivals.length === 0 && (
                        <div className="text-[9px] text-purple-400 italic">No targets available</div>
                      )}
                      {rivals.map(rival => (
                        <button
                          key={rival.id}
                          onClick={() => handleCastOnTarget(item.hexId!, rival.id)}
                          className="w-full flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded
                            bg-purple-800/50 text-purple-200 hover:bg-purple-600 transition-colors
                            border border-purple-600/30"
                        >
                          <Skull className="w-3 h-3 text-purple-400" />
                          <span className="font-medium">{rival.name}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => setCastingScroll(null)}
                        className="text-[8px] text-purple-400 hover:text-purple-200 mt-0.5"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inventory Grid */}
      <div className="bg-parchment-dark/40 rounded p-1.5 border border-wood-light/40">
        <h4 className="text-[9px] font-display font-bold text-wood mb-1 uppercase tracking-wide">
          Inventory
        </h4>
        <div 
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleInventoryDrop}
        >
          {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, index) => {
            const item = regularBagItems[index];
            return (
              <InventorySlot
                key={index}
                item={item}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                isDragTarget={!!draggedItem && draggedItem.equipped}
              />
            );
          })}
        </div>
      </div>

      {/* Combat Stats Summary */}
      <div className="mt-2 bg-wood/80 rounded p-1.5 text-[9px]">
        <div className="flex justify-between text-parchment">
          <span>ATK</span>
          <span className="font-bold text-gold">{combatStats.attack}</span>
        </div>
        <div className="flex justify-between text-parchment">
          <span>DEF</span>
          <span className="font-bold text-gold">{combatStats.defense}</span>
        </div>
        {combatStats.blockChance > 0 && (
          <div className="flex justify-between text-parchment">
            <span>BLK</span>
            <span className="font-bold text-gold">{Math.round(combatStats.blockChance * 100)}%</span>
          </div>
        )}
        {player.temperedItems.length > 0 && (
          <div className="text-[8px] text-emerald-300 mt-0.5 text-center italic">
            Temper bonuses included
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoveredItem && !hoveredItem.isHexScroll && (
        <ItemTooltip item={hoveredItem} position={tooltipPos} />
      )}
    </div>
  );
}

// Equipment slot component
interface EquipSlotProps {
  slot: EquipmentSlot;
  label: string;
  item?: InventoryItem;
  onDrop: () => void;
  onDragStart: (e: React.DragEvent, item: InventoryItem) => void;
  onDragEnd: () => void;
  onMouseEnter: (e: React.MouseEvent, item: InventoryItem) => void;
  onMouseLeave: () => void;
  isDragTarget: boolean;
}

function EquipSlot({
  slot,
  label,
  item,
  onDrop,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  isDragTarget,
}: EquipSlotProps) {
  return (
    <div
      className={`
        ${SLOT_SIZE} rounded border-2 flex flex-col items-center justify-center
        transition-all duration-150
        ${item
          ? item.tempered
            ? 'bg-emerald-500/25 border-emerald-500/70'
            : 'bg-gold/30 border-gold/60'
          : 'bg-parchment-dark/30 border-wood-light/50 border-dashed'
        }
        ${isDragTarget ? 'border-accent ring-2 ring-accent/50' : ''}
      `}
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={onDrop}
    >
      {item ? (
        <div
          draggable
          onDragStart={(e) => onDragStart(e, item)}
          onDragEnd={onDragEnd}
          onMouseEnter={(e) => onMouseEnter(e, item)}
          onMouseLeave={onMouseLeave}
          className="cursor-grab active:cursor-grabbing w-full h-full flex items-center justify-center relative"
        >
          <ItemIcon itemId={item.itemId} size={28} />
          {item.tempered && (
            <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-emerald-400 bg-emerald-900/80 rounded px-0.5 leading-tight" title="Tempered">T</span>
          )}
        </div>
      ) : (
        <span className="text-[7px] text-wood-light/60 font-semibold uppercase">
          {label}
        </span>
      )}
    </div>
  );
}

// Inventory slot component
interface InventorySlotProps {
  item?: InventoryItem;
  onDragStart: (e: React.DragEvent, item: InventoryItem) => void;
  onDragEnd: () => void;
  onMouseEnter: (e: React.MouseEvent, item: InventoryItem) => void;
  onMouseLeave: () => void;
  isDragTarget: boolean;
}

function InventorySlot({
  item,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  isDragTarget,
}: InventorySlotProps) {
  return (
    <div
      className={`
        ${SLOT_SIZE} rounded border flex items-center justify-center relative
        transition-all duration-150
        ${item 
          ? item.broken
            ? 'bg-destructive/20 border-destructive/40'
            : 'bg-parchment border-wood-light/40 hover:border-gold/60'
          : 'bg-parchment-dark/20 border-wood-light/20'
        }
        ${isDragTarget && !item ? 'border-accent border-dashed' : ''}
      `}
    >
      {item && (
        <div
          draggable={!!item.slot} // Only equippables are draggable
          onDragStart={(e) => item.slot && onDragStart(e, item)}
          onDragEnd={onDragEnd}
          onMouseEnter={(e) => onMouseEnter(e, item)}
          onMouseLeave={onMouseLeave}
          className={`w-full h-full flex items-center justify-center ${item.slot ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        >
          <ItemIcon itemId={item.itemId} size={28} />
          {item.quantity > 1 && (
            <span className="absolute bottom-0 right-0.5 text-[8px] font-bold text-wood bg-parchment/80 px-0.5 rounded">
              {item.quantity}
            </span>
          )}
          {item.broken && (
            <span className="absolute top-0 right-0 text-[10px] text-destructive">⚠</span>
          )}
          {item.tempered && (
            <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-emerald-400 bg-emerald-900/80 rounded px-0.5 leading-tight" title="Tempered">T</span>
          )}
        </div>
      )}
    </div>
  );
}

// Tooltip component
interface ItemTooltipProps {
  item: InventoryItem;
  position: { x: number; y: number };
}

function ItemTooltip({ item, position }: ItemTooltipProps) {
  return (
    <div
      className="fixed z-[100] bg-wood text-parchment p-3 rounded shadow-lg border border-gold/30 max-w-[400px] pointer-events-none"
      style={{ left: position.x, top: position.y }}
    >
      <div className="font-display font-bold text-[22px] text-gold mb-2">
        {item.tempered && <span className="text-emerald-400 mr-1">&#9733;</span>}
        {item.name}
        {item.tempered && <span className="text-emerald-400 text-[18px] ml-1">(Tempered)</span>}
        {item.equipped && <span className="text-secondary ml-1">(Equipped)</span>}
      </div>
      <div className="text-[18px] text-parchment/80 mb-3">
        {item.description}
      </div>
      {item.stats && (
        <div className="text-[18px] space-y-1 border-t border-gold/20 pt-2">
          {item.stats.attack && (
            <div className="flex justify-between">
              <span>Attack:</span>
              <span className="text-health font-bold">+{item.stats.attack}</span>
            </div>
          )}
          {item.stats.defense && (
            <div className="flex justify-between">
              <span>Defense:</span>
              <span className="text-time font-bold">+{item.stats.defense}</span>
            </div>
          )}
          {item.stats.blockChance && (
            <div className="flex justify-between">
              <span>Block:</span>
              <span className="text-secondary font-bold">{Math.round(item.stats.blockChance * 100)}%</span>
            </div>
          )}
        </div>
      )}
      {item.tempered && item.temperedStats && (
        <div className="text-[18px] space-y-1 border-t border-emerald-500/30 pt-2 mt-2">
          <div className="text-emerald-400 font-bold text-[16px] uppercase">Temper Bonus</div>
          {item.temperedStats.attack && (
            <div className="flex justify-between">
              <span className="text-emerald-300">Attack:</span>
              <span className="text-emerald-400 font-bold">+{item.temperedStats.attack}</span>
            </div>
          )}
          {item.temperedStats.defense && (
            <div className="flex justify-between">
              <span className="text-emerald-300">Defense:</span>
              <span className="text-emerald-400 font-bold">+{item.temperedStats.defense}</span>
            </div>
          )}
          {item.temperedStats.blockChance && (
            <div className="flex justify-between">
              <span className="text-emerald-300">Block:</span>
              <span className="text-emerald-400 font-bold">+{Math.round(item.temperedStats.blockChance * 100)}%</span>
            </div>
          )}
        </div>
      )}
      {item.broken && (
        <div className="text-[18px] text-destructive mt-2 border-t border-gold/20 pt-2">
          ⚠ Broken - Needs repair
        </div>
      )}
      {item.slot && !item.equipped && (
        <div className="text-[16px] text-parchment/60 mt-2 italic">
          Drag to equip
        </div>
      )}
    </div>
  );
}

// Equipment slot → player field mapping for building equipped items
const EQUIP_SLOTS: { slot: EquipmentSlot; playerField: 'equippedWeapon' | 'equippedArmor' | 'equippedShield' }[] = [
  { slot: 'weapon', playerField: 'equippedWeapon' },
  { slot: 'armor', playerField: 'equippedArmor' },
  { slot: 'shield', playerField: 'equippedShield' },
];

// Helper: Build inventory items from player data
function buildInventoryItems(player: Player): InventoryItem[] {
  const items: InventoryItem[] = [];
  const allItems = [...ARMORY_ITEMS, ...GENERAL_STORE_ITEMS, ...ENCHANTER_ITEMS];

  // Add equipped items (weapon, armor, shield)
  for (const { slot, playerField } of EQUIP_SLOTS) {
    const equippedId = player[playerField];
    if (!equippedId) continue;
    const itemData = allItems.find(i => i.id === equippedId);
    if (!itemData) continue;
    const isTempered = player.temperedItems.includes(equippedId);
    items.push({
      id: `equipped-${itemData.id}`,
      itemId: itemData.id,
      name: itemData.name,
      description: itemData.description,
      category: itemData.category,
      quantity: 1,
      equipped: true,
      tempered: isTempered,
      slot,
      stats: itemData.equipStats,
      temperedStats: isTempered ? TEMPER_BONUS[slot] : undefined,
    });
  }

  // Add durables from inventory
  Object.entries(player.durables).forEach(([itemId, qty]) => {
    if (qty <= 0) return;
    const itemData = allItems.find(i => i.id === itemId);
    if (itemData) {
      const isTempered = player.temperedItems.includes(itemId);
      const slot = itemData.equipSlot;
      items.push({
        id: `durable-${itemId}`,
        itemId: itemId,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        quantity: qty,
        tempered: isTempered,
        slot,
        stats: itemData.equipStats,
        temperedStats: isTempered && slot ? TEMPER_BONUS[slot] : undefined,
      });
    }
  });

  // Add appliances
  Object.entries(player.appliances).forEach(([appId, data]) => {
    const appData = getAppliance(appId);
    if (appData) {
      items.push({
        id: `appliance-${appId}`,
        itemId: appId,
        name: appData.name,
        description: appData.description,
        category: 'appliance',
        quantity: 1,
        broken: data.isBroken,
      });
    }
  });

  // Add tickets
  player.tickets.forEach((ticket, idx) => {
    items.push({
      id: `ticket-${idx}`,
      itemId: ticket,
      name: ticket.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'Weekend event ticket',
      category: 'luxury',
      quantity: 1,
    });
  });

  // Add hex scrolls (when feature is enabled)
  if (getGameOption('enableHexesCurses')) {
    player.hexScrolls.forEach(scroll => {
      const hex = getHexById(scroll.hexId);
      if (hex) {
        items.push({
          id: `hex-${scroll.hexId}`,
          itemId: 'hex-scroll', // generic scroll icon
          name: hex.name,
          description: hex.description,
          category: 'hex-scroll',
          quantity: scroll.quantity,
          isHexScroll: true,
          hexId: hex.id,
          hexCategory: hex.category,
          castTime: hex.castTime,
        });
      }
    });
  }

  return items;
}

// Helper: Calculate all combat stats in a single call
function getPlayerCombatStats(player: Player) {
  return calculateCombatStats(player.equippedWeapon, player.equippedArmor, player.equippedShield, player.temperedItems);
}
