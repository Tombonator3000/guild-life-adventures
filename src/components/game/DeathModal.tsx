// Death Modal — shown when a player's health reaches 0
// Permadeath OFF: player respawns at Graveyard with 20 HP
// Permadeath ON: player is permanently eliminated

import { useState, useEffect } from 'react';
import { Skull, Heart, MapPin } from 'lucide-react';
import { playSFX } from '@/audio/sfxManager';
import { useTranslation } from '@/i18n';
import type { DeathEvent } from '@/types/game.types';

interface DeathModalProps {
  event: DeathEvent;
  onDismiss: () => void;
}

export function DeathModal({ event, onDismiss }: DeathModalProps) {
  const [showContent, setShowContent] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    playSFX('death');
    // Slight delay for dramatic effect
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Dark blood-red overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(80,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)',
          opacity: showContent ? 1 : 0,
        }}
      />

      {/* Content */}
      <div
        className="relative flex flex-col items-center text-center px-6 max-w-lg transition-all duration-700"
        style={{
          opacity: showContent ? 1 : 0,
          transform: showContent ? 'translateY(0)' : 'translateY(30px)',
        }}
      >
        {/* Skull icon with pulse */}
        <div className="mb-6 animate-pulse">
          <Skull className="w-24 h-24 text-red-500 drop-shadow-[0_0_20px_rgba(220,38,38,0.6)]" />
        </div>

        {/* Title */}
        <h1 className="font-display text-5xl md:text-6xl font-bold text-red-500 mb-4 tracking-wider drop-shadow-[0_0_10px_rgba(220,38,38,0.4)]">
          {t('death.youAreDead')}
        </h1>

        {/* Player name */}
        <p className="font-display text-xl text-red-300/80 mb-6">
          {t('death.hasFallen', { name: event.playerName })}
        </p>

        {/* Message */}
        <div className="parchment-panel p-5 mb-6 max-w-sm w-full" style={{ background: 'rgba(30,20,10,0.9)', border: '2px solid rgba(139,69,19,0.6)' }}>
          <p className="text-amber-200/90 text-base whitespace-pre-line leading-relaxed">
            {event.message}
          </p>
        </div>

        {/* Respawn info or permadeath */}
        {!event.isPermadeath && !event.wasResurrected && (
          <div className="flex items-center gap-3 mb-6 text-green-400/90">
            <Heart className="w-5 h-5" />
            <span className="font-display text-sm">{t('death.respawning')}</span>
            <MapPin className="w-5 h-5" />
          </div>
        )}

        {event.wasResurrected && (
          <div className="flex items-center gap-3 mb-6 text-green-400/90">
            <Heart className="w-5 h-5" />
            <span className="font-display text-sm">{t('death.spiritsRestored')}</span>
            <MapPin className="w-5 h-5" />
          </div>
        )}

        {event.isPermadeath && !event.wasResurrected && (
          <div className="flex items-center gap-3 mb-6 text-red-400/90">
            <Skull className="w-5 h-5" />
            <span className="font-display text-sm">{t('death.permadeathEnabled')}</span>
            <Skull className="w-5 h-5" />
          </div>
        )}

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="gold-button text-lg px-10 py-3"
        >
          {event.isPermadeath && !event.wasResurrected ? t('death.acceptFate') : t('death.riseAgain')}
        </button>
      </div>
    </div>
  );
}
