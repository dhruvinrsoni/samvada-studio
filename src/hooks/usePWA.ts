/**
 * PWA Hook - Provides install prompt, update detection, and service worker status
 * 
 * Features:
 * - Custom install prompt handling (beforeinstallprompt)
 * - Service worker update detection
 * - Online/offline status tracking
 * - Cross-browser compatibility (Chrome, Edge, Firefox, Safari)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Define types for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Extend Window interface for deferredPrompt
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

export interface PWAStatus {
  // Install state
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  
  // Update state
  needsUpdate: boolean;
  isUpdating: boolean;
  
  // Connection state
  isOnline: boolean;
  
  // Service worker state
  swRegistration: ServiceWorkerRegistration | null;
  swStatus: 'idle' | 'installing' | 'waiting' | 'active' | 'error';
  
  // Actions
  installApp: () => Promise<boolean>;
  updateApp: () => void;
  dismissInstall: () => void;
  checkForUpdates: () => Promise<void>;
}

export function usePWA(): PWAStatus {
  // Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  
  // Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Service worker registration using vite-plugin-pwa
  const {
    needRefresh: [needsUpdate],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registered:', swUrl);
      
      // Check for updates periodically (every 1 hour)
      if (registration) {
        setInterval(() => {
          registration.update();
          console.log('[PWA] Checking for updates...');
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
    onNeedRefresh() {
      console.log('[PWA] New content available, please refresh.');
    },
    onOfflineReady() {
      console.log('[PWA] App is ready for offline use.');
    },
  });

  // Check if app is running as standalone (installed)
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://');

  // Track last prompt time (show every 2 days if not dismissed)
  const [lastPromptTime, setLastPromptTime] = useState<number>(() => {
    const stored = localStorage.getItem('pwa-last-prompt');
    return stored ? parseInt(stored, 10) : 0;
  });

  // Detect install state
  useEffect(() => {
    // Check localStorage for previous install dismissal
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Reset dismissal after 2 days (not too annoying)
      if (Date.now() - dismissedTime > 2 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('pwa-install-dismissed');
        setInstallDismissed(false);
      } else {
        setInstallDismissed(true);
      }
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt with smart timing
      const now = Date.now();
      const daysSinceLastPrompt = (now - lastPromptTime) / (1000 * 60 * 60 * 24);
      
      // Show immediately if never shown, or after 2 days
      // Also show after 30 minutes on first session
      const isFirstVisit = lastPromptTime === 0;
      const shouldShowPrompt = isFirstVisit || daysSinceLastPrompt >= 2;
      
      if (shouldShowPrompt && !installDismissed) {
        // For first visit, wait 30 seconds before showing
        const delay = isFirstVisit ? 30000 : 0;
        
        setTimeout(() => {
          setIsInstallable(true);
          setLastPromptTime(now);
          localStorage.setItem('pwa-last-prompt', now.toString());
        }, delay);
      }
    };

    // Handle appinstalled event
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      
      // Store installation state
      localStorage.setItem('pwa-installed', 'true');
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-last-prompt');
    };

    // Check if already installed
    if (localStorage.getItem('pwa-installed') === 'true' || isStandalone) {
      setIsInstalled(true);
      setIsInstallable(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone, lastPromptTime]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('[PWA] App is online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[PWA] App is offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Install app function
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user's choice
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA] User choice:', outcome);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Install error:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Dismiss install prompt
  const dismissInstall = useCallback(() => {
    setInstallDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  // Update app function
  const updateApp = useCallback(() => {
    console.log('[PWA] Updating service worker...');
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  // Check for updates manually
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('[PWA] Manual update check completed');
      }
    }
  }, []);

  // Get service worker status
  const [swStatus, setSwStatus] = useState<'idle' | 'installing' | 'waiting' | 'active' | 'error'>('idle');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const updateSwStatus = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          setSwRegistration(registration || null);
          
          if (registration) {
            if (registration.installing) {
              setSwStatus('installing');
            } else if (registration.waiting) {
              setSwStatus('waiting');
            } else if (registration.active) {
              setSwStatus('active');
            }
          }
        } catch {
          setSwStatus('error');
        }
      }
    };

    updateSwStatus();

    // Listen for service worker state changes
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service worker controller changed');
        updateSwStatus();
      });
    }
  }, []);

  // Close offline ready notification after 5 seconds
  useEffect(() => {
    if (offlineReady) {
      const timer = setTimeout(() => {
        setOfflineReady(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [offlineReady, setOfflineReady]);

  return {
    // Install state
    isInstallable: isInstallable && !installDismissed && !isInstalled,
    isInstalled,
    isStandalone,
    
    // Update state
    needsUpdate,
    isUpdating: swStatus === 'installing',
    
    // Connection state
    isOnline,
    
    // Service worker state
    swRegistration,
    swStatus,
    
    // Actions
    installApp,
    updateApp,
    dismissInstall,
    checkForUpdates,
  };
}

export default usePWA;
