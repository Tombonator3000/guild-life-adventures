import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getLocation, getMovementCost } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
import { MapPin, Clock, ArrowRight, X } from 'lucide-react';

interface LocationPanelProps {
  locationId: LocationId;
}

export function LocationPanel({ locationId }: LocationPanelProps) {
  const { selectLocation, movePlayer, modifyGold, modifyHappiness, spendTime } = useGameStore();
  const player = useCurrentPlayer();
  const location = getLocation(locationId);

  if (!location || !player) return null;

  const moveCost = getMovementCost(player.currentLocation, locationId);
  const isHere = player.currentLocation === locationId;
  const canAffordMove = player.timeRemaining >= moveCost;

  const handleTravel = () => {
    if (canAffordMove && !isHere) {
      movePlayer(player.id, locationId, moveCost);
    }
  };

  // Location-specific actions
  const getLocationActions = () => {
    if (!isHere) return null;

    switch (locationId) {
      case 'rusty-tankard':
        return (
          <div className="space-y-2">
            <ActionButton
              label="Buy a Meal"
              cost={10}
              time={2}
              disabled={player.gold < 10 || player.timeRemaining < 2}
              onClick={() => {
                modifyGold(player.id, -10);
                modifyHappiness(player.id, 5);
                spendTime(player.id, 2);
              }}
            />
            <ActionButton
              label="Have a Drink"
              cost={5}
              time={1}
              disabled={player.gold < 5 || player.timeRemaining < 1}
              onClick={() => {
                modifyGold(player.id, -5);
                modifyHappiness(player.id, 3);
                spendTime(player.id, 1);
              }}
            />
            <ActionButton
              label="Listen for Rumors"
              cost={0}
              time={4}
              disabled={player.timeRemaining < 4}
              onClick={() => {
                spendTime(player.id, 4);
                // Random event chance
                if (Math.random() > 0.5) {
                  modifyGold(player.id, 15);
                }
              }}
            />
          </div>
        );
      
      case 'guild-hall':
        return (
          <div className="space-y-2">
            <ActionButton
              label="Work a Shift (8h)"
              cost={0}
              time={8}
              reward={25}
              disabled={player.timeRemaining < 8}
              onClick={() => {
                spendTime(player.id, 8);
                modifyGold(player.id, 25);
              }}
            />
            <ActionButton
              label="Take a Quest (12h)"
              cost={0}
              time={12}
              reward={50}
              disabled={player.timeRemaining < 12}
              onClick={() => {
                spendTime(player.id, 12);
                modifyGold(player.id, 50);
                modifyHappiness(player.id, 5);
              }}
            />
          </div>
        );

      case 'forge':
        return (
          <div className="space-y-2">
            <ActionButton
              label="Labor at the Forge (10h)"
              cost={0}
              time={10}
              reward={35}
              disabled={player.timeRemaining < 10}
              onClick={() => {
                spendTime(player.id, 10);
                modifyGold(player.id, 35);
                modifyHappiness(player.id, -2);
              }}
            />
          </div>
        );

      case 'bank':
        return (
          <div className="space-y-2">
            <ActionButton
              label="Deposit 100 Gold"
              cost={100}
              time={1}
              disabled={player.gold < 100 || player.timeRemaining < 1}
              onClick={() => {
                modifyGold(player.id, -100);
                spendTime(player.id, 1);
                // In full implementation, track savings
              }}
            />
          </div>
        );

      case 'general-store':
        return (
          <div className="space-y-2">
            <ActionButton
              label="Buy Supplies"
              cost={20}
              time={1}
              disabled={player.gold < 20 || player.timeRemaining < 1}
              onClick={() => {
                modifyGold(player.id, -20);
                spendTime(player.id, 1);
              }}
            />
          </div>
        );

      default:
        return (
          <p className="text-muted-foreground text-center py-4">
            This location is under construction...
          </p>
        );
    }
  };

  return (
    <div className="parchment-panel h-full p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <MapPin className="w-8 h-8 text-primary" />
          <div>
            <h2 className="font-display text-2xl font-bold text-card-foreground">
              {location.name}
            </h2>
            <p className="text-muted-foreground">{location.description}</p>
          </div>
        </div>
        <button 
          onClick={() => selectLocation(null)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Travel or Actions */}
      <div className="flex-1">
        {isHere ? (
          <div>
            <h3 className="font-display text-lg font-semibold mb-4 text-card-foreground">
              Available Actions
            </h3>
            {getLocationActions()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Clock className="w-5 h-5" />
              <span>Travel time: {moveCost} hours</span>
            </div>
            <button
              onClick={handleTravel}
              disabled={!canAffordMove}
              className="gold-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Travel to {location.name}
              <ArrowRight className="w-5 h-5" />
            </button>
            {!canAffordMove && (
              <p className="text-destructive text-sm mt-2">Not enough time!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  cost: number;
  time: number;
  reward?: number;
  disabled: boolean;
  onClick: () => void;
}

function ActionButton({ label, cost, time, reward, disabled, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full p-3 wood-frame text-card flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="font-display font-semibold">{label}</span>
      <div className="flex items-center gap-4 text-sm">
        {cost > 0 && (
          <span className="text-gold">-{cost}g</span>
        )}
        {reward && (
          <span className="text-secondary">+{reward}g</span>
        )}
        <span className="text-time">{time}h</span>
      </div>
    </button>
  );
}
