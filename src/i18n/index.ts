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
import type { Language, TranslationStrings } from './types';

export type { Language, TranslationStrings };

// === Language map ===
// English is the fallback and always loaded. Other languages load on demand so
// English players do not download them at startup.
const translations: Partial<Record<Language, TranslationStrings>> = { en };
const loaders: Record<Exclude<Language, 'en'>, () => Promise<TranslationStrings>> = {
  de: () => import('./de').then(m => m.de),
  es: () => import('./es').then(m => m.es),
};
const loading = new Map<Language, Promise<void>>();

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
    if (stored && LANGUAGE_OPTIONS.some(option => option.value === stored)) return stored as Language;
  } catch { /* ignore */ }
  return 'en';
})();

// === Subscription system ===
type Listener = () => void;
const listeners = new Set<Listener>();

// Bumped on a language switch and when a language's strings finish loading.
let revision = 0;

function notify() {
  revision += 1;
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

/** Load a language's strings once; English is always present. Failed loads fall back to English. */
function loadLanguage(lang: Language): Promise<void> {
  if (translations[lang]) return Promise.resolve();
  let pending = loading.get(lang);
  if (!pending) {
    pending = loaders[lang as Exclude<Language, 'en'>]()
      .then(strings => {
        translations[lang] = strings;
        if (lang === currentLanguage) notify();
      })
      .catch(error => {
        loading.delete(lang);
        console.warn(`[i18n] Could not load "${lang}", using English:`, error);
      });
    loading.set(lang, pending);
  }
  return pending;
}

/** Resolves when the selected language is loaded (await before the first render to avoid an English flash). */
export function whenLanguageReady(): Promise<void> {
  return loadLanguage(currentLanguage);
}

export function setLanguage(lang: Language): void {
  if (lang === currentLanguage) return;
  currentLanguage = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch { /* ignore */ }
  // English text shows until the chosen language arrives, then listeners re-render.
  void loadLanguage(lang);
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

const getSnapshot = () => revision;

export function useTranslation() {
  const languageRevision = useSyncExternalStore(subscribeLanguage, getSnapshot);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => t(key, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [languageRevision],
  );

  return {
    t: translate,
    language: currentLanguage,
    setLanguage,
  };
}
