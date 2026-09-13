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
        className="entry-button entry-button--quiet"
        title="Open Hall of Fame and world ranking"
      >
        <Trophy className="w-5 h-5" />
        <span>Hall of Fame</span>
      </button>

      {open && (
        <Suspense fallback={null}>
          <HighScoreScreen onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
