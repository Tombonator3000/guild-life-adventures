import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Player } from '@/types/game.types';
import {
  PLAYER_RULE_TEXT,
  PLAYER_RULE_VALUES,
  containsRetiredInvestmentAccountCopy,
} from '@/data/playerFacingRules';
import {
  calculateAdventureValue,
  calculateCareerValue,
  calculateEducationValue,
  calculateTotalWealth,
} from '@/lib/calculateGoalProgress';
import { TUTORIAL_STEPS } from '@/components/game/TutorialOverlay';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const financialPlayer = {
  gold: 125,
  savings: 300,
  investments: 0,
  stocks: { 'crystal-mine': 2 },
  loanAmount: 50,
} as Pick<Player, 'gold' | 'savings' | 'investments' | 'stocks' | 'loanAmount'>;

describe('Phase 16Y rules truth', () => {
  it('describes the actual starvation flow instead of guaranteed health damage', () => {
    const startTurn = source('src/store/helpers/startTurnHelpers.ts');

    expect(startTurn).toContain(`const STARVATION_TIME_PENALTY = ${PLAYER_RULE_VALUES.starvationTimeLoss}`);
    expect(startTurn).toContain(`if (Math.random() < ${PLAYER_RULE_VALUES.starvationDoctorChance})`);
    expect(startTurn).toContain('timeRemaining: Math.max(0, p.timeRemaining - 10)');
    expect(startTurn).toContain('happiness: Math.max(0, p.happiness - 4)');
    expect(PLAYER_RULE_TEXT.starvation).toContain('does not apply a guaranteed direct Health penalty');
    expect(PLAYER_RULE_TEXT.starvation).not.toMatch(/lose 10 Health|lose 10 HP|-10 Health/i);
  });

  it('uses the current financial components and subtracts debt', () => {
    expect(calculateTotalWealth(financialPlayer, { 'crystal-mine': 80 })).toBe(535);
    expect(PLAYER_RULE_TEXT.wealthFormula).toBe(
      'Wealth = cash + Savings + current Broker portfolio value - outstanding loan debt.',
    );
  });

  it('keeps the other goal values aligned with their calculators', () => {
    expect(calculateEducationValue({ completedDegrees: ['trade-guild', 'junior-academy'] })).toBe(18);
    expect(calculateCareerValue({ currentJob: null, dependability: 90 })).toBe(0);
    expect(calculateCareerValue({ currentJob: 'floor-sweeper', dependability: 73 })).toBe(73);
    expect(calculateAdventureValue({ completedQuests: 4, dungeonFloorsCleared: [1, 2, 3] })).toBe(7);
  });

  it('contains no retired account copy in the tutorial or manual', () => {
    const tutorialCopy = TUTORIAL_STEPS.map(step => `${step.title} ${step.content} ${step.tip ?? ''}`).join('\n');
    const manualSource = source('src/components/game/UserManual.tsx');
    const setupSource = source('src/components/screens/GameSetup.tsx');

    expect(containsRetiredInvestmentAccountCopy(tutorialCopy)).toBe(false);
    expect(containsRetiredInvestmentAccountCopy(manualSource)).toBe(false);
    expect(containsRetiredInvestmentAccountCopy(setupSource)).toBe(false);
  });

  it('describes the newspaper at the General Store with free weekly rereading', () => {
    expect(PLAYER_RULE_TEXT.newspaper).toContain('General Store');
    expect(PLAYER_RULE_TEXT.newspaper).toContain('reread for free');

    const generalStore = source('src/components/game/GeneralStorePanel.tsx');
    expect(generalStore).toContain("purchaseNewspaper(player.id, 'general-store')");
    expect(generalStore).toContain("player.hasNewspaper ? 'Read The Guildholm Herald'");
  });

  it('matches shortest-route and partial-travel movement behavior', () => {
    const movementSource = source('src/hooks/useLocationClick.ts');
    expect(movementSource).toContain('getPath');
    expect(movementSource).toContain('calculatePartialTravel');
    expect(PLAYER_RULE_TEXT.movement).toContain('shortest route');
    expect(PLAYER_RULE_TEXT.movement).toContain('travel as far as your remaining time allows');
    expect(PLAYER_RULE_TEXT.movement).not.toMatch(/choose clockwise|choose counter-clockwise/i);
  });

  it('uses the actual lottery prizes on every active purchase surface', () => {
    const weekEnd = source('src/store/helpers/weekEndHelpers.ts');
    const generalStore = source('src/components/game/GeneralStorePanel.tsx');
    const shadowMarket = source('src/components/game/ShadowMarketPanel.tsx');

    expect(weekEnd).toContain(`const LOTTERY_GRAND_PRIZE = ${PLAYER_RULE_VALUES.lotteryGrandPrize}`);
    expect(weekEnd).toContain(`const LOTTERY_SMALL_PRIZE = ${PLAYER_RULE_VALUES.lotterySmallPrize}`);
    expect(`${generalStore}\n${shadowMarket}`).not.toContain('5,000g');
    expect(PLAYER_RULE_TEXT.lottery).toContain(`${PLAYER_RULE_VALUES.lotteryGrandPrize}g grand prize`);
  });
});
