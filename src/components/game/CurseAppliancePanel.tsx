import hexCurseImage from '@/assets/events/hex-appliance-curse.jpg';
import { Button } from '@/components/ui/button';
import { getAppliance } from '@/data/items';

interface CurseAppliancePanelProps {
  applianceId: string;
  repairCost: number;
  curserName?: string;
  onDismiss: () => void;
}

export function CurseAppliancePanel({
  applianceId,
  repairCost,
  curserName,
  onDismiss,
}: CurseAppliancePanelProps) {
  const appliance = getAppliance(applianceId);
  const applianceName = appliance?.name ?? applianceId;
  const curser = curserName ?? 'An enemy';

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground overflow-hidden">
      {/* Woodcut image with sepia filter */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ maxHeight: '45%' }}>
        <img
          src={hexCurseImage}
          alt="Dark sorcerer casting a hex curse"
          className="w-full h-full object-cover"
          style={{ filter: 'sepia(0.3) brightness(0.92)' }}
        />
        {/* Purple vignette overlay for hex atmosphere */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(88,28,135,0.35) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 items-center justify-center gap-2 px-4 py-3 text-center overflow-auto">
        {/* Title */}
        <div className="text-lg font-bold leading-tight" style={{ color: 'hsl(var(--primary))' }}>
          🔮 Cursed by {curser}!
        </div>

        {/* Appliance destroyed */}
        <p className="text-sm text-muted-foreground leading-snug">
          Your <span className="font-semibold text-foreground">{applianceName}</span> has been
          destroyed by dark magic!
        </p>

        {/* Repair info */}
        <div className="mt-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Repair cost:{' '}
          <span className="font-semibold text-foreground">{repairCost}g</span> at the{' '}
          <span className="font-semibold text-foreground">Enchanter</span>
        </div>

        {/* Dismiss button */}
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={onDismiss}
        >
          Understood
        </Button>
      </div>
    </div>
  );
}
