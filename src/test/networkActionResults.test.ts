import { describe, it, expect, afterEach } from 'vitest';
import {
  subscribeActionResult,
  trackPendingAction,
  resolveAction,
  clearPendingActions,
  type NetworkActionResultEvent,
} from '@/network/NetworkActionProxy';

describe('NetworkActionProxy action-result subscription', () => {
  afterEach(() => clearPendingActions());

  it('emits a failure event when the host rejects sabotagePlayer', () => {
    const events: NetworkActionResultEvent[] = [];
    const unsub = subscribeActionResult(e => events.push(e));

    trackPendingAction('req-1', 'sabotagePlayer', ['self', 'rival', 'pickpocket']);
    resolveAction('req-1', false, 'Not enough gold');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actionName: 'sabotagePlayer',
      success: false,
      error: 'Not enough gold',
      timedOut: false,
    });
    expect(events[0].args).toEqual(['self', 'rival', 'pickpocket']);
    unsub();
  });

  it('emits a success event for buyProtection and buyTipOff', () => {
    const events: NetworkActionResultEvent[] = [];
    const unsub = subscribeActionResult(e => events.push(e));

    trackPendingAction('req-2', 'buyProtection', ['self', 3]);
    resolveAction('req-2', true);
    trackPendingAction('req-3', 'buyTipOff', ['self', 'rival']);
    resolveAction('req-3', true);

    expect(events.map(e => e.actionName)).toEqual(['buyProtection', 'buyTipOff']);
    expect(events.every(e => e.success)).toBe(true);
    unsub();
  });

  it('does not emit for unknown request ids', () => {
    const events: NetworkActionResultEvent[] = [];
    const unsub = subscribeActionResult(e => events.push(e));
    resolveAction('never-tracked', false, 'x');
    expect(events).toHaveLength(0);
    unsub();
  });
});