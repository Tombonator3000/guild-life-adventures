import toadImage from '@/assets/events/curse-of-the-toad.jpg';
import { playSFX } from '@/audio/sfxManager';
import { useEffect } from 'react';

interface CurseToadPanelProps {
  hoursLost: number;
  curserName?: string;
  onDismiss: () => void;
}

export function CurseToadPanel({
  hoursLost,
  curserName,
  onDismiss,
}: CurseToadPanelProps) {
  const curser = curserName ?? 'An enemy';

  useEffect(() => {
    playSFX('curse-cast');
  }, []);

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground overflow-hidden">
      {/* Woodcut image with sepia + green tint */}
      <div className="relative flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ maxHeight: '32%' }}>
        <img
          src={toadImage}
          alt="Nobleman transformed into a frog by dark magic"
          className="w-full h-full object-contain"
          style={{ filter: 'sepia(0.15) brightness(0.9) saturate(1.2)' }}
        />
        {/* Green-purple vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 35%, rgba(22,101,52,0.30) 80%, rgba(88,28,135,0.40) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 items-center justify-center gap-2 px-4 py-3 text-center overflow-auto">
        {/* Title */}
        <div
          className="text-lg font-bold leading-tight"
          style={{ color: 'hsl(var(--primary))' }}
        >
          🐸 Ribbiiit! You are a frog!
        </div>

        {/* Flavor text */}
        <p className="text-xs text-muted-foreground leading-snug italic">
          {curser} has cursed you with the ancient Curse of the Toad. Your fingers
          are green. Your legs are shorter. Every hop wastes precious time…
        </p>

        {/* Time lost info box */}
        <div className="mt-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Ribbit around wastes{' '}
          <span className="font-semibold text-[#3d2a14]">−{hoursLost} hours</span>{' '}
          this turn.{' '}
          <span className="text-muted-foreground">The curse lifts at end of week.</span>
        </div>

        {/* Dismiss button */}
        <button
          className="mt-2 w-full bg-purple-900 text-amber-100 hover:bg-purple-800 border border-purple-700 text-sm font-semibold rounded px-3 py-1.5 transition-colors"
          onClick={onDismiss}
        >
          Ribbit… Understood
        </button>
      </div>
    </div>
  );
}
