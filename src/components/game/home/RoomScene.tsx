import { getAppliance } from '@/data/items';

// Appliance positions within the room scene (percentages)
const APPLIANCE_POSITIONS: Record<string, { left: string; bottom: string; icon: string; label: string }> = {
  'scrying-mirror': { left: '8%', bottom: '38%', icon: '\u{1FA9E}', label: 'Scrying Mirror' },
  'simple-scrying-glass': { left: '8%', bottom: '38%', icon: '\u{1F52E}', label: 'Scrying Glass' },
  'memory-crystal': { left: '72%', bottom: '44%', icon: '\u{1F48E}', label: 'Memory Crystal' },
  'music-box': { left: '60%', bottom: '28%', icon: '\u{1F3B5}', label: 'Music Box' },
  'cooking-fire': { left: '82%', bottom: '22%', icon: '\u{1F525}', label: 'Cooking Fire' },
  'preservation-box': { left: '85%', bottom: '38%', icon: '\u{1F4E6}', label: 'Preservation Box' },
  'arcane-tome': { left: '22%', bottom: '30%', icon: '\u{1F4D6}', label: 'Arcane Tome' },
  'frost-chest': { left: '90%', bottom: '32%', icon: '\u{2744}\u{FE0F}', label: 'Frost Chest' },
};

// Durable item display in room
const DURABLE_POSITIONS: Record<string, { left: string; bottom: string; icon: string }> = {
  'candles': { left: '45%', bottom: '52%', icon: '\u{1F56F}\u{FE0F}' },
  'blanket': { left: '35%', bottom: '18%', icon: '\u{1F6CF}\u{FE0F}' },
  'furniture': { left: '38%', bottom: '32%', icon: '\u{1FA91}' },
  'glow-orb': { left: '50%', bottom: '58%', icon: '\u{1F4A1}' },
  'warmth-stone': { left: '75%', bottom: '16%', icon: '\u{1FAA8}' },
  'dagger': { left: '15%', bottom: '52%', icon: '\u{1F5E1}\u{FE0F}' },
  'sword': { left: '12%', bottom: '56%', icon: '\u{2694}\u{FE0F}' },
  'shield': { left: '18%', bottom: '56%', icon: '\u{1F6E1}\u{FE0F}' },
};

export { APPLIANCE_POSITIONS };

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
}

export function RoomScene({
  isNoble,
  isSlums,
  ownedAppliances,
  brokenAppliances,
  ownedDurables,
  relaxation,
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
        const pos = APPLIANCE_POSITIONS[applianceId];
        if (!pos) return null;
        const appliance = getAppliance(applianceId);
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
            title={appliance?.name || pos.label}
          >
            <span style={{ fontSize: 'clamp(1rem, 2.5vw, 1.8rem)', filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))' }}>
              {pos.icon}
            </span>
          </div>
        );
      })}

      {/* Broken appliances shown dimmed with crack */}
      {brokenAppliances.map(applianceId => {
        const pos = APPLIANCE_POSITIONS[applianceId];
        if (!pos) return null;
        const appliance = getAppliance(applianceId);
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
            title={`${appliance?.name || pos.label} (BROKEN)`}
          >
            <span style={{ fontSize: 'clamp(1rem, 2.5vw, 1.8rem)', filter: 'grayscale(0.8) drop-shadow(1px 1px 2px rgba(0,0,0,0.5))' }}>
              {pos.icon}
            </span>
            <span style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.7rem)', color: '#ff4444', fontWeight: 'bold' }}>{'\u2717'}</span>
          </div>
        );
      })}

      {/* Owned durable items in the room */}
      {ownedDurables.map(durableId => {
        const pos = DURABLE_POSITIONS[durableId];
        if (!pos) return null;
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
            <span style={{ fontSize: 'clamp(0.8rem, 2vw, 1.4rem)', filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))' }}>
              {pos.icon}
            </span>
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
