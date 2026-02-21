/**
 * Modal for non-linear quest chain choices.
 * Shows 2-3 choices with reward modifiers after completing a chain step.
 */

import { X, Swords, Heart, Clock, Coins } from 'lucide-react';
import { playSFX } from '@/audio/sfxManager';
import type { QuestChainChoice, NonLinearChainStep } from '@/data/questChains';
import { calculateChoiceRewards } from '@/data/questChains';

interface ChainChoiceModalProps {
  stepName: string;
  choices: QuestChainChoice[];
  step: NonLinearChainStep;
  onChoice: (choiceId: string) => void;
  onCancel: () => void;
}

function ModifierBadge({ value, icon, label }: { value: number; icon: React.ReactNode; label: string }) {
  const isPositive = value > 1;
  const isNegative = value < 1;
  const color = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-[#6b5a42]';
  const pct = Math.round((value - 1) * 100);
  const sign = pct >= 0 ? '+' : '';

  if (value === 1) return null;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${color}`}>
      {icon} {sign}{pct}% {label}
    </span>
  );
}

export function ChainChoiceModal({ stepName, choices, step, onChoice, onCancel }: ChainChoiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative parchment-panel p-4 w-full max-w-md">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display text-lg text-card-foreground">Choose Your Path</h3>
          <button onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#6b5a42] mb-3">
          You completed <span className="font-bold text-[#3d2a14]">{stepName}</span>. How do you proceed?
        </p>

        <div className="space-y-2">
          {choices.map((choice) => {
            const rewards = calculateChoiceRewards(step, choice);
            return (
              <button
                key={choice.id}
                onClick={() => { playSFX('quest-accept'); onChoice(choice.id); }}
                className="w-full text-left bg-[#e0d4b8] hover:bg-[#d4c4a8] border border-[#8b7355] hover:border-[#c9a227] rounded p-3 transition-all"
              >
                <div className="font-mono text-sm font-bold text-[#3d2a14]">{choice.label}</div>
                <p className="text-xs text-[#6b5a42] mt-0.5">{choice.description}</p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-[#8b6914] font-bold">
                    <Coins className="w-3 h-3 inline mr-0.5" />{rewards.gold}g
                  </span>
                  <span className="text-xs text-[#6b5a42]">
                    <Heart className="w-3 h-3 inline mr-0.5" />+{rewards.happiness}hap
                  </span>
                  <span className="text-xs text-red-600">
                    <Swords className="w-3 h-3 inline mr-0.5" />-{rewards.healthRisk}HP
                  </span>
                  <span className="text-xs text-[#6b5a42]">
                    <Clock className="w-3 h-3 inline mr-0.5" />{rewards.time}h
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-1">
                  <ModifierBadge value={choice.goldModifier} icon={<Coins className="w-3 h-3" />} label="gold" />
                  <ModifierBadge value={choice.happinessModifier} icon={<Heart className="w-3 h-3" />} label="hap" />
                  <ModifierBadge value={choice.healthRiskModifier} icon={<Swords className="w-3 h-3" />} label="risk" />
                  <ModifierBadge value={choice.timeModifier} icon={<Clock className="w-3 h-3" />} label="time" />
                </div>

                {choice.nextStepIndex === 'complete' && (
                  <span className="inline-block mt-1 text-xs text-green-600 font-bold font-mono">→ Completes Chain</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
