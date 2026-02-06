// Guild Life - Event Modal Component

import { AlertTriangle, Skull, Home, Coins, Heart, Utensils } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: 'theft' | 'sickness' | 'eviction' | 'death' | 'starvation' | 'bonus' | 'info';
  effects?: {
    gold?: number;
    health?: number;
    happiness?: number;
    food?: number;
  };
}

interface EventModalProps {
  event: GameEvent | null;
  onDismiss: () => void;
}

export function EventModal({ event, onDismiss }: EventModalProps) {
  if (!event) return null;

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
    <Dialog open={!!event} onOpenChange={() => onDismiss()}>
      <DialogContent className="parchment-panel border-0 max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <DialogTitle className="font-display text-2xl text-card-foreground">
            {event.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            {event.description}
          </DialogDescription>
        </DialogHeader>
        
        {effectsText && (
          <div className="wood-frame p-3 text-parchment text-center my-4">
            <span className="font-display font-semibold">{effectsText}</span>
          </div>
        )}

        <DialogFooter>
          <Button 
            onClick={onDismiss}
            className="w-full gold-button"
          >
            {event.type === 'death' ? 'Game Over' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
