// BanterBubble - Large speech bubble displayed above the center panel
// Shows NPC banter as a prominent, easy-to-read overlay on the game board

import { useEffect, useState } from 'react';
import type { BanterLine } from '@/data/banter';

interface BanterBubbleProps {
  banter: BanterLine;
  npcName: string;
  onDismiss: () => void;
}

export function BanterBubble({ banter, npcName, onDismiss }: BanterBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onDismiss, 400);
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  // Mood-based styling — background gradient + border + glow
  const moodStyles: Record<string, { bg: string; border: string; glow: string; icon: string }> = {
    friendly: {
      bg: 'linear-gradient(135deg, #2a4a2a 0%, #3d6a3d 50%, #2a4a2a 100%)',
      border: '#6b9e6b',
      glow: 'rgba(107, 158, 107, 0.4)',
      icon: '\u263A', // smiley
    },
    grumpy: {
      bg: 'linear-gradient(135deg, #4a3a2a 0%, #6a5040 50%, #4a3a2a 100%)',
      border: '#9b8365',
      glow: 'rgba(155, 131, 101, 0.4)',
      icon: '\uD83D\uDE20', // angry face
    },
    mysterious: {
      bg: 'linear-gradient(135deg, #2a2a4a 0%, #3d3d6a 50%, #2a2a4a 100%)',
      border: '#7b7bae',
      glow: 'rgba(123, 123, 174, 0.5)',
      icon: '\u2728', // sparkles
    },
    gossip: {
      bg: 'linear-gradient(135deg, #4a2a4a 0%, #6a3d6a 50%, #4a2a4a 100%)',
      border: '#ae7bae',
      glow: 'rgba(174, 123, 174, 0.4)',
      icon: '\uD83D\uDDE3', // speaking head
    },
    warning: {
      bg: 'linear-gradient(135deg, #4a2a2a 0%, #6a3d3d 50%, #4a2a2a 100%)',
      border: '#ae7b7b',
      glow: 'rgba(174, 123, 123, 0.4)',
      icon: '\u26A0', // warning
    },
  };

  const mood = banter.mood || 'friendly';
  const style = moodStyles[mood] || moodStyles.friendly;

  return (
    <div
      className={`
        pointer-events-auto cursor-pointer
        transition-all duration-400 ease-out
        ${isVisible && !isLeaving
          ? 'opacity-100 translate-y-0 scale-100'
          : isLeaving
            ? 'opacity-0 -translate-y-4 scale-95'
            : 'opacity-0 translate-y-4 scale-95'
        }
      `}
      onClick={() => {
        setIsLeaving(true);
        setTimeout(onDismiss, 300);
      }}
      title="Click to dismiss"
    >
      {/* Speech bubble */}
      <div
        className="relative rounded-xl border-2 shadow-2xl"
        style={{
          background: style.bg,
          borderColor: style.border,
          boxShadow: `0 8px 32px ${style.glow}, 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`,
          padding: 'clamp(10px, 2vw, 20px) clamp(14px, 2.5vw, 28px)',
          maxWidth: 'clamp(260px, 40vw, 480px)',
          minWidth: 'clamp(180px, 25vw, 280px)',
        }}
      >
        {/* NPC name label */}
        <div
          className="font-display font-bold uppercase tracking-wider mb-1"
          style={{
            color: style.border,
            fontSize: 'clamp(0.55rem, 1.1vw, 0.8rem)',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {style.icon} {npcName} says:
        </div>

        {/* Banter text — large and readable */}
        <p
          className="italic leading-relaxed"
          style={{
            color: '#e8dcc8',
            fontSize: 'clamp(0.8rem, 1.6vw, 1.15rem)',
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            lineHeight: '1.5',
          }}
        >
          &ldquo;{banter.text}&rdquo;
        </p>

        {/* Speech bubble tail (triangle pointing down) */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: '100%',
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: `14px solid ${style.border}`,
            filter: `drop-shadow(0 4px 6px ${style.glow})`,
          }}
        />
        {/* Inner tail (matches background) */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 'calc(100% - 2px)',
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '12px solid #3d5a3d',
            borderTopColor:
              mood === 'friendly' ? '#3d6a3d' :
              mood === 'grumpy' ? '#6a5040' :
              mood === 'mysterious' ? '#3d3d6a' :
              mood === 'gossip' ? '#6a3d6a' :
              mood === 'warning' ? '#6a3d3d' : '#3d6a3d',
          }}
        />
      </div>
    </div>
  );
}
