import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getWorkPreview } from '@/store/helpers/workEducationHelpers';
import { getWorkInfo } from '@/components/game/locationTabs';
import type { LocationTabContext } from '@/components/game/locationTabContext';

beforeEach(() => {
  useGameStore.getState().startNewGame(['Worker'], false, { wealth:5000, happiness:100, education:45, career:75, adventure:0 });
  const player = useGameStore.getState().players[0];
  useGameStore.setState({ week:7, players:[{...player, currentJob:'apprentice-smith', currentWage:8, currentLocation:'forge', clothingCondition:50}] });
});

describe('work preview matches real service results', () => {
  it.each([null, 'midsummer-fair'] as const)('includes festival %s, bonuses and both debt deductions', festival => {
    const player = useGameStore.getState().players[0];
    useGameStore.setState({activeFestival:festival, players:[{...player, weeksSinceRent:4, rentDebt:200, loanAmount:100, loanWeeksRemaining:0, permanentGoldBonus:.2}]});
    const before = useGameStore.getState().players[0];
    const preview = getWorkPreview(before, 8, 7, festival);
    expect(useGameStore.getState().players[0]).toBe(before);
    expect(preview.deductions).toBeGreaterThan(0);
    const result = useGameStore.getState().performWorkShift(before.id, 'full');
    expect(result && result.success).toBe(true);
    const after = useGameStore.getState().players[0];
    expect(after.gold).toBe(preview.goldAfter);
    expect(after.timeRemaining).toBe(preview.hoursAfter);
    expect(before.happiness - after.happiness).toBe(preview.happinessLoss);
  });

  it('offers a real short shift and blocks inadequate clothing before clicking', () => {
    const player = useGameStore.getState().players[0];
    useGameStore.setState({players:[{...player,timeRemaining:3}]});
    const context = () => ({...useGameStore.getState(), player:useGameStore.getState().players[0]}) as unknown as LocationTabContext;
    const work = getWorkInfo('forge', context())!;
    expect(work.hoursPerShift).toBe(3);
    expect(work.canWork).toBe(true);
    work.onWork();
    expect(useGameStore.getState().players[0].gold).toBe(work.preview.goldAfter);
    expect(useGameStore.getState().players[0].timeRemaining).toBe(0);
    expect(getWorkInfo('forge', context())?.blockedReason).toMatch(/No hours/);
    useGameStore.setState({players:[{...player,clothingCondition:1}]});
    expect(getWorkInfo('forge', context())?.canWork).toBe(false);
    expect(getWorkInfo('forge', context())?.blockedReason).toMatch(/clothing/);
    expect(getWorkInfo('bank', context())).toBeNull();
  });
});
