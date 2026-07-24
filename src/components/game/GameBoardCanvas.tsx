import type { ComponentProps, ReactNode } from 'react';
import { LOCATIONS, getMovementCost, getPath } from '@/data/locations';
import { getQuestLocationObjectives } from '@/data/quests';
import { useGameStore } from '@/store/gameStore';
import { useBanterStore } from '@/store/banterStore';
import type { LocationId, Player } from '@/types/game.types';
import gameBoard from '@/assets/game-board.jpeg';
import { AnimatedPlayerToken } from './AnimatedPlayerToken';
import { BanterBubble } from './BanterBubble';
import { DebugOverlay } from './DebugOverlay';
import { FestivalOverlay } from './FestivalOverlay';
import { GraveyardCrows } from './GraveyardCrows';
import { LocationZone } from './LocationZone';
import { PlayerToken } from './PlayerToken';
import { ShadowfingersToken } from './ShadowfingersToken';
import { WeatherOverlay } from './WeatherOverlay';

type CenterPanel = { top: number; left: number; width: number; height: number };
type WeatherState = ReturnType<typeof useGameStore.getState>['weather'];
type LocationHex = ReturnType<typeof useGameStore.getState>['locationHexes'][number];
type BoardLocation = (typeof LOCATIONS)[number];

interface GameBoardCanvasProps {
  children: ReactNode;
  players: Player[];
  currentPlayer?: Player;
  selectedLocation: LocationId | null;
  locationHexes: LocationHex[];
  weather: WeatherState;
  isMobile: boolean;
  centerPanel: CenterPanel;
  customZones: ComponentProps<typeof DebugOverlay>['customZones'];
  debugCenterPanel: ComponentProps<typeof DebugOverlay>['centerPanel'];
  showDebugOverlay: boolean;
  focusedLocationId: LocationId | null;
  animatingPlayer: string | null;
  animationPath: LocationId[] | null;
  pathVersion: number;
  shadowfingersTargetLocation: LocationId | null;
  getLocationWithCustomPosition: (locationId: LocationId, isMobile: boolean) => BoardLocation | undefined;
  onLocationClick: (locationId: LocationId) => void;
  onViewPlayer: (player: Player) => void;
  onAnimationComplete: () => void;
  onLocationReached: (pathLocationIndex: number) => void;
}

export function GameBoardCanvas({
  children,
  players,
  currentPlayer,
  selectedLocation,
  locationHexes,
  weather,
  isMobile,
  centerPanel,
  customZones,
  debugCenterPanel,
  showDebugOverlay,
  focusedLocationId,
  animatingPlayer,
  animationPath,
  pathVersion,
  shadowfingersTargetLocation,
  getLocationWithCustomPosition,
  onLocationClick,
  onViewPlayer,
  onAnimationComplete,
  onLocationReached,
}: GameBoardCanvasProps) {
  const activeFestival = useGameStore(state => state.activeFestival);
  const chainProgress = currentPlayer?.activeQuest?.startsWith('nlchain:')
    ? currentPlayer.nlChainProgress
    : currentPlayer?.questChainProgress;
  const questObjectives = getQuestLocationObjectives(currentPlayer?.activeQuest ?? null, chainProgress);
  const questProgress = currentPlayer?.questLocationProgress ?? [];

  return (
    <div className="relative w-full h-full">
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{ backgroundImage: `url(${gameBoard})`, backgroundSize: '100% 100%' }}
      />

      <div className="absolute inset-0">
        {LOCATIONS.map(baseLocation => {
          const location = getLocationWithCustomPosition(baseLocation.id, isMobile) || baseLocation;
          const playersHere = players.filter(
            player => player.currentLocation === location.id && player.id !== animatingPlayer,
          );
          const baseMoveCost = currentPlayer
            ? getMovementCost(currentPlayer.currentLocation, location.id)
            : 0;
          const weatherExtra = baseMoveCost > 0 && weather?.movementCostExtra && currentPlayer
            ? getPath(currentPlayer.currentLocation, location.id).length * weather.movementCostExtra
            : 0;
          const moveCost = baseMoveCost + weatherExtra;
          const activeHex = locationHexes.find(
            hex => hex.targetLocation === location.id && hex.weeksRemaining > 0,
          );
          const objective = questObjectives.find(candidate => candidate.locationId === location.id);

          return (
            <LocationZone
              key={location.id}
              location={location}
              isSelected={selectedLocation === location.id}
              isCurrentLocation={currentPlayer?.currentLocation === location.id && !animatingPlayer}
              moveCost={moveCost}
              onClick={() => onLocationClick(location.id)}
              isHexed={!!activeHex}
              hexCasterName={activeHex?.casterName}
              isQuestObjective={!!objective && !questProgress.includes(objective.id)}
              isQuestObjectiveDone={!!objective && questProgress.includes(objective.id)}
              isKeyboardFocused={focusedLocationId === location.id}
            >
              {playersHere.map((player, index) => (
                <PlayerToken
                  key={player.id}
                  player={player}
                  index={index}
                  isCurrent={player.id === currentPlayer?.id}
                  onClickPlayer={player.id !== currentPlayer?.id ? onViewPlayer : undefined}
                />
              ))}
            </LocationZone>
          );
        })}
      </div>

      {animatingPlayer && animationPath && (
        <div className="absolute inset-0 pointer-events-none z-40">
          {players.filter(player => player.id === animatingPlayer).map(player => (
            <AnimatedPlayerToken
              key={`${player.id}-${pathVersion}`}
              player={player}
              isCurrent
              animationPath={animationPath}
              onAnimationComplete={onAnimationComplete}
              onLocationReached={onLocationReached}
            />
          ))}
        </div>
      )}

      {shadowfingersTargetLocation && (
        <div className="absolute inset-0 pointer-events-none z-45">
          <ShadowfingersToken targetLocation={shadowfingersTargetLocation} />
        </div>
      )}

      <GraveyardCrows />
      <FestivalOverlay activeFestival={activeFestival} />
      <WeatherOverlay particle={weather?.particle ?? null} weatherType={weather?.type} />
      <DebugOverlay customZones={customZones} centerPanel={debugCenterPanel} visible={showDebugOverlay} />
      <BoardBanterOverlay centerPanel={centerPanel} isMobile={isMobile} />
      {children}
    </div>
  );
}

function BoardBanterOverlay({ centerPanel, isMobile }: { centerPanel: CenterPanel; isMobile: boolean }) {
  const { activeBanter, npcName, clearBanter } = useBanterStore();
  if (!activeBanter || !npcName) return null;

  return (
    <div
      className="absolute z-20 pointer-events-none flex items-end justify-start"
      style={isMobile ? {
        bottom: '33%',
        left: '5%',
        width: '90%',
        height: 'auto',
        paddingBottom: '8px',
      } : {
        top: `${Math.max(centerPanel.top - 18, 1)}%`,
        left: `${centerPanel.left}%`,
        width: `${centerPanel.width}%`,
        height: `${Math.min(18, centerPanel.top)}%`,
        paddingLeft: '2%',
      }}
    >
      <BanterBubble banter={activeBanter} npcName={npcName} onDismiss={clearBanter} />
    </div>
  );
}
