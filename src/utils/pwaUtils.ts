/**
 * PWA Registration and Error Handling
 * Provides better error messages for PWA installation issues
 */

interface PWAError {
  code: string;
  message: string;
  details?: any;
}

class PWAErrorHandler {
  private errors: PWAError[] = [];

  logError(error: PWAError) {
    this.errors.push(error);
    console.error('🚨 PWA Error:', error);

    // Store in localStorage for debugging
    try {
      const existing = JSON.parse(localStorage.getItem('pwa-errors') || '[]');
      existing.push({ ...error, timestamp: new Date().toISOString() });
      localStorage.setItem('pwa-errors', JSON.stringify(existing.slice(-10))); // Keep last 10
    } catch (e) {
      console.error('Failed to store PWA error:', e);
    }
  }

  getErrors(): PWAError[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
    localStorage.removeItem('pwa-errors');
  }
}

export const pwaErrorHandler = new PWAErrorHandler();

// Enhanced PWA registration with error handling
export const registerPWA = async () => {
  // Check if PWA is supported
  if (!('serviceWorker' in navigator)) {
    pwaErrorHandler.logError({
      code: 'SERVICE_WORKER_NOT_SUPPORTED',
      message: 'Service Worker not supported in this browser'
    });
    return;
  }

  if (!('BeforeInstallPromptEvent' in window)) {
    console.warn('⚠️ PWA installation may not be fully supported in this browser');
  }

  try {
    // Check if we're running on HTTPS (required for PWA)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && !location.hostname.startsWith('127.')) {
      pwaErrorHandler.logError({
        code: 'HTTPS_REQUIRED',
        message: 'PWA installation requires HTTPS. For local development, use HTTPS server.',
        details: { protocol: location.protocol, hostname: location.hostname }
      });
    }

    // Check manifest
    const manifestResponse = await fetch('/manifest.webmanifest');
    if (!manifestResponse.ok) {
      pwaErrorHandler.logError({
        code: 'MANIFEST_NOT_FOUND',
        message: 'PWA manifest not found or not accessible',
        details: { status: manifestResponse.status }
      });
    }

    // Register service worker (handled by VitePWA, but we can check)
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.warn('⚠️ Service Worker not registered yet. This may affect PWA functionality.');
    } else {
      console.log('✅ Service Worker registered:', registration.scope);
    }

    // Listen for PWA installation events
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('📱 PWA install prompt available');
      // Prevent automatic prompt
      event.preventDefault();

      // Store the event for later use
      (window as any).deferredPrompt = event;
    });

    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installed successfully!');
      // Clear any stored prompt
      delete (window as any).deferredPrompt;
    });

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 Running in PWA standalone mode');
    }

  } catch (error) {
    pwaErrorHandler.logError({
      code: 'PWA_REGISTRATION_FAILED',
      message: 'Failed to initialize PWA',
      details: error
    });
  }
};

// Utility to trigger PWA installation
export const installPWA = async (): Promise<boolean> => {
  const deferredPrompt = (window as any).deferredPrompt;

  if (!deferredPrompt) {
    pwaErrorHandler.logError({
      code: 'NO_INSTALL_PROMPT',
      message: 'PWA install prompt not available. Make sure the app meets PWA criteria.'
    });
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ User accepted PWA installation');
      return true;
    } else {
      console.log('❌ User dismissed PWA installation');
      return false;
    }
  } catch (error) {
    pwaErrorHandler.logError({
      code: 'INSTALL_FAILED',
      message: 'PWA installation failed',
      details: error
    });
    return false;
  }
};

// Check PWA installation status
export const getPWAStatus = () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const hasInstallPrompt = !!(window as any).deferredPrompt;

  return {
    isInstalled: isStandalone,
    isIOS,
    isAndroid,
    canInstall: hasInstallPrompt,
    isHttps: location.protocol === 'https:',
    errors: pwaErrorHandler.getErrors()
  };
};