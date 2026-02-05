import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { LOCATIONS, getMovementCost } from '@/data/locations';
import { LocationZone } from './LocationZone';
import { PlayerToken } from './PlayerToken';
import { ResourcePanel } from './ResourcePanel';
import { LocationPanel } from './LocationPanel';
import { EventModal, type GameEvent } from './EventModal';
import gameBoard from '@/assets/game-board.jpeg';

export function GameBoard() {
  const { players, selectedLocation, selectLocation, week, priceModifier, eventMessage, dismissEvent, phase } = useGameStore();
  const currentPlayer = useCurrentPlayer();

  const handleLocationClick = (locationId: string) => {
    if (selectedLocation === locationId) {
      selectLocation(null);
    } else {
      selectLocation(locationId as any);
    }
  };

  // Convert eventMessage to GameEvent format
  const currentEvent: GameEvent | null = eventMessage ? {
    id: 'weekly-event',
    title: 'Week ' + week + ' Events',
    description: eventMessage,
    type: eventMessage.includes('evicted') ? 'eviction' :
          eventMessage.includes('Shadowfingers') ? 'theft' :
          eventMessage.includes('starving') ? 'starvation' :
          eventMessage.includes('ill') ? 'sickness' :
          'info',
  } : null;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background flex items-center justify-center">
      {/* Game board container - maintains aspect ratio */}
      <div className="relative w-full h-full max-w-[177.78vh] max-h-[56.25vw]">
        {/* Game board background */}
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${gameBoard})` }}
        />
      
        {/* Location zones overlay */}
        <div className="absolute inset-0">
          {LOCATIONS.map((location) => {
            const playersHere = players.filter(p => p.currentLocation === location.id);
            const moveCost = currentPlayer 
              ? getMovementCost(currentPlayer.currentLocation, location.id)
              : 0;
            const isCurrentLocation = currentPlayer?.currentLocation === location.id;
            
            return (
              <LocationZone
                key={location.id}
                location={location}
                isSelected={selectedLocation === location.id}
                isCurrentLocation={isCurrentLocation}
                moveCost={moveCost}
                onClick={() => handleLocationClick(location.id)}
              >
                {playersHere.map((player, index) => (
                  <PlayerToken 
                    key={player.id} 
                    player={player} 
                    index={index}
                    isCurrent={player.id === currentPlayer?.id}
                  />
                ))}
              </LocationZone>
            );
          })}
        </div>

        {/* Center UI panel - positioned exactly within the white frame */}
        <div 
          className="absolute overflow-hidden z-10"
          style={{
           top: '15.8%',
           left: '15.2%',
           width: '69.6%',
           height: '49.2%',
          }}
        >
         <div className="w-full h-full overflow-auto bg-card/95">
            {selectedLocation ? (
              <LocationPanel locationId={selectedLocation} />
            ) : (
              <ResourcePanel />
            )}
          </div>
        </div>

        {/* Week and price indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="parchment-panel px-6 py-2 flex items-center gap-6">
            <span className="font-display text-lg">
              Week <span className="text-primary font-bold">{week}</span>
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="font-display text-lg">
              Market: <span className={priceModifier > 1 ? 'text-destructive' : 'text-secondary'}>
                {(priceModifier * 100).toFixed(0)}%
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal 
        event={phase === 'event' ? currentEvent : null} 
        onDismiss={dismissEvent} 
      />
    </div>
  );
}
