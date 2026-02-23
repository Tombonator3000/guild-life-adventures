import { useMemo, useState } from 'react';
import type { Player, LocationId } from '@/types/game.types';
import { useTranslation } from '@/i18n';
import { HOUSING_DATA } from '@/data/housing';
import { JonesButton } from './JonesStylePanel';
import { RoomScene, HomeActionBar, ApplianceLegend } from './home';
import { HomeItemGenerator } from './home/HomeItemGenerator';
import { loadZoneConfig } from '@/data/zoneStorage';
import { getQuestLocationObjectives } from '@/data/quests';
import { useGameStore } from '@/store/gameStore';
import { playSFX } from '@/audio/sfxManager';
import { toast } from 'sonner';
import { Swords } from 'lucide-react';

interface HomePanelProps {
  player: Player;
  locationId: LocationId;
  spendTime: (playerId: string, hours: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyRelaxation: (playerId: string, amount: number) => void;
  onDone: () => void;
}

/** Check if the player actually rents at this housing location */
function playerRentsHere(housing: string, locationId: LocationId): boolean {
  if (locationId === 'noble-heights') return housing === 'noble';
  if (locationId === 'slums') return housing === 'slums';
  return false;
}

export function HomePanel({
  player,
  locationId,
  spendTime,
  modifyHappiness,
  modifyHealth,
  modifyRelaxation,
  onDone,
}: HomePanelProps) {
  const { t } = useTranslation();
  const [showGenerator, setShowGenerator] = useState(false);
  const customPositions = useMemo(() => loadZoneConfig()?.homeItemPositions, []);
  const store = useGameStore();

  // LOQ: Quest objective banner for home locations
  const questObjectives = getQuestLocationObjectives(player.activeQuest, player.questChainProgress);
  const questProgress = player.questLocationProgress ?? [];
  const pendingObjectiveHere = questObjectives.find(
    o => o.locationId === locationId && !questProgress.includes(o.id)
  );
  const handleCompleteObjective = () => {
    if (!pendingObjectiveHere) return;
    playSFX('quest-complete');
    store.completeLocationObjective(player.id, pendingObjectiveHere.id);
    toast.success(pendingObjectiveHere.completionText, { duration: 5000 });
  };
  if (player.housing === 'homeless') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#1a1410] p-4">
        <div className="text-[#8b7355] text-center font-mono">
          <p className="text-lg mb-2">{t('panelHome.homeless')}</p>
          <p className="text-sm">{t('panelHome.homelessMessage')}</p>
        </div>
        <JonesButton label={t('common.done')} onClick={onDone} className="mt-4" />
      </div>
    );
  }

  const rentsHere = playerRentsHere(player.housing, locationId);

  // Player doesn't rent here — show "For Rent" display
  if (!rentsHere) {
    const forRentImage = `${import.meta.env.BASE_URL}locations/for-rent.jpg`;
    const locationName = locationId === 'noble-heights' ? t('locations.nobleHeights') : t('locations.slums');
    return (
      <div className="h-full flex flex-col overflow-hidden select-none" style={{ background: '#1a1410' }}>
        <div
          className="flex-1 relative overflow-hidden flex items-center justify-center"
          style={{
            backgroundImage: `url(${forRentImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div className="relative z-10 text-center p-4">
            <h2
              className="font-display text-xl font-bold mb-2"
              style={{ color: '#f0e8d8', textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
            >
              {locationName}
            </h2>
            <p
              className="text-sm"
              style={{ color: '#d4c8a0', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            >
              {t('panelHome.visitLandlord')}
            </p>
          </div>
        </div>
        <div
          className="shrink-0 flex items-center justify-center py-2 px-3"
          style={{
            background: 'linear-gradient(180deg, #3d3224 0%, #2d2218 100%)',
            borderTop: '2px solid #8b7355',
          }}
        >
          <JonesButton label={t('common.done')} onClick={onDone} />
        </div>
      </div>
    );
  }

  // Load custom item positions set via the Zone Editor's Home Layout mode
  // customPositions moved to top (before early returns)

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
    modifyHappiness(player.id, 3);
    modifyRelaxation(player.id, 5);
  };

  const handleSleep = () => {
    spendTime(player.id, 8);
    modifyHappiness(player.id, 8);
    modifyHealth(player.id, 10);
    modifyRelaxation(player.id, 5);
  };

  // Wall and floor colors based on housing tier
  const wallColor = isNoble ? '#5c4a6d' : isSlums ? '#3d3224' : '#4a3d2e';
  const wallAccent = isNoble ? '#7a6290' : isSlums ? '#2d2218' : '#5a4d3e';
  const floorColor = isNoble ? '#6b4e2e' : isSlums ? '#4a3828' : '#5a4430';
  const floorAccent = isNoble ? '#7d5e3e' : isSlums ? '#3a2a1a' : '#6a5440';

  if (showGenerator) {
    return <HomeItemGenerator onClose={() => setShowGenerator(false)} />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden select-none" style={{ background: '#1a1410' }}>
      {/* LOQ: Quest objective banner at home location */}
      {pendingObjectiveHere && (
        <div className="flex-shrink-0 bg-amber-900/80 border border-amber-400/70 px-3 py-2 flex items-center gap-2 z-20">
          <Swords className="w-4 h-4 text-amber-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-amber-200 text-xs font-semibold leading-tight truncate">Quest Objective</p>
            <p className="text-amber-100/80 text-xs leading-tight truncate">{pendingObjectiveHere.description}</p>
          </div>
          <button
            onClick={handleCompleteObjective}
            className="flex-shrink-0 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded text-xs font-bold transition-colors"
          >
            {pendingObjectiveHere.actionText}
          </button>
        </div>
      )}
      {/* Header banner */}
      <div
        className="text-center py-1.5 font-bold tracking-widest uppercase text-white shrink-0 relative"
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
        {isNoble ? t('housing.noble.name') : t('housing.slums.name')}
        {import.meta.env.DEV && (
          <button
            onClick={() => setShowGenerator(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-40 hover:opacity-100"
            title="Generate room item graphics"
          >
            🎨
          </button>
        )}
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
        customPositions={customPositions}
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
