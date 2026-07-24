import { useEffect } from 'react';
import { toast } from 'sonner';
import { getAppliance } from '@/data/items';

interface ApplianceBreakageNotification {
  applianceId: string;
  repairCost: number;
  fromCurse?: boolean;
}

interface UseApplianceBreakageNotificationOptions {
  event: ApplianceBreakageNotification | null;
  dismissEvent: () => void;
}

export function useApplianceBreakageNotification({
  event,
  dismissEvent,
}: UseApplianceBreakageNotificationOptions) {
  useEffect(() => {
    if (!event || event.fromCurse) return;

    const appliance = getAppliance(event.applianceId);
    const name = appliance?.name || event.applianceId;
    toast.warning(
      `Your ${name} broke! Repair cost: ~${event.repairCost}g (Forge is cheaper).`,
      { duration: 6000 },
    );
    dismissEvent();
  }, [event, dismissEvent]);
}
