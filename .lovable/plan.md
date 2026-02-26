

## Plan: Make AI More Competitive — Education Pipeline & Strategic Overhaul

### Problem Analysis (from screenshots and code review)

The statistics show clear AI weaknesses:
- **Tuck (human)**: 54 Education, 6 Degrees, 109 Career, 1712g Wealth, 15 Quests
- **Grimwald**: 18 Education, 2 Degrees, 89 Career, 386g Wealth, 5 Quests
- **Seraphina** (Scholar personality!): 9 Education, 1 Degree, 86 Career, 0g Wealth, 3 Quests

Seraphina — who has a 1.5x education weight — finished only 1 degree in 37 weeks. The human finished 6. This is catastrophic.

### Root Causes Identified

**1. Education is gated behind "weakest goal" check**
`generateGoalActions` only generates education actions when `weakestGoal === 'education'`. But education is measured as `completedDegrees * 9`, and with default goals of ~50, the AI needs 6 degrees. Early game, wealth and career are typically weaker, so education actions never fire until it's too late.

**2. Cash flow check blocks education too aggressively**
In `generateEducationActions` (goalActions.ts line 37-43): if `shortfallRisk` is true AND gold < 3x session cost, education is skipped entirely. With 5g/session costs, this blocks study when gold < 15g — but the AI often has 50-100g and still skips because `shortfallRisk` triggers from projected rent.

**3. No education actions in `generateStrategicActions`**
The strategic actions module generates job-seeking, work, housing, and banking — but has NO education fallback. Education only comes from `goalActions` (weakest goal) and `educationPipelineActions` (only when 1 degree away from a better job AND already started).

**4. Commitment plan for degrees has duration too short**
`tryEarnDegreePlan` creates a 2-turn (medium) or 4-turn (hard) plan, but 10 sessions × 6 hours = 60 hours = 1 full turn of pure study. At best the AI studies 2-3 sessions per turn (competing with work/food/rent), so a degree takes 4-5 turns. The plan expires before completion.

**5. AI doesn't proactively pursue education for job upgrades**
The `educationPipelineActions` in strategicActions.ts only fires when the AI is 1 missing degree away AND has already started it. It never plans "I should start this degree to get a better job."

**6. Seraphina's education weight (1.5x) is nearly useless**
The 1.5x multiplier on `study` priority (e.g., 70 × 1.5 = 105) only matters when education IS the weakest goal. Since it rarely is, the multiplier has no effect.

### Solution: 7 Targeted Changes

#### Change 1: Always-On Education Strategy (New)
**File: `src/hooks/ai/actions/strategicActions.ts`**

Add a new sub-generator `generateProactiveEducationActions` that fires REGARDLESS of weakest goal. Logic:
- If AI has < 3 completed degrees AND gold > 50 AND no degree currently near-completion: suggest starting a degree
- Priority: 45 (below critical needs but always present)
- Uses `getNextDegreeByROI` to pick the best degree
- Only when at academy or when travel + study fits in time budget

#### Change 2: Education-Career Pipeline — Remove "already started" gate
**File: `src/hooks/ai/actions/strategicActions.ts`**

In `generateEducationPipelineActions`: remove the `progressOnMissing <= 0` early return. The AI should START degrees that unlock better jobs, not just finish ones it randomly started.

#### Change 3: Relax Cash Flow Gate for Education
**File: `src/hooks/ai/actions/goalActions.ts`**

Change the cash flow check (lines 37-43) from blocking when gold < 3× session cost to only blocking when gold < session cost + 20 (bare minimum to pay for one session and still buy food).

#### Change 4: Extend Commitment Plan Duration for Degrees
**File: `src/hooks/ai/commitmentPlan.ts`**

In `tryEarnDegreePlan`: change medium AI maxDuration from 2 to 4, hard AI from 4 to 6. This gives enough turns to actually finish a degree.

#### Change 5: Add Education Weight to Strategic Actions
**File: `src/hooks/ai/actionGenerator.ts`**

Add `'study'` and `'graduate'` to a new always-applied education boost when the personality has education weight > 1.0. Currently the personality weight only applies AFTER actions are generated — but if no education actions are generated, there's nothing to weight. The fix is to ensure education actions ARE generated (Change 1), and then the personality weight naturally amplifies them.

#### Change 6: Smarter Weakest Goal for Education-Dependent Goals
**File: `src/hooks/ai/strategy.ts`**

In `getWeakestGoal`: when career is the weakest goal BUT the AI has no job (or a low-paying job) AND has fewer than 2 degrees, consider education as a stepping stone — return 'education' instead. This creates a natural education→career pipeline.

#### Change 7: Increase AI Work Efficiency (More Shifts Per Turn)
**File: `src/hooks/ai/actions/strategicActions.ts`**

In `generateWorkActions`: boost work priority when AI has a high-paying job and wealth is weak. Currently work priority is 50 + modest boosts. Raise base work priority to 55 and increase the wage-based boost from `min(15)` to `min(25)` for hard AI.

### Technical Details

**Change 1 — New function in strategicActions.ts:**
```typescript
function generateProactiveEducationActions(ctx: ActionContext): AIAction[] {
  const { player, settings, currentLocation, moveCost } = ctx;
  if (player.completedDegrees.length >= 4) return []; // Enough degrees
  
  const nextDegree = getNextDegreeByROI(player, settings);
  if (!nextDegree) return [];
  if (player.gold < nextDegree.costPerSession + 20) return [];
  
  // Check if already studying this (in-progress)
  const progress = player.degreeProgress[nextDegree.id] || 0;
  const sessionsLeft = nextDegree.sessionsRequired - progress;
  
  // Higher priority if already in progress
  const basePriority = progress > 0 ? 55 : 45;
  // Seraphina/scholar types get natural boost via personality weights
  
  if (currentLocation === 'academy' && player.timeRemaining >= nextDegree.hoursPerSession) {
    return [{
      type: 'study',
      priority: basePriority,
      description: `Study ${nextDegree.name} (proactive, ${sessionsLeft} sessions left)`,
      details: { degreeId: nextDegree.id, cost: nextDegree.costPerSession, hours: nextDegree.hoursPerSession },
    }];
  }
  if (player.timeRemaining > moveCost('academy') + nextDegree.hoursPerSession) {
    return [{
      type: 'move',
      location: 'academy',
      priority: basePriority - 5,
      description: `Travel to academy to study ${nextDegree.name}`,
    }];
  }
  return [];
}
```

**Change 2 — strategicActions.ts, `generateEducationPipelineActions`:**
Remove lines checking `if (progressOnMissing <= 0) return [];`. Instead, always consider starting the missing degree if the job upgrade is worth it.

**Change 3 — goalActions.ts, line 39:**
```typescript
// OLD: player.gold < nextDegree.costPerSession * 3
// NEW: player.gold < nextDegree.costPerSession + 15
if (forecast.shortfallRisk && player.gold < nextDegree.costPerSession + 15) {
```

**Change 4 — commitmentPlan.ts, `tryEarnDegreePlan`:**
```typescript
maxDuration: settings.planningDepth >= 3 ? 6 : 4,
```

**Change 6 — strategy.ts, `getWeakestGoal`:**
After the sprint check but before returning the weakest goal, add:
```typescript
// Education stepping stone: if career or wealth is weakest but we have few degrees,
// redirect to education (degrees unlock better jobs → faster career/wealth)
const weakest = goals[0];
if ((weakest.name === 'career' || weakest.name === 'wealth') 
    && progress.education.progress < 0.5 
    && progress.education.progress < weakest.progress + 0.2) {
  return 'education';
}
```

**Change 7 — strategicActions.ts, `generateWorkActions`:**
```typescript
// OLD: priority: 50 + wealthNeedBoost + wageBoost
// NEW: base 55, boost up to 25
const baseWorkPriority = 55;
const wageBoost = settings.planningDepth >= 3 ? Math.min(25, Math.round(valuePerHour * 3)) : 0;
return [{ type: 'work', priority: baseWorkPriority + wealthNeedBoost + wageBoost, ... }];
```

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/ai/actions/strategicActions.ts` | Add proactive education generator; fix pipeline gate; boost work priority |
| `src/hooks/ai/actions/goalActions.ts` | Relax cash flow gate for education |
| `src/hooks/ai/commitmentPlan.ts` | Extend degree plan duration (2→4, 4→6) |
| `src/hooks/ai/strategy.ts` | Education stepping stone in weakest goal logic |
| `CLAUDE.md` | Document AI education conventions |
| `log2.md` | Timestamped changelog entry |

### Expected Impact

- AI will start pursuing degrees from week 3-5 instead of week 15-20
- Seraphina's 1.5x education weight will actually matter (proactive education actions exist to be weighted)
- Education→career pipeline ensures AI gets better jobs mid-game
- Grimwald should finish 3-4 degrees (was 2), Seraphina 4-5 (was 1)
- Higher-paying jobs → more gold → competitive wealth goal
- Career (dependability) benefits from more work shifts at better-paying jobs

