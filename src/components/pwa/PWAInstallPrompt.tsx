/**
 * PWA Install Prompt - Custom install banner for the Progressive Web App
 * 
 * Features:
 * - Animated slide-in banner
 * - Cross-browser compatible (Chrome, Edge, Safari, Firefox)
 * - Dismissable with 7-day memory
 * - Respects user preferences
 */

import { useChat } from '../../context/ChatContext';
import type { PWAStatus } from '../../hooks/usePWA';

interface PWAInstallPromptProps {
  pwaStatus: PWAStatus;
}

export default function PWAInstallPrompt({ pwaStatus }: PWAInstallPromptProps) {
  const { state } = useChat();
  const { isInstallable, installApp, dismissInstall } = pwaStatus;

  // Don't show if not installable
  if (!isInstallable) return null;

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      console.log('[PWA] App installed successfully!');
    }
  };

  const handleDismiss = () => {
    dismissInstall();
  };

  return (
    <div 
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 
        animate-slide-up transform transition-all duration-300 ease-out`}
    >
      <div className={`rounded-xl shadow-2xl border overflow-hidden ${
        state.theme === 'dark'
          ? 'bg-dark-200 border-dark-100'
          : 'bg-white border-gray-200'
      }`}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📱</span>
              <h3 className="text-white font-semibold">Install Samvada Studio</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              title="Dismiss"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className={`text-sm mb-4 ${
            state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Install Samvada Studio for a faster, app-like experience with offline support.
          </p>

          {/* Benefits */}
          <ul className={`text-xs space-y-2 mb-4 ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Works offline</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Faster loading</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Desktop icon</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Full-screen experience</span>
            </li>
          </ul>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                text-white font-medium rounded-lg transition-all duration-200 
                transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className={`px-4 py-2.5 font-medium rounded-lg transition-colors ${
                state.theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-dark-100'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
