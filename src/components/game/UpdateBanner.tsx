import { RefreshCw } from 'lucide-react';
import { useAppUpdate } from '@/hooks/useAppUpdate';

export function UpdateBanner() {
  const { needRefresh, updateApp } = useAppUpdate();

  if (!needRefresh) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="parchment-panel px-5 py-3 flex items-center gap-3 shadow-lg border-2 border-primary/50">
        <RefreshCw className="w-5 h-5 text-primary animate-spin" style={{ animationDuration: '3s' }} />
        <div className="flex flex-col">
          <span className="font-display text-sm text-card-foreground font-bold">
            A new version is available!
          </span>
          <span className="text-[10px] text-muted-foreground">
            Click to update and see latest features
          </span>
        </div>
        <button
          onClick={updateApp}
          className="gold-button text-xs px-4 py-1.5 font-bold"
        >
          Update Now
        </button>
      </div>
    </div>
  );
}

/** Build timestamp visible in Options — helps verify the running version. */
export function getBuildVersion(): string {
  try {
    const ts = __BUILD_TIME__;
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'dev';
  }
}
