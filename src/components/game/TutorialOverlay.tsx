/**
 * Tutorial Overlay - Step-by-step guidance for new players
 * Shows contextual tips as the player progresses through their first game.
 */

import { useGameStore } from '@/store/gameStore';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';

interface TutorialStep {
  title: string;
  content: string;
  tip?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Guild Life!',
    content: 'You are an adventurer in the medieval town of Guildholm. Your goal is to achieve victory in four areas: Wealth, Happiness, Education, and Career. Manage your time wisely - you have 60 hours each week!',
    tip: 'Click any building on the board to travel there and interact with it.',
  },
  {
    title: 'Your First Priority: Housing',
    content: 'You start homeless! Visit the Landlord to rent a room in The Slums (75g/week). Without housing, you lose health and hours each turn, and are more vulnerable to robbery.',
    tip: 'Look for the Landlord building on the board and click it.',
  },
  {
    title: 'Get a Job',
    content: 'Visit the Guild Hall to find employment. Start with entry-level jobs like Floor Sweeper or Porter - they have no requirements. Work shifts to earn gold and build dependability.',
    tip: 'Once hired, go to your workplace and click "Work" to earn gold.',
  },
  {
    title: 'Buy Food & Clothing',
    content: 'Visit the General Store to buy food (prevents -20 hour starvation penalty) and clothing (needed for better jobs). Keep your food and clothing above 25% to avoid trouble.',
    tip: 'Food depletes each week. Always keep some food in stock!',
  },
  {
    title: 'Movement & Time',
    content: 'Moving costs 1 hour per building step. Entering a building costs 2 hours. Plan your route - travel to nearby buildings to save time. When time runs out, your turn ends automatically.',
    tip: 'Buildings are arranged in a ring. Moving clockwise or counter-clockwise will take the shortest path.',
  },
  {
    title: 'Education & Career',
    content: 'Visit the Academy to study for degrees. Degrees unlock better-paying jobs and give +9 education points each. Start with Trade Guild Certificate or Junior Academy. Build your career step by step!',
    tip: 'Each degree takes multiple study sessions (6 hours each). Plan ahead!',
  },
  {
    title: 'Banking & Wealth',
    content: 'Deposit gold at the Bank to protect it from robbery and earn interest. Your wealth goal counts cash + savings + investments + stocks. Be careful with loans - 10% weekly interest adds up fast!',
    tip: 'Deposit excess gold frequently. Shadowfingers can rob you on the street!',
  },
  {
    title: 'The Cave & Quests',
    content: 'Buy a Guild Pass (500g) at the Guild Hall to take quests. Explore the Cave dungeon for gold and rare items. Equip weapons and armor from the Armory before diving in!',
    tip: 'The cave has 5 floors of increasing difficulty. Prepare well before going deeper.',
  },
  {
    title: 'Victory!',
    content: 'Win by reaching all four goals: Wealth (gold target), Happiness (accumulate happiness points), Education (earn degrees), and Career (reach the required guild rank through dependability). Good luck, adventurer!',
    tip: 'Check your progress in the Goals tab on the left sidebar. Press Escape for the game menu.',
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
    if (!isFirst) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const handleClose = () => {
    setShowTutorial(false);
    onClose();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="parchment-panel p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-gold flex-shrink-0" />
            <h3 className="font-display text-lg text-card-foreground">{step.title}</h3>
          </div>
          <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-card-foreground mb-2 leading-relaxed">{step.content}</p>

        {/* Tip */}
        {step.tip && (
          <div className="bg-primary/10 rounded px-3 py-2 mb-3">
            <p className="text-xs text-primary font-display">Tip: {step.tip}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {tutorialStep + 1} / {TUTORIAL_STEPS.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1"
            >
              Skip Tutorial
            </button>
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="p-1.5 rounded bg-background/50 text-muted-foreground hover:text-foreground border border-border"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded bg-primary/20 text-primary border border-primary font-display text-sm hover:bg-primary/30 flex items-center gap-1"
            >
              {isLast ? 'Got it!' : 'Next'}
              {!isLast && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
