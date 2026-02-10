// InfoTabs - Medieval-styled tabbed info panel inspired by Jones in the Fast Lane
// Provides Inventory, Goals, and Stats tabs for comprehensive player info

import { useState } from 'react';
import { Package, Target, BarChart3, Sword, Shield, Shirt } from 'lucide-react';
import type { Player, GoalSettings } from '@/types/game.types';
import { GoalProgress } from './GoalProgress';
import { ARMORY_ITEMS, GENERAL_STORE_ITEMS, getAppliance } from '@/data/items';
import { GUILD_RANK_NAMES, GUILD_RANK_INDEX } from '@/types/game.types';
import { HOUSING_DATA } from '@/data/housing';
import { getGameOption } from '@/data/gameOptions';
import { getJob } from '@/data/jobs';

type TabId = 'inventory' | 'goals' | 'stats';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
  { id: 'goals', label: 'Goals', icon: <Target className="w-4 h-4" /> },
  { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
];

interface InfoTabsProps {
  player: Player;
  goals: GoalSettings;
}

export function InfoTabs({ player, goals }: InfoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('inventory');

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation - Medieval Shield Style */}
      <div className="flex justify-center gap-1 p-2 bg-gradient-to-b from-wood to-wood-light border-b-2 border-wood-light">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto bg-parchment/95 p-3">
        {activeTab === 'inventory' && <InventoryTab player={player} />}
        {activeTab === 'goals' && <GoalsTab player={player} goals={goals} />}
        {activeTab === 'stats' && <StatsTab player={player} />}
      </div>
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
        w-16 h-14 rounded-t-lg transition-all duration-200
        ${isActive 
          ? 'bg-parchment text-wood border-2 border-b-0 border-accent -mb-[2px] z-10' 
          : 'bg-wood-light/50 text-parchment/80 hover:bg-wood-light hover:text-parchment border-2 border-transparent'
        }
      `}
      title={tab.label}
    >
      <div className={`
        p-1.5 rounded
        ${isActive ? 'text-accent' : 'text-parchment/70'}
      `}>
        {tab.icon}
      </div>
      <span className="text-[9px] font-display font-semibold uppercase tracking-wide">
        {tab.label}
      </span>
    </button>
  );
}

// ============================================
// INVENTORY TAB
// ============================================
interface InventoryTabProps {
  player: Player;
}

function InventoryTab({ player }: InventoryTabProps) {
  // Get equipped items
  const equippedWeapon = player.equippedWeapon 
    ? ARMORY_ITEMS.find(i => i.id === player.equippedWeapon)
    : null;
  const equippedArmor = player.equippedArmor 
    ? ARMORY_ITEMS.find(i => i.id === player.equippedArmor)
    : null;
  const equippedShield = player.equippedShield 
    ? ARMORY_ITEMS.find(i => i.id === player.equippedShield)
    : null;

  // Calculate total defense and attack
  const totalAttack = (equippedWeapon?.equipStats?.attack || 0);
  const totalDefense = (equippedArmor?.equipStats?.defense || 0) + 
                       (equippedShield?.equipStats?.defense || 0);
  const blockChance = Math.round((equippedShield?.equipStats?.blockChance || 0) * 100);

  // Get durables
  const durableItems = Object.entries(player.durables).filter(([, qty]) => qty > 0);
  
  // Get appliances
  const applianceItems = Object.entries(player.appliances);

  return (
    <div className="space-y-4">
      {/* Equipment Section with Character Silhouette */}
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-3 flex items-center gap-2">
          <Sword className="w-4 h-4" />
          Equipment
        </h3>
        
        {/* Character Silhouette Grid */}
        <div className="relative flex justify-center mb-4">
          <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
            {/* Top Row - Armor */}
            <div className="col-start-2">
              <EquipmentSlot
                label="Armor"
                item={equippedArmor?.name}
                icon={<Shirt className="w-4 h-4" />}
                isEmpty={!equippedArmor}
              />
            </div>
            
            {/* Middle Row - Weapon & Shield */}
            <div>
              <EquipmentSlot
                label="Weapon"
                item={equippedWeapon?.name}
                icon={<Sword className="w-4 h-4" />}
                isEmpty={!equippedWeapon}
              />
            </div>
            <div className="flex items-center justify-center">
              {/* Silhouette Placeholder */}
              <div className="w-12 h-16 border-2 border-dashed border-wood-light/30 rounded flex items-center justify-center">
                <span className="text-wood-light/40 text-xs">♙</span>
              </div>
            </div>
            <div>
              <EquipmentSlot
                label="Shield"
                item={equippedShield?.name}
                icon={<Shield className="w-4 h-4" />}
                isEmpty={!equippedShield}
              />
            </div>
          </div>
        </div>

        {/* Combat Stats Summary */}
        <div className="bg-wood/90 rounded p-2 space-y-1">
          <div className="flex items-center justify-between text-parchment text-xs">
            <span className="flex items-center gap-1">
              <Sword className="w-3 h-3 text-health" /> Attack
            </span>
            <span className="font-bold text-gold">{totalAttack}</span>
          </div>
          <div className="flex items-center justify-between text-parchment text-xs">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-time" /> Defense
            </span>
            <span className="font-bold text-gold">{totalDefense}</span>
          </div>
          {blockChance > 0 && (
            <div className="flex items-center justify-between text-parchment text-xs">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-secondary" /> Block
              </span>
              <span className="font-bold text-gold">{blockChance}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Appliances Section */}
      {applianceItems.length > 0 && (
        <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
          <h3 className="font-display text-sm font-bold text-wood mb-2">Appliances</h3>
          <div className="grid grid-cols-2 gap-2">
            {applianceItems.map(([id, data]) => {
              const appliance = getAppliance(id);
              return (
                <div 
                  key={id}
                  className={`
                    p-2 rounded text-xs border
                    ${data.isBroken 
                      ? 'bg-destructive/10 border-destructive/30 text-destructive' 
                      : 'bg-parchment border-wood-light/30 text-wood'}
                  `}
                >
                  <div className="font-semibold truncate">{appliance?.name || id}</div>
                  {data.isBroken && <span className="text-[10px]">⚠ Broken</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Durables Section */}
      {durableItems.length > 0 && (
        <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
          <h3 className="font-display text-sm font-bold text-wood mb-2">Stored Items</h3>
          <div className="grid grid-cols-2 gap-2">
            {durableItems.map(([itemId, qty]) => {
              const item = [...GENERAL_STORE_ITEMS, ...ARMORY_ITEMS].find(i => i.id === itemId);
              return (
                <div 
                  key={itemId}
                  className="p-2 rounded text-xs bg-parchment border border-wood-light/30"
                >
                  <div className="font-semibold text-wood truncate">{item?.name || itemId}</div>
                  <div className="text-muted-foreground">×{qty}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fresh Food Storage */}
      {player.freshFood > 0 && (
        <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
          <h3 className="font-display text-sm font-bold text-wood mb-2">Fresh Food Storage</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3 bg-wood/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary transition-all"
                style={{ width: `${(player.freshFood / (player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken ? 12 : 6)) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-wood">
              {player.freshFood}/{player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken ? 12 : 6}
            </span>
          </div>
        </div>
      )}

      {/* Tickets */}
      {player.tickets.length > 0 && (
        <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
          <h3 className="font-display text-sm font-bold text-wood mb-2">Weekend Tickets</h3>
          <div className="flex flex-wrap gap-1">
            {player.tickets.map((ticket, i) => (
              <span key={i} className="px-2 py-1 bg-gold/20 text-wood text-xs rounded">
                {ticket.replace('-', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {durableItems.length === 0 && applianceItems.length === 0 && !equippedWeapon && !equippedArmor && !equippedShield && (
        <div className="text-center text-muted-foreground text-sm py-4">
          No items in inventory
        </div>
      )}
    </div>
  );
}

interface EquipmentSlotProps {
  label: string;
  item: string | undefined;
  icon: React.ReactNode;
  isEmpty: boolean;
}

function EquipmentSlot({ label, item, icon, isEmpty }: EquipmentSlotProps) {
  return (
    <div className={`
      aspect-square rounded border-2 flex flex-col items-center justify-center p-1
      ${isEmpty 
        ? 'border-dashed border-wood-light/40 bg-parchment-dark/20' 
        : 'border-wood-light bg-gold/20'}
    `}>
      <div className={`${isEmpty ? 'text-wood-light/50' : 'text-wood'}`}>
        {icon}
      </div>
      <span className="text-[8px] text-center text-wood/70 font-semibold uppercase mt-0.5">
        {isEmpty ? label : (item?.split(' ')[0] || label)}
      </span>
    </div>
  );
}

// ============================================
// GOALS TAB
// ============================================
interface GoalsTabProps {
  player: Player;
  goals: GoalSettings;
}

function GoalsTab({ player, goals }: GoalsTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Victory Goals
        </h3>
        <GoalProgress player={player} goals={goals} />
      </div>

      {/* Dungeon Progress */}
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Dungeon Progress</h3>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-3 bg-wood/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(player.dungeonFloorsCleared.length / 6) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-wood">
            {player.dungeonFloorsCleared.length}/6
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(floor => (
            <div
              key={floor}
              className={`
                w-6 h-6 rounded flex items-center justify-center text-xs font-bold
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

      {/* Quests Completed */}
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <div className="flex justify-between items-center">
          <span className="text-sm text-wood">Quests Completed</span>
          <span className="font-display font-bold text-gold">{player.completedQuests}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-wood">Guild Pass</span>
          <span className={`text-xs font-bold ${player.hasGuildPass ? 'text-secondary' : 'text-destructive'}`}>
            {player.hasGuildPass ? '✓ Owned' : '✗ Not Owned'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STATS TAB
// ============================================
interface StatsTabProps {
  player: Player;
}

function StatsTab({ player }: StatsTabProps) {
  const housingName = player.housing !== 'homeless' ? HOUSING_DATA[player.housing]?.name : 'Homeless';
  const jobData = player.currentJob ? getJob(player.currentJob) : null;

  return (
    <div className="space-y-3">
      {/* Core Stats */}
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Character</h3>
        {getGameOption('enableAging') && (
          <StatRow label="Age" value={`${player.age ?? 18}`} />
        )}
        <StatRow label="Guild Rank" value={GUILD_RANK_NAMES[player.guildRank]} />
        <StatRow label="Rank Level" value={`${GUILD_RANK_INDEX[player.guildRank]}/7`} />
        <StatRow label="Housing" value={housingName} />
      </div>

      {/* Work Stats */}
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Employment</h3>
        <StatRow label="Current Job" value={jobData?.name || 'Unemployed'} />
        {player.currentJob && (
          <>
            <StatRow label="Wage" value={`${player.currentWage}g/hr`} highlight />
            <StatRow label="Shifts Worked" value={player.shiftsWorkedSinceHire.toString()} />
          </>
        )}
        <StatRow label="Dependability" value={`${player.dependability}%`} />
        <StatRow label="Experience" value={`${player.experience}/${player.maxExperience}`} />
      </div>

      {/* Financial Stats */}
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Finances</h3>
        <StatRow label="Gold on Hand" value={`${player.gold}g`} highlight />
        <StatRow label="Bank Savings" value={`${player.savings}g`} />
        <StatRow label="Investments" value={`${player.investments}g`} />
        {player.loanAmount > 0 && (
          <StatRow label="Loan Debt" value={`-${player.loanAmount}g`} warning />
        )}
        {player.permanentGoldBonus > 0 && (
          <StatRow label="Gold Bonus" value={`+${player.permanentGoldBonus}%`} />
        )}
      </div>

      {/* Education */}
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Education</h3>
        <StatRow label="Degrees Completed" value={player.completedDegrees.length.toString()} />
        {player.completedDegrees.map(degreeId => (
          <div key={degreeId} className="text-xs text-secondary pl-2">
            ✓ {degreeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        ))}
        {player.completedDegrees.length === 0 && (
          <div className="text-xs text-muted-foreground pl-2">No degrees yet</div>
        )}
      </div>

      {/* Misc Stats */}
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Other</h3>
        <StatRow label="Relaxation" value={`${player.relaxation}/50`} />
        <StatRow label="Max Health" value={player.maxHealth.toString()} />
        {player.isSick && <StatRow label="Status" value="Sick" warning />}
      </div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  warning?: boolean;
}

function StatRow({ label, value, highlight = false, warning = false }: StatRowProps) {
  return (
    <div className="flex justify-between items-baseline py-0.5">
      <span className="text-xs text-wood/70">{label}</span>
      <span className={`
        text-xs font-semibold
        ${warning ? 'text-destructive' : highlight ? 'text-gold' : 'text-wood'}
      `}>
        {value}
      </span>
    </div>
  );
}
