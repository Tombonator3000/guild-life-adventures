import { useState, useEffect } from 'react';
import { getPortrait, type PortraitDefinition } from '@/data/portraits';

interface CharacterPortraitProps {
  portraitId: string | null;
  playerColor: string;
  playerName: string;
  /** Width in pixels (and height when shape is 'circle') */
  size: number;
  /** Optional explicit height in pixels (defaults to size) */
  height?: number;
  className?: string;
  isAI?: boolean;
  /** Shape of the portrait frame. Default 'circle'. */
  shape?: 'circle' | 'rect';
  /** Show cursed aura when player has active hexes */
  hasCurse?: boolean;
}

/**
 * Renders a character portrait inside a circular frame.
 * Tries to load the JPG image first; falls back to a generated placeholder SVG.
 */
export function CharacterPortrait({
  portraitId,
  playerColor,
  playerName,
  size,
  height,
  className = '',
  isAI = false,
  shape = 'circle',
  hasCurse = false,
}: CharacterPortraitProps) {
  const [imageError, setImageError] = useState(false);
  const portrait = getPortrait(portraitId);
  const actualHeight = height ?? size;
  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  // Reset error state when portrait changes (e.g., different AI player)
  useEffect(() => {
    setImageError(false);
  }, [portraitId]);

  // If no portrait selected, show colored circle with initial
  if (!portrait) {
    return (
      <div
        className={`${roundedClass} border-2 border-white/60 flex items-center justify-center relative ${className}`}
        style={{
          width: size,
          height: actualHeight,
          backgroundColor: playerColor,
          minWidth: size,
          minHeight: actualHeight,
        }}
      >
        <span
          className="font-bold text-white drop-shadow-md"
          style={{ fontSize: size * 0.4 }}
        >
          {isAI ? 'AI' : playerName.charAt(0).toUpperCase()}
        </span>
        {hasCurse && <CurseOverlay size={size} height={actualHeight} shape={shape} />}
      </div>
    );
  }

  const imageSrc = `${import.meta.env.BASE_URL}${portrait.imagePath}`;

  return (
    <div
      className={`${roundedClass} border-2 border-white/60 overflow-hidden relative ${className}`}
      style={{
        width: size,
        height: actualHeight,
        minWidth: size,
        minHeight: actualHeight,
        backgroundColor: portrait.placeholderColors.bg,
      }}
    >
      {!imageError ? (
        <img
          src={imageSrc}
          alt={portrait.name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : (
        <PlaceholderPortrait portrait={portrait} size={size} isAI={isAI} />
      )}
      {hasCurse && <CurseOverlay size={size} height={actualHeight} shape={shape} />}
    </div>
  );
}

/** Pulsing purple curse aura overlay */
function CurseOverlay({ size, height, shape }: { size: number; height: number; shape: 'circle' | 'rect' }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none animate-curse-pulse ${
        shape === 'circle' ? 'rounded-full' : 'rounded-lg'
      }`}
      style={{
        boxShadow: '0 0 8px 3px rgba(147, 51, 234, 0.5), inset 0 0 6px 2px rgba(147, 51, 234, 0.3)',
        border: '1px solid rgba(147, 51, 234, 0.4)',
      }}
    />
  );
}

/** Generated SVG placeholder portrait */
function PlaceholderPortrait({
  portrait,
  size,
  isAI,
}: {
  portrait: PortraitDefinition;
  size: number;
  isAI: boolean;
}) {
  const { bg, accent, skin } = portrait.placeholderColors;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="100" height="100" fill={bg} />

      {/* Decorative pattern */}
      <circle cx="50" cy="100" r="45" fill={accent} opacity="0.3" />

      {/* Body/shoulders */}
      <ellipse cx="50" cy="95" rx="35" ry="25" fill={accent} opacity="0.8" />

      {/* Neck */}
      <rect x="43" y="58" width="14" height="12" rx="3" fill={skin} />

      {/* Head */}
      <ellipse cx="50" cy="42" rx="20" ry="22" fill={skin} />

      {/* Hair/helmet based on portrait type */}
      {portrait.id === 'warrior' && (
        <>
          {/* Helmet */}
          <path d="M30 38 Q50 10 70 38 L68 30 Q50 5 32 30 Z" fill={accent} />
          <rect x="32" y="36" width="36" height="4" rx="1" fill={accent} opacity="0.7" />
        </>
      )}
      {portrait.id === 'mage' && (
        <>
          {/* Wizard hat */}
          <path d="M35 35 L50 5 L65 35 Z" fill={accent} />
          <ellipse cx="50" cy="36" rx="22" ry="5" fill={accent} opacity="0.8" />
        </>
      )}
      {portrait.id === 'rogue' && (
        <>
          {/* Hood */}
          <path d="M28 45 Q30 15 50 12 Q70 15 72 45" fill={accent} opacity="0.9" />
          <ellipse cx="50" cy="35" rx="20" ry="10" fill={accent} opacity="0.3" />
        </>
      )}
      {portrait.id === 'cleric' && (
        <>
          {/* Halo */}
          <ellipse cx="50" cy="20" rx="18" ry="5" fill={accent} opacity="0.6" />
          <ellipse cx="50" cy="20" rx="14" ry="3" fill="none" stroke={accent} strokeWidth="2" />
        </>
      )}
      {portrait.id === 'ranger' && (
        <>
          {/* Green hood */}
          <path d="M28 42 Q35 15 50 12 Q65 15 72 42" fill={accent} opacity="0.9" />
          <circle cx="38" cy="18" r="3" fill={accent} opacity="0.6" />
        </>
      )}
      {portrait.id === 'bard' && (
        <>
          {/* Feathered hat */}
          <path d="M30 35 Q40 18 55 20 Q70 22 68 38" fill={accent} opacity="0.8" />
          <path d="M60 22 Q72 8 75 20" fill={accent} opacity="0.6" strokeWidth="1" />
        </>
      )}
      {portrait.id === 'paladin' && (
        <>
          {/* Full helmet */}
          <path d="M28 45 Q28 12 50 8 Q72 12 72 45" fill={accent} opacity="0.9" />
          <rect x="42" y="32" width="16" height="10" rx="2" fill={bg} opacity="0.5" />
        </>
      )}
      {portrait.id === 'merchant' && (
        <>
          {/* Wide-brimmed hat */}
          <ellipse cx="50" cy="28" rx="28" ry="6" fill={accent} opacity="0.8" />
          <path d="M35 28 Q40 14 50 12 Q60 14 65 28" fill={accent} />
        </>
      )}

      {/* AI-specific: dark cloak/hood */}
      {isAI && portrait.id.startsWith('ai-') && (
        <>
          <path d="M25 50 Q30 10 50 5 Q70 10 75 50" fill={accent} opacity="0.7" />
        </>
      )}

      {/* Eyes */}
      <ellipse cx="42" cy="42" rx="4" ry="3" fill="white" />
      <ellipse cx="58" cy="42" rx="4" ry="3" fill="white" />
      <circle cx="43" cy="42" r="2" fill="#333" />
      <circle cx="59" cy="42" r="2" fill="#333" />

      {/* Mouth */}
      <path d="M43 52 Q50 56 57 52" fill="none" stroke="#8B6B5A" strokeWidth="1.5" strokeLinecap="round" />

      {/* Name banner at bottom */}
      <rect x="10" y="82" width="80" height="16" rx="3" fill="rgba(0,0,0,0.6)" />
      <text
        x="50"
        y="93"
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="bold"
        fontFamily="serif"
      >
        {portrait.name}
      </text>
    </svg>
  );
}
