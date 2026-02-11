// Inline event panel that renders inside the center panel (not a Dialog overlay)
// Redesigned: large text filling center, button at bottom center, space for future graphics

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
        return <Coins className="w-16 h-16 text-destructive drop-shadow-lg" />;
      case 'sickness':
        return <Heart className="w-16 h-16 text-destructive drop-shadow-lg" />;
      case 'eviction':
        return <Home className="w-16 h-16 text-destructive drop-shadow-lg" />;
      case 'death':
        return <Skull className="w-16 h-16 text-destructive drop-shadow-lg" />;
      case 'starvation':
        return <Utensils className="w-16 h-16 text-destructive drop-shadow-lg" />;
      case 'bonus':
        return <Coins className="w-16 h-16 text-secondary drop-shadow-lg" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-primary drop-shadow-lg" />;
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
    return effects.length > 0 ? effects.join('  |  ') : null;
  };

  const effectsText = getEffectsText();

  // Parse multi-line event description into separate event lines for display
  const descriptionLines = event.description.split('\n').filter(line => line.trim());

  return (
    <div className="h-full w-full flex flex-col parchment-panel">
      {/* Scrollable content area - fills available space */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto min-h-0">
        {/* Icon area - also serves as future graphics placeholder */}
        <div className="flex-shrink-0 mb-3">
          {getIcon()}
        </div>

        {/* Title - large and prominent */}
        <h2 className="font-display text-3xl text-card-foreground text-center mb-4 drop-shadow-sm">
          {event.title}
        </h2>

        {/* Event description lines - large readable text */}
        <div className="w-full max-w-lg space-y-2 mb-4">
          {descriptionLines.map((line, i) => (
            <p
              key={i}
              className="font-display text-lg text-card-foreground text-center leading-relaxed"
            >
              {line}
            </p>
          ))}
        </div>

        {/* Effects summary */}
        {effectsText && (
          <div className="wood-frame px-6 py-3 text-parchment text-center w-full max-w-lg">
            <span className="font-display text-lg font-semibold">{effectsText}</span>
          </div>
        )}
      </div>

      {/* Fixed button at bottom center */}
      <div className="flex-shrink-0 p-4 flex justify-center">
        <button
          onClick={onDismiss}
          className="gold-button text-lg px-12 py-3 min-w-[200px]"
        >
          {event.type === 'death' ? 'Game Over' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
