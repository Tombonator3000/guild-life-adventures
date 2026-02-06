// NPC Portrait component with image support and emoji fallback
// Tries to load portraitImage (JPG/PNG), falls back to emoji portrait on error

import { useState } from 'react';
import type { LocationNPC } from '@/data/npcs';

interface NpcPortraitProps {
  npc: LocationNPC;
}

export function NpcPortrait({ npc }: NpcPortraitProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = npc.portraitImage && !imgFailed;

  return (
    <div
      className="w-32 h-36 rounded-lg border-2 flex items-center justify-center overflow-hidden mb-1.5 shadow-inner"
      style={{
        backgroundColor: npc.bgColor,
        borderColor: npc.accentColor,
        boxShadow: `inset 0 2px 8px rgba(0,0,0,0.4), 0 0 12px ${npc.accentColor}33`,
      }}
    >
      {showImage ? (
        <img
          src={`${import.meta.env.BASE_URL}${npc.portraitImage}`}
          alt={npc.name}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="text-7xl">{npc.portrait}</span>
      )}
    </div>
  );
}
