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
      className="shrink-0 flex items-center justify-center gap-2 py-2 px-3 flex-wrap"
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
        className="font-bold uppercase tracking-wider transition-colors"
        style={{
          background: canRelax
            ? 'linear-gradient(180deg, #4a8a4a 0%, #3a7a3a 100%)'
            : '#3a3a2a',
          color: canRelax ? '#e0ffe0' : '#6b6b5a',
          border: `2px solid ${canRelax ? '#5aaa5a' : '#4a4a3a'}`,
          borderRadius: '3px',
          padding: 'clamp(3px, 0.6vw, 8px) clamp(8px, 1.5vw, 18px)',
          fontSize: 'clamp(0.5rem, 1vw, 0.75rem)',
          cursor: canRelax ? 'pointer' : 'not-allowed',
          opacity: canRelax ? 1 : 0.6,
        }}
        title={`Relax for ${relaxHours} hours (+3 happiness, +5 relaxation)`}
      >
        Relax ({relaxHours}h)
      </button>

      {/* Sleep button */}
      <button
        onClick={onSleep}
        disabled={!canSleep}
        className="font-bold uppercase tracking-wider transition-colors"
        style={{
          background: canSleep
            ? 'linear-gradient(180deg, #4a5a8a 0%, #3a4a7a 100%)'
            : '#3a3a2a',
          color: canSleep ? '#e0e0ff' : '#6b6b5a',
          border: `2px solid ${canSleep ? '#5a6aaa' : '#4a4a3a'}`,
          borderRadius: '3px',
          padding: 'clamp(3px, 0.6vw, 8px) clamp(8px, 1.5vw, 18px)',
          fontSize: 'clamp(0.5rem, 1vw, 0.75rem)',
          cursor: canSleep ? 'pointer' : 'not-allowed',
          opacity: canSleep ? 1 : 0.6,
        }}
        title="Sleep for 8 hours (+8 happiness, +10 health, +5 relaxation)"
      >
        Sleep (8h)
      </button>

      {/* Done button */}
      <button
        onClick={onDone}
        className="font-bold uppercase tracking-wider transition-colors"
        style={{
          background: 'linear-gradient(180deg, #8b7355 0%, #6b5a42 100%)',
          color: '#f0e8d8',
          border: '2px solid #a08a68',
          borderRadius: '3px',
          padding: 'clamp(3px, 0.6vw, 8px) clamp(8px, 1.5vw, 18px)',
          fontSize: 'clamp(0.5rem, 1vw, 0.75rem)',
          cursor: 'pointer',
        }}
      >
        Done
      </button>
    </div>
  );
}
