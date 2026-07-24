import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const notificationMocks = vi.hoisted(() => ({
  warning: vi.fn(),
  getAppliance: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { warning: notificationMocks.warning },
}));

vi.mock('@/data/items', () => ({
  getAppliance: notificationMocks.getAppliance,
}));

import { useApplianceBreakageNotification } from './useApplianceBreakageNotification';

describe('useApplianceBreakageNotification', () => {
  beforeEach(() => {
    notificationMocks.warning.mockReset();
    notificationMocks.getAppliance.mockReset();
  });

  it('shows the appliance name and dismisses a regular breakage event', () => {
    notificationMocks.getAppliance.mockReturnValue({ name: 'Frost Chest' });
    const dismissEvent = vi.fn();

    renderHook(() => useApplianceBreakageNotification({
      event: {
        applianceId: 'frost-chest',
        repairCost: 80,
        fromCurse: false,
      },
      dismissEvent,
    }));

    expect(notificationMocks.getAppliance).toHaveBeenCalledWith('frost-chest');
    expect(notificationMocks.warning).toHaveBeenCalledWith(
      'Your Frost Chest broke! Repair cost: ~80g (Forge is cheaper).',
      { duration: 6000 },
    );
    expect(dismissEvent).toHaveBeenCalledTimes(1);
  });

  it('falls back to the appliance id when item data is unavailable', () => {
    notificationMocks.getAppliance.mockReturnValue(undefined);
    const dismissEvent = vi.fn();

    renderHook(() => useApplianceBreakageNotification({
      event: {
        applianceId: 'legacy-appliance',
        repairCost: 25,
      },
      dismissEvent,
    }));

    expect(notificationMocks.warning).toHaveBeenCalledWith(
      'Your legacy-appliance broke! Repair cost: ~25g (Forge is cheaper).',
      { duration: 6000 },
    );
    expect(dismissEvent).toHaveBeenCalledTimes(1);
  });

  it('leaves curse breakage events for the dedicated modal', () => {
    const dismissEvent = vi.fn();

    renderHook(() => useApplianceBreakageNotification({
      event: {
        applianceId: 'frost-chest',
        repairCost: 80,
        fromCurse: true,
      },
      dismissEvent,
    }));

    expect(notificationMocks.getAppliance).not.toHaveBeenCalled();
    expect(notificationMocks.warning).not.toHaveBeenCalled();
    expect(dismissEvent).not.toHaveBeenCalled();
  });

  it('does nothing without a breakage event', () => {
    const dismissEvent = vi.fn();

    renderHook(() => useApplianceBreakageNotification({
      event: null,
      dismissEvent,
    }));

    expect(notificationMocks.getAppliance).not.toHaveBeenCalled();
    expect(notificationMocks.warning).not.toHaveBeenCalled();
    expect(dismissEvent).not.toHaveBeenCalled();
  });
});
