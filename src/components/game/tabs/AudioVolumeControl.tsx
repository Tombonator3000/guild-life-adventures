// Reusable audio volume control with mute toggle + slider + percentage display
// Deduplicates the 3 identical audio control patterns (Music, Ambient, SFX)

import { VolumeX } from 'lucide-react';

interface AudioVolumeControlProps {
  label: string;
  icon: React.ReactNode;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export function AudioVolumeControl({
  label,
  icon,
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}: AudioVolumeControlProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleMute}
        className={`p-1.5 rounded border text-xs transition-colors ${
          muted
            ? 'bg-red-100 border-red-300 text-red-700'
            : 'bg-amber-200/50 border-amber-600/50 text-amber-900'
        }`}
        title={muted ? `Unmute ${label}` : `Mute ${label}`}
      >
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : icon}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={muted ? 0 : Math.round(volume * 100)}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10) / 100;
          onVolumeChange(v);
          if (muted && v > 0) onToggleMute();
        }}
        className="flex-1 h-2 accent-amber-700 cursor-pointer"
        title={`${label} volume: ${Math.round(volume * 100)}%`}
      />
      <span className="text-[10px] text-amber-800 font-display w-7 text-right">
        {muted ? '0' : Math.round(volume * 100)}%
      </span>
    </div>
  );
}
