// Guild Life - Encounter Intro View
// Shows the upcoming encounter with stats and an action button

import { Heart, Swords, Sparkles } from 'lucide-react';
import { playSFX } from '@/audio/sfxManager';
import type { DungeonRunState } from '@/data/combatResolver';
import { getEncounterIcon, getEncounterAction } from '@/data/combatResolver';
import { HealthBar } from './HealthBar';

interface EncounterIntroProps {
  encounter: DungeonRunState['encounters'][0];
  encounterIndex: number;
  totalEncounters: number;
  currentHealth: number;
  maxHealth: number;
  canDisarm: boolean;
  onFight: () => void;
}

export function EncounterIntro({
  encounter,
  encounterIndex,
  totalEncounters,
  currentHealth,
  maxHealth,
  canDisarm,
  onFight,
}: EncounterIntroProps) {
  const icon = getEncounterIcon(encounter.type);
  const action = getEncounterAction(encounter, canDisarm);
  const isBoss = encounter.type === 'boss';

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Encounter counter */}
      <div className="flex justify-between items-center text-xs text-[#8b7355]">
        <span>
          Encounter {encounterIndex + 1} of {totalEncounters}
        </span>
        <div className="flex items-center gap-1">
          <Heart className="w-3 h-3 text-red-400" />
          <span className={currentHealth <= maxHealth * 0.3 ? 'text-red-400' : 'text-[#e0d4b8]'}>
            {currentHealth}/{maxHealth}
          </span>
        </div>
      </div>

      {/* HP bar */}
      <HealthBar currentHealth={currentHealth} maxHealth={maxHealth} height="h-1.5" />

      {/* Encounter card */}
      <div
        className={`rounded-lg p-4 border-2 ${
          isBoss
            ? 'bg-gradient-to-b from-red-950/60 to-red-950/30 border-red-700/60'
            : encounter.type === 'treasure'
              ? 'bg-gradient-to-b from-amber-950/40 to-amber-950/20 border-amber-600/40'
              : encounter.type === 'healing'
                ? 'bg-gradient-to-b from-cyan-950/40 to-cyan-950/20 border-cyan-600/40'
                : encounter.type === 'trap'
                  ? 'bg-gradient-to-b from-orange-950/40 to-orange-950/20 border-orange-600/40'
                  : 'bg-gradient-to-b from-[#2d1f0f] to-[#1a1308] border-[#8b7355]/60'
        }`}
      >
        {/* Icon + Name */}
        <div className="text-center mb-3">
          <div className="text-3xl mb-1">{icon}</div>
          <h3
            className={`font-display text-lg ${
              isBoss ? 'text-red-300' : 'text-[#e0d4b8]'
            }`}
          >
            {encounter.name}
          </h3>
          {isBoss && (
            <div className="text-xs text-red-400 uppercase tracking-wider mt-0.5">
              Floor Boss
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-[#a09080] italic text-center mb-3">
          {encounter.flavorText}
        </p>

        {/* Enemy stats (for combat/boss) */}
        {(encounter.type === 'combat' || encounter.type === 'boss') && (
          <div className="flex justify-center gap-4 text-xs font-mono mb-3">
            <span className="text-red-400">
              Power: {encounter.basePower}
            </span>
            <span className="text-orange-400">
              Damage: {encounter.baseDamage}
            </span>
            <span className="text-amber-400">
              Gold: {encounter.baseGold}
            </span>
          </div>
        )}

        {/* Treasure info */}
        {encounter.type === 'treasure' && (
          <div className="text-center text-xs font-mono text-amber-400 mb-3">
            Contains gold: ~{encounter.baseGold}g
          </div>
        )}

        {/* Healing info */}
        {encounter.type === 'healing' && (
          <div className="text-center text-xs font-mono text-cyan-400 mb-3">
            Restores: +{Math.abs(encounter.baseDamage)} HP
          </div>
        )}

        {/* Trap info */}
        {encounter.type === 'trap' && (
          <div className="text-center text-xs font-mono text-orange-400 mb-3">
            {canDisarm ? 'You can disarm this trap!' : `Danger: ~${encounter.baseDamage} damage`}
          </div>
        )}

        {/* Arcane warning */}
        {encounter.requiresArcane && (
          <div className="text-center text-xs text-purple-400 mb-3 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            Ethereal — requires Arcane knowledge
          </div>
        )}
      </div>

      {/* Action button */}
      <button
        className={`w-full py-2.5 px-4 text-sm font-display rounded-lg transition-all ${
          isBoss
            ? 'bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-red-100 border border-red-600/50'
            : encounter.type === 'treasure'
              ? 'bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-amber-100 border border-amber-600/50'
              : encounter.type === 'healing'
                ? 'bg-gradient-to-r from-cyan-800 to-cyan-700 hover:from-cyan-700 hover:to-cyan-600 text-cyan-100 border border-cyan-600/50'
                : 'bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-[#e0d4b8] border border-amber-600/50'
        }`}
        onClick={() => { playSFX('sword-hit'); onFight(); }}
      >
        <span className="flex items-center justify-center gap-2">
          {(encounter.type === 'combat' || encounter.type === 'boss') && (
            <Swords className="w-4 h-4" />
          )}
          {action}
        </span>
      </button>
    </div>
  );
}
