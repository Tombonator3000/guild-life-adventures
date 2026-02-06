/**
 * Dark mode toggle button.
 * Uses the .dark class on <html> (Tailwind class-based dark mode).
 * Persists preference to localStorage.
 */

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'guild-life-dark-mode';

function getInitialMode(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    // Default to dark (the game's natural aesthetic)
    return true;
  } catch {
    return true;
  }
}

export function DarkModeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(getInitialMode);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(isDark));
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  // Apply initial mode on mount
  useEffect(() => {
    if (getInitialMode()) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className={`p-2 rounded transition-colors ${
        isDark
          ? 'bg-background/50 text-gold hover:bg-background/70'
          : 'bg-background/50 text-primary hover:bg-background/70'
      } ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
