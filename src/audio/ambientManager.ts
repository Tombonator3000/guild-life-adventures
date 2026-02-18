// AmbientManager — singleton that handles environmental/atmospheric audio loops.
// Runs independently of the music system. Uses crossfade for smooth transitions.
// Routes audio through Web Audio API GainNodes for iOS/iPadOS volume control
// (iOS ignores HTMLAudioElement.volume — GainNode is the only way to control volume).
// Falls back to HTMLAudioElement.volume if AudioContext is unavailable.

import { AMBIENT_TRACKS, AMBIENT_CROSSFADE_MS, DEFAULT_AMBIENT_VOLUME } from './ambientConfig';
import { connectElement, resumeAudioContext } from './webAudioBridge';

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
  // Web Audio API gain nodes for iOS volume control (null = fallback to element.volume)
  private gainA: GainNode | null;
  private gainB: GainNode | null;
  private activeDeck: 'A' | 'B' = 'A';
  private currentTrackId: string | null = null;
  private settings: AmbientSettings;
  private cachedSettings: AmbientSettings;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<() => void> = [];
  private resumeCleanup: (() => void) | null = null;

  constructor() {
    // Audio element creation wrapped in try-catch: if Audio() is unavailable
    // (e.g., sandboxed iframe), ambient sounds gracefully degrade to silence.
    try {
      this.deckA = new Audio();
      this.deckB = new Audio();
      this.deckA.loop = true;
      this.deckB.loop = true;
      this.deckA.preload = 'auto';
      this.deckB.preload = 'auto';
    } catch (e) {
      console.warn('[Ambient] HTMLAudioElement creation failed:', e);
      this.deckA = {} as HTMLAudioElement;
      this.deckB = {} as HTMLAudioElement;
    }

    // Route through Web Audio API GainNodes — required for iOS volume control
    // Returns null if AudioContext is unavailable (falls back to element.volume)
    // Wrapped in try-catch: connectElement creates an AudioContext at module load time.
    // If this throws (e.g. dummy Audio element from catch above), it must not crash
    // the singleton — a crash here prevents React from mounting.
    try {
      this.gainA = connectElement(this.deckA);
      this.gainB = connectElement(this.deckB);
    } catch (e) {
      console.warn('[Ambient] connectElement failed:', e);
      this.gainA = null;
      this.gainB = null;
    }

    this.settings = loadSettings();
    this.cachedSettings = { ...this.settings };
  }

  // --- Public API ---

  /** Play an ambient track by ID. Retries if same track was blocked by autoplay. */
  play(trackId: string) {
    if (trackId === this.currentTrackId) {
      // Same track requested — but if the active deck is paused (autoplay was blocked),
      // retry playback instead of silently returning
      const deck = this.getActiveDeck();
      if (deck.paused && deck.src) {
        resumeAudioContext();
        deck.play().catch(() => {});
      }
      return;
    }

    const track = AMBIENT_TRACKS[trackId];
    if (!track) return;

    const url = `${import.meta.env.BASE_URL}ambient/${track.file}`;
    this.crossfadeTo(url, trackId, track.baseVolume);
  }

  /** Stop all ambient with fade out. */
  stop() {
    if (!this.currentTrackId) return;
    this.currentTrackId = null;
    this.clearResumeListener();
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    this.fadeOut(this.getActiveDeck(), this.getActiveGain());
    this.fadeOut(this.getInactiveDeck(), this.getInactiveGain());
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

  private getActiveGain(): GainNode | null {
    return this.activeDeck === 'A' ? this.gainA : this.gainB;
  }

  private getInactiveGain(): GainNode | null {
    return this.activeDeck === 'A' ? this.gainB : this.gainA;
  }

  private effectiveVolume(baseVolume = 1): number {
    if (this.settings.ambientMuted) return 0;
    return this.settings.ambientVolume * baseVolume;
  }

  private currentBaseVolume = 1;

  /** Set volume on a gain node if available, otherwise use element.volume */
  private setGainVolume(gain: GainNode | null, deck: HTMLAudioElement, vol: number) {
    if (gain) {
      gain.gain.value = vol;
    } else {
      deck.volume = vol;
    }
  }

  /** Read volume from a gain node if available, otherwise from element.volume */
  private getGainVolume(gain: GainNode | null, deck: HTMLAudioElement): number {
    return gain ? gain.gain.value : deck.volume;
  }

  private applyVolume() {
    const vol = this.effectiveVolume(this.currentBaseVolume);
    this.setGainVolume(this.getActiveGain(), this.getActiveDeck(), vol);
  }

  private clearResumeListener() {
    if (this.resumeCleanup) {
      this.resumeCleanup();
      this.resumeCleanup = null;
    }
  }

  /** Register a one-shot user interaction listener to resume blocked playback. */
  private registerResumeListener(deck: HTMLAudioElement, trackId: string) {
    this.clearResumeListener();

    const resume = () => {
      resumeAudioContext();
      // Only retry if this is still the track we want to play
      if (this.currentTrackId === trackId && deck.paused && deck.src) {
        deck.play().catch(() => {});
      }
      cleanup();
    };

    const cleanup = () => {
      document.removeEventListener('click', resume);
      document.removeEventListener('touchstart', resume);
      document.removeEventListener('keydown', resume);
      this.resumeCleanup = null;
    };

    document.addEventListener('click', resume, { once: true });
    document.addEventListener('touchstart', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
    this.resumeCleanup = cleanup;
  }

  private crossfadeTo(url: string, trackId: string, baseVolume: number) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    this.clearResumeListener();

    const oldDeck = this.getActiveDeck();
    const oldGain = this.getActiveGain();
    this.activeDeck = this.activeDeck === 'A' ? 'B' : 'A';
    const newDeck = this.getActiveDeck();
    const newGain = this.getActiveGain();

    this.currentTrackId = trackId;
    this.currentBaseVolume = baseVolume;

    newDeck.src = url;
    this.setGainVolume(newGain, newDeck, 0);
    newDeck.currentTime = 0;

    // Resume AudioContext (iOS requires user gesture)
    resumeAudioContext();

    const playPromise = newDeck.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay blocked — register listener to resume on next user interaction
        console.warn(`[Ambient] Autoplay blocked for "${trackId}", will resume on user interaction`);
        this.registerResumeListener(newDeck, trackId);
      });
    }

    const targetVolume = this.effectiveVolume(baseVolume);
    const oldVolume = this.getGainVolume(oldGain, oldDeck);
    const steps = 20;
    const interval = AMBIENT_CROSSFADE_MS / steps;
    let step = 0;

    this.fadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;

      this.setGainVolume(newGain, newDeck, Math.min(targetVolume, targetVolume * progress));
      this.setGainVolume(oldGain, oldDeck, Math.max(0, oldVolume * (1 - progress)));

      if (step >= steps) {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        this.setGainVolume(newGain, newDeck, targetVolume);
        this.setGainVolume(oldGain, oldDeck, 0);
        oldDeck.pause();
        oldDeck.src = '';
      }
    }, interval);
  }

  private fadeOut(deck: HTMLAudioElement, gain: GainNode | null) {
    const startVolume = this.getGainVolume(gain, deck);
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
      this.setGainVolume(gain, deck, Math.max(0, startVolume * (1 - step / steps)));
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
