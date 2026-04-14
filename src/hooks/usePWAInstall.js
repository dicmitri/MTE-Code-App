import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isInStandaloneMode =
      'standalone' in window.navigator && window.navigator.standalone;

    if (isIosDevice && !isInStandaloneMode) {
      setIsIos(true);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      return;
    }
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setInstallPromptEvent(null);
  };

  return {
    installPromptEvent,
    isIos,
    showIosPrompt,
    setShowIosPrompt,
    handleInstallClick
  };
};
