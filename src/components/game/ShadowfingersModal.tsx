// Guild Life - Shadowfingers Robbery Modal Component
// Displays when Shadowfingers robs the player with the character image
//
// NOTE: To display the Shadowfingers image, save the provided image to:
// src/assets/shadowfingers.jpg

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useGameStore, type ShadowfingersEvent } from '@/store/gameStore';
import type { StreetRobberyResult, ApartmentRobberyResult } from '@/data/shadowfingers';
import { Skull } from 'lucide-react';
import { playSFX } from '@/audio/sfxManager';

// Import the Shadowfingers image
import shadowfingersImage from '@/assets/shadowfingers.jpg';
const SHADOWFINGERS_IMAGE_PATH = shadowfingersImage;

interface ShadowfingersModalProps {
  event: ShadowfingersEvent | null;
  onDismiss: () => void;
}

export function ShadowfingersModal({ event, onDismiss }: ShadowfingersModalProps) {
  const [imageError, setImageError] = useState(false);

  // Play robbery SFX when modal opens
  useEffect(() => {
    if (event) playSFX('robbery');
  }, [event]);

  if (!event) return null;

  const isStreetRobbery = event.type === 'street';
  const result = event.result;

  const headline = result.headline;
  const message = result.message;

  // Effects summary text
  let effectsText = '';
  if (isStreetRobbery) {
    const streetResult = result as StreetRobberyResult;
    effectsText = `Lost ${streetResult.goldStolen} gold · ${Math.abs(streetResult.happinessLoss)} happiness`;
  } else {
    const apartmentResult = result as ApartmentRobberyResult;
    const itemCount = apartmentResult.stolenItems.reduce((sum, item) => sum + item.quantity, 0);
    effectsText = `Lost ${itemCount} item${itemCount !== 1 ? 's' : ''} · ${Math.abs(apartmentResult.happinessLoss)} happiness`;
  }

  return (
    <Dialog open={!!event} onOpenChange={() => onDismiss()}>
      <DialogContent className="parchment-panel border-0 max-w-md p-0 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Scrollable content */}
          <div className="flex flex-col items-center p-6 overflow-y-auto">

            {/* Shadowfingers portrait */}
            <div className="relative w-44 h-56 overflow-hidden rounded-lg border-2 border-amber-800/60 shadow-xl mb-4 flex-shrink-0">
              {!imageError ? (
                <img
                  src={SHADOWFINGERS_IMAGE_PATH}
                  alt="Shadowfingers - The Notorious Thief"
                  className="w-full h-full object-cover object-top"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                  <Skull className="w-16 h-16 text-amber-200 mb-2" />
                </div>
              )}
              {/* Name badge at bottom of portrait */}
              <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1.5 text-center">
                <span className="font-display text-amber-200 text-sm font-bold drop-shadow">
                  Shadowfingers
                </span>
              </div>
            </div>

            {/* Newspaper-style headline — parchment scroll style */}
            <div className="w-full bg-parchment/80 border border-amber-800/40 rounded px-4 py-3 mb-3 text-center shadow-inner">
              <p className="font-display text-[11px] uppercase tracking-widest text-amber-800/70 mb-1">
                The Guildholm Herald — Special Edition
              </p>
              <h2 className="font-display text-xl text-card-foreground font-bold leading-snug">
                {headline}
              </h2>
            </div>

            {/* Event description */}
            <p className="font-display text-base text-card-foreground text-center leading-relaxed mb-4 px-1">
              {message}
            </p>

            {/* Effects banner */}
            <div className="wood-frame w-full px-6 py-3 text-center mb-4">
              <span className="font-display text-base font-bold text-destructive">
                {effectsText.toUpperCase()}
              </span>
            </div>

            {/* Stolen items list for apartment robbery */}
            {!isStreetRobbery && (event.result as ApartmentRobberyResult).stolenItems.length > 0 && (
              <div className="w-full bg-parchment/60 border border-amber-800/30 rounded p-3 mb-4">
                <p className="font-display text-sm font-semibold text-card-foreground mb-2">
                  Stolen Items:
                </p>
                <ul className="space-y-0.5">
                  {(event.result as ApartmentRobberyResult).stolenItems.map((item, idx) => (
                    <li key={idx} className="flex justify-between font-display text-sm text-card-foreground">
                      <span>{item.itemName}</span>
                      <span className="text-card-foreground/60">×{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Fixed Continue button */}
          <div className="flex-shrink-0 px-6 pb-6 flex justify-center">
            <button onClick={onDismiss} className="gold-button text-lg px-12 py-3 min-w-[200px]">
              Continue
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use Shadowfingers modal state
export function useShadowfingersModal() {
  const shadowfingersEvent = useGameStore((state) => state.shadowfingersEvent);
  const dismissShadowfingersEvent = useGameStore((state) => state.dismissShadowfingersEvent);

  return {
    event: shadowfingersEvent,
    dismiss: dismissShadowfingersEvent,
  };
}
