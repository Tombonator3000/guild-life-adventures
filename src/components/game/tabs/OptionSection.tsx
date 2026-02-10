// Shared section wrapper for Options and Developer tabs
// Amber-tinted box with title bar, used across RightSideTabs sections

export function OptionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-amber-100/50 rounded p-2 border border-amber-700/30">
      <h3 className="font-display text-[10px] font-bold text-amber-900 mb-1.5 uppercase tracking-wide border-b border-amber-700/30 pb-0.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex justify-between">
      <kbd className="px-1 bg-amber-200/50 rounded text-amber-900 font-mono text-[8px]">{keys}</kbd>
      <span className="text-amber-700">{action}</span>
    </div>
  );
}
