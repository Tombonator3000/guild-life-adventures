// Inline event panel that renders inside the center panel (not a Dialog overlay)
// Redesigned: large text filling center, button at bottom center, woodcut illustrations

import { LocationPages } from './LocationPages';
import './playability.css';
import { useEffect } from 'react';
import { AlertTriangle, Skull, Home, Coins, Heart, Utensils } from 'lucide-react';
import type { GameEvent } from './EventModal';
import { playSFX } from '@/audio/sfxManager';
import { t } from '@/i18n';
import { getEventImage } from '@/assets/events';
import { getQuestImage } from '@/assets/quests';

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
      effects.push(`${event.effects.gold > 0 ? '+' : ''}${event.effects.gold} ${t('events.gold')}`);
    }
    if (event.effects.health) {
      effects.push(`${event.effects.health > 0 ? '+' : ''}${event.effects.health} ${t('events.health')}`);
    }
    if (event.effects.happiness) {
      effects.push(`${event.effects.happiness > 0 ? '+' : ''}${event.effects.happiness} ${t('events.happiness')}`);
    }
    if (event.effects.food) {
      effects.push(`${event.effects.food > 0 ? '+' : ''}${event.effects.food} ${t('events.food')}`);
    }
    return effects.length > 0 ? effects.join('  |  ') : null;
  };

  const effectsText = getEffectsText();

  // Parse multi-line event description into separate event lines for display
  const descriptionLines = event.description.split('\n').filter(line => line.trim());

  const illustration = getQuestImage(event.id) || getEventImage(event.id, event.type);
  return <section className="event-report parchment-panel" aria-label="Event report">
    <h2 className="font-display">{event.title}</h2>
    <div className="event-report-body">
      <aside aria-hidden="true">{illustration ? <img src={illustration} alt="" /> : getIcon()}</aside>
      <LocationPages pageKey={event.id}>
        <div className="event-report-copy">{descriptionLines.map((line, i) => <p key={i}>{line}</p>)}</div>
        {effectsText && <p className="event-report-effects">{effectsText}</p>}
      </LocationPages>
    </div>
    <button onClick={onDismiss} className="gold-button event-report-continue">{event.type === 'death' ? t('events.gameOver') : t('events.continue')}</button>
  </section>;
}
