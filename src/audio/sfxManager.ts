// SFXManager — singleton that handles sound effects for UI interactions.
// Uses packaged MP3 files only when they have passed the audio asset audit.
// Effects without a verified file are intentionally synthesized with Web Audio.
// Routes audio through Web Audio API GainNodes for iOS/iPadOS volume control
// (iOS ignores HTMLAudioElement.volume — GainNode is the only way to control volume).

import { playSynthSFX } from './synthSFX';
import { connectElement, resumeAudioContext } from './webAudioBridge';

const SETTINGS_KEY = 'guild-life-sfx-settings';

export interface SFXSettings {
  sfxVolume: number; // 0-1
  sfxMuted: boolean;
}

interface FileSFXDefinition {
  source: 'file';
  file: string;
  volume: number;
}

interface SynthSFXDefinition {
  source: 'synth';
  volume: number;
}

type SFXDefinition = FileSFXDefinition | SynthSFXDefinition;

const fileSFX = (file: string, volume: number): FileSFXDefinition => ({ source: 'file', file, volume });
const synthSFX = (volume: number): SynthSFXDefinition => ({ source: 'synth', volume });

/**
 * Sound-effect definitions.
 *
 * `file` means the packaged MP3 is verified and Web Audio synth is a runtime
 * fallback. `synth` means procedural audio is the intended primary source; the
 * browser never requests a nonexistent or known-invalid MP3 first.
 */
export const SFX_LIBRARY = {
  // UI Sounds
  'button-click': fileSFX('button-click.mp3', 0.6),
  'button-hover': synthSFX(0.3),
  'gold-button-click': synthSFX(0.7),
  'menu-open': fileSFX('menu-open.mp3', 0.5),
  'menu-close': fileSFX('menu-close.mp3', 0.4),

  // Game Actions
  'coin-gain': synthSFX(0.6),
  'coin-spend': synthSFX(0.5),
  'item-buy': fileSFX('item-buy.mp3', 0.6),
  'item-equip': synthSFX(0.5),
  'success': synthSFX(0.6),
  'error': fileSFX('error.mp3', 0.5),

  // Movement & Locations
  'footstep': synthSFX(0.4),
  'door-open': synthSFX(0.5),

  // Work & Education
  'work-complete': synthSFX(0.5),
  'study': synthSFX(0.4),
  'graduation': fileSFX('graduation.mp3', 0.7),

  // Combat & Dungeon
  'sword-hit': synthSFX(0.6),
  'damage-taken': synthSFX(0.5),
  'victory-fanfare': fileSFX('victory-fanfare.mp3', 0.7),
  'defeat': synthSFX(0.5),

  // Events
  'notification': fileSFX('notification.mp3', 0.5),
  'turn-start': synthSFX(0.4),
  'week-end': fileSFX('week-end.mp3', 0.5),

  // Game event sounds
  'robbery': fileSFX('robbery.mp3', 0.6),
  'heal': synthSFX(0.5),
  'quest-accept': synthSFX(0.5),
  'quest-complete': fileSFX('quest-complete.mp3', 0.6),
  'level-up': fileSFX('level-up.mp3', 0.7),
  'appliance-break': fileSFX('appliance-break.mp3', 0.5),
  'dice-roll': fileSFX('dice-roll.mp3', 0.4),
  'death': fileSFX('death.mp3', 0.6),
  'resurrection': fileSFX('resurrection.mp3', 0.6),
  'rent-paid': fileSFX('rent-paid.mp3', 0.4),
  'weather-thunder': fileSFX('weather-thunder.mp3', 0.5),
  'festival': synthSFX(0.5),
  'travel-event': fileSFX('travel-event.mp3', 0.5),

  // Dark magic
  'curse-cast': synthSFX(0.65),
} as const satisfies Record<string, SFXDefinition>;

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
  private audioPool: HTMLAudioElement[] = [];
  private gainNodes: (GainNode | null)[] = [];
  private poolIndex = 0;
  private readonly POOL_SIZE = 8;
  private failedFiles = new Set<SFXId>();

  constructor() {
    this.settings = loadSettings();
    this.cachedSettings = { ...this.settings };

    try {
      for (let i = 0; i < this.POOL_SIZE; i++) {
        const audio = new Audio();
        audio.preload = 'auto';
        this.audioPool.push(audio);
        this.gainNodes.push(connectElement(audio));
      }
    } catch (error) {
      console.warn('[SFX] Audio pool creation failed — synth effects remain available:', error);
    }
  }

  /** Play a sound effect by ID using its declared primary source. */
  play(sfxId: SFXId) {
    if (this.settings.sfxMuted) return;

    const sfx = SFX_LIBRARY[sfxId];
    const effectiveVolume = sfx.volume * this.settings.sfxVolume;

    if (sfx.source === 'synth') {
      playSynthSFX(sfxId, effectiveVolume);
      return;
    }

    if (this.failedFiles.has(sfxId) || this.audioPool.length === 0) {
      playSynthSFX(sfxId, effectiveVolume);
      return;
    }

    const url = `${import.meta.env.BASE_URL}sfx/${sfx.file}`;
    const index = this.poolIndex;
    const audio = this.audioPool[index];
    const gain = this.gainNodes[index];
    this.poolIndex = (this.poolIndex + 1) % this.POOL_SIZE;

    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    if (gain) gain.gain.value = effectiveVolume;
    else audio.volume = effectiveVolume;

    resumeAudioContext();

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch((error) => {
        if (error?.name === 'NotAllowedError') {
          playSynthSFX(sfxId, effectiveVolume);
        } else {
          this.failedFiles.add(sfxId);
          playSynthSFX(sfxId, effectiveVolume);
        }
      });
    }

    const errorHandler = () => {
      this.failedFiles.add(sfxId);
      playSynthSFX(sfxId, effectiveVolume);
      audio.removeEventListener('error', errorHandler);
    };
    audio.addEventListener('error', errorHandler, { once: true });
  }

  getSettings(): SFXSettings {
    return this.cachedSettings;
  }

  setVolume(volume: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    saveSettings(this.settings);
    this.notify();
  }

  toggleMute() {
    this.settings.sfxMuted = !this.settings.sfxMuted;
    saveSettings(this.settings);
    this.notify();
  }

  setMuted(muted: boolean) {
    this.settings.sfxMuted = muted;
    saveSettings(this.settings);
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(listenerEntry => listenerEntry !== listener);
    };
  }

  private notify() {
    this.cachedSettings = { ...this.settings };
    this.listeners.forEach(listener => listener());
  }
}

export const sfxManager = new SFXManager();

export function playSFX(sfxId: SFXId) {
  sfxManager.play(sfxId);
}
