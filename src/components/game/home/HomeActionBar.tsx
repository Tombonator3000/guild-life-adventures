interface HomeActionBarProps {
  isNoble: boolean;
  canRelax: boolean;
  canSleep: boolean;
  relaxHours: number;
  onRelax: () => void;
  onSleep: () => void;
  onDone: () => void;
}

export function HomeActionBar({
  isNoble,
  canRelax,
  canSleep,
  relaxHours,
  onRelax,
  onSleep,
  onDone,
}: HomeActionBarProps) {
  return (
    <div
      className="guild-home-actions shrink-0 flex items-center justify-center gap-2 py-2 px-3 flex-wrap"
      style={{
        background: isNoble
          ? 'linear-gradient(180deg, #4a3568 0%, #3a2558 100%)'
          : 'linear-gradient(180deg, #3d3224 0%, #2d2218 100%)',
        borderTop: `2px solid ${isNoble ? '#8a6aaa' : '#8b7355'}`,
      }}
    >
      {/* Relax button — combined rest & relaxation recovery */}
      <button
        onClick={onRelax}
        disabled={!canRelax}
        className="guild-button guild-board-button guild-button--gold"
        title={`Relax for ${relaxHours} hours (+3 happiness, +5 relaxation)`}
      >
        Relax ({relaxHours}h)
      </button>

      {/* Sleep button */}
      <button
        onClick={onSleep}
        disabled={!canSleep}
        className="guild-button guild-board-button"
        title="Sleep for 8 hours (+8 happiness, +10 health, +5 relaxation)"
      >
        Sleep (8h)
      </button>

      {/* Done button */}
      <button
        onClick={onDone}
        className="guild-button guild-board-button"
      >
        Done
      </button>
    </div>
  );
}
