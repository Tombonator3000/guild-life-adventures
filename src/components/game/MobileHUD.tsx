import { Coins, Clock, Heart, Smile, Utensils, BarChart3, Users, Menu } from 'lucide-react';
import type { Player } from '@/types/game.types';

interface MobileHUDProps {
  player: Player;
  week: number;
  priceModifier: number;
  economyTrend: number;
  onEndTurn: () => void;
  onOpenLeftDrawer: () => void;
  onOpenRightDrawer: () => void;
  onOpenMenu: () => void;
  disabled?: boolean;
}

export function MobileHUD({
  player,
  week,
  priceModifier,
  economyTrend,
  onEndTurn,
  onOpenLeftDrawer,
  onOpenRightDrawer,
  onOpenMenu,
  disabled,
}: MobileHUDProps) {
  const trendIcon = economyTrend === 1 ? '\u2191' : economyTrend === -1 ? '\u2193' : '\u2194';

  return (
    <div className="flex-shrink-0 flex items-center gap-1.5 px-1.5 py-1 bg-gradient-to-b from-wood-dark to-wood border-b-2 border-wood-light z-30">
      {/* Left drawer button */}
      <button
        onClick={onOpenLeftDrawer}
        className="p-1.5 rounded text-parchment/80 hover:text-parchment active:bg-wood-light/30"
        title="Stats & Inventory"
      >
        <BarChart3 className="w-4 h-4" />
      </button>

      {/* Player dot + name */}
      <div className="flex items-center gap-1 min-w-0">
        <div
          className="w-4 h-4 rounded-full border border-wood-light flex-shrink-0"
          style={{ backgroundColor: player.color }}
        />
        <span className="font-display text-[10px] text-parchment truncate max-w-[50px]">
          {player.name}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-wood-light/50 flex-shrink-0" />

      {/* Resources strip */}
      <div className="flex items-center gap-1.5 flex-1 justify-center overflow-hidden">
        <ResourceChip icon={<Coins className="w-3 h-3" />} value={player.gold} color="text-gold" />
        <ResourceChip icon={<Clock className="w-3 h-3" />} value={player.timeRemaining} color="text-time" warning={player.timeRemaining < 10} />
        <ResourceChip icon={<Heart className="w-3 h-3" />} value={player.health} color="text-health" warning={player.health <= 20} />
        <ResourceChip icon={<Smile className="w-3 h-3" />} value={`${player.happiness}%`} color="text-happiness" />
        <ResourceChip icon={<Utensils className="w-3 h-3" />} value={`${player.foodLevel}%`} color="text-secondary" warning={player.foodLevel < 25} />
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-wood-light/50 flex-shrink-0" />

      {/* Week + market */}
      <div className="flex-shrink-0 text-center leading-none">
        <div className="text-[9px] text-parchment/60 font-display">W{week}</div>
        <div className="text-[8px] text-parchment/50">
          {(priceModifier * 100).toFixed(0)}%{trendIcon}
        </div>
      </div>

      {/* End Turn */}
      <button
        onClick={onEndTurn}
        disabled={disabled}
        className="gold-button !text-[10px] !py-1 !px-2.5 !font-display flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        End Turn
      </button>

      {/* Right drawer */}
      <button
        onClick={onOpenRightDrawer}
        className="p-1.5 rounded text-parchment/80 hover:text-parchment active:bg-wood-light/30"
        title="Players & Options"
      >
        <Users className="w-4 h-4" />
      </button>

      {/* Game Menu */}
      <button
        onClick={onOpenMenu}
        className="p-1.5 rounded text-parchment/80 hover:text-parchment active:bg-wood-light/30"
        title="Game Menu"
      >
        <Menu className="w-4 h-4" />
      </button>
    </div>
  );
}

function ResourceChip({
  icon,
  value,
  color,
  warning,
}: {
  icon: React.ReactNode;
  value: string | number;
  color: string;
  warning?: boolean;
}) {
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-bold ${color} ${warning ? 'animate-pulse' : ''}`}>
      {icon}
      <span className="font-display">{value}</span>
    </span>
  );
}
