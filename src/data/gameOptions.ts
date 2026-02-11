/**
 * Game Options — centralized settings storage.
 * Persists to localStorage. Provides non-React access for game logic (helpers).
 */

const STORAGE_KEY = 'guild-life-options';

export type BorderStyle = 'stone' | 'leather' | 'wood' | 'iron' | 'parchment' | 'none';

export interface GameOptions {
  // === Gameplay ===
  enableAging: boolean;        // Player aging system (birthdays, elder decay, health crises)
  enableWeatherEvents: boolean; // Random weather events affecting gameplay
  enableFestivals: boolean;    // Seasonal festivals every 12 weeks
  enablePermadeath: boolean;   // Players die permanently (vs respawn at cost)

  // === Display ===
  showEventAnimations: boolean; // Animate event popups
  compactUI: boolean;          // Use compact stat displays
  showTurnNotifications: boolean; // Show turn-change notifications
  borderStyle: BorderStyle;    // Side panel border style: stone, leather, or none

  // === Game Speed ===
  autoEndTurn: boolean;        // Auto-end turn when time runs out

  // Note: Dark mode, music, and SFX have their own dedicated storage/managers.
  // They are surfaced in the OptionsMenu UI but managed by their own systems.
}

const DEFAULT_OPTIONS: GameOptions = {
  // Gameplay
  enableAging: false,           // Off by default — opt-in feature
  enableWeatherEvents: true,
  enableFestivals: true,
  enablePermadeath: true,

  // Display
  showEventAnimations: true,
  compactUI: false,
  showTurnNotifications: true,
  borderStyle: 'stone',         // Default: stone wall borders

  // Game Speed
  autoEndTurn: false,
};

let cachedOptions: GameOptions | null = null;

/** Load options from localStorage (with defaults for missing keys). */
export function loadGameOptions(): GameOptions {
  if (cachedOptions) return cachedOptions;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedOptions = { ...DEFAULT_OPTIONS };
      return cachedOptions;
    }
    const stored = JSON.parse(raw);
    // Merge with defaults to handle new options added in future versions
    cachedOptions = { ...DEFAULT_OPTIONS, ...stored };
    return cachedOptions;
  } catch {
    cachedOptions = { ...DEFAULT_OPTIONS };
    return cachedOptions;
  }
}

/** Save options to localStorage. */
export function saveGameOptions(options: GameOptions): void {
  cachedOptions = { ...options };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
  // Notify subscribers
  for (const cb of listeners) cb();
}

/** Update a single option. */
export function setGameOption<K extends keyof GameOptions>(key: K, value: GameOptions[K]): void {
  const current = loadGameOptions();
  saveGameOptions({ ...current, [key]: value });
}

/** Get a single option value (non-React, for use in game logic). */
export function getGameOption<K extends keyof GameOptions>(key: K): GameOptions[K] {
  return loadGameOptions()[key];
}

/** Reset all options to defaults. */
export function resetGameOptions(): void {
  saveGameOptions({ ...DEFAULT_OPTIONS });
}

// === Subscription system (for React hook) ===
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeGameOptions(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export { DEFAULT_OPTIONS };
