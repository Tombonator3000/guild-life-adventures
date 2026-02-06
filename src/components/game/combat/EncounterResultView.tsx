// Guild Life - Encounter Result View
// Shows the outcome of a resolved encounter with continue/retreat options

import {
  Heart,
  Shield,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  BookOpen,
  Clock,
} from 'lucide-react';
import type { EncounterResult } from '@/data/combatResolver';
import { getEncounterIcon } from '@/data/combatResolver';
import { HealthBar } from './HealthBar';

interface EncounterResultViewProps {
  result: EncounterResult;
  currentHealth: number;
  maxHealth: number;
  canRetreat: boolean;
  onContinue: () => void;
  onRetreat: () => void;
  onLeaveDungeon: () => void;
  encounterTimeCost: number;
  hasEnoughTime: boolean;
}

export function EncounterResultView({
  result,
  currentHealth,
  maxHealth,
  canRetreat,
  onContinue,
  onRetreat,
  onLeaveDungeon,
  encounterTimeCost,
  hasEnoughTime,
}: EncounterResultViewProps) {
  const enc = result.encounter;
  const icon = getEncounterIcon(enc.type);

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Result header */}
      <div className="text-center">
        <div className="text-2xl mb-1">{icon}</div>
        <h3 className="font-display text-base text-[#e0d4b8]">{enc.name}</h3>
      </div>

      {/* Result details */}
      <div className="bg-[#1a1308] border border-[#8b7355]/40 rounded-lg p-3 space-y-2">
        {/* Damage taken */}
        {result.damageDealt > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-red-300">
              -{result.damageDealt} HP
              {result.blocked && (
                <span className="text-blue-400 ml-1">(blocked!)</span>
              )}
            </span>
          </div>
        )}

        {/* Trap disarmed */}
        {result.disarmed && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-green-300">Trap disarmed!</span>
          </div>
        )}

        {/* Gold earned */}
        {result.goldEarned > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-400 text-base">💰</span>
            <span className="text-amber-300">+{result.goldEarned}g</span>
          </div>
        )}

        {/* Healing received */}
        {result.healed > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-cyan-400 text-base">💧</span>
            <span className="text-cyan-300">+{result.healed} HP restored</span>
          </div>
        )}

        {/* Potion found */}
        {result.potionFound && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-400 text-base">🧪</span>
            <span className="text-emerald-300">
              Found Healing Potion! +{result.potionHealed} HP
            </span>
          </div>
        )}

        {/* Education bonuses activated */}
        {result.bonusesActivated.length > 0 && (
          <div className="flex items-center gap-2 text-xs mt-1">
            <BookOpen className="w-3 h-3 text-[#8888cc]" />
            <span className="text-[#aaaadd]">
              {result.bonusesActivated.join(' | ')}
            </span>
          </div>
        )}
      </div>

      {/* HP bar */}
      <HealthBar currentHealth={currentHealth} maxHealth={maxHealth} showLabel height="h-2" />

      {/* Low health warning */}
      {currentHealth <= maxHealth * 0.3 && currentHealth > 0 && (
        <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-950/30 border border-orange-800/30 rounded p-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Health is low. Consider retreating to keep your gold.</span>
        </div>
      )}

      {/* Time cost info */}
      <div className="text-xs text-[#8b7355] flex items-center justify-center gap-1">
        <Clock className="w-3 h-3" />
        {hasEnoughTime
          ? `Continuing costs ${encounterTimeCost}h`
          : 'Not enough time to continue'}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {hasEnoughTime ? (
          <button
            className="flex-1 py-2 px-3 text-sm font-display rounded-lg bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-[#e0d4b8] border border-amber-600/50 transition-all"
            onClick={onContinue}
          >
            <span className="flex items-center justify-center gap-1.5">
              <ChevronRight className="w-4 h-4" />
              Continue Deeper ({encounterTimeCost}h)
            </span>
          </button>
        ) : (
          <button
            className="flex-1 py-2 px-3 text-sm font-display rounded-lg bg-[#2d1f0f] hover:bg-[#3d2f1f] text-[#a09080] border border-[#8b7355]/50 transition-all"
            onClick={onLeaveDungeon}
          >
            <span className="flex items-center justify-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Leave Dungeon (no time)
            </span>
          </button>
        )}
        {canRetreat && hasEnoughTime && (
          <button
            className="py-2 px-3 text-sm font-display rounded-lg bg-[#2d1f0f] hover:bg-[#3d2f1f] text-[#a09080] border border-[#8b7355]/50 transition-all"
            onClick={onRetreat}
          >
            <span className="flex items-center justify-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Retreat
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
