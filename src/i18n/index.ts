/**
 * i18n — Internationalization system for Guild Life Adventures.
 *
 * Usage:
 *   import { t } from '@/i18n';
 *   t('title.newAdventure')          // "New Adventure"
 *   t('sidebar.turn', { name: 'Grimwald' })  // "Grimwald's Turn"
 *
 * Reactive (React):
 *   import { useTranslation } from '@/i18n';
 *   const { t } = useTranslation();
 */

import { useSyncExternalStore, useCallback } from 'react';
import { en } from './en';
import { de } from './de';
import { es } from './es';
import type { Language, TranslationStrings } from './types';

export type { Language, TranslationStrings };

// === Language map ===
const translations: Record<Language, TranslationStrings> = { en, de, es };

/** Display labels for language picker. */
export const LANGUAGE_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
];

// === Storage ===
const LANG_STORAGE_KEY = 'guild-life-language';

let currentLanguage: Language = (() => {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && stored in translations) return stored as Language;
  } catch { /* ignore */ }
  return 'en';
})();

// === Subscription system ===
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const cb of listeners) cb();
}

export function subscribeLanguage(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// === Getters / Setters ===

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  if (lang === currentLanguage) return;
  currentLanguage = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch { /* ignore */ }
  notify();
}

// === Translation function ===

/**
 * Translate a dot-path key, e.g. `t('title.newAdventure')`.
 * Supports interpolation: `t('sidebar.turn', { name: 'Bob' })`.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const strings = translations[currentLanguage] ?? translations.en;
  const parts = key.split('.');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = strings;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') break;
    value = value[part];
  }

  if (typeof value !== 'string') {
    // Fallback to English
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = translations.en;
    for (const part of parts) {
      if (fallback == null || typeof fallback !== 'object') break;
      fallback = fallback[part];
    }
    if (typeof fallback === 'string') value = fallback;
    else return key; // Return key as last resort
  }

  // Interpolation: replace {param} with value
  if (params) {
    return (value as string).replace(/\{(\w+)\}/g, (_, k) =>
      params[k] != null ? String(params[k]) : `{${k}}`
    );
  }

  return value as string;
}

// === React hook ===

const getSnapshot = () => currentLanguage;

export function useTranslation() {
  const language = useSyncExternalStore(subscribeLanguage, getSnapshot);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => t(key, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language],
  );

  return {
    t: translate,
    language,
    setLanguage,
  };
}
