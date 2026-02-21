import { useState } from 'react';
import { getAppliance } from '@/data/items';
import type { HomeItemPositions } from '@/types/game.types';

// Default appliance positions within the room scene (percentages)
const APPLIANCE_POSITIONS: Record<string, { left: string; bottom: string; icon: string; label: string }> = {
  'scrying-mirror':       { left: '8%',  bottom: '38%', icon: '\u{1FA9E}', label: 'Scrying Mirror' },
  'simple-scrying-glass': { left: '8%',  bottom: '38%', icon: '\u{1F52E}', label: 'Scrying Glass' },
  'memory-crystal':       { left: '72%', bottom: '44%', icon: '\u{1F48E}', label: 'Memory Crystal' },
  'music-box':            { left: '60%', bottom: '28%', icon: '\u{1F3B5}', label: 'Music Box' },
  'cooking-fire':         { left: '82%', bottom: '22%', icon: '\u{1F525}', label: 'Cooking Fire' },
  'preservation-box':     { left: '85%', bottom: '38%', icon: '\u{1F4E6}', label: 'Preservation Box' },
  'arcane-tome':          { left: '22%', bottom: '30%', icon: '\u{1F4D6}', label: 'Arcane Tome' },
  'frost-chest':          { left: '90%', bottom: '32%', icon: '\u2744\uFE0F', label: 'Frost Chest' },
};

// Default durable item display positions in the room
const DURABLE_POSITIONS: Record<string, { left: string; bottom: string; icon: string }> = {
  'candles':      { left: '45%', bottom: '52%', icon: '\u{1F56F}\uFE0F' },
  'blanket':      { left: '35%', bottom: '18%', icon: '\u{1F6CF}\uFE0F' },
  'furniture':    { left: '38%', bottom: '32%', icon: '\u{1FA91}' },
  'glow-orb':     { left: '50%', bottom: '58%', icon: '\u{1F4A1}' },
  'warmth-stone': { left: '75%', bottom: '16%', icon: '\u{1FAA8}' },
  'dagger':       { left: '15%', bottom: '52%', icon: '\u{1F5E1}\uFE0F' },
  'sword':        { left: '12%', bottom: '56%', icon: '\u2694\uFE0F' },
  'shield':       { left: '18%', bottom: '56%', icon: '\u{1F6E1}\uFE0F' },
};

export { APPLIANCE_POSITIONS };

/** Resolves position: uses customPositions if provided, otherwise falls back to the hardcoded default string */
function resolvePos(
  itemId: string,
  defaultLeft: string,
  defaultBottom: string,
  customPositions?: HomeItemPositions,
): { left: string; bottom: string } {
  const custom = customPositions?.[itemId];
  if (custom) {
    return { left: `${custom.left}%`, bottom: `${custom.bottom}%` };
  }
  return { left: defaultLeft, bottom: defaultBottom };
}

/** Item icon component: tries a JPG image first, falls back to emoji */
function ItemIcon({ itemId, icon, size = 'normal' }: { itemId: string; icon: string; size?: 'normal' | 'small' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = `${import.meta.env.BASE_URL}items/${itemId}.jpg`;
  const emojiStyle = {
    fontSize: size === 'small'
      ? 'clamp(0.8rem, 2vw, 1.4rem)'
      : 'clamp(1rem, 2.5vw, 1.8rem)',
    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))',
  };

  if (!imgFailed) {
    return (
      <img
        src={src}
        alt={itemId}
        draggable={false}
        onError={() => setImgFailed(true)}
        style={{
          width: size === 'small' ? 'clamp(20px, 3.5vw, 36px)' : 'clamp(28px, 4vw, 48px)',
          height: size === 'small' ? 'clamp(20px, 3.5vw, 36px)' : 'clamp(28px, 4vw, 48px)',
          objectFit: 'cover',
          borderRadius: 4,
          filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    );
  }
  return <span style={emojiStyle}>{icon}</span>;
}

interface RoomSceneProps {
  isNoble: boolean;
  isSlums: boolean;
  wallColor: string;
  wallAccent: string;
  floorColor: string;
  floorAccent: string;
  ownedAppliances: string[];
  brokenAppliances: string[];
  ownedDurables: string[];
  relaxation: number;
  /** Optional custom item positions from the Zone Editor's Home Layout mode */
  customPositions?: HomeItemPositions;
}

export function RoomScene({
  isNoble,
  isSlums,
  ownedAppliances,
  brokenAppliances,
  ownedDurables,
  relaxation,
  customPositions,
}: RoomSceneProps) {
  const bgImage = isNoble
    ? `${import.meta.env.BASE_URL}locations/noble-heights.jpg`
    : `${import.meta.env.BASE_URL}locations/slums.jpg`;

  return (
    <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
      {/* Background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Slight overlay for readability of overlaid items */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.15)' }}
      />

      {/* Owned appliances rendered in the room */}
      {ownedAppliances.map(applianceId => {
        const def = APPLIANCE_POSITIONS[applianceId];
        if (!def) return null;
        const appliance = getAppliance(applianceId);
        const pos = resolvePos(applianceId, def.left, def.bottom, customPositions);
        return (
          <div
            key={applianceId}
            className="absolute flex flex-col items-center"
            style={{
              left: pos.left,
              bottom: pos.bottom,
              transform: 'translateX(-50%)',
              zIndex: 5,
            }}
            title={appliance?.name || def.label}
          >
            <ItemIcon itemId={applianceId} icon={def.icon} />
          </div>
        );
      })}

      {/* Broken appliances shown dimmed with crack */}
      {brokenAppliances.map(applianceId => {
        const def = APPLIANCE_POSITIONS[applianceId];
        if (!def) return null;
        const appliance = getAppliance(applianceId);
        const pos = resolvePos(applianceId, def.left, def.bottom, customPositions);
        return (
          <div
            key={`broken-${applianceId}`}
            className="absolute flex flex-col items-center"
            style={{
              left: pos.left,
              bottom: pos.bottom,
              transform: 'translateX(-50%)',
              opacity: 0.5,
              zIndex: 5,
            }}
            title={`${appliance?.name || def.label} (BROKEN)`}
          >
            <span style={{ fontSize: 'clamp(1rem, 2.5vw, 1.8rem)', filter: 'grayscale(0.8) drop-shadow(1px 1px 2px rgba(0,0,0,0.5))' }}>
              {def.icon}
            </span>
            <span style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.7rem)', color: '#ff4444', fontWeight: 'bold' }}>{'\u2717'}</span>
          </div>
        );
      })}

      {/* Owned durable items in the room */}
      {ownedDurables.map(durableId => {
        const def = DURABLE_POSITIONS[durableId];
        if (!def) return null;
        const pos = resolvePos(durableId, def.left, def.bottom, customPositions);
        return (
          <div
            key={durableId}
            className="absolute"
            style={{
              left: pos.left,
              bottom: pos.bottom,
              transform: 'translateX(-50%)',
              zIndex: 4,
            }}
            title={durableId}
          >
            <ItemIcon itemId={durableId} icon={def.icon} size="small" />
          </div>
        );
      })}

      {/* Empty room hint */}
      {ownedAppliances.length === 0 && ownedDurables.length === 0 && (
        <div
          className="absolute text-center pointer-events-none"
          style={{
            bottom: '18%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#f0e8d8',
            fontSize: 'clamp(0.5rem, 0.9vw, 0.7rem)',
            fontStyle: 'italic',
            opacity: 0.8,
            zIndex: 10,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          Your home is quite bare...
        </div>
      )}

      {/* Relaxation stat display */}
      <div
        className="absolute font-mono"
        style={{
          top: '4%',
          right: '4%',
          fontSize: 'clamp(0.45rem, 0.8vw, 0.6rem)',
          color: '#e0d8c8',
          background: 'rgba(0,0,0,0.6)',
          padding: 'clamp(1px, 0.3vw, 3px) clamp(3px, 0.6vw, 6px)',
          borderRadius: '2px',
          zIndex: 10,
        }}
      >
        Relaxation: {relaxation}/50
      </div>
    </div>
  );
}
