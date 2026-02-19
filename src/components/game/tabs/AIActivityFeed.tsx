// AIActivityFeed — shows recent AI opponent actions in the Players tab
// Reads from the aiActivityLog store slice populated by useGrimwaldAI

import { useGameStore } from '@/store/gameStore';

export function AIActivityFeed() {
  const log = useGameStore(s => s.aiActivityLog);

  if (log.length === 0) return null;

  // Show last 15 entries, newest at top
  const recent = [...log].reverse().slice(0, 15);

  return (
    <div className="pt-2 mt-2 border-t border-amber-300/50">
      <p className="text-[10px] text-amber-700 font-semibold mb-1 uppercase tracking-wide">
        Recent AI Actions
      </p>
      <div className="space-y-0.5 max-h-36 overflow-y-auto scrollbar-thin">
        {recent.map((entry, i) => (
          <div key={i} className="flex items-start gap-1.5 min-w-0">
            {/* Color dot */}
            <span
              className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.playerColor }}
            />
            {/* Action text */}
            <span className="text-[10px] text-amber-800 leading-tight min-w-0">
              <span className="font-semibold">{entry.playerName}:</span>{' '}
              {entry.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
