/**
 * PWA Advanced Controls - Advanced PWA management for power users
 * Located in Developer tab for technical users
 * 
 * Features:
 * - Cache management with detailed info
 * - Service Worker controls (check updates, unregister)
 * - Full PWA reset (danger zone)
 * - Debug information
 */

import { useState, useEffect } from 'react';
import type { PWAStatus } from '../../hooks/usePWA';

interface PWAAdvancedControlsProps {
  pwaStatus: PWAStatus;
  isDark: boolean;
}

interface CacheInfo {
  name: string;
  size: number;
  count: number;
}

export default function PWAAdvancedControls({ pwaStatus, isDark }: PWAAdvancedControlsProps) {
  const [cacheList, setCacheList] = useState<CacheInfo[]>([]);
  const [totalCacheSize, setTotalCacheSize] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [isFetchingCache, setIsFetchingCache] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const {
    isInstallable,
    isInstalled,
    isStandalone,
    needsUpdate,
    isOnline,
    swRegistration,
    swStatus,
    checkForUpdates,
  } = pwaStatus;

  // Fetch cache information on mount
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
      alert('Cache cleared successfully! Reload the page to see changes take effect.');
    } catch (error) {
      console.error('[PWA] Error clearing cache:', error);
      alert('Failed to clear cache. Check console for details.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      await checkForUpdates();
      // Show success feedback briefly
      setTimeout(() => {
        setIsCheckingUpdates(false);
      }, 1000);
    } catch (error) {
      console.error('[PWA] Error checking for updates:', error);
      setIsCheckingUpdates(false);
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
      alert('Service worker unregistered. Reload the page to complete changes.');
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
      alert('PWA reset complete. Page will reload automatically to fetch the latest version.');
      await fetchCacheInfo();
      
      // Auto-reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('[PWA] Error during reset:', error);
      alert('Failed to reset PWA. Check console for details.');
    }
  };

  const handleForceRefresh = async () => {
    if (!confirm('Force refresh and fetch latest app version? This will:\n\n• Clear all caches\n• Unregister service workers\n• Hard reload the page\n• Fetch the latest version from server\n\nYour chats and settings will be preserved.')) {
      return;
    }

    try {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[PWA] All caches cleared');

      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[PWA] Service worker unregistered');
      }

      // Hard reload - bypasses cache completely
      console.log('[PWA] Performing hard reload to fetch latest version');
      window.location.reload();
    } catch (error) {
      console.error('[PWA] Error during force refresh:', error);
      alert('Failed to force refresh. Check console for details.');
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300' : 'border-light-400 bg-light-200'}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className={`font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          🛠️ PWA Advanced Controls
        </h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Advanced PWA management for developers and power users
        </p>
      </div>

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
              <div className={`text-xs font-bold pt-2 border-t ${
                isDark ? 'text-gray-300 border-dark-100' : 'text-gray-700 border-light-400'
              }`}>
                Total: {formatBytes(totalCacheSize)}
              </div>
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
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdates}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCheckingUpdates
                  ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                  : isDark
                  ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-300'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
              }`}
            >
              {isCheckingUpdates ? '⏳ Checking...' : '🔍 Check Updates'}
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

        {/* Full Reset - Danger Zone */}
        <div className={`p-3 rounded-lg border ${isDark ? 'border-red-800/30 bg-red-900/10' : 'border-red-200 bg-red-50'}`}>
          <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-red-300' : 'text-red-800'}`}>
            ⚠️ Danger Zone
          </h4>
          <p className={`text-xs mb-3 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
            Advanced operations that affect PWA functionality. Your chats and settings will NOT be affected.
          </p>
          <div className="space-y-2">
            <button
              onClick={handleForceRefresh}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-green-900/50 hover:bg-green-900/70 text-green-200 border border-green-800/30'
                  : 'bg-green-600 hover:bg-green-700 text-white border border-green-500'
              }`}
            >
              ⚡ Force Refresh Latest App
            </button>
            <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Clears all caches and forces a complete reload to fetch the latest version from the server
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
            <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Resets all PWA data including install state and service workers
            </p>
          </div>
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
    </div>
  );
}
