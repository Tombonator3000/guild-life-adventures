// BanterBubble - Speech bubble for NPC banter
// Appears above NPC portrait when triggered

import { useEffect, useState } from 'react';
import type { BanterLine } from '@/data/banter';

interface BanterBubbleProps {
  banter: BanterLine;
  onDismiss: () => void;
}

export function BanterBubble({ banter, onDismiss }: BanterBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto-dismiss after 4 seconds
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onDismiss, 300);
    }, 4000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  // Mood-based styling
  const moodStyles = {
    friendly: 'bg-[#3d5a3d] border-[#6b8e6b]',
    grumpy: 'bg-[#5a4a3a] border-[#8b7355]',
    mysterious: 'bg-[#3a3a5a] border-[#6b6b8e]',
    gossip: 'bg-[#5a3a5a] border-[#8e6b8e]',
    warning: 'bg-[#5a3a3a] border-[#8e6b6b]',
  };

  const moodStyle = moodStyles[banter.mood || 'friendly'];

  return (
    <div
      className={`
        absolute top-0 left-1/2 -translate-x-1/2 z-50
        transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      {/* Speech bubble */}
      <div
        className={`
          relative px-3 py-2 rounded-lg border-2 shadow-lg
          max-w-[200px] min-w-[120px]
          ${moodStyle}
        `}
      >
        {/* Text */}
        <p className="text-[11px] text-[#e0d4b8] leading-tight italic">
          "{banter.text}"
        </p>

        {/* Speech bubble tail */}
        <div
          className={`
            absolute top-full left-1/2 -translate-x-1/2 -mt-px
            w-0 h-0 
            border-l-[8px] border-l-transparent
            border-r-[8px] border-r-transparent
            border-t-[8px]
          `}
          style={{
            borderTopColor: banter.mood === 'friendly' ? '#3d5a3d' :
                           banter.mood === 'grumpy' ? '#5a4a3a' :
                           banter.mood === 'mysterious' ? '#3a3a5a' :
                           banter.mood === 'gossip' ? '#5a3a5a' :
                           banter.mood === 'warning' ? '#5a3a3a' : '#3d5a3d',
          }}
        />
      </div>
    </div>
  );
}
