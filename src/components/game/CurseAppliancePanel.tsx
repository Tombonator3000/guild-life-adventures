import hexCurseImage from '@/assets/events/hex-appliance-curse.jpg';
import { getAppliance } from '@/data/items';
import { playSFX } from '@/audio/sfxManager';
import { useEffect } from 'react';

interface CurseAppliancePanelProps {
  applianceId: string;
  originalPrice: number;
  curserName?: string;
  onDismiss: () => void;
}

export function CurseAppliancePanel({
  applianceId,
  originalPrice,
  curserName,
  onDismiss,
}: CurseAppliancePanelProps) {
  const appliance = getAppliance(applianceId);
  const applianceName = appliance?.name ?? applianceId;
  const curser = curserName ?? 'An enemy';

  // Enchanter: 5–25% of original price
  const enchanterMin = Math.max(1, Math.floor(originalPrice / 20));
  const enchanterMax = Math.max(1, Math.floor(originalPrice / 4));
  // Forge: 50% of Enchanter cost, min 5g
  const forgeMin = Math.max(5, Math.floor(enchanterMin * 0.5));
  const forgeMax = Math.max(5, Math.floor(enchanterMax * 0.5));

  useEffect(() => {
    playSFX('curse-cast');
  }, []);

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground overflow-hidden">
      {/* Woodcut image with sepia filter */}
      <div className="relative flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ maxHeight: '32%' }}>
        <img
          src={hexCurseImage}
          alt="Dark sorcerer casting a hex curse"
          className="w-full h-full object-contain"
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
          Cursed by {curser}!
        </div>

        {/* Appliance destroyed */}
        <p className="text-sm text-muted-foreground leading-snug">
          Your <span className="font-semibold text-[#3d2a14]">{applianceName}</span> has been
          destroyed by dark magic!
        </p>

        {/* Repair options — both locations */}
        <div className="mt-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground w-full">
          <div className="font-semibold text-[#3d2a14] mb-1">Repair options:</div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[#2a5c3a]">Forge</span>
              <span className="text-[#2a5c3a]">~{forgeMin}–{forgeMax}g &bull; 3h</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Enchanter</span>
              <span>~{enchanterMin}–{enchanterMax}g &bull; 2h</span>
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          className="mt-2 w-full bg-purple-900 text-amber-100 hover:bg-purple-800 border border-purple-700 text-sm font-semibold rounded px-3 py-1.5 transition-colors"
          onClick={onDismiss}
        >
          Understood
        </button>
      </div>
    </div>
  );
}
