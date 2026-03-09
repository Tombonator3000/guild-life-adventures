// NPC Portrait component with video, image, and emoji fallback
// If portraitVideo is set, plays it looped and muted.
// Falls back to portraitImage (JPG/PNG), then emoji on error.

import { useState } from 'react';
import type { LocationNPC } from '@/data/npcs';

interface NpcPortraitProps {
  npc: LocationNPC;
  size?: 'normal' | 'large' | 'xl';
}

const SIZES = {
  normal: 'w-40 h-44',
  large: 'w-48 h-56',
  xl: 'w-60 h-72',
};

export function NpcPortrait({ npc, size = 'normal' }: NpcPortraitProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass = SIZES[size];

  const showVideo = !!npc.portraitVideo && !videoFailed;
  const showImage = !showVideo && !!npc.portraitImage && !imgFailed;

  return (
    <div
      className={`${sizeClass} rounded-lg border-2 flex items-center justify-center overflow-hidden mb-1.5 shadow-inner`}
      style={{
        backgroundColor: npc.bgColor,
        borderColor: npc.accentColor,
        boxShadow: `inset 0 2px 8px rgba(0,0,0,0.4), 0 0 12px ${npc.accentColor}33`,
      }}
    >
      {showVideo ? (
        <video
          src={`${import.meta.env.BASE_URL}${npc.portraitVideo}`}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onError={() => setVideoFailed(true)}
        />
      ) : showImage ? (
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
