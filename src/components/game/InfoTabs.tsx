import { useState } from 'react';
import { Package, Target, BarChart3, Sword, Shield, Shirt } from 'lucide-react';
import type { Player, GoalSettings } from '@/types/game.types';
import { GUILD_RANK_NAMES, GUILD_RANK_INDEX } from '@/types/game.types';
import { PLAYER_RULE_VALUES } from '@/data/playerFacingRules';
import { GoalProgress } from './GoalProgress';
import { ARMORY_ITEMS, GENERAL_STORE_ITEMS, getAppliance, calculateCombatStats } from '@/data/items';
import { HOUSING_DATA } from '@/data/housing';
import { getGameOption } from '@/data/gameOptions';
import { getJob } from '@/data/jobs';
import { getHexById } from '@/data/hexes';

type TabId = 'inventory' | 'goals' | 'stats';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
  { id: 'goals', label: 'Goals', icon: <Target className="w-4 h-4" /> },
  { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
];

export function InfoTabs({ player, goals }: { player: Player; goals: GoalSettings }) {
  const [activeTab, setActiveTab] = useState<TabId>('inventory');

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center gap-1 p-2 bg-gradient-to-b from-wood to-wood-light border-b-2 border-wood-light">
        {TABS.map(tab => (
          <TabButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-parchment/95 p-3">
        {activeTab === 'inventory' && <InventoryTab player={player} />}
        {activeTab === 'goals' && <GoalsTab player={player} goals={goals} />}
        {activeTab === 'stats' && <StatsTab player={player} />}
      </div>
    </div>
  );
}

function TabButton({ tab, isActive, onClick }: {
  tab: { id: TabId; label: string; icon: React.ReactNode };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center w-16 h-14 rounded-t-lg transition-all duration-200 ${
        isActive
          ? 'bg-parchment text-wood border-2 border-b-0 border-accent -mb-[2px] z-10'
          : 'bg-wood-light/50 text-parchment/80 hover:bg-wood-light hover:text-parchment border-2 border-transparent'
      }`}
      title={tab.label}
    >
      <div className={`p-1.5 rounded ${isActive ? 'text-accent' : 'text-parchment/70'}`}>{tab.icon}</div>
      <span className="text-[9px] font-display font-semibold uppercase tracking-wide">{tab.label}</span>
    </button>
  );
}

function InventoryTab({ player }: { player: Player }) {
  const equippedWeapon = player.equippedWeapon ? ARMORY_ITEMS.find(item => item.id === player.equippedWeapon) : null;
  const equippedArmor = player.equippedArmor ? ARMORY_ITEMS.find(item => item.id === player.equippedArmor) : null;
  const equippedShield = player.equippedShield ? ARMORY_ITEMS.find(item => item.id === player.equippedShield) : null;
  const combatStats = calculateCombatStats(
    player.equippedWeapon,
    player.equippedArmor,
    player.equippedShield,
    player.temperedItems,
    player.equipmentDurability,
  );
  const durableItems = Object.entries(player.durables).filter(([, quantity]) => quantity > 0);
  const applianceItems = Object.entries(player.appliances);
  const hasWorkingFrostChest = !!player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken;
  const freshFoodCapacity = hasWorkingFrostChest
    ? PLAYER_RULE_VALUES.frostChestCapacity
    : PLAYER_RULE_VALUES.freshFoodCapacity;

  return (
    <div className="space-y-4">
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-3 flex items-center gap-2">
          <Sword className="w-4 h-4" /> Equipment
        </h3>
        <div className="relative flex justify-center mb-4">
          <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
            <div className="col-start-2">
              <EquipmentSlot label="Armor" item={equippedArmor?.name} icon={<Shirt className="w-4 h-4" />} isEmpty={!equippedArmor} />
            </div>
            <EquipmentSlot label="Weapon" item={equippedWeapon?.name} icon={<Sword className="w-4 h-4" />} isEmpty={!equippedWeapon} />
            <div className="flex items-center justify-center">
              <div className="w-12 h-16 border-2 border-dashed border-wood-light/30 rounded flex items-center justify-center">
                <span className="text-wood-light/40 text-xs">♙</span>
              </div>
            </div>
            <EquipmentSlot label="Shield" item={equippedShield?.name} icon={<Shield className="w-4 h-4" />} isEmpty={!equippedShield} />
          </div>
        </div>
        <div className="bg-wood/90 rounded p-2 space-y-1">
          <CombatStat icon={<Sword className="w-3 h-3 text-health" />} label="Attack" value={`${combatStats.attack}`} />
          <CombatStat icon={<Shield className="w-3 h-3 text-time" />} label="Defense" value={`${combatStats.defense}`} />
          {combatStats.blockChance > 0 && (
            <CombatStat icon={<Shield className="w-3 h-3 text-secondary" />} label="Block" value={`${Math.round(combatStats.blockChance * 100)}%`} />
          )}
        </div>
      </div>

      {applianceItems.length > 0 && (
        <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
          <h3 className="font-display text-sm font-bold text-wood mb-2">Appliances</h3>
          <div className="grid grid-cols-2 gap-2">
            {applianceItems.map(([id, data]) => {
              const appliance = getAppliance(id);
              return (
                <div key={id} className={`p-2 rounded text-xs border ${data.isBroken ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-parchment border-wood-light/30 text-wood'}`}>
                  <div className="font-semibold truncate">{appliance?.name || id}</div>
                  {data.isBroken && <span className="text-[10px]">Broken</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {durableItems.length > 0 && (
        <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
          <h3 className="font-display text-sm font-bold text-wood mb-2">Stored Items</h3>
          <div className="grid grid-cols-2 gap-2">
            {durableItems.map(([itemId, quantity]) => {
              const item = [...GENERAL_STORE_ITEMS, ...ARMORY_ITEMS].find(candidate => candidate.id === itemId);
              return (
                <div key={itemId} className="p-2 rounded text-xs bg-parchment border border-wood-light/30">
                  <div className="font-semibold text-wood truncate">{item?.name || itemId}</div>
                  <div className="text-muted-foreground">×{quantity}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {player.freshFood > 0 && (
        <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
          <h3 className="font-display text-sm font-bold text-wood mb-2">Fresh Food Storage</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3 bg-wood/20 rounded-full overflow-hidden">
              <div className="h-full bg-secondary transition-all" style={{ width: `${Math.min(100, (player.freshFood / freshFoodCapacity) * 100)}%` }} />
            </div>
            <span className="text-xs font-bold text-wood">{player.freshFood}/{freshFoodCapacity}</span>
          </div>
        </div>
      )}

      {player.tickets.length > 0 && (
        <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
          <h3 className="font-display text-sm font-bold text-wood mb-2">Weekend Tickets</h3>
          <div className="flex flex-wrap gap-1">
            {player.tickets.map((ticket, index) => (
              <span key={`${ticket}-${index}`} className="px-2 py-1 bg-gold/20 text-wood text-xs rounded">{ticket.replace('-', ' ')}</span>
            ))}
          </div>
        </div>
      )}

      {durableItems.length === 0 && applianceItems.length === 0 && !equippedWeapon && !equippedArmor && !equippedShield && (
        <div className="text-center text-muted-foreground text-sm py-4">No items in inventory</div>
      )}
    </div>
  );
}

function CombatStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-parchment text-xs">
      <span className="flex items-center gap-1">{icon} {label}</span>
      <span className="font-bold text-gold">{value}</span>
    </div>
  );
}

function EquipmentSlot({ label, item, icon, isEmpty }: {
  label: string;
  item: string | undefined;
  icon: React.ReactNode;
  isEmpty: boolean;
}) {
  return (
    <div className={`aspect-square rounded border-2 flex flex-col items-center justify-center p-1 ${isEmpty ? 'border-dashed border-wood-light/40 bg-parchment-dark/20' : 'border-wood-light bg-gold/20'}`}>
      <div className={isEmpty ? 'text-wood-light/50' : 'text-wood'}>{icon}</div>
      <span className="text-[8px] text-center text-wood/70 font-semibold uppercase mt-0.5">{isEmpty ? label : (item?.split(' ')[0] || label)}</span>
    </div>
  );
}

function GoalsTab({ player, goals }: { player: Player; goals: GoalSettings }) {
  return (
    <div className="space-y-4">
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" /> Victory Goals
        </h3>
        <GoalProgress player={player} goals={goals} />
      </div>

      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Dungeon Progress</h3>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-3 bg-wood/20 rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${(player.dungeonFloorsCleared.length / 6) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-wood">{player.dungeonFloorsCleared.length}/6</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(floor => (
            <div key={floor} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${player.dungeonFloorsCleared.includes(floor) ? 'bg-secondary text-secondary-foreground' : 'bg-wood/20 text-wood/50'}`}>{floor}</div>
          ))}
        </div>
      </div>

      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <StatRow label="Regular Quests Completed" value={`${player.completedQuests}`} />
        <StatRow label="Guild Pass" value={player.hasGuildPass ? 'Owned' : 'Not owned'} highlight={player.hasGuildPass} warning={!player.hasGuildPass} />
      </div>
    </div>
  );
}

function StatsTab({ player }: { player: Player }) {
  const housingName = player.housing !== 'homeless' ? HOUSING_DATA[player.housing]?.name : 'Homeless';
  const jobData = player.currentJob ? getJob(player.currentJob) : null;
  const brokerShares = Object.entries(player.stocks ?? {})
    .filter(([stockId, shares]) => !stockId.startsWith('__') && shares > 0)
    .reduce((total, [, shares]) => total + shares, 0);

  return (
    <div className="space-y-3">
      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Character</h3>
        {getGameOption('enableAging') && <StatRow label="Age" value={`${player.age ?? PLAYER_RULE_VALUES.startingAge}`} />}
        <StatRow label="Guild Rank" value={GUILD_RANK_NAMES[player.guildRank]} />
        <StatRow label="Rank Level" value={`${GUILD_RANK_INDEX[player.guildRank]}/7`} />
        <StatRow label="Housing" value={housingName} />
      </div>

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

      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Finances</h3>
        <StatRow label="Gold on Hand" value={`${player.gold}g`} highlight />
        <StatRow label="Bank Savings" value={`${player.savings}g`} />
        <StatRow label="Broker Shares" value={`${brokerShares}`} />
        {player.investments > 0 && <StatRow label="Legacy Funds Pending Migration" value={`${player.investments}g`} warning />}
        {player.loanAmount > 0 && <StatRow label="Loan Debt" value={`-${player.loanAmount}g`} warning />}
        {player.permanentGoldBonus > 0 && <StatRow label="Gold Bonus" value={`+${player.permanentGoldBonus}%`} />}
      </div>

      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Education</h3>
        <StatRow label="Degrees Completed" value={player.completedDegrees.length.toString()} />
        {player.completedDegrees.map(degreeId => (
          <div key={degreeId} className="text-xs text-secondary pl-2">✓ {degreeId.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())}</div>
        ))}
        {player.completedDegrees.length === 0 && <div className="text-xs text-muted-foreground pl-2">No degrees yet</div>}
      </div>

      <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
        <h3 className="font-display text-sm font-bold text-wood mb-2">Other</h3>
        <StatRow label="Relaxation" value={`${player.relaxation}/50`} />
        <StatRow label="Max Health" value={player.maxHealth.toString()} />
        {player.isSick && <StatRow label="Status" value="Sick" warning />}
        {player.hasProtectiveAmulet && <StatRow label="Protection" value="Amulet Active" highlight />}
      </div>

      {getGameOption('enableHexesCurses') && ((player.activeCurses?.length ?? 0) > 0 || player.hexScrolls.length > 0) && (
        <div className="bg-parchment-dark/30 rounded-lg p-3 border border-wood-light/30">
          <h3 className="font-display text-sm font-bold text-destructive mb-2">Dark Magic</h3>
          {(player.activeCurses?.length ?? 0) > 0 && (
            <>
              <div className="text-xs text-wood/70 mb-1">Active Afflictions:</div>
              {player.activeCurses?.map((curse, index) => {
                const hex = getHexById(curse.hexId);
                return (
                  <div key={`${curse.hexId}-${index}`} className="flex justify-between text-xs py-0.5">
                    <span className="text-destructive">{hex?.name || 'Unknown'}</span>
                    <span className="text-wood/70">{curse.weeksRemaining}w left</span>
                  </div>
                );
              })}
            </>
          )}
          {player.hexScrolls.length > 0 && (
            <>
              <div className="text-xs text-wood/70 mb-1 mt-1">Hex Scrolls:</div>
              {player.hexScrolls.map(scroll => {
                const hex = getHexById(scroll.hexId);
                return (
                  <div key={scroll.hexId} className="flex justify-between text-xs py-0.5">
                    <span className="text-purple-700">{hex?.name || scroll.hexId}</span>
                    <span className="text-wood/70">×{scroll.quantity}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
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
      <span className={`text-xs font-semibold ${warning ? 'text-destructive' : highlight ? 'text-gold' : 'text-wood'}`}>{value}</span>
    </div>
  );
}
