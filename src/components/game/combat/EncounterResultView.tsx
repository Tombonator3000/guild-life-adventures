// Guild Life - Encounter Result View
// Shows the outcome of a resolved encounter with continue/retreat options

import {
  Heart,
  Shield,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import type { EncounterResult } from '@/data/combatResolver';
import { getEncounterIcon } from '@/data/combatResolver';
import { getEncounterImage } from '@/assets/encounters';
import { LocationActions } from '../LocationPages';
import { HealthBar } from './HealthBar';

interface EncounterResultViewProps {
  result: EncounterResult;
  encounterIndex: number;
  totalEncounters: number;
  totalGold: number;
  previousHealth: number;
  retreatGold: number;
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
  result, encounterIndex, totalEncounters, totalGold, previousHealth, retreatGold,
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
    <section className="cave-result" aria-label="Encounter outcome" aria-live="polite">
      <div className="cave-result-heading">
        {getEncounterImage(enc.id) ? <img src={getEncounterImage(enc.id)} alt="" /> : <span>{icon}</span>}
        <div><p className="cave-eyebrow">Encounter {encounterIndex + 1} of {totalEncounters} · resolved</p><h3>{enc.name}</h3><span className="cave-compact-outcome">Health {previousHealth} → {currentHealth} HP · +{result.goldEarned}g</span><p>{enc.type === 'combat' || enc.type === 'boss' ? 'You survived the encounter.' : enc.type === 'healing' ? 'Spring visited.' : enc.type === 'treasure' ? 'Treasure collected.' : result.disarmed ? 'Trap safely disarmed.' : 'You passed the trap.'}</p></div>
      </div>
      {/* Result details */}
      <div className="cave-result-ledger">
        <div className="cave-result-total">This encounter: <strong>+{result.goldEarned}g</strong> · Run loot: <strong>{totalGold}g</strong></div>
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

        {result.bonusesActivated.length > 0 && <details className="cave-result-bonuses"><summary>Why this outcome?</summary><p>{result.bonusesActivated.join(' · ')}</p></details>}
      </div>

<p className="cave-health-change">Health: <strong>{previousHealth} → {currentHealth} HP</strong></p>
      {/* HP bar */}
      <HealthBar currentHealth={currentHealth} maxHealth={maxHealth} height="h-2" />

      {/* Low health warning */}
      {currentHealth <= maxHealth * 0.3 && currentHealth > 0 && (
        <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-950/30 border border-orange-800/30 rounded p-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Health is low. Retreat keeps half your run earnings.</span>
        </div>
      )}

      {!canRetreat && hasEnoughTime && <p className="cave-hint">The boss blocks your escape. Retreat is unavailable here.</p>}
      {/* Action buttons */}
      <LocationActions><div className="cave-actions" role="group" aria-label="Encounter choices">
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
              Retreat · keep {retreatGold}g
            </span>
          </button>
        )}
      </div></LocationActions>
    </section>
  );
}
