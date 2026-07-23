// Hex Shop Panel — Shared by Enchanter ("Forbidden Scrolls") and Shadow Market ("Dirty Tricks")
// Shows available hex scrolls for purchase and casting

import { useGameStore } from '@/store/gameStore';
import { getGameOption } from '@/data/gameOptions';
import { getHexPrice, getHexById, DEFENSE_ITEMS } from '@/data/hexes';
import type { HexDefinition } from '@/data/hexes';
import type { Player } from '@/types/game.types';
import { Flame, Shield, Target, MapPin, Skull } from 'lucide-react';
import { toast } from 'sonner';
import { playSFX } from '@/audio/sfxManager';
import type { ReactNode } from 'react';

interface HexShopPanelProps {
  player: Player;
  players: Player[];
  priceModifier: number;
  availableHexes: HexDefinition[];
  showDefense?: boolean;
  variant: 'enchanter' | 'shadow-market';
}

export function HexShopPanel({ player, players, priceModifier, availableHexes, showDefense, variant }: HexShopPanelProps) {
  const purchaseHexScroll = useGameStore(state => state.purchaseHexScroll);
  const castLocationHex = useGameStore(state => state.castLocationHex);
  const castPersonalCurse = useGameStore(state => state.castPersonalCurse);
  const performHexDefense = useGameStore(state => state.useHexDefense);
  const locationHexes = useGameStore(state => state.locationHexes);

  if (!getGameOption('enableHexesCurses')) return null;

  const rivals = players.filter(candidate => candidate.id !== player.id && !candidate.isGameOver);
  const ownedScrolls = player.hexScrolls;
  const hostileLocationHexes = locationHexes.filter(hex =>
    hex.casterId !== player.id && hex.weeksRemaining > 0);

  const handleBuyScroll = (hex: HexDefinition) => {
    const result = purchaseHexScroll(player.id, variant, hex.id);
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  const handleCastLocationHex = (hexId: string) => {
    const result = castLocationHex(player.id, hexId);
    if (result.success) {
      playSFX('curse-cast');
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleCastCurse = (hexId: string, targetId: string) => {
    const result = castPersonalCurse(player.id, hexId, targetId);
    if (result.success) {
      playSFX('curse-cast');
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleBuyAmulet = () => {
    const result = performHexDefense(player.id, 'amulet');
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  const handleDispel = (targetLocation: Player['currentLocation']) => {
    const result = performHexDefense(player.id, 'dispel', targetLocation);
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  const locationHexesForSale = availableHexes.filter(hex => hex.category === 'location');
  const personalCurses = availableHexes.filter(hex => hex.category === 'personal');
  const sabotageHexes = availableHexes.filter(hex => hex.category === 'sabotage');

  const accentColor = variant === 'enchanter' ? '#6b21a8' : '#c084fc';
  const bgColor = variant === 'enchanter' ? 'bg-purple-50' : 'bg-red-50';
  const amuletPrice = Math.round((DEFENSE_ITEMS.find(item => item.id === 'protective-amulet')?.basePrice ?? 400) * priceModifier);
  const dispelPrice = Math.round((DEFENSE_ITEMS.find(item => item.id === 'dispel-scroll')?.basePrice ?? 250) * priceModifier);

  return (
    <div className="space-y-3">
      {ownedScrolls.length > 0 && (
        <div className={`${bgColor} border border-[#8b7355] rounded p-2`}>
          <h4 className="font-display text-sm font-bold mb-2" style={{ color: variant === 'enchanter' ? '#4a1072' : '#7c3aed' }}>
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
                        onChange={(event) => {
                          if (event.target.value) handleCastCurse(hex.id, event.target.value);
                        }}
                        disabled={player.timeRemaining < hex.castTime || rivals.length === 0}
                      >
                        <option value="">Cast on... ({hex.castTime}h)</option>
                        {rivals.map(rival => (
                          <option key={rival.id} value={rival.id}>{rival.name}</option>
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

      <HexSaleSection
        title="Location Hexes"
        icon={<MapPin className="w-3 h-3" />}
        hexes={locationHexesForSale}
        accentColor={accentColor}
        priceModifier={priceModifier}
        player={player}
        onBuy={handleBuyScroll}
      />
      <HexSaleSection
        title="Personal Curses"
        icon={<Target className="w-3 h-3" />}
        hexes={personalCurses}
        accentColor={accentColor}
        priceModifier={priceModifier}
        player={player}
        onBuy={handleBuyScroll}
      />
      <HexSaleSection
        title="Sabotage Scrolls"
        icon={<Flame className="w-3 h-3" />}
        hexes={sabotageHexes}
        accentColor={accentColor}
        priceModifier={priceModifier}
        player={player}
        onBuy={handleBuyScroll}
      />

      {showDefense && (
        <div>
          <h4 className="font-display text-xs font-bold mb-1 flex items-center gap-1" style={{ color: '#166534' }}>
            <Shield className="w-3 h-3" /> Protection
          </h4>
          <div className="space-y-1.5">
            <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="font-display text-xs font-bold text-[#3d2a14]">Protective Amulet</span>
                  <p className="text-xs text-[#6b5a42]">Blocks the next hex cast on you (consumed).</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#8b6914]">{amuletPrice}g</span>
                  <br />
                  <button
                    onClick={handleBuyAmulet}
                    disabled={player.gold < amuletPrice || player.hasProtectiveAmulet}
                    className="gold-button text-xs py-0.5 px-1.5 disabled:opacity-50 mt-0.5"
                  >
                    {player.hasProtectiveAmulet ? 'Active' : 'Buy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#e0d4b8] border border-[#8b7355] rounded p-2">
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1">
                  <span className="font-display text-xs font-bold text-[#3d2a14]">Dispel Scroll</span>
                  <p className="text-xs text-[#6b5a42]">Remove one hostile location hex from afar through the Enchanter.</p>
                </div>
                <span className="text-xs font-bold text-[#8b6914]">{dispelPrice}g · 1h</span>
              </div>
              {hostileLocationHexes.length === 0 ? (
                <p className="text-xs text-[#6b5a42] italic">No hostile location hexes are active.</p>
              ) : (
                <div className="space-y-1">
                  {hostileLocationHexes.map(activeHex => {
                    const definition = getHexById(activeHex.hexId);
                    return (
                      <button
                        key={`${activeHex.casterId}-${activeHex.hexId}-${activeHex.targetLocation}`}
                        onClick={() => handleDispel(activeHex.targetLocation)}
                        disabled={player.gold < dispelPrice || player.timeRemaining < 1}
                        className="w-full gold-button text-xs py-1 px-2 disabled:opacity-50 flex justify-between"
                      >
                        <span>{definition?.name ?? activeHex.hexId}</span>
                        <span>{activeHex.targetLocation}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HexSaleSection({
  title,
  icon,
  hexes,
  accentColor,
  priceModifier,
  player,
  onBuy,
}: {
  title: string;
  icon: ReactNode;
  hexes: HexDefinition[];
  accentColor: string;
  priceModifier: number;
  player: Player;
  onBuy: (hex: HexDefinition) => void;
}) {
  if (hexes.length === 0) return null;
  return (
    <div>
      <h4 className="font-display text-xs font-bold mb-1 flex items-center gap-1" style={{ color: accentColor }}>
        {icon} {title}
      </h4>
      <div className="space-y-1.5">
        {hexes.map(hex => (
          <HexScrollItem
            key={hex.id}
            hex={hex}
            price={getHexPrice(hex, priceModifier)}
            player={player}
            onBuy={() => onBuy(hex)}
          />
        ))}
      </div>
    </div>
  );
}

function HexScrollItem({ hex, price, player, onBuy }: { hex: HexDefinition; price: number; player: Player; onBuy: () => void }) {
  const alreadyHas = player.hexScrolls.some(scroll => scroll.hexId === hex.id);
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
