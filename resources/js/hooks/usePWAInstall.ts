import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(iosDevice);

    // Show iOS install banner after 3rd visit (not if already installed)
    if (iosDevice && !isStandalone) {
      const visits = parseInt(sessionStorage.getItem('pwa_visits') || '0') + 1;
      sessionStorage.setItem('pwa_visits', String(visits));
      if (visits >= 3 && !localStorage.getItem('pwa_ios_banner_dismissed')) {
        setShowIOSBanner(true);
      }
    }

    // Capture the beforeinstallprompt event (Android/Desktop Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismissIOSBanner = useCallback(() => {
    setShowIOSBanner(false);
    localStorage.setItem('pwa_ios_banner_dismissed', '1');
  }, []);

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    isIOS,
    showIOSBanner,
    install,
    dismissIOSBanner,
  };
}
