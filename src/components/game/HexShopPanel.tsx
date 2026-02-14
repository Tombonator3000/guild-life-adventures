// Hex Shop Panel — Shared by Enchanter ("Forbidden Scrolls") and Shadow Market ("Dirty Tricks")
// Shows available hex scrolls for purchase and casting

import { useGameStore } from '@/store/gameStore';
import { getGameOption } from '@/data/gameOptions';
import { getHexPrice, getHexById, DEFENSE_ITEMS } from '@/data/hexes';
import type { HexDefinition } from '@/data/hexes';
import type { Player } from '@/types/game.types';
import { Flame, Shield, Target, MapPin, Skull } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

interface HexShopPanelProps {
  player: Player;
  players: Player[];
  priceModifier: number;
  availableHexes: HexDefinition[];
  showDefense?: boolean;  // Show Protective Amulet / Dispel Scroll
  variant: 'enchanter' | 'shadow-market';
}

export function HexShopPanel({ player, players, priceModifier, availableHexes, showDefense, variant }: HexShopPanelProps) {
  const store = useGameStore();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  if (!getGameOption('enableHexesCurses')) return null;

  const rivals = players.filter(p => p.id !== player.id && !p.isGameOver);
  const ownedScrolls = player.hexScrolls;

  const handleBuyScroll = (hex: HexDefinition) => {
    const price = getHexPrice(hex, priceModifier);
    store.buyHexScroll(player.id, hex.id, price);
    toast.success(`Acquired ${hex.name} scroll!`);
  };

  const handleCastLocationHex = (hexId: string) => {
    const result = store.castLocationHex(player.id, hexId);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleCastCurse = (hexId: string, targetId: string) => {
    const result = store.castPersonalCurse(player.id, hexId, targetId);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setSelectedTarget(null);
  };

  const handleBuyAmulet = () => {
    const price = Math.round(DEFENSE_ITEMS[0].basePrice * priceModifier);
    store.buyProtectiveAmulet(player.id, price);
    toast.success('Protective Amulet acquired! It will block the next hex cast on you.');
  };

  const handleDispel = () => {
    const price = Math.round(DEFENSE_ITEMS[1].basePrice * priceModifier);
    const result = store.dispelLocationHex(player.id, price);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const locationHexes = availableHexes.filter(h => h.category === 'location');
  const personalCurses = availableHexes.filter(h => h.category === 'personal');
  const sabotageHexes = availableHexes.filter(h => h.category === 'sabotage');

  const accentColor = variant === 'enchanter' ? '#6b21a8' : '#991b1b';
  const bgColor = variant === 'enchanter' ? 'bg-purple-50' : 'bg-red-50';

  return (
    <div className="space-y-3">
      {/* Inventory: Owned Scrolls */}
      {ownedScrolls.length > 0 && (
        <div className={`${bgColor} border border-[#8b7355] rounded p-2`}>
          <h4 className="font-display text-xs font-bold mb-1" style={{ color: accentColor }}>
            <Skull className="w-3 h-3 inline mr-1" />Your Scrolls
          </h4>
          <div className="space-y-1">
            {ownedScrolls.map(scroll => {
              const hex = getHexById(scroll.hexId);
              if (!hex) return null;
              return (
                <div key={scroll.hexId} className="flex justify-between items-center text-xs">
                  <span className="text-[#3d2a14]">{hex.name} ×{scroll.quantity}</span>
                  <div className="flex gap-1">
                    {hex.category === 'location' && (
                      <button
                        onClick={() => handleCastLocationHex(hex.id)}
                        disabled={player.timeRemaining < hex.castTime}
                        className="gold-button text-xs py-0.5 px-1.5 disabled:opacity-50"
                      >
                        <MapPin className="w-3 h-3 inline mr-0.5" />Cast ({hex.castTime}h)
                      </button>
                    )}
                    {(hex.category === 'personal' || hex.category === 'sabotage') && (
                      <select
                        className="text-xs border rounded px-1 py-0.5 bg-white"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleCastCurse(hex.id, e.target.value);
                        }}
                        disabled={player.timeRemaining < hex.castTime || rivals.length === 0}
                      >
                        <option value="">Cast on... ({hex.castTime}h)</option>
                        {rivals.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Location Hexes */}
      {locationHexes.length > 0 && (
        <div>
          <h4 className="font-display text-xs font-bold mb-1 flex items-center gap-1" style={{ color: accentColor }}>
            <MapPin className="w-3 h-3" /> Location Hexes
          </h4>
          <div className="space-y-1.5">
            {locationHexes.map(hex => {
              const price = getHexPrice(hex, priceModifier);
              return (
                <HexScrollItem key={hex.id} hex={hex} price={price} player={player} onBuy={() => handleBuyScroll(hex)} />
              );
            })}
          </div>
        </div>
      )}

      {/* Personal Curses */}
      {personalCurses.length > 0 && (
        <div>
          <h4 className="font-display text-xs font-bold mb-1 flex items-center gap-1" style={{ color: accentColor }}>
            <Target className="w-3 h-3" /> Personal Curses
          </h4>
          <div className="space-y-1.5">
            {personalCurses.map(hex => {
              const price = getHexPrice(hex, priceModifier);
              return (
                <HexScrollItem key={hex.id} hex={hex} price={price} player={player} onBuy={() => handleBuyScroll(hex)} />
              );
            })}
          </div>
        </div>
      )}

      {/* Sabotage */}
      {sabotageHexes.length > 0 && (
        <div>
          <h4 className="font-display text-xs font-bold mb-1 flex items-center gap-1" style={{ color: accentColor }}>
            <Flame className="w-3 h-3" /> Sabotage Scrolls
          </h4>
          <div className="space-y-1.5">
            {sabotageHexes.map(hex => {
              const price = getHexPrice(hex, priceModifier);
              return (
                <HexScrollItem key={hex.id} hex={hex} price={price} player={player} onBuy={() => handleBuyScroll(hex)} />
              );
            })}
          </div>
        </div>
      )}

      {/* Defense Items */}
      {showDefense && (
        <div>
          <h4 className="font-display text-xs font-bold mb-1 flex items-center gap-1" style={{ color: '#166534' }}>
            <Shield className="w-3 h-3" /> Protection
          </h4>
          <div className="space-y-1.5">
            {/* Protective Amulet */}
            <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="font-display text-xs font-bold text-[#3d2a14]">Protective Amulet</span>
                  <p className="text-xs text-[#6b5a42]">Blocks the next hex cast on you (consumed).</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#8b6914]">{Math.round(400 * priceModifier)}g</span>
                  <br />
                  <button
                    onClick={handleBuyAmulet}
                    disabled={player.gold < Math.round(400 * priceModifier) || player.hasProtectiveAmulet}
                    className="gold-button text-xs py-0.5 px-1.5 disabled:opacity-50 mt-0.5"
                  >
                    {player.hasProtectiveAmulet ? 'Active' : 'Buy'}
                  </button>
                </div>
              </div>
            </div>
            {/* Dispel Scroll */}
            <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="font-display text-xs font-bold text-[#3d2a14]">Dispel Scroll</span>
                  <p className="text-xs text-[#6b5a42]">Remove a location hex (must be at the hexed location).</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#8b6914]">{Math.round(250 * priceModifier)}g</span>
                  <br />
                  <button
                    onClick={handleDispel}
                    disabled={player.gold < Math.round(250 * priceModifier)}
                    className="gold-button text-xs py-0.5 px-1.5 disabled:opacity-50 mt-0.5"
                  >
                    Use (1h)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HexScrollItem({ hex, price, player, onBuy }: { hex: HexDefinition; price: number; player: Player; onBuy: () => void }) {
  const alreadyHas = player.hexScrolls.some(s => s.hexId === hex.id);
  return (
    <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-2">
          <span className="font-display text-xs font-bold text-[#3d2a14]">{hex.name}</span>
          {hex.duration > 0 && <span className="text-xs text-[#6b5a42] ml-1">({hex.duration}w)</span>}
          <p className="text-xs text-[#6b5a42]">{hex.description}</p>
        </div>
        <div className="text-right shrink-0">
          {price > 0 && <span className="text-xs font-bold text-[#8b6914]">{price}g</span>}
          {price === 0 && <span className="text-xs text-[#6b5a42]">Drop only</span>}
          {price > 0 && (
            <>
              <br />
              <button
                onClick={onBuy}
                disabled={player.gold < price}
                className="gold-button text-xs py-0.5 px-1.5 disabled:opacity-50 mt-0.5"
              >
                {alreadyHas ? 'Buy +1' : 'Buy'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
