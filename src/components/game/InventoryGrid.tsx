// InventoryGrid - Medieval-styled grid inventory with drag-drop and tooltips
// Inspired by classic RPG inventory systems

import { useState, useRef, useCallback } from 'react';
import { ItemIcon } from './ItemIcon';
import { ARMORY_ITEMS, GENERAL_STORE_ITEMS, ENCHANTER_ITEMS, getAppliance, type Item } from '@/data/items';
import type { Player, EquipmentSlot } from '@/types/game.types';
import { useGameStore } from '@/store/gameStore';

// Grid constants
const GRID_COLS = 4;
const GRID_ROWS = 5;
const SLOT_SIZE = 'w-10 h-10'; // Tailwind classes for slot size

interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  equipped?: boolean;
  broken?: boolean;
  slot?: EquipmentSlot;
  stats?: {
    attack?: number;
    defense?: number;
    blockChance?: number;
  };
}

interface InventoryGridProps {
  player: Player;
}

export function InventoryGrid({ player }: InventoryGridProps) {
  const { equipItem, unequipItem } = useGameStore();
  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);
  const [hoveredItem, setHoveredItem] = useState<InventoryItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  // Build inventory items from player data
  const inventoryItems = buildInventoryItems(player);
  const equippedItems = inventoryItems.filter(i => i.equipped);
  const bagItems = inventoryItems.filter(i => !i.equipped);

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
            const item = bagItems[index];
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
          <span className="font-bold text-gold">{calculateTotalAttack(player)}</span>
        </div>
        <div className="flex justify-between text-parchment">
          <span>DEF</span>
          <span className="font-bold text-gold">{calculateTotalDefense(player)}</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredItem && (
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
          ? 'bg-gold/30 border-gold/60' 
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
          className="cursor-grab active:cursor-grabbing w-full h-full flex items-center justify-center"
        >
          <ItemIcon itemId={item.itemId} size={28} />
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
      className="fixed z-[100] bg-wood text-parchment p-2 rounded shadow-lg border border-gold/30 max-w-[180px] pointer-events-none"
      style={{ left: position.x, top: position.y }}
    >
      <div className="font-display font-bold text-[11px] text-gold mb-1">
        {item.name}
        {item.equipped && <span className="text-secondary ml-1">(Equipped)</span>}
      </div>
      <div className="text-[9px] text-parchment/80 mb-1.5">
        {item.description}
      </div>
      {item.stats && (
        <div className="text-[9px] space-y-0.5 border-t border-gold/20 pt-1">
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
      {item.broken && (
        <div className="text-[9px] text-destructive mt-1 border-t border-gold/20 pt-1">
          ⚠ Broken - Needs repair
        </div>
      )}
      {item.slot && !item.equipped && (
        <div className="text-[8px] text-parchment/60 mt-1 italic">
          Drag to equip
        </div>
      )}
    </div>
  );
}

// Helper: Build inventory items from player data
function buildInventoryItems(player: Player): InventoryItem[] {
  const items: InventoryItem[] = [];
  const allItems = [...ARMORY_ITEMS, ...GENERAL_STORE_ITEMS, ...ENCHANTER_ITEMS];

  // Add equipped items
  if (player.equippedWeapon) {
    const itemData = allItems.find(i => i.id === player.equippedWeapon);
    if (itemData) {
      items.push({
        id: `equipped-${itemData.id}`,
        itemId: itemData.id,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        quantity: 1,
        equipped: true,
        slot: 'weapon',
        stats: itemData.equipStats,
      });
    }
  }
  if (player.equippedArmor) {
    const itemData = allItems.find(i => i.id === player.equippedArmor);
    if (itemData) {
      items.push({
        id: `equipped-${itemData.id}`,
        itemId: itemData.id,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        quantity: 1,
        equipped: true,
        slot: 'armor',
        stats: itemData.equipStats,
      });
    }
  }
  if (player.equippedShield) {
    const itemData = allItems.find(i => i.id === player.equippedShield);
    if (itemData) {
      items.push({
        id: `equipped-${itemData.id}`,
        itemId: itemData.id,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        quantity: 1,
        equipped: true,
        slot: 'shield',
        stats: itemData.equipStats,
      });
    }
  }

  // Add durables from inventory
  Object.entries(player.durables).forEach(([itemId, qty]) => {
    if (qty <= 0) return;
    const itemData = allItems.find(i => i.id === itemId);
    if (itemData) {
      items.push({
        id: `durable-${itemId}`,
        itemId: itemId,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        quantity: qty,
        slot: itemData.equipSlot,
        stats: itemData.equipStats,
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

  return items;
}

// Helper: Calculate total attack
function calculateTotalAttack(player: Player): number {
  const weapon = ARMORY_ITEMS.find(i => i.id === player.equippedWeapon);
  return weapon?.equipStats?.attack || 0;
}

// Helper: Calculate total defense
function calculateTotalDefense(player: Player): number {
  const armor = ARMORY_ITEMS.find(i => i.id === player.equippedArmor);
  const shield = ARMORY_ITEMS.find(i => i.id === player.equippedShield);
  return (armor?.equipStats?.defense || 0) + (shield?.equipStats?.defense || 0);
}
