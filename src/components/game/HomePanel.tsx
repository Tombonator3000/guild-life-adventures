import type { Player } from '@/types/game.types';
import { HOUSING_DATA } from '@/data/housing';
import { JonesButton } from './JonesStylePanel';
import { RoomScene, HomeActionBar, ApplianceLegend } from './home';

interface HomePanelProps {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyRelaxation: (playerId: string, amount: number) => void;
  onDone: () => void;
}

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

      <RoomScene
        isNoble={isNoble}
        isSlums={isSlums}
        wallColor={wallColor}
        wallAccent={wallAccent}
        floorColor={floorColor}
        floorAccent={floorAccent}
        ownedAppliances={ownedAppliances}
        brokenAppliances={brokenAppliances}
        ownedDurables={ownedDurables}
        relaxation={player.relaxation}
      />

      <HomeActionBar
        isNoble={isNoble}
        canRelax={canRelax}
        canSleep={canSleep}
        relaxHours={housingData.relaxationRate}
        onRelax={handleRelax}
        onSleep={handleSleep}
        onDone={onDone}
      />

      <ApplianceLegend
        ownedAppliances={ownedAppliances}
        brokenAppliances={brokenAppliances}
      />
    </div>
  );
}
