/**
 * PWA Status Panel - Advanced PWA management for power users
 * 
 * Features:
 * - Install/Uninstall management
 * - Service Worker status and controls
 * - Cache management
 * - Version info and diagnostics
 * - Debug-level information
 */

import { useState, useEffect } from 'react';
import type { PWAStatus } from '../../hooks/usePWA';

interface PWAStatusPanelProps {
  pwaStatus: PWAStatus;
  isDark: boolean;
}

interface CacheInfo {
  name: string;
  size: number;
  count: number;
}

export default function PWAStatusPanel({ pwaStatus, isDark }: PWAStatusPanelProps) {
  const [cacheList, setCacheList] = useState<CacheInfo[]>([]);
  const [totalCacheSize, setTotalCacheSize] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [isFetchingCache, setIsFetchingCache] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    isInstallable,
    isInstalled,
    isStandalone,
    needsUpdate,
    isOnline,
    swRegistration,
    swStatus,
    installApp,
    updateApp,
    checkForUpdates,
  } = pwaStatus;

  // Get app version from package.json or manifest
  const appVersion = '0.1.0'; // TODO: Pull from package.json dynamically

  // Fetch cache information
  useEffect(() => {
    if ('caches' in window) {
      fetchCacheInfo();
    }
  }, []);

  const fetchCacheInfo = async () => {
    setIsFetchingCache(true);
    try {
      const cacheNames = await caches.keys();
      const cacheInfoPromises = cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        
        // Estimate size (rough calculation)
        let estimatedSize = 0;
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            estimatedSize += blob.size;
          }
        }

        return {
          name,
          count: keys.length,
          size: estimatedSize,
        };
      });

      const info = await Promise.all(cacheInfoPromises);
      setCacheList(info);
      setTotalCacheSize(info.reduce((sum, cache) => sum + cache.size, 0));
    } catch (error) {
      console.error('[PWA] Error fetching cache info:', error);
    } finally {
      setIsFetchingCache(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all cached data? This will not affect your chats or settings.')) {
      return;
    }

    setIsClearing(true);
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[PWA] All caches cleared');
      await fetchCacheInfo();
      alert('Cache cleared successfully! The app will reload.');
      window.location.reload();
    } catch (error) {
      console.error('[PWA] Error clearing cache:', error);
      alert('Failed to clear cache. Check console for details.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleUnregisterSW = async () => {
    if (!confirm('Unregister service worker? This will disable offline features until next visit.')) {
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('[PWA] Service worker unregistered');
      alert('Service worker unregistered. The app will reload.');
      window.location.reload();
    } catch (error) {
      console.error('[PWA] Error unregistering service worker:', error);
      alert('Failed to unregister service worker. Check console for details.');
    }
  };

  const handleResetPWA = async () => {
    if (!confirm('Reset all PWA data? This will clear caches, unregister service worker, and reset install preferences.')) {
      return;
    }

    try {
      // Clear caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));

      // Unregister service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }

      // Clear PWA-related localStorage
      localStorage.removeItem('pwa-installed');
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-last-prompt');

      console.log('[PWA] Complete reset performed');
      alert('PWA reset complete. The app will reload.');
      window.location.reload();
    } catch (error) {
      console.error('[PWA] Error during reset:', error);
      alert('Failed to reset PWA. Check console for details.');
    }
  };

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      alert('App installed successfully!');
    } else {
      // Check if it's because prompt isn't available yet
      if (!isInstallable) {
        alert('The install prompt is not available yet. This usually happens when:\n\n1. The browser is still evaluating the app\n2. The app is already installed\n3. Installation criteria are not met\n\nTry refreshing the page or visiting the app a few more times.');
      } else {
        alert('Installation cancelled or failed.');
      }
    }
  };

  const handleUninstall = () => {
    alert('To uninstall the app:\n\n• Chrome/Edge (Desktop): Right-click the app icon in taskbar/dock → Uninstall\n• Chrome/Edge (Mobile): Long-press the app icon → Uninstall\n• Safari (iOS): Long-press the app icon → Remove App\n• Firefox: Remove from Apps menu\n\nYou can also use the "Reset PWA" button in Advanced Controls to clear all app data.');
  };

  const getStatusBadge = () => {
    if (isInstalled || isStandalone) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          ✓ Installed
        </span>
      );
    }
    if (isInstallable) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          ⚡ Ready to Install
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
        ○ Web Version
      </span>
    );
  };

  const getSwStatusBadge = () => {
    const badges = {
      active: { text: '✓ Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      installing: { text: '⟳ Installing', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      waiting: { text: '⏳ Waiting', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
      idle: { text: '○ Idle', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
      error: { text: '✗ Error', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    };

    const badge = badges[swStatus] || badges.idle;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className={`p-4 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300' : 'border-light-400 bg-light-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              📱 Progressive Web App (PWA)
            </h3>
            {getStatusBadge()}
          </div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Install for offline support, faster loading, and app-like experience
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 rounded-lg ${
        isDark ? 'bg-dark-200' : 'bg-light-300'
      }`}>
        <div>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Version</p>
          <p className={`font-mono font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            v{appVersion}
          </p>
        </div>
        <div>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Service Worker</p>
          <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {getSwStatusBadge()}
          </p>
        </div>
        <div>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Cache Size</p>
          <p className={`font-mono font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {formatBytes(totalCacheSize)}
          </p>
        </div>
        <div>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Network</p>
          <p className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? '✓ Online' : '✗ Offline'}
          </p>
        </div>
      </div>

      {/* Install/Uninstall Section */}
      <div className={`p-3 rounded-lg mb-4 ${
        (isInstalled || isStandalone)
          ? (isDark ? 'bg-green-900/20 border border-green-800/30' : 'bg-green-50 border border-green-200')
          : (isDark ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200')
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className={`text-sm font-medium mb-1 ${
              (isInstalled || isStandalone)
                ? (isDark ? 'text-green-300' : 'text-green-800')
                : (isDark ? 'text-blue-300' : 'text-blue-800')
            }`}>
              {(isInstalled || isStandalone) ? '✓ App Installed' : 'Install Samvada Studio'}
            </p>
            {!(isInstalled || isStandalone) ? (
              <ul className={`text-xs space-y-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                <li>✓ Works offline</li>
                <li>✓ Faster loading</li>
                <li>✓ Desktop/Mobile icon</li>
                <li>✓ Full-screen mode</li>
              </ul>
            ) : (
              <p className={`text-xs ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                Enjoying full offline support and app-like experience
              </p>
            )}
            {!isInstallable && !(isInstalled || isStandalone) && (
              <p className={`text-xs mt-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                💡 Tip: If install fails, try refreshing the page or visiting a few times
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            {(isInstalled || isStandalone) ? (
              <button
                onClick={handleUninstall}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
                title="View uninstall instructions"
              >
                🗑️ Uninstall
              </button>
            ) : (
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                title="Install the app for offline access and faster performance"
              >
                📥 Install App
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Update Available */}
      {needsUpdate && (
        <div className={`p-3 rounded-lg mb-4 ${
          isDark ? 'bg-orange-900/20 border border-orange-800/30' : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                🔄 Update Available
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                A new version is ready to install
              </p>
            </div>
            <button
              onClick={updateApp}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm"
            >
              Update Now
            </button>
          </div>
        </div>
      )}

      {/* Advanced Controls Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mb-3 transition-colors ${
          isDark ? 'bg-dark-200 hover:bg-dark-100' : 'bg-light-300 hover:bg-light-400'
        }`}
      >
        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          🛠️ Advanced Controls (Power Users)
        </span>
        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          {showAdvanced ? '▼' : '▶'}
        </span>
      </button>

      {/* Advanced Section */}
      {showAdvanced && (
        <div className="space-y-4">
          {/* Cache Management */}
          <div className={`p-3 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-200' : 'border-light-400 bg-white'}`}>
            <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              💾 Cache Management
            </h4>
            
            {cacheList.length > 0 && (
              <div className="space-y-2 mb-3">
                {cacheList.map(cache => (
                  <div key={cache.name} className={`text-xs flex justify-between ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <span className="font-mono truncate">{cache.name}</span>
                    <span>{cache.count} items • {formatBytes(cache.size)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleClearCache}
                disabled={isClearing}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isClearing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : isDark
                      ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300'
                      : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
              >
                {isClearing ? '⏳ Clearing...' : '🗑️ Clear Cache'}
              </button>
              <button
                onClick={fetchCacheInfo}
                disabled={isFetchingCache}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isFetchingCache
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : isDark
                      ? 'bg-dark-100 hover:bg-dark-50 text-gray-300 hover:scale-105'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700 hover:scale-105'
                }`}
              >
                {isFetchingCache ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Loading...
                  </span>
                ) : (
                  '🔄 Refresh'
                )}
              </button>
            </div>
          </div>

          {/* Service Worker Controls */}
          <div className={`p-3 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-200' : 'border-light-400 bg-white'}`}>
            <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              ⚙️ Service Worker Controls
            </h4>
            
            <div className={`text-xs mb-3 space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <p>Status: <span className="font-semibold">{swStatus}</span></p>
              {swRegistration && (
                <>
                  <p>Scope: <span className="font-mono">{swRegistration.scope}</span></p>
                  <p>Active: <span className="font-semibold">{swRegistration.active ? 'Yes' : 'No'}</span></p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={checkForUpdates}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-300'
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                }`}
              >
                🔍 Check Updates
              </button>
              <button
                onClick={handleUnregisterSW}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300'
                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
              >
                🚫 Unregister
              </button>
            </div>
          </div>

          {/* Full Reset */}
          <div className={`p-3 rounded-lg border ${isDark ? 'border-red-800/30 bg-red-900/10' : 'border-red-200 bg-red-50'}`}>
            <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-red-300' : 'text-red-800'}`}>
              ⚠️ Danger Zone
            </h4>
            <p className={`text-xs mb-3 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              Reset all PWA data including caches, service worker, and install state. 
              Your chats and settings will NOT be affected.
            </p>
            <button
              onClick={handleResetPWA}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-red-900/50 hover:bg-red-900/70 text-red-200'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              🔄 Full PWA Reset
            </button>
          </div>

          {/* Debug Info */}
          <details className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <summary className="cursor-pointer hover:underline font-medium mb-2">
              🐛 Debug Information
            </summary>
            <div className={`pl-4 space-y-1 font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              <p>isInstallable: {isInstallable.toString()}</p>
              <p>isInstalled: {isInstalled.toString()}</p>
              <p>isStandalone: {isStandalone.toString()}</p>
              <p>needsUpdate: {needsUpdate.toString()}</p>
              <p>isOnline: {isOnline.toString()}</p>
              <p>swStatus: {swStatus}</p>
              <p>userAgent: {navigator.userAgent}</p>
              <p>serviceWorkerSupport: {('serviceWorker' in navigator).toString()}</p>
              <p>cacheStorageSupport: {('caches' in window).toString()}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
