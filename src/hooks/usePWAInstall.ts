import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (navigator as unknown as { standalone: boolean }).standalone === true);
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode on any platform)
    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    const ios = isIOSDevice();
    setIsIOS(ios);

    // On iOS, beforeinstallprompt is never fired — show manual install guide instead
    if (ios) {
      setCanInstall(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    // On iOS, show the manual install guide
    if (isIOS) {
      setShowIOSGuide(true);
      return false;
    }

    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setCanInstall(false);
    }

    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt, isIOS]);

  const dismissIOSGuide = useCallback(() => {
    setShowIOSGuide(false);
  }, []);

  return { canInstall, isInstalled, install, isIOS, showIOSGuide, dismissIOSGuide };
}
