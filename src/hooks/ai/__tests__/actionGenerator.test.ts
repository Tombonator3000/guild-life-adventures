import { describe, it, expect } from 'vitest';
import {
  AI_PERSONALITIES,
  AI_ID_TO_PERSONALITY,
  getAIPersonality,
  DIFFICULTY_SETTINGS,
  type AIPersonality,
  type DifficultySettings,
} from '../types';
import type { AIAction } from '../types';

// ============================================================
// Personality System Tests
// ============================================================

describe('AI_PERSONALITIES', () => {
  it('defines exactly 4 personalities', () => {
    expect(Object.keys(AI_PERSONALITIES)).toHaveLength(4);
  });

  it('each personality has valid weight values (> 0)', () => {
    for (const [id, p] of Object.entries(AI_PERSONALITIES)) {
      for (const [key, val] of Object.entries(p.weights)) {
        expect(val, `${id}.weights.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('each personality has a unique preferred goal', () => {
    const goals = Object.values(AI_PERSONALITIES).map(p => p.preferredGoal);
    expect(new Set(goals).size).toBe(4);
  });

  it('grimwald is balanced (all weights = 1.0)', () => {
    const g = AI_PERSONALITIES.grimwald;
    for (const val of Object.values(g.weights)) {
      expect(val).toBe(1.0);
    }
  });

  it('seraphina favors education and caution', () => {
    const s = AI_PERSONALITIES.seraphina;
    expect(s.weights.education).toBeGreaterThan(1.0);
    expect(s.weights.caution).toBeGreaterThan(1.0);
    expect(s.weights.combat).toBeLessThan(1.0);
  });

  it('thornwick favors wealth and rivalry', () => {
    const t = AI_PERSONALITIES.thornwick;
    expect(t.weights.wealth).toBeGreaterThan(1.0);
    expect(t.weights.rivalry).toBeGreaterThan(1.0);
  });

  it('morgath favors combat with low caution', () => {
    const m = AI_PERSONALITIES.morgath;
    expect(m.weights.combat).toBeGreaterThan(1.0);
    expect(m.weights.caution).toBeLessThan(1.0);
    expect(m.dungeonRiskTolerance).toBeLessThan(1.0); // braver
  });
});

describe('AI_ID_TO_PERSONALITY', () => {
  it('maps all 4 AI IDs to personality IDs', () => {
    expect(AI_ID_TO_PERSONALITY['ai-grimwald']).toBe('grimwald');
    expect(AI_ID_TO_PERSONALITY['ai-seraphina']).toBe('seraphina');
    expect(AI_ID_TO_PERSONALITY['ai-thornwick']).toBe('thornwick');
    expect(AI_ID_TO_PERSONALITY['ai-morgath']).toBe('morgath');
  });
});

describe('getAIPersonality', () => {
  it('returns correct personality for known AI IDs', () => {
    expect(getAIPersonality('ai-seraphina').id).toBe('seraphina');
    expect(getAIPersonality('ai-morgath').id).toBe('morgath');
  });

  it('falls back to grimwald for unknown IDs', () => {
    expect(getAIPersonality('unknown-player').id).toBe('grimwald');
    expect(getAIPersonality('').id).toBe('grimwald');
  });
});

// ============================================================
// Difficulty Settings Tests
// ============================================================

describe('DIFFICULTY_SETTINGS', () => {
  it('defines easy, medium, hard', () => {
    expect(DIFFICULTY_SETTINGS.easy).toBeDefined();
    expect(DIFFICULTY_SETTINGS.medium).toBeDefined();
    expect(DIFFICULTY_SETTINGS.hard).toBeDefined();
  });

  it('easy has lowest aggressiveness and planning depth', () => {
    const { easy, medium, hard } = DIFFICULTY_SETTINGS;
    expect(easy.aggressiveness).toBeLessThan(medium.aggressiveness);
    expect(medium.aggressiveness).toBeLessThan(hard.aggressiveness);
    expect(easy.planningDepth).toBeLessThan(medium.planningDepth);
    expect(medium.planningDepth).toBeLessThan(hard.planningDepth);
  });

  it('easy has highest mistake chance', () => {
    const { easy, medium, hard } = DIFFICULTY_SETTINGS;
    expect(easy.mistakeChance).toBeGreaterThan(medium.mistakeChance);
    expect(medium.mistakeChance).toBeGreaterThan(hard.mistakeChance);
  });

  it('hard has fastest decision delay', () => {
    const { easy, hard } = DIFFICULTY_SETTINGS;
    expect(hard.decisionDelay).toBeLessThan(easy.decisionDelay);
  });
});

// ============================================================
// Action Generator Helper Tests (pure functions extracted from actionGenerator.ts)
// We test the personality weight application logic directly
// ============================================================

describe('personality weight application', () => {
  // Reproduce the weight mapping and apply function from actionGenerator.ts
  const PERSONALITY_WEIGHT_CATEGORY: Partial<Record<string, keyof AIPersonality['weights']>> = {
    'study': 'education',
    'graduate': 'education',
    'work': 'wealth',
    'deposit-bank': 'wealth',
    'explore-dungeon': 'combat',
    'buy-equipment': 'combat',
    'rest': 'social',
    'buy-appliance': 'social',
    'heal': 'caution',
    'buy-lottery-ticket': 'gambling',
    'buy-stock': 'gambling',
  };

  function applyPersonalityWeights(actions: AIAction[], personality: AIPersonality): void {
    for (const action of actions) {
      const category = PERSONALITY_WEIGHT_CATEGORY[action.type];
      if (category) {
        action.priority = Math.round(action.priority * personality.weights[category]);
      }
    }
  }

  it('seraphina boosts education actions', () => {
    const actions: AIAction[] = [
      { type: 'study', priority: 50, description: 'Study' },
      { type: 'work', priority: 50, description: 'Work' },
    ];
    applyPersonalityWeights(actions, AI_PERSONALITIES.seraphina);
    // education weight = 1.5, wealth weight = 0.8
    expect(actions[0].priority).toBe(75); // 50 * 1.5
    expect(actions[1].priority).toBe(40); // 50 * 0.8
  });

  it('morgath boosts combat actions', () => {
    const actions: AIAction[] = [
      { type: 'explore-dungeon', priority: 60, description: 'Dungeon' },
      { type: 'rest', priority: 60, description: 'Rest' },
    ];
    applyPersonalityWeights(actions, AI_PERSONALITIES.morgath);
    // combat = 1.6, social = 0.6
    expect(actions[0].priority).toBe(96);  // 60 * 1.6
    expect(actions[1].priority).toBe(36);  // 60 * 0.6
  });

  it('grimwald leaves all priorities unchanged', () => {
    const actions: AIAction[] = [
      { type: 'study', priority: 50, description: 'Study' },
      { type: 'work', priority: 50, description: 'Work' },
      { type: 'explore-dungeon', priority: 50, description: 'Dungeon' },
    ];
    applyPersonalityWeights(actions, AI_PERSONALITIES.grimwald);
    for (const a of actions) {
      expect(a.priority).toBe(50);
    }
  });

  it('does not modify move/end-turn actions (no category)', () => {
    const actions: AIAction[] = [
      { type: 'move', priority: 40, description: 'Move', location: 'academy' },
      { type: 'end-turn', priority: 1, description: 'End' },
    ];
    applyPersonalityWeights(actions, AI_PERSONALITIES.seraphina);
    expect(actions[0].priority).toBe(40);
    expect(actions[1].priority).toBe(1);
  });
});

describe('time budget awareness', () => {
  function applyTimeBudgetAwareness(actions: AIAction[], turnTimeRatio: number): void {
    for (const action of actions) {
      if (turnTimeRatio < 0.25) {
        const quickActions = ['buy-food', 'buy-clothing', 'deposit-bank', 'withdraw-bank',
          'pay-rent', 'buy-fresh-food', 'buy-lottery-ticket', 'pawn-appliance',
          'complete-quest', 'graduate', 'sell-item', 'repay-loan'];
        if (quickActions.includes(action.type)) {
          action.priority += 8;
        }
        if (action.type === 'study' || action.type === 'explore-dungeon') {
          action.priority -= 10;
        }
      } else if (turnTimeRatio > 0.8) {
        const highValueActions = ['work', 'study', 'explore-dungeon', 'take-quest'];
        if (highValueActions.includes(action.type)) {
          action.priority += 5;
        }
      }
    }
  }

  it('boosts quick actions late in turn', () => {
    const actions: AIAction[] = [
      { type: 'deposit-bank', priority: 40, description: 'Deposit' },
      { type: 'study', priority: 50, description: 'Study' },
    ];
    applyTimeBudgetAwareness(actions, 0.1); // late
    expect(actions[0].priority).toBe(48); // +8
    expect(actions[1].priority).toBe(40); // -10
  });

  it('boosts high-value actions early in turn', () => {
    const actions: AIAction[] = [
      { type: 'work', priority: 50, description: 'Work' },
      { type: 'deposit-bank', priority: 40, description: 'Deposit' },
    ];
    applyTimeBudgetAwareness(actions, 0.9); // early
    expect(actions[0].priority).toBe(55); // +5
    expect(actions[1].priority).toBe(40); // unchanged
  });

  it('does not modify actions mid-turn', () => {
    const actions: AIAction[] = [
      { type: 'work', priority: 50, description: 'Work' },
      { type: 'study', priority: 50, description: 'Study' },
    ];
    applyTimeBudgetAwareness(actions, 0.5);
    expect(actions[0].priority).toBe(50);
    expect(actions[1].priority).toBe(50);
  });
});
