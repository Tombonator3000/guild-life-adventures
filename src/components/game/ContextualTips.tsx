/**
 * Contextual Tips System — auto-triggered tips based on game state
 * Shows helpful hints when the player is in a situation where guidance would help.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lightbulb, X } from 'lucide-react';
import type { Player } from '@/types/game.types';
import { useGameStore } from '@/store/gameStore';

interface ContextualTip {
  id: string;
  condition: (player: Player, week: number) => boolean;
  title: string;
  message: string;
  /** Which UI element to highlight (CSS selector or zone ID) */
  highlightTarget?: string;
  /** Priority (higher = shown first) */
  priority: number;
}

const CONTEXTUAL_TIPS: ContextualTip[] = [
  {
    id: 'no-job-early',
    condition: (p, w) => !p.currentJob && w <= 3 && !p.isAI,
    title: 'Get a Job!',
    message: 'Head to the Guild Hall to apply for your first job. Floor Sweeper and Porter have no requirements — start earning gold right away!',
    highlightTarget: 'guild-hall',
    priority: 100,
  },
  {
    id: 'low-food',
    condition: (p) => p.foodLevel <= 20 && !p.isAI,
    title: 'Running Low on Food!',
    message: 'Your food is almost gone! Buy food at the Rusty Tankard (safe, always works) or General Store (cheaper but needs a Preservation Box). If you starve, you lose 20 hours!',
    highlightTarget: 'rusty-tankard',
    priority: 95,
  },
  {
    id: 'no-food',
    condition: (p) => p.foodLevel <= 0 && !p.isAI,
    title: '⚠️ Starving!',
    message: 'You have NO food! You will lose 20 hours at the start of next turn searching for food. Buy food immediately!',
    highlightTarget: 'rusty-tankard',
    priority: 99,
  },
  {
    id: 'rent-due-soon',
    condition: (p, w) => p.weeksSinceRent >= 3 && p.housing !== 'homeless' && !p.isAI,
    title: 'Rent Due Soon!',
    message: 'Rent is due next week! Make sure you have enough gold or your wages will be garnished.',
    highlightTarget: 'landlord',
    priority: 85,
  },
  {
    id: 'clothing-low',
    condition: (p) => p.clothingCondition <= 20 && p.currentJob !== null && !p.isAI,
    title: 'Clothes Wearing Out!',
    message: 'Your clothing is getting worn. If it drops below your job\'s required tier, you won\'t be able to work! Buy new clothes at the Armory.',
    highlightTarget: 'armory',
    priority: 80,
  },
  {
    id: 'has-gold-no-bank',
    condition: (p) => p.gold >= 300 && p.savings === 0 && !p.isAI,
    title: 'Protect Your Gold',
    message: 'You\'re carrying a lot of gold! Deposit it at the Bank to protect from robbery and earn interest.',
    highlightTarget: 'bank',
    priority: 60,
  },
  {
    id: 'no-education-mid',
    condition: (p, w) => w >= 8 && p.completedDegrees.length === 0 && !p.isAI,
    title: 'Consider Education',
    message: 'Degrees unlock better-paying jobs and give education points. Visit the Academy to start studying — Trade Guild Certificate and Junior Academy are cheap to start!',
    highlightTarget: 'academy',
    priority: 50,
  },
  {
    id: 'guild-pass-ready',
    condition: (p) => !p.hasGuildPass && p.gold >= 500 && !p.isAI,
    title: 'Ready for Quests!',
    message: 'You have enough gold for a Guild Pass (500g)! Buy one at the Guild Hall to unlock quests — they give gold, happiness, and guild reputation.',
    highlightTarget: 'guild-hall',
    priority: 70,
  },
  {
    id: 'first-dungeon',
    condition: (p, w) => w >= 6 && p.dungeonFloorsCleared.length === 0 && p.hasGuildPass && !p.isAI,
    title: 'Try the Dungeon!',
    message: 'The Cave has 6 floors of dungeon encounters with gold and rare items. Equip a weapon and armor from the Armory first!',
    highlightTarget: 'cave',
    priority: 45,
  },
  {
    id: 'health-low',
    condition: (p) => p.health <= 25 && !p.isAI,
    title: '⚠️ Low Health!',
    message: 'Your health is critically low! Visit the Enchanter for healing, or you might die. If you have savings, resurrection costs gold.',
    highlightTarget: 'enchanter',
    priority: 90,
  },
];

/** Store which tips have been dismissed in this session */
const dismissedTips = new Set<string>();

export function ContextualTips() {
  const { players, currentPlayerIndex, week, showTutorial } = useGameStore();
  const player = players[currentPlayerIndex];
  const [dismissedLocal, setDismissedLocal] = useState<Set<string>>(new Set(dismissedTips));

  // Find the highest-priority applicable tip that hasn't been dismissed
  const activeTip = useMemo(() => {
    if (!player || player.isAI) return null;
    const candidates = CONTEXTUAL_TIPS
      .filter(tip => !dismissedLocal.has(tip.id) && tip.condition(player, week))
      .sort((a, b) => b.priority - a.priority);
    return candidates[0] || null;
  }, [player, week, dismissedLocal]);

  const handleDismiss = useCallback(() => {
    if (activeTip) {
      dismissedTips.add(activeTip.id);
      setDismissedLocal(new Set(dismissedTips));
    }
  }, [activeTip]);

  // Don't show during tutorial or for AI, or if no tip
  if (showTutorial || !player || player.isAI || !activeTip) return null;

  return (
    <>
      {/* Highlight overlay for target zone */}
      {activeTip.highlightTarget && (
        <ZoneHighlight zoneId={activeTip.highlightTarget} />
      )}
      
      {/* Tip panel */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-fade-in">
        <div className="bg-[#f0e8d8] border-2 border-[#c9a227] rounded-lg p-4 shadow-xl">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[#c9a227] flex-shrink-0" />
              <h4 className="font-display text-sm font-bold text-[#3d2a14]">{activeTip.title}</h4>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-[#8b7355] hover:text-[#3d2a14] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#6b5a42] leading-relaxed">{activeTip.message}</p>
        </div>
      </div>
    </>
  );
}

/** Pulsing highlight overlay on a board zone */
function ZoneHighlight({ zoneId }: { zoneId: string }) {
  // This renders an overlay that the GameBoard can pick up to add a pulsing glow to the target zone
  // We use a data attribute approach so GameBoard can style the zone
  useEffect(() => {
    const el = document.querySelector(`[data-zone-id="${zoneId}"]`);
    if (el) {
      el.classList.add('zone-highlighted');
      return () => el.classList.remove('zone-highlighted');
    }
  }, [zoneId]);

  return null;
}
