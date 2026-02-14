// SpeechNarrator — singleton wrapping the Web Speech API (SpeechSynthesis)
// for zero-dependency browser-native text-to-speech narration.
// Handles voice selection, cross-browser bugs, and settings persistence.

const SETTINGS_KEY = 'guild-life-narration-settings';
const CANCEL_SPEAK_DELAY = 300; // ms delay between cancel() and next speak()

export interface NarrationSettings {
  enabled: boolean;
  volume: number;   // 0-1
  rate: number;     // 0.5-2.0
  voiceURI: string; // Preferred voice URI (empty = auto-select)
}

export interface VoiceInfo {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}

const DEFAULT_SETTINGS: NarrationSettings = {
  enabled: false,
  volume: 0.8,
  rate: 0.9,
  voiceURI: '',
};

// en-GB voices ranked by quality/preference
const PREFERRED_VOICE_NAMES = [
  'Google UK English Male',
  'Google UK English Female',
  'Microsoft Daniel',
  'Microsoft Sonia Online (Natural)',
  'Daniel',                           // Apple en-GB
  'Microsoft Hazel Desktop',
  'Microsoft Hazel',
];

function loadSettings(): NarrationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
        volume: typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SETTINGS.volume,
        rate: typeof parsed.rate === 'number' ? parsed.rate : DEFAULT_SETTINGS.rate,
        voiceURI: typeof parsed.voiceURI === 'string' ? parsed.voiceURI : DEFAULT_SETTINGS.voiceURI,
      };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: NarrationSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

class SpeechNarrator {
  private settings: NarrationSettings;
  private cachedSettings: NarrationSettings;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null; // prevent GC (Bug 2)
  private listeners: Array<() => void> = [];
  private voicesLoaded = false;
  private userGestureReceived = false;
  private cancelTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Constructor wrapped in try-catch: speechNarrator is a module-level singleton.
    // If initVoices() or registerUserGestureListener() throws (broken SpeechSynthesis
    // API, sandboxed iframe, privacy restrictions), narration degrades to silent.
    // This is critical — a constructor crash prevents React from mounting.
    this.settings = loadSettings();
    this.cachedSettings = { ...this.settings };
    try {
      this.initVoices();
      this.registerUserGestureListener();
    } catch (e) {
      console.warn('[Narration] SpeechSynthesis initialization failed:', e);
    }
  }

  // --- Public API ---

  /** Speak text aloud. Cancels any current speech first. */
  speak(text: string) {
    if (!this.settings.enabled) return;
    if (!this.userGestureReceived) return;
    if (!window.speechSynthesis) return;
    if (!text.trim()) return;

    // Clear any pending cancel timer
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = null;
    }

    // Cancel current speech with delay workaround (Bug 3)
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      this.cancelTimer = setTimeout(() => {
        this.cancelTimer = null;
        this.doSpeak(text);
      }, CANCEL_SPEAK_DELAY);
      return;
    }

    this.doSpeak(text);
  }

  /** Stop any current speech immediately. */
  stop() {
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  /** Check if the browser supports speech synthesis. */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /** Get available voices as simple objects (for UI). */
  getVoices(): VoiceInfo[] {
    return this.voices.map(v => ({
      name: v.name,
      lang: v.lang,
      voiceURI: v.voiceURI,
      localService: v.localService,
    }));
  }

  /** Get English voices only (for voice picker). */
  getEnglishVoices(): VoiceInfo[] {
    return this.getVoices().filter(v => v.lang.startsWith('en'));
  }

  /** Get current settings (immutable snapshot for React). */
  getSettings(): NarrationSettings {
    return this.cachedSettings;
  }

  setEnabled(enabled: boolean) {
    this.settings.enabled = enabled;
    if (!enabled) this.stop();
    this.save();
  }

  setVolume(volume: number) {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.save();
  }

  setRate(rate: number) {
    this.settings.rate = Math.max(0.5, Math.min(2, rate));
    this.save();
  }

  setVoice(voiceURI: string) {
    this.settings.voiceURI = voiceURI;
    this.selectedVoice = this.voices.find(v => v.voiceURI === voiceURI) ?? null;
    if (!this.selectedVoice) {
      this.selectedVoice = this.pickBestVoice();
    }
    this.save();
  }

  /** Subscribe to settings changes. Returns unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // --- Internal ---

  private save() {
    saveSettings(this.settings);
    this.cachedSettings = { ...this.settings };
    this.listeners.forEach(l => l());
  }

  private notify() {
    this.cachedSettings = { ...this.settings };
    this.listeners.forEach(l => l());
  }

  private doSpeak(text: string) {
    if (!window.speechSynthesis) return;

    try {
      // Always create a new utterance (Firefox reuse Bug 4)
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.settings.volume;
      utterance.rate = this.settings.rate;
      utterance.lang = 'en-GB';

      const voice = this.selectedVoice ?? this.pickBestVoice();
      if (voice) {
        utterance.voice = voice;
      }

      // Store reference to prevent garbage collection (Bug 2)
      this.currentUtterance = utterance;

      utterance.onend = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
      };
      utterance.onerror = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      // SpeechSynthesis can throw on some browsers (e.g. sandboxed iframes, privacy settings)
      this.currentUtterance = null;
    }
  }

  private initVoices() {
    if (!this.isSupported()) return;

    try {
      // Try loading voices immediately (works in Firefox)
      const immediate = window.speechSynthesis.getVoices();
      if (immediate.length > 0) {
        this.onVoicesReady(immediate);
        return;
      }

      // Chrome/Edge/Safari: voices load asynchronously
      const handler = () => {
        try {
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            this.onVoicesReady(voices);
            window.speechSynthesis.removeEventListener('voiceschanged', handler);
          }
        } catch { /* ignore — broken SpeechSynthesis implementation */ }
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);

      // Fallback timeout (3s) in case voiceschanged never fires
      setTimeout(() => {
        if (!this.voicesLoaded) {
          try {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
              this.onVoicesReady(voices);
            }
            window.speechSynthesis.removeEventListener('voiceschanged', handler);
          } catch { /* ignore */ }
        }
      }, 3000);
    } catch (e) {
      console.warn('[Narration] Voice initialization failed:', e);
    }
  }

  private onVoicesReady(voices: SpeechSynthesisVoice[]) {
    this.voices = voices;
    this.voicesLoaded = true;

    // Restore saved voice preference, or pick best
    if (this.settings.voiceURI) {
      this.selectedVoice = voices.find(v => v.voiceURI === this.settings.voiceURI) ?? null;
    }
    if (!this.selectedVoice) {
      this.selectedVoice = this.pickBestVoice();
    }

    this.notify();
  }

  private pickBestVoice(): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) return null;

    // 1. Try preferred voices by name
    for (const name of PREFERRED_VOICE_NAMES) {
      const match = this.voices.find(v => v.name === name);
      if (match) return match;
    }

    // 2. Any en-GB voice
    const enGB = this.voices.find(v => v.lang === 'en-GB');
    if (enGB) return enGB;

    // 3. Any English voice
    const en = this.voices.find(v => v.lang.startsWith('en'));
    if (en) return en;

    // 4. Default voice
    const defaultVoice = this.voices.find(v => v.default);
    if (defaultVoice) return defaultVoice;

    return this.voices[0] ?? null;
  }

  /** Register a one-shot user gesture listener to unlock speech. */
  private registerUserGestureListener() {
    if (typeof document === 'undefined') return;

    const unlock = () => {
      this.userGestureReceived = true;
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };

    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);
  }
}

// Singleton instance
export const speechNarrator = new SpeechNarrator();
