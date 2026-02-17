// AudioManager — singleton that handles background music with crossfade transitions.
// Uses two HTMLAudioElement instances (A/B) to allow smooth volume crossfading.
// Routes audio through Web Audio API GainNodes for iOS/iPadOS volume control
// (iOS ignores HTMLAudioElement.volume — GainNode is the only way to control volume).
// Falls back to HTMLAudioElement.volume if AudioContext is unavailable.

import { MUSIC_TRACKS, CROSSFADE_MS, DEFAULT_MUSIC_VOLUME } from './musicConfig';
import { connectElement, resumeAudioContext } from './webAudioBridge';

const SETTINGS_KEY = 'guild-life-audio-settings';

export interface AudioSettings {
  musicVolume: number; // 0-1
  musicMuted: boolean;
}

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        musicVolume: typeof parsed.musicVolume === 'number' ? parsed.musicVolume : DEFAULT_MUSIC_VOLUME,
        musicMuted: typeof parsed.musicMuted === 'boolean' ? parsed.musicMuted : false,
      };
    }
  } catch { /* ignore */ }
  return { musicVolume: DEFAULT_MUSIC_VOLUME, musicMuted: false };
}

function saveSettings(settings: AudioSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

class AudioManager {
  private deckA: HTMLAudioElement;
  private deckB: HTMLAudioElement;
  // Web Audio API gain nodes for iOS volume control (null = fallback to element.volume)
  private gainA: GainNode | null;
  private gainB: GainNode | null;
  // Which deck is currently active (the one playing or fading in)
  private activeDeck: 'A' | 'B' = 'A';
  private currentTrackId: string | null = null;
  private settings: AudioSettings;
  // Cached immutable settings object for useSyncExternalStore
  // Only recreated when settings actually change
  private cachedSettings: AudioSettings;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<() => void> = [];
  private resumeCleanup: (() => void) | null = null;

  constructor() {
    // Audio element creation wrapped in try-catch: if Audio() is unavailable
    // (e.g., sandboxed iframe), music gracefully degrades to silence.
    // This is critical because audioManager is a module-level singleton —
    // a constructor crash prevents React from mounting ("Loading the realm..." freeze).
    try {
      this.deckA = new Audio();
      this.deckB = new Audio();
      this.deckA.loop = true;
      this.deckB.loop = true;
      this.deckA.preload = 'auto';
      this.deckB.preload = 'auto';
    } catch (e) {
      console.warn('[Audio] HTMLAudioElement creation failed:', e);
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
      console.warn('[Audio] connectElement failed:', e);
      this.gainA = null;
      this.gainB = null;
    }

    this.settings = loadSettings();
    this.cachedSettings = { ...this.settings };
    this.applyVolume();
  }

  // --- Public API ---

  /** Play a track by ID. Retries if same track was blocked by autoplay. */
  play(trackId: string) {
    if (trackId === this.currentTrackId) {
      // Same track requested — retry if the active deck is paused (autoplay blocked)
      const deck = this.getActiveDeck();
      if (deck.paused && deck.src) {
        resumeAudioContext();
        deck.play().catch(() => {});
      }
      return;
    }

    const track = MUSIC_TRACKS[trackId];
    if (!track) return;

    const url = `${import.meta.env.BASE_URL}music/${track.file}`;
    this.crossfadeTo(url, trackId);
  }

  /** Stop all music with a short fade out. */
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

  /** Get current settings - returns cached immutable object for React compatibility. */
  getSettings(): AudioSettings {
    return this.cachedSettings;
  }

  /** Set music volume (0-1). */
  setVolume(volume: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
    saveSettings(this.settings);
    this.notify();
  }

  /** Toggle mute. */
  toggleMute() {
    this.settings.musicMuted = !this.settings.musicMuted;
    this.applyVolume();
    saveSettings(this.settings);
    this.notify();
  }

  /** Set muted state directly. */
  setMuted(muted: boolean) {
    this.settings.musicMuted = muted;
    this.applyVolume();
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
    // Create new cached settings object when settings change
    // This is required for useSyncExternalStore to detect changes
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

  private effectiveVolume(): number {
    return this.settings.musicMuted ? 0 : this.settings.musicVolume;
  }

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
    const vol = this.effectiveVolume();
    // Only set volume on the active deck; inactive deck is either silent or fading out
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

  private crossfadeTo(url: string, trackId: string) {
    // Cancel any ongoing fade
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    this.clearResumeListener();

    const oldDeck = this.getActiveDeck();
    const oldGain = this.getActiveGain();
    // Switch active deck
    this.activeDeck = this.activeDeck === 'A' ? 'B' : 'A';
    const newDeck = this.getActiveDeck();
    const newGain = this.getActiveGain();

    this.currentTrackId = trackId;

    // Prepare the new deck
    newDeck.src = url;
    this.setGainVolume(newGain, newDeck, 0);
    newDeck.currentTime = 0;

    // Resume AudioContext (iOS requires user gesture)
    resumeAudioContext();

    // Start playing the new deck (handle autoplay restrictions)
    const playPromise = newDeck.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay blocked — register listener to resume on next user interaction
        console.warn(`[Music] Autoplay blocked for "${trackId}", will resume on user interaction`);
        this.registerResumeListener(newDeck, trackId);
      });
    }

    // Crossfade
    const targetVolume = this.effectiveVolume();
    const steps = 30; // ~30 steps during crossfade
    const interval = CROSSFADE_MS / steps;
    let step = 0;

    this.fadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;

      // New deck fades in
      this.setGainVolume(newGain, newDeck, Math.min(targetVolume, targetVolume * progress));
      // Old deck fades out
      this.setGainVolume(oldGain, oldDeck, Math.max(0, targetVolume * (1 - progress)));

      if (step >= steps) {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        // Ensure final volumes
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
    const steps = 20;
    const interval = 500 / steps;
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
export const audioManager = new AudioManager();
