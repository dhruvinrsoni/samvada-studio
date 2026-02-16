/**
 * PWA Update Notification - Notifies users when a new version is available
 * 
 * Features:
 * - Non-intrusive toast-like notification
 * - One-click update
 * - Auto-dismissible
 */

import { useChat } from '../../context/ChatContext';
import type { PWAStatus } from '../../hooks/usePWA';

interface PWAUpdateNotificationProps {
  pwaStatus: PWAStatus;
}

export default function PWAUpdateNotification({ pwaStatus }: PWAUpdateNotificationProps) {
  const { isDark } = useChat();
  const { needsUpdate, updateApp, isUpdating } = pwaStatus;

  // Don't show if no update available
  if (!needsUpdate) return null;

  const handleUpdate = () => {
    updateApp();
  };

  return (
    <div 
      className={`fixed top-20 right-4 z-50 
        animate-slide-down transform transition-all duration-300 ease-out`}
    >
      <div className={`rounded-xl shadow-2xl border overflow-hidden max-w-sm ${
        isDark
          ? 'bg-dark-200 border-dark-100'
          : 'bg-white border-gray-200'
      }`}>
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>
                Update Available! 🎉
              </h4>
              <p className={`text-sm mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                A new version of Samvada Studio is ready. Update now for the latest features and improvements.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 
                bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600
                text-white font-medium rounded-lg transition-all duration-200 
                ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {isUpdating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
