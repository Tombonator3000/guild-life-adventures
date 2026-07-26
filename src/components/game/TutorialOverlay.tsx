/**
 * Tutorial Overlay - Step-by-step guidance for new players.
 * Rule claims come from playerFacingRules so the tutorial follows the game.
 */

import { useGameStore } from '@/store/gameStore';
import { PLAYER_RULE_TEXT, PLAYER_RULE_VALUES } from '@/data/playerFacingRules';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';

interface TutorialStep {
  title: string;
  content: string;
  tip?: string;
}

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

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const { tutorialStep, setTutorialStep, setShowTutorial } = useGameStore();

  const step = TUTORIAL_STEPS[tutorialStep] || TUTORIAL_STEPS[0];
  const isFirst = tutorialStep === 0;
  const isLast = tutorialStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      setShowTutorial(false);
      onClose();
    } else {
      setTutorialStep(tutorialStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setTutorialStep(tutorialStep - 1);
  };

  const handleClose = () => {
    setShowTutorial(false);
    onClose();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="parchment-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-gold flex-shrink-0" />
            <h3 className="font-display text-lg text-card-foreground">{step.title}</h3>
          </div>
          <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close tutorial">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-card-foreground mb-2 leading-relaxed">{step.content}</p>

        {step.tip && (
          <div className="bg-primary/10 rounded px-3 py-2 mb-3">
            <p className="text-xs text-primary font-display">Tip: {step.tip}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {tutorialStep + 1} / {TUTORIAL_STEPS.length}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClose} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1">
              Skip Tutorial
            </button>
            {!isFirst && (
              <button onClick={handlePrev} aria-label="Previous tutorial step" className="p-1.5 rounded bg-background/50 text-muted-foreground hover:text-foreground border border-border">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleNext} className="px-4 py-1.5 rounded bg-primary/20 text-primary border border-primary font-display text-sm hover:bg-primary/30 flex items-center gap-1">
              {isLast ? 'Got it!' : 'Next'}
              {!isLast && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
