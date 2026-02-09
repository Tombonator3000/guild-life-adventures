// AmbientManager — singleton that handles environmental/atmospheric audio loops.
// Runs independently of the music system. Uses crossfade for smooth transitions.

import { AMBIENT_TRACKS, AMBIENT_CROSSFADE_MS, DEFAULT_AMBIENT_VOLUME } from './ambientConfig';

const SETTINGS_KEY = 'guild-life-ambient-settings';

export interface AmbientSettings {
  ambientVolume: number; // 0-1
  ambientMuted: boolean;
}

function loadSettings(): AmbientSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ambientVolume: typeof parsed.ambientVolume === 'number' ? parsed.ambientVolume : DEFAULT_AMBIENT_VOLUME,
        ambientMuted: typeof parsed.ambientMuted === 'boolean' ? parsed.ambientMuted : false,
      };
    }
  } catch { /* ignore */ }
  return { ambientVolume: DEFAULT_AMBIENT_VOLUME, ambientMuted: false };
}

function saveSettings(settings: AmbientSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

class AmbientManager {
  private deckA: HTMLAudioElement;
  private deckB: HTMLAudioElement;
  private activeDeck: 'A' | 'B' = 'A';
  private currentTrackId: string | null = null;
  private settings: AmbientSettings;
  private cachedSettings: AmbientSettings;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.deckA = new Audio();
    this.deckB = new Audio();
    this.deckA.loop = true;
    this.deckB.loop = true;
    this.deckA.preload = 'auto';
    this.deckB.preload = 'auto';

    this.settings = loadSettings();
    this.cachedSettings = { ...this.settings };
  }

  // --- Public API ---

  /** Play an ambient track by ID. If same track is playing, do nothing. */
  play(trackId: string) {
    if (trackId === this.currentTrackId) return;

    const track = AMBIENT_TRACKS[trackId];
    if (!track) return;

    const url = `${import.meta.env.BASE_URL}ambient/${track.file}`;
    this.crossfadeTo(url, trackId, track.baseVolume);
  }

  /** Stop all ambient with fade out. */
  stop() {
    if (!this.currentTrackId) return;
    this.currentTrackId = null;
    this.fadeOut(this.getActiveDeck());
    this.fadeOut(this.getInactiveDeck());
  }

  /** Get the currently playing track ID (or null). */
  getCurrentTrack(): string | null {
    return this.currentTrackId;
  }

  /** Get current settings. */
  getSettings(): AmbientSettings {
    return this.cachedSettings;
  }

  /** Set ambient volume (0-1). */
  setVolume(volume: number) {
    this.settings.ambientVolume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
    saveSettings(this.settings);
    this.notify();
  }

  /** Toggle mute. */
  toggleMute() {
    this.settings.ambientMuted = !this.settings.ambientMuted;
    this.applyVolume();
    saveSettings(this.settings);
    this.notify();
  }

  /** Set muted state directly. */
  setMuted(muted: boolean) {
    this.settings.ambientMuted = muted;
    this.applyVolume();
    saveSettings(this.settings);
    this.notify();
  }

  /** Subscribe to settings changes. Returns unsubscribe function. */
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

  private getActiveDeck(): HTMLAudioElement {
    return this.activeDeck === 'A' ? this.deckA : this.deckB;
  }

  private getInactiveDeck(): HTMLAudioElement {
    return this.activeDeck === 'A' ? this.deckB : this.deckA;
  }

  private effectiveVolume(baseVolume = 1): number {
    if (this.settings.ambientMuted) return 0;
    return this.settings.ambientVolume * baseVolume;
  }

  private currentBaseVolume = 1;

  private applyVolume() {
    const vol = this.effectiveVolume(this.currentBaseVolume);
    this.getActiveDeck().volume = vol;
  }

  private crossfadeTo(url: string, trackId: string, baseVolume: number) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const oldDeck = this.getActiveDeck();
    this.activeDeck = this.activeDeck === 'A' ? 'B' : 'A';
    const newDeck = this.getActiveDeck();

    this.currentTrackId = trackId;
    this.currentBaseVolume = baseVolume;

    newDeck.src = url;
    newDeck.volume = 0;
    newDeck.currentTime = 0;

    const playPromise = newDeck.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay blocked — ambient will start on next user interaction
      });
    }

    const targetVolume = this.effectiveVolume(baseVolume);
    const oldVolume = oldDeck.volume;
    const steps = 20;
    const interval = AMBIENT_CROSSFADE_MS / steps;
    let step = 0;

    this.fadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;

      newDeck.volume = Math.min(targetVolume, targetVolume * progress);
      oldDeck.volume = Math.max(0, oldVolume * (1 - progress));

      if (step >= steps) {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        newDeck.volume = targetVolume;
        oldDeck.volume = 0;
        oldDeck.pause();
        oldDeck.src = '';
      }
    }, interval);
  }

  private fadeOut(deck: HTMLAudioElement) {
    const startVolume = deck.volume;
    if (startVolume <= 0) {
      deck.pause();
      deck.src = '';
      return;
    }
    const steps = 15;
    const interval = 400 / steps;
    let step = 0;
    const fadeTimer = setInterval(() => {
      step++;
      deck.volume = Math.max(0, startVolume * (1 - step / steps));
      if (step >= steps) {
        clearInterval(fadeTimer);
        deck.pause();
        deck.src = '';
      }
    }, interval);
  }
}

// Singleton instance
export const ambientManager = new AmbientManager();
