// SFXManager — singleton that handles sound effects for UI interactions.
// Uses a pool of HTMLAudioElement instances to allow overlapping sounds.
// Falls back to Web Audio API synthesized sounds when MP3 files are not available.

import { playSynthSFX } from './synthSFX';

const SETTINGS_KEY = 'guild-life-sfx-settings';

export interface SFXSettings {
  sfxVolume: number; // 0-1
  sfxMuted: boolean;
}

// Sound effect definitions — paths relative to /sfx/
export const SFX_LIBRARY = {
  // UI Sounds
  'button-click': { file: 'button-click.mp3', volume: 0.6 },
  'button-hover': { file: 'button-hover.mp3', volume: 0.3 },
  'gold-button-click': { file: 'gold-button-click.mp3', volume: 0.7 },
  'menu-open': { file: 'menu-open.mp3', volume: 0.5 },
  'menu-close': { file: 'menu-close.mp3', volume: 0.4 },

  // Game Actions
  'coin-gain': { file: 'coin-gain.mp3', volume: 0.6 },
  'coin-spend': { file: 'coin-spend.mp3', volume: 0.5 },
  'item-buy': { file: 'item-buy.mp3', volume: 0.6 },
  'item-equip': { file: 'item-equip.mp3', volume: 0.5 },
  'success': { file: 'success.mp3', volume: 0.6 },
  'error': { file: 'error.mp3', volume: 0.5 },

  // Movement & Locations
  'footstep': { file: 'footstep.mp3', volume: 0.4 },
  'door-open': { file: 'door-open.mp3', volume: 0.5 },

  // Work & Education
  'work-complete': { file: 'work-complete.mp3', volume: 0.5 },
  'study': { file: 'study.mp3', volume: 0.4 },
  'graduation': { file: 'graduation.mp3', volume: 0.7 },

  // Combat & Dungeon
  'sword-hit': { file: 'sword-hit.mp3', volume: 0.6 },
  'damage-taken': { file: 'damage-taken.mp3', volume: 0.5 },
  'victory-fanfare': { file: 'victory-fanfare.mp3', volume: 0.7 },
  'defeat': { file: 'defeat.mp3', volume: 0.5 },

  // Events
  'notification': { file: 'notification.mp3', volume: 0.5 },
  'turn-start': { file: 'turn-start.mp3', volume: 0.4 },
  'week-end': { file: 'week-end.mp3', volume: 0.5 },

  // --- New game event sounds ---
  'robbery': { file: 'robbery.mp3', volume: 0.6 },
  'heal': { file: 'heal.mp3', volume: 0.5 },
  'quest-accept': { file: 'quest-accept.mp3', volume: 0.5 },
  'quest-complete': { file: 'quest-complete.mp3', volume: 0.6 },
  'level-up': { file: 'level-up.mp3', volume: 0.7 },
  'appliance-break': { file: 'appliance-break.mp3', volume: 0.5 },
  'dice-roll': { file: 'dice-roll.mp3', volume: 0.4 },
  'death': { file: 'death.mp3', volume: 0.6 },
  'resurrection': { file: 'resurrection.mp3', volume: 0.6 },
  'rent-paid': { file: 'rent-paid.mp3', volume: 0.4 },
  'weather-thunder': { file: 'weather-thunder.mp3', volume: 0.5 },
  'festival': { file: 'festival.mp3', volume: 0.5 },
  'travel-event': { file: 'travel-event.mp3', volume: 0.5 },
} as const;

export type SFXId = keyof typeof SFX_LIBRARY;

function loadSettings(): SFXSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sfxVolume: typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : 0.5,
        sfxMuted: typeof parsed.sfxMuted === 'boolean' ? parsed.sfxMuted : false,
      };
    }
  } catch { /* ignore */ }
  return { sfxVolume: 0.5, sfxMuted: false };
}

function saveSettings(settings: SFXSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

class SFXManager {
  private settings: SFXSettings;
  private cachedSettings: SFXSettings;
  private listeners: Array<() => void> = [];
  // Pool of audio elements for overlapping sounds
  private audioPool: HTMLAudioElement[] = [];
  private poolIndex = 0;
  private readonly POOL_SIZE = 8;
  // Track which MP3 files failed to load so we use synth fallback directly
  private failedFiles = new Set<string>();

  constructor() {
    this.settings = loadSettings();
    this.cachedSettings = { ...this.settings };

    // Pre-create audio pool
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const audio = new Audio();
      audio.preload = 'auto';
      this.audioPool.push(audio);
    }
  }

  // --- Public API ---

  /** Play a sound effect by ID. Tries MP3 first, falls back to synth. */
  play(sfxId: SFXId) {
    if (this.settings.sfxMuted) return;

    const sfx = SFX_LIBRARY[sfxId];
    if (!sfx) return;

    const effectiveVolume = sfx.volume * this.settings.sfxVolume;

    // If this MP3 previously failed to load, go straight to synth
    if (this.failedFiles.has(sfxId)) {
      playSynthSFX(sfxId, effectiveVolume);
      return;
    }

    const url = `${import.meta.env.BASE_URL}sfx/${sfx.file}`;

    // Get next audio element from pool (round-robin)
    const audio = this.audioPool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.POOL_SIZE;

    // Stop any current playback on this element
    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    audio.volume = effectiveVolume;

    // Play (handle autoplay restrictions silently)
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        // MP3 failed (file missing or autoplay blocked) — fall back to synth
        this.failedFiles.add(sfxId);
        playSynthSFX(sfxId, effectiveVolume);
      });
    }

    // Also catch load errors for missing files
    const errorHandler = () => {
      this.failedFiles.add(sfxId);
      playSynthSFX(sfxId, effectiveVolume);
      audio.removeEventListener('error', errorHandler);
    };
    audio.addEventListener('error', errorHandler, { once: true });
  }

  /** Get current settings - returns cached immutable object for React compatibility. */
  getSettings(): SFXSettings {
    return this.cachedSettings;
  }

  /** Set SFX volume (0-1). */
  setVolume(volume: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    saveSettings(this.settings);
    this.notify();
  }

  /** Toggle mute. */
  toggleMute() {
    this.settings.sfxMuted = !this.settings.sfxMuted;
    saveSettings(this.settings);
    this.notify();
  }

  /** Set muted state directly. */
  setMuted(muted: boolean) {
    this.settings.sfxMuted = muted;
    saveSettings(this.settings);
    this.notify();
  }

  /** Subscribe to settings changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // --- Internal ---

  private notify() {
    this.cachedSettings = { ...this.settings };
    this.listeners.forEach(l => l());
  }
}

// Singleton instance
export const sfxManager = new SFXManager();

// Convenience function for playing sounds
export function playSFX(sfxId: SFXId) {
  sfxManager.play(sfxId);
}
