import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Lightbulb, LocateFixed, X } from 'lucide-react';
import { useCurrentPlayer, useGameStore } from '@/store/gameStore';
import { PLAYER_RULE_TEXT, PLAYER_RULE_VALUES } from '@/data/playerFacingRules';
import { getJob } from '@/data/jobs';
import type { LocationId, Player } from '@/types/game.types';

export interface TutorialStep {
  title: string;
  content: string;
  tip?: string;
}

/** Compact rule reference retained as a fallback beside the guided tutorial. */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Guild Life!',
    content: `You are building a life in Guildholm. Reach every enabled victory goal: Wealth, Happiness, Education, Career and, when selected, Adventure. You have ${PLAYER_RULE_VALUES.turnHours} hours each turn.`,
    tip: 'Click a building to travel. Open the Goals panel whenever you are unsure what still counts toward victory.',
  },
  {
    title: 'Get Hired, Then Work',
    content: 'Visit the Guild Hall to apply for a job. After you are hired, work at that job’s actual location. Work earns gold, Experience and Dependability; skipping work while employed can reduce Dependability.',
    tip: 'Entry-level work has few requirements. Better jobs need education, experience, dependability and suitable clothing.',
  },
  {
    title: 'Housing and Rent',
    content: PLAYER_RULE_TEXT.rent,
    tip: 'Your starting room in The Slums is cheap but vulnerable to burglary. Noble Heights is safer and gives weekly Happiness.',
  },
  {
    title: 'Food and Clothing',
    content: `${PLAYER_RULE_TEXT.food} If you begin a turn without food, ${PLAYER_RULE_TEXT.starvation}`,
    tip: `Clothing wears by ${PLAYER_RULE_VALUES.clothingDegradationPerWeek} condition each week. Worn clothing can block you from working before it reaches 0.`,
  },
  {
    title: 'Movement and Time',
    content: PLAYER_RULE_TEXT.movement,
    tip: 'Shopping and banking are usually free once you arrive, while work, study, healing, gambling and dungeon encounters use time.',
  },
  {
    title: 'Education and Career',
    content: `${PLAYER_RULE_TEXT.education} ${PLAYER_RULE_TEXT.career}`,
    tip: `Graduation also gives +${PLAYER_RULE_VALUES.graduationHappiness} Happiness, +${PLAYER_RULE_VALUES.graduationDependability} Dependability and raises the Experience and Dependability caps.`,
  },
  {
    title: 'Savings, The Broker and Loans',
    content: `${PLAYER_RULE_TEXT.wealthFormula} ${PLAYER_RULE_TEXT.broker} ${PLAYER_RULE_TEXT.loans}`,
    tip: 'Bank cash you do not need immediately. Savings cannot be taken in a street robbery, but debt subtracts from Wealth.',
  },
  {
    title: 'Quests and the Dungeon',
    content: `A Guild Pass costs ${PLAYER_RULE_VALUES.guildPassCost}g and is required for Guild quests and bounties. The Cave has six floors with increasing gear, education, health and time demands. Dungeon floors can be attempted without a Guild Pass.`,
    tip: 'Retreating keeps part of the run’s earnings. Defeat keeps less, and reaching 0 Health can trigger resurrection or elimination.',
  },
  {
    title: 'Winning the Game',
    content: `${PLAYER_RULE_TEXT.wealthProgress} Education is completed degrees × ${PLAYER_RULE_VALUES.educationPointsPerDegree}. ${PLAYER_RULE_TEXT.career} ${PLAYER_RULE_TEXT.adventure}`,
    tip: 'You must meet all enabled goals together. A rich unemployed adventurer can still have 0 Career.',
  },
];

interface TutorialOverlayProps {
  onClose: () => void;
}

interface TutorialBaseline {
  ownerId: string;
  week: number;
  currentPlayerIndex: number;
}

interface StepSnapshot {
  shifts: number;
  food: number;
  freshFood: number;
  hasStoreBoughtFood: boolean;
  spent: number;
  savings: number;
}

interface GuidedStep {
  title: string;
  content: string;
  tip: string;
  target?: string;
}

const WORK_LOCATION_IDS: Record<string, LocationId> = {
  'Guild Hall': 'guild-hall',
  Bank: 'bank',
  Forge: 'forge',
  Academy: 'academy',
  'General Store': 'general-store',
  Armory: 'armory',
  Enchanter: 'enchanter',
  'Shadow Market': 'shadow-market',
  'Rusty Tankard': 'rusty-tankard',
  Fence: 'fence',
};

const GUIDED_STEP_COUNT = 7;

function snapshot(player: Player): StepSnapshot {
  return {
    shifts: player.totalShiftsWorked ?? 0,
    food: player.foodLevel,
    freshFood: player.freshFood,
    hasStoreBoughtFood: player.hasStoreBoughtFood,
    spent: player.gameStats?.totalGoldSpent ?? 0,
    savings: player.savings,
  };
}

function findVisibleTarget(selector?: string): HTMLElement | null {
  if (selector) {
    const target = document.querySelector<HTMLElement>(selector);
    if (target && target.getBoundingClientRect().width > 0 && target.getBoundingClientRect().height > 0) return target;
  }

  if (selector === '[data-tutorial-target="end-turn"]') {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')];
    return buttons.find(button => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && /end turn/i.test(button.textContent ?? '');
    }) ?? null;
  }

  return null;
}

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const currentPlayer = useCurrentPlayer();
  const {
    players,
    week,
    currentPlayerIndex,
    tutorialStep,
    setTutorialStep,
    setShowTutorial,
    networkMode,
    localPlayerId,
    isSpectating,
    phase,
  } = useGameStore();
  const [showReference, setShowReference] = useState(false);
  const [referenceStep, setReferenceStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const baselineRef = useRef<TutorialBaseline | null>(null);
  const snapshotsRef = useRef(new Map<number, StepSnapshot>());

  if (!baselineRef.current && currentPlayer && !currentPlayer.isAI) {
    baselineRef.current = {
      ownerId: currentPlayer.id,
      week,
      currentPlayerIndex,
    };
  }

  const baseline = baselineRef.current;
  const owner = baseline ? players.find(player => player.id === baseline.ownerId) ?? null : null;
  const ownerJob = owner?.currentJob ? getJob(owner.currentJob) : null;
  const workLocationId = ownerJob ? WORK_LOCATION_IDS[ownerJob.location] : undefined;
  const isLocalOwner = Boolean(owner) && (
    networkMode === 'local'
    || (localPlayerId !== null && localPlayerId === owner?.id)
  );
  const isOwnerTurn = currentPlayer?.id === owner?.id && !currentPlayer?.isAI;
  const canDisplayGuide = phase === 'playing' && isLocalOwner && isOwnerTurn && !isSpectating;

  const completeTutorial = useCallback(() => {
    try { localStorage.setItem('guild-life-guided-tutorial-completed', 'true'); } catch { /* ignore */ }
    setTutorialStep(0);
    setShowTutorial(false);
    onClose();
  }, [onClose, setShowTutorial, setTutorialStep]);

  useEffect(() => {
    if (!owner || snapshotsRef.current.has(tutorialStep)) return;
    snapshotsRef.current.set(tutorialStep, snapshot(owner));
  }, [owner, tutorialStep]);

  useEffect(() => {
    if (!owner || !baseline) return;
    const stepSnapshot = snapshotsRef.current.get(tutorialStep);

    if (tutorialStep === 1 && owner.currentLocation === 'guild-hall') {
      setTutorialStep(2);
    } else if (tutorialStep === 2 && owner.currentJob) {
      setTutorialStep(3);
    } else if (tutorialStep === 3 && stepSnapshot && (owner.totalShiftsWorked ?? 0) > stepSnapshot.shifts) {
      setTutorialStep(4);
    } else if (tutorialStep === 4 && stepSnapshot && (
      owner.foodLevel > stepSnapshot.food
      || owner.freshFood > stepSnapshot.freshFood
      || (!stepSnapshot.hasStoreBoughtFood && owner.hasStoreBoughtFood)
      || (owner.gameStats?.totalGoldSpent ?? 0) > stepSnapshot.spent
    )) {
      setTutorialStep(5);
    } else if (tutorialStep === 5 && stepSnapshot && owner.savings > stepSnapshot.savings) {
      setTutorialStep(6);
    } else if (tutorialStep === 6 && (
      week > baseline.week
      || currentPlayerIndex !== baseline.currentPlayerIndex
      || currentPlayer?.id !== baseline.ownerId
    )) {
      completeTutorial();
    }
  }, [baseline, completeTutorial, currentPlayer?.id, currentPlayerIndex, owner, setTutorialStep, tutorialStep, week]);

  const guidedStep = useMemo<GuidedStep>(() => {
    switch (tutorialStep) {
      case 0:
        return {
          title: 'Your First Turn — Learn by Doing',
          content: `This guide follows your real adventurer and real game state. You will get hired, work one shift, buy food, protect some gold at the Bank and end the turn. Nothing is simulated or granted for free.`,
          tip: `You begin with ${PLAYER_RULE_VALUES.turnHours} hours. The guide never blocks the board, so mouse, touch, Tab and the normal keyboard controls still work.`,
        };
      case 1:
        return {
          title: '1. Travel to the Guild Hall',
          content: 'Select the highlighted Guild Hall on the board. Travel uses the actual shortest route and your normal turn hours.',
          tip: 'When your token arrives, the location panel opens with the Jobs tab.',
          target: '[data-tutorial-target="location-guild-hall"]',
        };
      case 2:
        return {
          title: '2. Get an Entry-Level Job',
          content: 'Choose an employer, apply for any job you qualify for, then accept the offer. Floor Sweeper at the Guild Hall always has no education or clothing requirement.',
          tip: 'The offered wage is the real market wage for this week. The guide advances only after the job is stored on your player.',
          target: '[data-tutorial-target="employment-panel"]',
        };
      case 3: {
        const atWork = Boolean(workLocationId && owner?.currentLocation === workLocationId);
        return {
          title: '3. Work One Full Shift',
          content: atWork
            ? `You are at ${ownerJob?.location}. Use the highlighted Work Shift button. The real action spends ${ownerJob?.hoursPerShift ?? 0} hours and pays your current wage.`
            : `Your new job is ${ownerJob?.name ?? 'stored on your character'} at ${ownerJob?.location ?? 'its employer'}. Travel to the highlighted workplace, then use Work Shift.`,
          tip: 'Working increases Experience and Dependability as well as gold. Career counts Dependability only while employed.',
          target: atWork
            ? '[data-tutorial-target="work-shift"]'
            : workLocationId ? `[data-tutorial-target="location-${workLocationId}"]` : undefined,
        };
      }
      case 4: {
        const atStore = owner?.currentLocation === 'general-store';
        return {
          title: '4. Buy Food for the Week',
          content: atStore
            ? 'Buy Bread or Cheese from the highlighted food list. This is a real purchase using current market prices.'
            : 'Travel to the highlighted General Store. Food is not optional: the food meter falls every week and an empty start costs time.',
          tip: `Regular food falls by ${PLAYER_RULE_VALUES.foodDepletionPerWeek} each week. Fresh food needs a working Preservation Box.`,
          target: atStore
            ? '[data-tutorial-target="food-panel"]'
            : '[data-tutorial-target="location-general-store"]',
        };
      }
      case 5: {
        const atBank = owner?.currentLocation === 'bank';
        return {
          title: '5. Protect Some Gold at the Bank',
          content: atBank
            ? 'Deposit 50g using the highlighted Banking action. Savings are part of Wealth and are protected from street theft.'
            : 'Travel to the highlighted Bank. You will deposit part of the income from your first shift.',
          tip: 'The Broker is for shares and Crown Bonds. A simple deposit is safer for the first turn and can be withdrawn later for free.',
          target: atBank
            ? '[data-tutorial-target="bank-deposit"]'
            : '[data-tutorial-target="location-bank"]',
        };
      }
      case 6:
      default:
        return {
          title: '6. Review the Turn and End It',
          content: 'You now have a job, work history, food and protected savings. Check the remaining hours and stats, then use End Turn. Week-end systems will process the real game normally.',
          tip: 'Future turns are open-ended: work, study, improve housing, pursue quests or build Wealth — but keep food, rent, health and clothing under control.',
          target: '[data-tutorial-target="end-turn"]',
        };
    }
  }, [owner?.currentLocation, ownerJob?.hoursPerShift, ownerJob?.location, ownerJob?.name, tutorialStep, workLocationId]);

  useEffect(() => {
    if (!canDisplayGuide || showReference) {
      setTargetRect(null);
      return;
    }

    const update = () => {
      const target = findVisibleTarget(guidedStep.target);
      setTargetRect(target ? target.getBoundingClientRect() : null);
    };
    update();
    const interval = window.setInterval(update, 200);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [canDisplayGuide, guidedStep.target, showReference]);

  const handleClose = () => {
    setShowTutorial(false);
    onClose();
  };

  if (!baseline || !owner || !canDisplayGuide) return null;

  if (showReference) {
    const reference = TUTORIAL_STEPS[referenceStep];
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Tutorial rule reference">
        <div className="absolute inset-0 bg-black/65" onClick={() => setShowReference(false)} />
        <div className="relative parchment-panel p-5 w-full max-w-lg shadow-2xl">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gold" />
              <h3 className="font-display text-lg text-card-foreground">{reference.title}</h3>
            </div>
            <button onClick={() => setShowReference(false)} aria-label="Close rule reference" className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-card-foreground leading-relaxed mb-3">{reference.content}</p>
          {reference.tip && <div className="bg-primary/10 rounded px-3 py-2 mb-4 text-xs text-primary font-display">Tip: {reference.tip}</div>}
          <div className="flex items-center justify-between">
            <button disabled={referenceStep === 0} onClick={() => setReferenceStep(step => Math.max(0, step - 1))} aria-label="Previous reference page" className="p-2 rounded border border-border disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-muted-foreground">{referenceStep + 1} / {TUTORIAL_STEPS.length}</span>
            <button disabled={referenceStep === TUTORIAL_STEPS.length - 1} onClick={() => setReferenceStep(step => Math.min(TUTORIAL_STEPS.length - 1, step + 1))} aria-label="Next reference page" className="p-2 rounded border border-border disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    );
  }

  const placeAtTop = Boolean(targetRect && targetRect.top > window.innerHeight * 0.55);

  return (
    <>
      {targetRect && (
        <div
          aria-hidden="true"
          className="fixed z-[58] pointer-events-none rounded-lg border-4 border-amber-300 animate-pulse"
          style={{
            left: Math.max(4, targetRect.left - 6),
            top: Math.max(4, targetRect.top - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: '0 0 0 4px rgba(120, 72, 16, 0.75), 0 0 30px 10px rgba(251, 191, 36, 0.55)',
          }}
        />
      )}

      <div className={`fixed left-1/2 -translate-x-1/2 z-[60] w-full max-w-xl px-3 ${placeAtTop ? 'top-3' : 'bottom-3'}`} aria-live="polite">
        <div className="parchment-panel p-4 shadow-2xl border-2 border-amber-700/70">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-start gap-2">
              {tutorialStep === 6 ? <CheckCircle2 className="w-5 h-5 text-green-700 mt-0.5" /> : <LocateFixed className="w-5 h-5 text-gold mt-0.5" />}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-amber-800 font-bold">Guided first turn · {Math.min(tutorialStep + 1, GUIDED_STEP_COUNT)} / {GUIDED_STEP_COUNT}</div>
                <h3 className="font-display text-lg text-card-foreground">{guidedStep.title}</h3>
              </div>
            </div>
            <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close guided tutorial"><X className="w-4 h-4" /></button>
          </div>

          <p className="text-sm text-card-foreground leading-relaxed mb-2">{guidedStep.content}</p>
          <div className="flex gap-2 bg-primary/10 rounded px-3 py-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary font-display">{guidedStep.tip}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button onClick={() => setShowReference(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1"><BookOpen className="w-3.5 h-3.5" /> Rule reference</button>
            <div className="flex items-center gap-2">
              <button onClick={handleClose} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Skip guide</button>
              {tutorialStep === 0 && (
                <button onClick={() => setTutorialStep(1)} className="px-4 py-2 rounded bg-primary/20 text-primary border border-primary font-display text-sm hover:bg-primary/30 flex items-center gap-1">
                  Start guided turn <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
