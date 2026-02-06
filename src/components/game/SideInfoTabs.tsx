// SideInfoTabs - Left sidebar tabbed info panel inspired by Jones in the Fast Lane
// Clean tabs-only design with Stats, Inventory, and Goals

import { useState } from 'react';
import { Package, Target, BarChart3, Clock, Coins, Heart, Smile, Utensils, Home, Sparkles, Skull, Shield, Shirt, Briefcase, GraduationCap, PiggyBank } from 'lucide-react';
import type { Player, GoalSettings } from '@/types/game.types';
import { GoalProgress } from './GoalProgress';
import { InventoryGrid } from './InventoryGrid';
import { GUILD_RANK_NAMES, GUILD_RANK_INDEX, HOURS_PER_TURN } from '@/types/game.types';
import { HOUSING_DATA } from '@/data/housing';
import { getJob } from '@/data/jobs';

type TabId = 'stats' | 'inventory' | 'goals';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'stats', label: 'STATS', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'inventory', label: 'INVENTORY', icon: <Package className="w-4 h-4" /> },
  { id: 'goals', label: 'GOALS', icon: <Target className="w-4 h-4" /> },
];

interface SideInfoTabsProps {
  player: Player;
  goals: GoalSettings;
  isCurrentPlayer: boolean;
}

export function SideInfoTabs({ player, goals, isCurrentPlayer }: SideInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('stats');

  return (
    <div className={`h-full flex flex-col bg-parchment rounded-lg border-2 overflow-hidden ${isCurrentPlayer ? 'border-accent' : 'border-wood-dark/50'}`}>
      {/* Player Header */}
      <div className="flex items-center gap-2 p-2 bg-gradient-to-b from-wood-dark to-wood border-b-2 border-wood-light">
        <div
          className="w-8 h-8 rounded-full border-2 border-parchment shadow-md flex-shrink-0"
          style={{ backgroundColor: player.color }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xs font-bold text-parchment truncate">
            {player.name}
          </h3>
          <p className="text-[10px] text-parchment/80 truncate">
            {GUILD_RANK_NAMES[player.guildRank]}
          </p>
        </div>
      </div>

      {/* Status Alerts - Only show when sick/dead */}
      {(player.isSick || player.health <= 0) && (
        <div className="flex-shrink-0 px-2 py-1 bg-destructive/20 border-b border-destructive/30">
          {player.isSick && (
            <div className="flex items-center gap-1 text-[10px] text-destructive font-semibold">
              <Skull className="w-3 h-3" />
              <span>Sick - Visit Healer!</span>
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
      <div className="flex-1 overflow-y-auto p-2 min-h-0 bg-parchment">
        {activeTab === 'stats' && <StatsTab player={player} />}
        {activeTab === 'inventory' && <InventoryGrid player={player} />}
        {activeTab === 'goals' && <GoalsTab player={player} goals={goals} />}
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
        w-14 h-10 rounded-t transition-all duration-200
        ${isActive 
          ? 'bg-parchment text-wood-dark border border-b-0 border-wood-dark -mb-[1px] z-10' 
          : 'bg-wood-light/50 text-parchment/90 hover:bg-wood-light hover:text-parchment border border-transparent'
        }
      `}
      title={tab.label}
    >
      <div className={`${isActive ? 'text-accent' : 'text-parchment/80'}`}>
        {tab.icon}
      </div>
      <span className={`text-[7px] font-display font-bold uppercase tracking-wide leading-tight ${isActive ? 'text-wood-dark' : ''}`}>
        {tab.label}
      </span>
    </button>
  );
}

// ============================================
// STATS TAB - All player resources and info
// ============================================
function StatsTab({ player }: { player: Player }) {
  const housingName = player.housing !== 'homeless' ? HOUSING_DATA[player.housing]?.name : 'Homeless';
  const jobData = player.currentJob ? getJob(player.currentJob) : null;

  const healthWarning = player.health <= 20;
  const timeWarning = player.timeRemaining <= 10;
  const foodWarning = player.foodLevel <= 25;
  const clothingWarning = player.clothingCondition <= 25;

  return (
    <div className="space-y-2">
      {/* Core Resources */}
      <StatSection title="Resources">
        <ResourceRow
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Hours"
          value={`${player.timeRemaining}/${HOURS_PER_TURN}`}
          barValue={player.timeRemaining}
          barMax={HOURS_PER_TURN}
          barColor="bg-time"
          warning={timeWarning}
        />
        <ResourceRow
          icon={<Coins className="w-3.5 h-3.5" />}
          label="Gold"
          value={player.gold.toString()}
          highlight
        />
        <ResourceRow
          icon={<Heart className="w-3.5 h-3.5" />}
          label="Health"
          value={`${player.health}/${player.maxHealth}`}
          barValue={player.health}
          barMax={player.maxHealth}
          barColor="bg-health"
          warning={healthWarning}
        />
        <ResourceRow
          icon={<Smile className="w-3.5 h-3.5" />}
          label="Happiness"
          value={`${player.happiness}%`}
          barValue={player.happiness}
          barMax={100}
          barColor="bg-happiness"
        />
        <ResourceRow
          icon={<Utensils className="w-3.5 h-3.5" />}
          label="Food"
          value={`${player.foodLevel}%`}
          barValue={player.foodLevel}
          barMax={100}
          barColor="bg-secondary"
          warning={foodWarning}
        />
        <ResourceRow
          icon={<Shirt className="w-3.5 h-3.5" />}
          label="Clothing"
          value={`${player.clothingCondition}%`}
          barValue={player.clothingCondition}
          barMax={100}
          barColor="bg-primary"
          warning={clothingWarning}
        />
      </StatSection>

      {/* Character Info */}
      <StatSection title="Character">
        <StatRow icon={<Shield className="w-3.5 h-3.5" />} label="Depend." value={`${player.dependability}%`} warning={player.dependability < 30} />
        <StatRow icon={<Home className="w-3.5 h-3.5" />} label="Home" value={housingName} />
        <StatRow icon={<Sparkles className="w-3.5 h-3.5" />} label="Exp" value={`${player.experience}/${player.maxExperience}`} />
      </StatSection>

      {/* Employment */}
      <StatSection title="Employment">
        <StatRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Job" value={jobData?.name || 'Unemployed'} />
        {player.currentJob && (
          <>
            <StatRow icon={<Coins className="w-3.5 h-3.5" />} label="Wage" value={`${player.currentWage}g/hr`} highlight />
            <StatRow icon={<Clock className="w-3.5 h-3.5" />} label="Shifts" value={player.shiftsWorkedSinceHire.toString()} />
          </>
        )}
      </StatSection>

      {/* Finances */}
      <StatSection title="Finances">
        <StatRow icon={<PiggyBank className="w-3.5 h-3.5" />} label="Savings" value={`${player.savings}g`} />
        <StatRow icon={<Coins className="w-3.5 h-3.5" />} label="Investments" value={`${player.investments}g`} />
        {player.loanAmount > 0 && (
          <StatRow icon={<Skull className="w-3.5 h-3.5" />} label="Loan Debt" value={`-${player.loanAmount}g`} warning />
        )}
      </StatSection>

      {/* Education */}
      <StatSection title="Education">
        <StatRow icon={<GraduationCap className="w-3.5 h-3.5" />} label="Degrees" value={player.completedDegrees.length.toString()} />
        {player.completedDegrees.slice(0, 3).map(degreeId => (
          <div key={degreeId} className="text-[9px] text-secondary-foreground pl-4 truncate font-medium">
            * {degreeId.replace(/-/g, ' ')}
          </div>
        ))}
        {player.completedDegrees.length > 3 && (
          <div className="text-[9px] text-wood/60 pl-4">
            +{player.completedDegrees.length - 3} more
          </div>
        )}
      </StatSection>
    </div>
  );
}

// ============================================
// GOALS TAB
// ============================================
function GoalsTab({ player, goals }: { player: Player; goals: GoalSettings }) {
  return (
    <div className="space-y-2">
      <StatSection title="Victory Goals">
        <GoalProgress player={player} goals={goals} compact />
      </StatSection>

      {/* Dungeon Progress */}
      <StatSection title="Dungeon">
        <div className="flex items-center gap-1 mb-1">
          <div className="flex-1 h-1.5 bg-amber-900/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all"
              style={{ width: `${(player.dungeonFloorsCleared.length / 5) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-amber-900">
            {player.dungeonFloorsCleared.length}/5
          </span>
        </div>
        <div className="flex gap-0.5 justify-center">
          {[1, 2, 3, 4, 5].map(floor => (
            <div
              key={floor}
              className={`
                w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold
                ${player.dungeonFloorsCleared.includes(floor)
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-amber-900/20 text-amber-800'}
              `}
            >
              {floor}
            </div>
          ))}
        </div>
      </StatSection>

      {/* Quest Stats */}
      <StatSection title="Quests">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-wood-dark font-medium">Quests Done</span>
          <span className="font-bold text-gold-dark">{player.completedQuests}</span>
        </div>
        <div className="flex justify-between items-center text-[11px] mt-1">
          <span className="text-wood-dark font-medium">Guild Pass</span>
          <span className={`font-bold ${player.hasGuildPass ? 'text-secondary' : 'text-destructive'}`}>
            {player.hasGuildPass ? 'Yes' : 'No'}
          </span>
        </div>
      </StatSection>
    </div>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================

function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-amber-100/50 rounded p-2 border border-amber-700/30">
      <h3 className="font-display text-[10px] font-bold text-amber-900 mb-1.5 uppercase tracking-wide border-b border-amber-700/30 pb-0.5">
        {title}
      </h3>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

interface ResourceRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  barValue?: number;
  barMax?: number;
  barColor?: string;
  warning?: boolean;
  highlight?: boolean;
}

function ResourceRow({
  icon,
  label,
  value,
  barValue,
  barMax,
  barColor = 'bg-primary',
  warning = false,
  highlight = false
}: ResourceRowProps) {
  const showBar = barValue !== undefined && barMax !== undefined;
  
  return (
    <div className={`${warning ? 'bg-destructive/15 rounded px-1 -mx-1' : ''}`}>
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-amber-800">{icon}</span>
          <span className="text-amber-800 font-medium">{label}</span>
        </div>
        <span className={`font-bold ${warning ? 'text-red-600 animate-pulse' : highlight ? 'text-amber-600' : 'text-amber-900'}`}>
          {value}
        </span>
      </div>
      {showBar && (
        <div className="h-1 bg-amber-900/20 rounded-full mt-0.5 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${Math.max(0, Math.min(100, (barValue / barMax) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  warning?: boolean;
}

function StatRow({ icon, label, value, highlight = false, warning = false }: StatRowProps) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <div className="flex items-center gap-1.5">
        <span className="text-amber-800">{icon}</span>
        <span className="text-amber-800 font-medium">{label}</span>
      </div>
      <span className={`font-bold ${warning ? 'text-red-600' : highlight ? 'text-amber-600' : 'text-amber-900'}`}>
        {value}
      </span>
    </div>
  );
}
