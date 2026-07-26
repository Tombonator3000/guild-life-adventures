import { lazy, Suspense, useState } from 'react';
import { Trophy } from 'lucide-react';

const HighScoreScreen = lazy(() => import('./HighScoreScreen').then(module => ({
  default: module.HighScoreScreen,
})));

export function TitleHighScoreLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-30 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 hover:brightness-110"
        style={{
          background: 'rgba(6,4,1,0.78)',
          color: '#f5d98a',
          border: '1px solid rgba(200,146,42,0.35)',
          backdropFilter: 'blur(4px)',
        }}
        title="Open Hall of Fame and world ranking"
      >
        <Trophy className="w-5 h-5" />
        <span className="text-xs font-display tracking-wider uppercase">Hall of Fame</span>
      </button>

      {open && (
        <Suspense fallback={null}>
          <HighScoreScreen onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
