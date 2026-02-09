// Inline event panel that renders inside the center panel (not a Dialog overlay)

import { useEffect } from 'react';
import { AlertTriangle, Skull, Home, Coins, Heart, Utensils } from 'lucide-react';
import type { GameEvent } from './EventModal';
import { playSFX } from '@/audio/sfxManager';

interface EventPanelProps {
  event: GameEvent;
  onDismiss: () => void;
}

export function EventPanel({ event, onDismiss }: EventPanelProps) {
  // Play appropriate SFX when event panel appears
  useEffect(() => {
    switch (event.type) {
      case 'death': playSFX('death'); break;
      case 'theft': playSFX('robbery'); break;
      case 'eviction': playSFX('error'); break;
      case 'sickness': playSFX('damage-taken'); break;
      case 'starvation': playSFX('error'); break;
      case 'bonus': playSFX('coin-gain'); break;
      default: playSFX('notification'); break;
    }
  }, [event.type]);

  const getIcon = () => {
    switch (event.type) {
      case 'theft':
        return <Coins className="w-12 h-12 text-destructive" />;
      case 'sickness':
        return <Heart className="w-12 h-12 text-destructive" />;
      case 'eviction':
        return <Home className="w-12 h-12 text-destructive" />;
      case 'death':
        return <Skull className="w-12 h-12 text-destructive" />;
      case 'starvation':
        return <Utensils className="w-12 h-12 text-destructive" />;
      case 'bonus':
        return <Coins className="w-12 h-12 text-secondary" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-primary" />;
    }
  };

  const getEffectsText = () => {
    if (!event.effects) return null;
    const effects: string[] = [];
    if (event.effects.gold) {
      effects.push(`${event.effects.gold > 0 ? '+' : ''}${event.effects.gold} gold`);
    }
    if (event.effects.health) {
      effects.push(`${event.effects.health > 0 ? '+' : ''}${event.effects.health} health`);
    }
    if (event.effects.happiness) {
      effects.push(`${event.effects.happiness > 0 ? '+' : ''}${event.effects.happiness} happiness`);
    }
    if (event.effects.food) {
      effects.push(`${event.effects.food > 0 ? '+' : ''}${event.effects.food} food`);
    }
    return effects.length > 0 ? effects.join(', ') : null;
  };

  const effectsText = getEffectsText();

  return (
    <div className="h-full w-full flex flex-col items-center justify-center parchment-panel p-6">
      <div className="flex flex-col items-center max-w-md w-full">
        <div className="mb-4">
          {getIcon()}
        </div>

        <h2 className="font-display text-2xl text-card-foreground text-center mb-3">
          {event.title}
        </h2>

        <p className="text-muted-foreground text-base text-center mb-4 whitespace-pre-line">
          {event.description}
        </p>

        {effectsText && (
          <div className="wood-frame p-3 text-parchment text-center mb-4 w-full">
            <span className="font-display font-semibold">{effectsText}</span>
          </div>
        )}

        <button
          onClick={onDismiss}
          className="w-full gold-button max-w-sm"
        >
          {event.type === 'death' ? 'Game Over' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
