import type { Player } from '@/types/game.types';
import { HOUSING_DATA } from '@/data/housing';
import { getAppliance } from '@/data/items';
import { JonesButton } from './JonesStylePanel';

interface HomePanelProps {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyRelaxation: (playerId: string, amount: number) => void;
  onDone: () => void;
}

// Appliance positions within the room scene (percentages)
const APPLIANCE_POSITIONS: Record<string, { left: string; bottom: string; icon: string; label: string }> = {
  'scrying-mirror': { left: '8%', bottom: '38%', icon: '🪞', label: 'Scrying Mirror' },
  'simple-scrying-glass': { left: '8%', bottom: '38%', icon: '🔮', label: 'Scrying Glass' },
  'memory-crystal': { left: '72%', bottom: '44%', icon: '💎', label: 'Memory Crystal' },
  'music-box': { left: '60%', bottom: '28%', icon: '🎵', label: 'Music Box' },
  'cooking-fire': { left: '82%', bottom: '22%', icon: '🔥', label: 'Cooking Fire' },
  'preservation-box': { left: '85%', bottom: '38%', icon: '📦', label: 'Preservation Box' },
  'arcane-tome': { left: '22%', bottom: '30%', icon: '📖', label: 'Arcane Tome' },
  'frost-chest': { left: '90%', bottom: '32%', icon: '❄️', label: 'Frost Chest' },
};

// Durable item display in room
const DURABLE_POSITIONS: Record<string, { left: string; bottom: string; icon: string }> = {
  'candles': { left: '45%', bottom: '52%', icon: '🕯️' },
  'blanket': { left: '35%', bottom: '18%', icon: '🛏️' },
  'furniture': { left: '38%', bottom: '32%', icon: '🪑' },
  'glow-orb': { left: '50%', bottom: '58%', icon: '💡' },
  'warmth-stone': { left: '75%', bottom: '16%', icon: '🪨' },
  'dagger': { left: '15%', bottom: '52%', icon: '🗡️' },
  'sword': { left: '12%', bottom: '56%', icon: '⚔️' },
  'shield': { left: '18%', bottom: '56%', icon: '🛡️' },
};

export function HomePanel({
  player,
  spendTime,
  modifyHappiness,
  modifyHealth,
  modifyRelaxation,
  onDone,
}: HomePanelProps) {
  if (player.housing === 'homeless') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#1a1410] p-4">
        <div className="text-[#8b7355] text-center font-mono">
          <p className="text-lg mb-2">You have no home.</p>
          <p className="text-sm">Visit the Landlord's Office to rent a place.</p>
        </div>
        <JonesButton label="DONE" onClick={onDone} className="mt-4" />
      </div>
    );
  }

  const housingData = HOUSING_DATA[player.housing];
  const isNoble = player.housing === 'noble';
  const isSlums = player.housing === 'slums';

  // Get owned appliances
  const ownedAppliances = Object.keys(player.appliances).filter(
    id => player.appliances[id] && !player.appliances[id].isBroken
  );
  const brokenAppliances = Object.keys(player.appliances).filter(
    id => player.appliances[id]?.isBroken
  );

  // Get owned durables
  const ownedDurables = Object.keys(player.durables).filter(
    id => player.durables[id] > 0
  );

  const canRelax = player.timeRemaining >= housingData.relaxationRate && housingData.relaxationRate > 0;
  const canSleep = player.timeRemaining >= 8;

  const handleRelax = () => {
    spendTime(player.id, housingData.relaxationRate);
    modifyHappiness(player.id, 5);  // Increased from 3 — relaxing should meaningfully offset work fatigue
    modifyRelaxation(player.id, 3);
  };

  const handleSleep = () => {
    spendTime(player.id, 8);
    modifyHappiness(player.id, 8);   // Increased from 5 — sleep is the primary active happiness recovery
    modifyHealth(player.id, 10);
    modifyRelaxation(player.id, 5);
  };

  // Wall and floor colors based on housing tier
  const wallColor = isNoble ? '#5c4a6d' : isSlums ? '#3d3224' : '#4a3d2e';
  const wallAccent = isNoble ? '#7a6290' : isSlums ? '#2d2218' : '#5a4d3e';
  const floorColor = isNoble ? '#6b4e2e' : isSlums ? '#4a3828' : '#5a4430';
  const floorAccent = isNoble ? '#7d5e3e' : isSlums ? '#3a2a1a' : '#6a5440';

  return (
    <div className="h-full flex flex-col overflow-hidden select-none" style={{ background: '#1a1410' }}>
      {/* Header banner */}
      <div
        className="text-center py-1.5 font-bold tracking-widest uppercase text-white shrink-0"
        style={{
          background: isNoble
            ? 'linear-gradient(180deg, #6b4e8a 0%, #4a3568 100%)'
            : isSlums
              ? 'linear-gradient(180deg, #5c4a32 0%, #3d3224 100%)'
              : 'linear-gradient(180deg, #5a4d3e 0%, #4a3d2e 100%)',
          borderBottom: `2px solid ${isNoble ? '#8a6aaa' : '#8b7355'}`,
          fontSize: 'clamp(0.7rem, 1.5vw, 1rem)',
        }}
      >
        {isNoble ? 'Noble Heights Estate' : isSlums ? 'The Slums' : 'Modest Dwelling'}
      </div>

      {/* Room scene */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        {/* Back wall */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${wallAccent} 0%, ${wallColor} 60%, ${floorColor} 60%, ${floorAccent} 100%)`,
          }}
        />

        {/* Wall texture / pattern - stone for slums, wallpaper for noble */}
        {isSlums && (
          <>
            {/* Cracks in the wall */}
            <div className="absolute" style={{ top: '15%', left: '20%', width: '2px', height: '20%', background: '#1a1410', opacity: 0.4, transform: 'rotate(15deg)' }} />
            <div className="absolute" style={{ top: '10%', left: '65%', width: '1px', height: '15%', background: '#1a1410', opacity: 0.3, transform: 'rotate(-10deg)' }} />
            <div className="absolute" style={{ top: '25%', left: '75%', width: '2px', height: '12%', background: '#1a1410', opacity: 0.3, transform: 'rotate(5deg)' }} />
          </>
        )}

        {isNoble && (
          <>
            {/* Decorative wallpaper pattern */}
            <div className="absolute" style={{ top: '5%', left: '5%', right: '5%', height: '2px', background: '#8a6aaa', opacity: 0.3 }} />
            <div className="absolute" style={{ top: '15%', left: '5%', right: '5%', height: '1px', background: '#8a6aaa', opacity: 0.2 }} />
            <div className="absolute" style={{ top: '25%', left: '5%', right: '5%', height: '2px', background: '#8a6aaa', opacity: 0.3 }} />
          </>
        )}

        {/* Floor line / baseboard */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: '60%',
            height: '3px',
            background: isNoble ? '#8a6aaa' : '#2d1f0f',
          }}
        />

        {/* Floor planks */}
        {[0, 1, 2, 3].map(i => (
          <div
            key={`plank-${i}`}
            className="absolute"
            style={{
              top: `${68 + i * 10}%`,
              left: 0,
              right: 0,
              height: '1px',
              background: isNoble ? 'rgba(138,106,170,0.15)' : 'rgba(26,20,16,0.3)',
            }}
          />
        ))}

        {/* Window */}
        <div
          className="absolute"
          style={{
            top: '8%',
            left: '38%',
            width: '24%',
            height: '35%',
            background: isNoble
              ? 'linear-gradient(180deg, #7ba3c9 0%, #a8c8e8 50%, #c5dff0 100%)'
              : 'linear-gradient(180deg, #4a6070 0%, #5a7888 50%, #6a8898 100%)',
            border: `3px solid ${isNoble ? '#8a6aaa' : '#5c4a32'}`,
            borderRadius: '2px',
          }}
        >
          {/* Window cross */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2" style={{ background: isNoble ? '#8a6aaa' : '#5c4a32' }} />
          <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2" style={{ background: isNoble ? '#8a6aaa' : '#5c4a32' }} />
          {/* Moon/sun */}
          <div
            className="absolute"
            style={{
              top: '15%',
              right: '15%',
              width: '18%',
              height: '24%',
              borderRadius: '50%',
              background: isNoble ? '#f0e68c' : '#c0c0c0',
              opacity: 0.8,
            }}
          />
        </div>

        {/* "Home Sweet Home" sign */}
        <div
          className="absolute text-center"
          style={{
            top: '12%',
            left: '5%',
            width: '28%',
            padding: 'clamp(2px, 0.5vw, 6px) clamp(4px, 0.8vw, 10px)',
            background: isNoble ? '#f5eedd' : '#d4c8a0',
            border: `2px solid ${isNoble ? '#8a6aaa' : '#8b7355'}`,
            borderRadius: '2px',
            transform: 'rotate(-2deg)',
            fontSize: 'clamp(0.45rem, 1vw, 0.65rem)',
            color: isNoble ? '#4a3568' : '#3d3224',
            fontWeight: 'bold',
            fontFamily: 'serif',
            letterSpacing: '0.05em',
          }}
        >
          {isNoble ? '~ Noble Living ~' : 'Home Sweet Home'}
        </div>

        {/* Door */}
        <div
          className="absolute"
          style={{
            top: '18%',
            right: '6%',
            width: '12%',
            height: '42%',
            background: isNoble
              ? 'linear-gradient(180deg, #6b4e2e 0%, #5a3e1e 100%)'
              : 'linear-gradient(180deg, #4a3828 0%, #3a2818 100%)',
            border: `2px solid ${isNoble ? '#8a6aaa' : '#2d1f0f'}`,
            borderRadius: '2px 2px 0 0',
          }}
        >
          {/* Door handle */}
          <div
            className="absolute"
            style={{
              top: '50%',
              right: '15%',
              width: '12%',
              height: '6%',
              borderRadius: '50%',
              background: isNoble ? '#c9a227' : '#8b7355',
            }}
          />
        </div>

        {/* Bed/Sleeping area */}
        <div
          className="absolute"
          style={{
            bottom: '42%',
            left: '28%',
            width: '30%',
            height: '16%',
            background: isNoble
              ? 'linear-gradient(180deg, #8b4a6d 0%, #6b3a5d 100%)'
              : 'linear-gradient(180deg, #8b7355 0%, #6b5a42 100%)',
            border: `2px solid ${isNoble ? '#a05a7d' : '#5c4a32'}`,
            borderRadius: '3px',
          }}
        >
          {/* Pillow */}
          <div
            className="absolute"
            style={{
              top: '15%',
              left: '5%',
              width: '25%',
              height: '65%',
              borderRadius: '4px',
              background: isNoble ? '#e8d8e8' : '#c8b898',
            }}
          />
          {/* Blanket pattern */}
          {isNoble && (
            <div
              className="absolute"
              style={{
                top: '20%',
                right: '5%',
                width: '60%',
                height: '60%',
                borderRadius: '2px',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(138,106,170,0.3) 4px, rgba(138,106,170,0.3) 8px)',
              }}
            />
          )}
        </div>

        {/* Table/Desk area */}
        <div
          className="absolute"
          style={{
            bottom: '40%',
            left: '5%',
            width: '16%',
            height: '10%',
            background: isNoble ? '#7d5e3e' : '#5a4430',
            border: `1px solid ${isNoble ? '#6b4e2e' : '#4a3420'}`,
            borderRadius: '2px',
          }}
        />
        {/* Table legs */}
        <div className="absolute" style={{ bottom: '34%', left: '6%', width: '2%', height: '6%', background: isNoble ? '#6b4e2e' : '#4a3420' }} />
        <div className="absolute" style={{ bottom: '34%', left: '18%', width: '2%', height: '6%', background: isNoble ? '#6b4e2e' : '#4a3420' }} />

        {/* Chair/Seat */}
        <div
          className="absolute"
          style={{
            bottom: '40%',
            right: '22%',
            width: '14%',
            height: '12%',
            background: isNoble
              ? 'linear-gradient(180deg, #8b4a4a 0%, #6b3a3a 100%)'
              : 'linear-gradient(180deg, #6b5a42 0%, #5a4a32 100%)',
            border: `1px solid ${isNoble ? '#a05555' : '#4a3a22'}`,
            borderRadius: '3px 3px 0 0',
          }}
        />
        {/* Chair back */}
        <div
          className="absolute"
          style={{
            bottom: '50%',
            right: '24%',
            width: '10%',
            height: '10%',
            background: isNoble
              ? 'linear-gradient(180deg, #9b5a5a 0%, #8b4a4a 100%)'
              : 'linear-gradient(180deg, #7b6a52 0%, #6b5a42 100%)',
            border: `1px solid ${isNoble ? '#a05555' : '#4a3a22'}`,
            borderRadius: '3px 3px 0 0',
          }}
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
              <span style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.7rem)', color: '#ff4444', fontWeight: 'bold' }}>✗</span>
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

        {/* Slums: Rats */}
        {isSlums && (
          <>
            <div
              className="absolute animate-pulse"
              style={{ bottom: '8%', left: '8%', fontSize: 'clamp(0.6rem, 1.2vw, 1rem)', opacity: 0.6, zIndex: 6 }}
              title="A rat scurries by..."
            >
              🐀
            </div>
            <div
              className="absolute"
              style={{ bottom: '5%', right: '15%', fontSize: 'clamp(0.5rem, 1vw, 0.8rem)', opacity: 0.4, zIndex: 6, transform: 'scaleX(-1)' }}
            >
              🐀
            </div>
          </>
        )}

        {/* Noble: Decorative elements */}
        {isNoble && (
          <>
            {/* Chandelier */}
            <div
              className="absolute"
              style={{ top: '2%', left: '45%', fontSize: 'clamp(1rem, 2vw, 1.6rem)', transform: 'translateX(-50%)', zIndex: 6 }}
            >
              🕯️
            </div>
            {/* Rug on floor */}
            <div
              className="absolute"
              style={{
                bottom: '12%',
                left: '25%',
                width: '50%',
                height: '14%',
                background: 'radial-gradient(ellipse, rgba(138,74,74,0.4) 0%, rgba(107,58,93,0.2) 70%, transparent 100%)',
                borderRadius: '50%',
                zIndex: 3,
              }}
            />
            {/* Painting on wall */}
            <div
              className="absolute"
              style={{
                top: '10%',
                right: '22%',
                width: '10%',
                height: '14%',
                background: 'linear-gradient(180deg, #4a6040 0%, #3a5030 50%, #5a7050 100%)',
                border: '2px solid #c9a227',
                borderRadius: '1px',
                zIndex: 6,
              }}
            />
          </>
        )}

        {/* Empty room hint */}
        {ownedAppliances.length === 0 && ownedDurables.length === 0 && (
          <div
            className="absolute text-center pointer-events-none"
            style={{
              bottom: '18%',
              left: '50%',
              transform: 'translateX(-50%)',
              color: isNoble ? '#8a6aaa' : '#6b5a42',
              fontSize: 'clamp(0.5rem, 0.9vw, 0.7rem)',
              fontStyle: 'italic',
              opacity: 0.6,
              zIndex: 10,
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
            color: '#a09080',
            background: 'rgba(0,0,0,0.5)',
            padding: 'clamp(1px, 0.3vw, 3px) clamp(3px, 0.6vw, 6px)',
            borderRadius: '2px',
            zIndex: 10,
          }}
        >
          Relaxation: {player.relaxation}/50
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        className="shrink-0 flex items-center justify-center gap-3 py-2 px-3"
        style={{
          background: isNoble
            ? 'linear-gradient(180deg, #4a3568 0%, #3a2558 100%)'
            : 'linear-gradient(180deg, #3d3224 0%, #2d2218 100%)',
          borderTop: `2px solid ${isNoble ? '#8a6aaa' : '#8b7355'}`,
        }}
      >
        {/* Relax button */}
        <button
          onClick={handleRelax}
          disabled={!canRelax}
          className="font-bold uppercase tracking-wider transition-colors"
          style={{
            background: canRelax
              ? 'linear-gradient(180deg, #4a8a4a 0%, #3a7a3a 100%)'
              : '#3a3a2a',
            color: canRelax ? '#e0ffe0' : '#6b6b5a',
            border: `2px solid ${canRelax ? '#5aaa5a' : '#4a4a3a'}`,
            borderRadius: '3px',
            padding: 'clamp(3px, 0.6vw, 8px) clamp(10px, 2vw, 24px)',
            fontSize: 'clamp(0.55rem, 1.1vw, 0.8rem)',
            cursor: canRelax ? 'pointer' : 'not-allowed',
            opacity: canRelax ? 1 : 0.6,
          }}
          title={`Rest for ${housingData.relaxationRate} hours (+5 happiness, +3 relaxation)`}
        >
          Relax ({housingData.relaxationRate}h)
        </button>

        {/* Sleep button */}
        <button
          onClick={handleSleep}
          disabled={!canSleep}
          className="font-bold uppercase tracking-wider transition-colors"
          style={{
            background: canSleep
              ? 'linear-gradient(180deg, #4a5a8a 0%, #3a4a7a 100%)'
              : '#3a3a2a',
            color: canSleep ? '#e0e0ff' : '#6b6b5a',
            border: `2px solid ${canSleep ? '#5a6aaa' : '#4a4a3a'}`,
            borderRadius: '3px',
            padding: 'clamp(3px, 0.6vw, 8px) clamp(10px, 2vw, 24px)',
            fontSize: 'clamp(0.55rem, 1.1vw, 0.8rem)',
            cursor: canSleep ? 'pointer' : 'not-allowed',
            opacity: canSleep ? 1 : 0.6,
          }}
          title="Sleep for 8 hours (+8 happiness, +10 health, +5 relaxation)"
        >
          Sleep (8h)
        </button>

        {/* Done button */}
        <button
          onClick={onDone}
          className="font-bold uppercase tracking-wider transition-colors"
          style={{
            background: 'linear-gradient(180deg, #8b7355 0%, #6b5a42 100%)',
            color: '#f0e8d8',
            border: '2px solid #a08a68',
            borderRadius: '3px',
            padding: 'clamp(3px, 0.6vw, 8px) clamp(10px, 2vw, 24px)',
            fontSize: 'clamp(0.55rem, 1.1vw, 0.8rem)',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>

      {/* Appliance legend at bottom if any owned */}
      {(ownedAppliances.length > 0 || brokenAppliances.length > 0) && (
        <div
          className="shrink-0 flex flex-wrap justify-center gap-x-3 gap-y-0.5 px-2 py-1 font-mono"
          style={{
            background: '#1a1410',
            fontSize: 'clamp(0.4rem, 0.7vw, 0.55rem)',
            color: '#8b7355',
          }}
        >
          {ownedAppliances.map(id => {
            const app = getAppliance(id);
            return app ? (
              <span key={id}>{APPLIANCE_POSITIONS[id]?.icon || '?'} {app.name}</span>
            ) : null;
          })}
          {brokenAppliances.map(id => {
            const app = getAppliance(id);
            return app ? (
              <span key={id} className="line-through" style={{ color: '#5a3a2a' }}>
                {APPLIANCE_POSITIONS[id]?.icon || '?'} {app.name} (broken)
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
