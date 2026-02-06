// SideInfoTabs - Left sidebar tabbed info panel inspired by Jones in the Fast Lane
// Combines player resource bars with Inventory, Goals, and Stats tabs

import { useState } from 'react';
import { Package, Target, BarChart3, Clock, Coins, Heart, Smile, Utensils, Home, Sparkles, Skull, Shield } from 'lucide-react';
import type { Player, GoalSettings } from '@/types/game.types';
import { GoalProgress } from './GoalProgress';
import { InventoryGrid } from './InventoryGrid';
import { GUILD_RANK_NAMES, GUILD_RANK_INDEX, HOURS_PER_TURN } from '@/types/game.types';
import { HOUSING_DATA } from '@/data/housing';
import { getJob } from '@/data/jobs';

type TabId = 'inventory' | 'goals' | 'stats';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'inventory', label: 'INVENTORY', icon: <Package className="w-4 h-4" /> },
  { id: 'goals', label: 'GOALS', icon: <Target className="w-4 h-4" /> },
  { id: 'stats', label: 'STATS', icon: <BarChart3 className="w-4 h-4" /> },
];

interface SideInfoTabsProps {
  player: Player;
  goals: GoalSettings;
  isCurrentPlayer: boolean;
}

export function SideInfoTabs({ player, goals, isCurrentPlayer }: SideInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('stats');
  const housingName = player.housing !== 'homeless' ? HOUSING_DATA[player.housing]?.name : 'Homeless';

  // Warning states
  const healthWarning = player.health <= 20;
  const timeWarning = player.timeRemaining <= 10;
  const foodWarning = player.foodLevel <= 25;
  const clothingWarning = player.clothingCondition <= 25;

  return (
    <div className={`h-full flex flex-col bg-parchment/95 rounded-lg border-2 overflow-hidden ${isCurrentPlayer ? 'border-accent' : 'border-wood-dark/50'}`}>
      {/* Player Header */}
      <div className="flex items-center gap-2 p-2 bg-gradient-to-b from-wood to-wood-light border-b-2 border-wood-light">
        <div
          className="w-8 h-8 rounded-full border-2 border-parchment shadow-md flex-shrink-0"
          style={{ backgroundColor: player.color }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xs font-bold text-parchment truncate">
            {player.name}
          </h3>
          <p className="text-[10px] text-parchment/70 truncate">
            {GUILD_RANK_NAMES[player.guildRank]}
          </p>
        </div>
      </div>

      {/* Quick Stats - Always Visible (like image-16) */}
      <div className="flex-shrink-0 p-2 space-y-1 border-b border-wood-light/30 bg-parchment-dark/20">
        <QuickStatRow
          icon={<Clock className="w-3 h-3" />}
          label="Hours"
          value={`${player.timeRemaining}/${HOURS_PER_TURN}`}
          color="text-time"
          warning={timeWarning}
          barValue={player.timeRemaining}
          barMax={HOURS_PER_TURN}
          barColor="bg-time"
        />
        <QuickStatRow
          icon={<Coins className="w-3 h-3" />}
          label="Gold"
          value={player.gold.toString()}
          color="text-gold"
        />
        <QuickStatRow
          icon={<Heart className="w-3 h-3" />}
          label="Health"
          value={`${player.health}/${player.maxHealth}`}
          color="text-health"
          warning={healthWarning}
          barValue={player.health}
          barMax={player.maxHealth}
          barColor="bg-health"
        />
        <QuickStatRow
          icon={<Smile className="w-3 h-3" />}
          label="Happiness"
          value={`${player.happiness}%`}
          color="text-happiness"
          barValue={player.happiness}
          barMax={100}
          barColor="bg-happiness"
        />
        <QuickStatRow
          icon={<Utensils className="w-3 h-3" />}
          label="Food"
          value={`${player.foodLevel}%`}
          color="text-secondary"
          warning={foodWarning}
          barValue={player.foodLevel}
          barMax={100}
          barColor="bg-secondary"
        />
        <QuickStatRow
          icon={<Shirt className="w-3 h-3" />}
          label="Clothing"
          value={`${player.clothingCondition}%`}
          color="text-primary"
          warning={clothingWarning}
          barValue={player.clothingCondition}
          barMax={100}
          barColor="bg-primary"
        />
        <QuickStatRow
          icon={<Shield className="w-3 h-3" />}
          label="Depend."
          value={`${player.dependability}%`}
          color="text-accent-foreground"
          warning={player.dependability < 30}
        />
        <QuickStatRow
          icon={<Home className="w-3 h-3" />}
          label="Home"
          value={housingName}
          color="text-muted-foreground"
        />
        <QuickStatRow
          icon={<Sparkles className="w-3 h-3" />}
          label="Exp"
          value={`${player.experience}/${player.maxExperience}`}
          color="text-purple-400"
        />
      </div>

      {/* Status Indicators */}
      {(player.isSick || player.health <= 0) && (
        <div className="flex-shrink-0 px-2 py-1 border-b border-wood-light/30 bg-destructive/10">
          {player.isSick && (
            <div className="flex items-center gap-1 text-[10px] text-destructive">
              <Skull className="w-3 h-3" />
              <span>Sick</span>
            </div>
          )}
          {player.health <= 0 && (
            <div className="flex items-center gap-1 text-[10px] text-destructive font-bold">
              <Skull className="w-3 h-3" />
              <span>DEAD</span>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex-shrink-0 flex justify-center gap-0.5 p-1 bg-gradient-to-b from-wood to-wood-light">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {activeTab === 'inventory' && <InventoryTab player={player} />}
        {activeTab === 'goals' && <GoalsTab player={player} goals={goals} />}
        {activeTab === 'stats' && <StatsTab player={player} />}
      </div>
    </div>
  );
}

// Quick stat row for top section
interface QuickStatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  warning?: boolean;
  barValue?: number;
  barMax?: number;
  barColor?: string;
}

function QuickStatRow({
  icon,
  label,
  value,
  color,
  warning = false,
  barValue,
  barMax,
  barColor = 'bg-primary'
}: QuickStatRowProps) {
  const showBar = barValue !== undefined && barMax !== undefined;
  
  return (
    <div className={`${warning ? 'bg-destructive/20 rounded px-0.5' : ''}`}>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1">
          <span className={color}>{icon}</span>
          <span className="text-wood/70">{label}</span>
        </div>
        <span className={`font-bold ${color} ${warning ? 'animate-pulse' : ''}`}>{value}</span>
      </div>
      {showBar && (
        <div className="h-0.5 bg-wood/20 rounded-full mt-0.5 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${Math.max(0, Math.min(100, (barValue / barMax) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        w-12 h-10 rounded-t transition-all duration-200
        ${isActive 
          ? 'bg-parchment text-wood border border-b-0 border-accent -mb-[1px] z-10' 
          : 'bg-wood-light/50 text-parchment/80 hover:bg-wood-light hover:text-parchment border border-transparent'
        }
      `}
      title={tab.label}
    >
      <div className={`${isActive ? 'text-accent' : 'text-parchment/70'}`}>
        {tab.icon}
      </div>
      <span className="text-[6px] font-display font-semibold uppercase tracking-wide leading-tight">
        {tab.label}
      </span>
    </button>
  );
}

// ============================================
// INVENTORY TAB
// ============================================
function InventoryTab({ player }: { player: Player }) {
  const equippedWeapon = player.equippedWeapon 
    ? ARMORY_ITEMS.find(i => i.id === player.equippedWeapon)
    : null;
  const equippedArmor = player.equippedArmor 
    ? ARMORY_ITEMS.find(i => i.id === player.equippedArmor)
    : null;
  const equippedShield = player.equippedShield 
    ? ARMORY_ITEMS.find(i => i.id === player.equippedShield)
    : null;

  const totalAttack = (equippedWeapon?.equipStats?.attack || 0);
  const totalDefense = (equippedArmor?.equipStats?.defense || 0) + 
                       (equippedShield?.equipStats?.defense || 0);
  const blockChance = Math.round((equippedShield?.equipStats?.blockChance || 0) * 100);

  const durableItems = Object.entries(player.durables).filter(([, qty]) => qty > 0);
  const applianceItems = Object.entries(player.appliances);

  return (
    <div className="space-y-2">
      {/* Equipment Section */}
      <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
        <h3 className="font-display text-[10px] font-bold text-wood mb-1.5 flex items-center gap-1">
          <Sword className="w-3 h-3" />
          Equipment
        </h3>
        
        {/* Equipment Slots */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          <EquipmentSlot
            label="Weapon"
            item={equippedWeapon?.name}
            icon={<Sword className="w-3 h-3" />}
            isEmpty={!equippedWeapon}
          />
          <EquipmentSlot
            label="Armor"
            item={equippedArmor?.name}
            icon={<Shirt className="w-3 h-3" />}
            isEmpty={!equippedArmor}
          />
          <EquipmentSlot
            label="Shield"
            item={equippedShield?.name}
            icon={<Shield className="w-3 h-3" />}
            isEmpty={!equippedShield}
          />
        </div>

        {/* Combat Stats */}
        <div className="bg-wood/80 rounded p-1.5 space-y-0.5 text-[9px]">
          <div className="flex items-center justify-between text-parchment">
            <span className="flex items-center gap-1">
              <Sword className="w-2.5 h-2.5 text-health" /> ATK
            </span>
            <span className="font-bold text-gold">{totalAttack}</span>
          </div>
          <div className="flex items-center justify-between text-parchment">
            <span className="flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-time" /> DEF
            </span>
            <span className="font-bold text-gold">{totalDefense}</span>
          </div>
          {blockChance > 0 && (
            <div className="flex items-center justify-between text-parchment">
              <span>Block</span>
              <span className="font-bold text-gold">{blockChance}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Appliances */}
      {applianceItems.length > 0 && (
        <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
          <h3 className="font-display text-[10px] font-bold text-wood mb-1">Appliances</h3>
          <div className="space-y-0.5">
            {applianceItems.map(([id, data]) => {
              const appliance = getAppliance(id);
              return (
                <div 
                  key={id}
                  className={`text-[9px] flex justify-between ${data.isBroken ? 'text-destructive' : 'text-wood'}`}
                >
                  <span className="truncate">{appliance?.name || id}</span>
                  {data.isBroken && <span>⚠</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Durables */}
      {durableItems.length > 0 && (
        <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
          <h3 className="font-display text-[10px] font-bold text-wood mb-1">Stored Items</h3>
          <div className="space-y-0.5">
            {durableItems.map(([itemId, qty]) => {
              const item = [...GENERAL_STORE_ITEMS, ...ARMORY_ITEMS].find(i => i.id === itemId);
              return (
                <div key={itemId} className="text-[9px] flex justify-between text-wood">
                  <span className="truncate">{item?.name || itemId}</span>
                  <span>×{qty}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fresh Food */}
      {player.freshFood > 0 && (
        <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
          <h3 className="font-display text-[10px] font-bold text-wood mb-1">Fresh Food</h3>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-2 bg-wood/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary transition-all"
                style={{ width: `${(player.freshFood / (player.appliances['frost-chest'] ? 12 : 6)) * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-wood">
              {player.freshFood}/{player.appliances['frost-chest'] ? 12 : 6}
            </span>
          </div>
        </div>
      )}

      {/* Tickets */}
      {player.tickets.length > 0 && (
        <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
          <h3 className="font-display text-[10px] font-bold text-wood mb-1">Tickets</h3>
          <div className="flex flex-wrap gap-0.5">
            {player.tickets.map((ticket, i) => (
              <span key={i} className="px-1 py-0.5 bg-gold/20 text-wood text-[8px] rounded">
                {ticket.replace('-', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {durableItems.length === 0 && applianceItems.length === 0 && !equippedWeapon && !equippedArmor && !equippedShield && (
        <div className="text-center text-muted-foreground text-[10px] py-2">
          No items
        </div>
      )}
    </div>
  );
}

function EquipmentSlot({ label, item, icon, isEmpty }: { label: string; item: string | undefined; icon: React.ReactNode; isEmpty: boolean }) {
  return (
    <div className={`
      aspect-square rounded border flex flex-col items-center justify-center p-0.5
      ${isEmpty 
        ? 'border-dashed border-wood-light/40 bg-parchment-dark/20' 
        : 'border-wood-light bg-gold/20'}
    `}>
      <div className={`${isEmpty ? 'text-wood-light/50' : 'text-wood'}`}>
        {icon}
      </div>
      <span className="text-[6px] text-center text-wood/70 font-semibold uppercase leading-tight">
        {isEmpty ? label : (item?.split(' ')[0] || label)}
      </span>
    </div>
  );
}

// ============================================
// GOALS TAB
// ============================================
function GoalsTab({ player, goals }: { player: Player; goals: GoalSettings }) {
  return (
    <div className="space-y-2">
      <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
        <h3 className="font-display text-[10px] font-bold text-wood mb-1.5 flex items-center gap-1">
          <Target className="w-3 h-3" />
          Victory Goals
        </h3>
        <GoalProgress player={player} goals={goals} compact />
      </div>

      {/* Dungeon Progress */}
      <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
        <h3 className="font-display text-[10px] font-bold text-wood mb-1">Dungeon</h3>
        <div className="flex items-center gap-1 mb-1">
          <div className="flex-1 h-1.5 bg-wood/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all"
              style={{ width: `${(player.dungeonFloorsCleared.length / 5) * 100}%` }}
            />
          </div>
          <span className="text-[9px] font-bold text-wood">
            {player.dungeonFloorsCleared.length}/5
          </span>
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(floor => (
            <div
              key={floor}
              className={`
                w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold
                ${player.dungeonFloorsCleared.includes(floor)
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-wood/20 text-wood/50'}
              `}
            >
              {floor}
            </div>
          ))}
        </div>
      </div>

      {/* Quest Stats */}
      <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-wood">Quests Done</span>
          <span className="font-bold text-gold">{player.completedQuests}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] mt-0.5">
          <span className="text-wood">Guild Pass</span>
          <span className={`font-bold ${player.hasGuildPass ? 'text-secondary' : 'text-destructive'}`}>
            {player.hasGuildPass ? '✓' : '✗'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STATS TAB
// ============================================
function StatsTab({ player }: { player: Player }) {
  const housingName = player.housing !== 'homeless' ? HOUSING_DATA[player.housing]?.name : 'Homeless';
  const jobData = player.currentJob ? getJob(player.currentJob) : null;

  return (
    <div className="space-y-2">
      {/* Character */}
      <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
        <h3 className="font-display text-[10px] font-bold text-wood mb-1">Character</h3>
        <StatRow label="Guild Rank" value={GUILD_RANK_NAMES[player.guildRank]} />
        <StatRow label="Rank Level" value={`${GUILD_RANK_INDEX[player.guildRank]}/7`} />
        <StatRow label="Housing" value={housingName} />
      </div>

      {/* Employment */}
      <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
        <h3 className="font-display text-[10px] font-bold text-wood mb-1">Employment</h3>
        <StatRow label="Current Job" value={jobData?.name || 'Unemployed'} />
        {player.currentJob && (
          <>
            <StatRow label="Wage" value={`${player.currentWage}g/hr`} highlight />
            <StatRow label="Shifts" value={player.shiftsWorkedSinceHire.toString()} />
          </>
        )}
        <StatRow label="Dependability" value={`${player.dependability}%`} />
        <StatRow label="Experience" value={`${player.experience}/${player.maxExperience}`} />
      </div>

      {/* Finances */}
      <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
        <h3 className="font-display text-[10px] font-bold text-wood mb-1">Finances</h3>
        <StatRow label="Gold on Hand" value={`${player.gold}g`} highlight />
        <StatRow label="Bank Savings" value={`${player.savings}g`} />
        <StatRow label="Investments" value={`${player.investments}g`} />
        {player.loanAmount > 0 && (
          <StatRow label="Loan Debt" value={`-${player.loanAmount}g`} warning />
        )}
      </div>

      {/* Education */}
      <div className="bg-parchment-dark/30 rounded p-2 border border-wood-light/30">
        <h3 className="font-display text-[10px] font-bold text-wood mb-1">Education</h3>
        <StatRow label="Degrees" value={player.completedDegrees.length.toString()} />
        {player.completedDegrees.slice(0, 3).map(degreeId => (
          <div key={degreeId} className="text-[8px] text-secondary pl-1 truncate">
            ✓ {degreeId.replace(/-/g, ' ')}
          </div>
        ))}
        {player.completedDegrees.length > 3 && (
          <div className="text-[8px] text-muted-foreground pl-1">
            +{player.completedDegrees.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight = false, warning = false }: { label: string; value: string; highlight?: boolean; warning?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-px">
      <span className="text-[9px] text-wood/70">{label}</span>
      <span className={`
        text-[9px] font-semibold
        ${warning ? 'text-destructive' : highlight ? 'text-gold' : 'text-wood'}
      `}>
        {value}
      </span>
    </div>
  );
}
