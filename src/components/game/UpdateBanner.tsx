import { RefreshCw } from 'lucide-react';
import { useAppUpdate } from '@/hooks/useAppUpdate';

export function UpdateBanner() {
  const { needRefresh, updateApp } = useAppUpdate();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="parchment-panel px-5 py-3 flex items-center gap-3 shadow-lg">
        <RefreshCw className="w-4 h-4 text-primary animate-spin" style={{ animationDuration: '3s' }} />
        <span className="font-display text-sm text-card-foreground">
          A new version is available!
        </span>
        <button
          onClick={updateApp}
          className="gold-button text-xs px-3 py-1"
        >
          Update Now
        </button>
      </div>
    </div>
  );
}
