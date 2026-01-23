/**
 * PWA Offline Indicator - Shows when the app is offline
 * 
 * Features:
 * - Non-intrusive indicator
 * - Auto-hides when back online
 */

import { useChat } from '../../context/ChatContext';
import type { PWAStatus } from '../../hooks/usePWA';

interface PWAOfflineIndicatorProps {
  pwaStatus: PWAStatus;
}

export default function PWAOfflineIndicator({ pwaStatus }: PWAOfflineIndicatorProps) {
  const { state } = useChat();
  const { isOnline } = pwaStatus;

  // Only show when offline
  if (isOnline) return null;

  return (
    <div 
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 
        animate-slide-up transition-all duration-300`}
    >
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${
        state.theme === 'dark'
          ? 'bg-yellow-900/90 text-yellow-200 border border-yellow-700'
          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
      }`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
        <span className="text-sm font-medium">You're offline</span>
        <span className="text-xs opacity-75">• Local data available</span>
      </div>
    </div>
  );
}
