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

export default function PWAStatusPanel({ pwaStatus, isDark }: PWAStatusPanelProps) {
  const [totalCacheSize, setTotalCacheSize] = useState(0);

  const {
    isInstallable,
    isInstalled,
    isStandalone,
    needsUpdate,
    isOnline,
    swStatus,
    installApp,
    updateApp,
  } = pwaStatus;

  const appVersion = import.meta.env.APP_VERSION || '0.0.0';
  const gitCommit = import.meta.env.GIT_COMMIT || 'unknown';
  const repoUrl = 'https://github.com/dhruvinrsoni/samvada-studio';

  // Fetch cache size summary
  useEffect(() => {
    const fetchCacheSize = async () => {
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          let totalSize = 0;
          for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            for (const request of keys) {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
              }
            }
          }
          setTotalCacheSize(totalSize);
        } catch (error) {
          console.error('[PWA] Error fetching cache size:', error);
        }
      }
    };
    fetchCacheSize();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
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
            <a
              href={`${repoUrl}/releases/tag/v${appVersion}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
              title="View release on GitHub"
            >
              v{appVersion}
            </a>
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
              <ul className={`text-xs space-y-1 ${isDark ? 'text-theme-primary' : 'text-theme-primary'}`}>
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
              <p className={`text-xs mt-2 ${isDark ? 'text-theme-primary' : 'text-theme-primary'}`}>
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
                className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg font-medium text-sm transition-colors"
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

      {/* Technical Details */}
      <details className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <summary className="cursor-pointer hover:underline font-medium mb-2">
          🔧 Technical Details
        </summary>
        <div className={`pl-4 space-y-1 font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          <p>
            Version:{' '}
            <a
              href={`${repoUrl}/releases/tag/v${appVersion}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
              title="View release on GitHub"
            >
              v{appVersion}
            </a>
          </p>
          <p>
            Commit:{' '}
            {gitCommit !== 'unknown' ? (
              <a
                href={`${repoUrl}/commit/${gitCommit}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
                title="View commit on GitHub"
              >
                {gitCommit}
              </a>
            ) : (
              gitCommit
            )}
          </p>
          <p>Service Worker: {swStatus}</p>
          <p>Cache Size: {formatBytes(totalCacheSize)}</p>
          <p>Network: {isOnline ? 'Online' : 'Offline'}</p>
          <p className="text-xs mt-2 opacity-75">💡 For advanced controls, see the Developer tab</p>
        </div>
      </details>
    </div>
  );
}
