import { ChatProvider, useChat } from './context/ChatContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { useIsMobile, useIsTablet } from './hooks/useMediaQuery';
import { useLocalNetworkPermission } from './hooks/useLocalNetworkPermission';
import ErrorBoundary from './components/common/ErrorBoundary';
import Sidebar from './components/sidebar/Sidebar';
import ChatArea from './components/chat/ChatArea';
import ContextPanel from './components/context/ContextPanel';
import AdminPanel from './components/admin/AdminPanel';
import GlobalSearch from './components/search/GlobalSearch';
import CommandPalette from './components/common/CommandPalette';
import KeyboardShortcuts from './components/common/KeyboardShortcuts';
import TemplatesLibrary from './components/templates/TemplatesLibrary';
import ExportModal from './components/export/ExportModal';
import StarredModal from './components/starred/StarredModal';
import ThemeHealthIndicator from './components/common/ThemeHealthIndicator';
import ThemeSettingsModal from './components/common/ThemeSettingsModal';
import ConnectionStatus from './components/common/ConnectionStatus';
import StatusBar from './components/common/StatusBar';
import DebugMode from './components/common/DebugMode';
import ToastContainer from './components/toast/ToastContainer';
import { PWAInstallPrompt, PWAUpdateNotification, PWAOfflineIndicator } from './components/pwa';
import { usePWA } from './hooks/usePWA';
import { useState, useEffect } from 'react';
import BRAND from './constants/brand';
import { HealthService } from './utils/healthService';

function AppContent() {
  const { state, dispatch, createChat, isDark } = useChat();
  const { toasts, removeToast } = useToast();
  const pwaStatus = usePWA();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  // Local network permission hook - prompts on first use with Ollama
  useLocalNetworkPermission();
  
  const [quotedText, setQuotedText] = useState<string>('');
  const [templateContent, setTemplateContent] = useState<string>('');
  // Theme settings modal is managed by global context now
  const isThemeSettingsOpen = state.isThemeSettingsOpen;
  const [minimizedOllamaWarnings, setMinimizedOllamaWarnings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleQuote = (text: string) => {
    setQuotedText(prev => prev ? `${prev}\n\n> ${text}` : `> ${text}`);
  };

  const clearQuote = () => {
    setQuotedText('');
  };

  const handleSelectTemplate = (content: string) => {
    setTemplateContent(content);
  };

  const clearTemplateContent = () => {
    setTemplateContent('');
  };

  const minimizeOllamaWarnings = () => {
    setMinimizedOllamaWarnings(true);
  };

  const showOllamaWarnings = () => {
    setMinimizedOllamaWarnings(false);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N - New chat (handled by context)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        // Will be handled by ChatContext or AppContent
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle PWA shortcuts and share target
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const shareTitle = urlParams.get('title');
    const shareText = urlParams.get('text');
    const shareUrl = urlParams.get('url');

    if (action === 'new-chat') {
      createChat();
    } else if (action === 'command-palette') {
      dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
    } else if (action === 'templates') {
      dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' });
    } else if (shareTitle || shareText || shareUrl) {
      // Handle Web Share Target
      const sharedContent = [shareTitle, shareText, shareUrl].filter(Boolean).join('\n\n');
      if (sharedContent) {
        setQuotedText(sharedContent);
        createChat();
      }
    }

    // Clean URL after handling
    if (action || shareTitle || shareText || shareUrl) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [dispatch, createChat]);

  // Refresh Ollama cache on app startup
  useEffect(() => {
    const refreshOllamaCache = async () => {
      try {
        // For testing: populate cache with test data if no real Ollama
        if (!navigator.onLine || window.location.hostname === 'localhost') {
          HealthService.populateTestCache();
        } else {
          await HealthService.refreshOllamaCache();
        }
      } catch (error) {
        console.warn('Failed to refresh Ollama cache on startup:', error);
        // Fallback to test data
        HealthService.populateTestCache();
      }
    };
    refreshOllamaCache();
  }, []);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    // On mobile, start with sidebar closed; on desktop, open
    dispatch({ type: 'SET_SIDEBAR_OPEN', payload: !isMobile });
  }, [isMobile, dispatch]);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

  return (
    <>
      <div className={`flex flex-col h-screen-safe overflow-hidden ${isDark ? 'bg-dark-300 text-gray-200' : 'bg-light-200 text-gray-800'}`}>
      {/* Top Bar with Global Search - Theme-colored */}
      <div className={`flex items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-3 border-b relative overflow-hidden flex-shrink-0 ${
        isDark ? 'bg-dark-200 border-dark-100' : 'bg-light-100 border-light-400'
      }`}>
        {/* Theme color accent strip */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-theme-primary via-theme-accent to-theme-primary opacity-80"></div>
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
            {/* Mobile Burger Menu */}
            {isMobile && (
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                className={`p-2 rounded-lg transition-colors touch-target ${
                    isDark 
                    ? 'text-gray-400 hover:bg-dark-100' 
                    : 'text-gray-600 hover:bg-light-300'
                }`}
                title="Toggle Sidebar"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-theme-primary truncate max-w-[100px] sm:max-w-none">
              {isMobile ? BRAND.shortName || BRAND.displayName.split(' ')[0] : BRAND.displayName}
            </h1>
            {import.meta.env.DEV && (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wide bg-theme-primary text-white border border-white/20 shadow-sm">
                DEV MODE
              </span>
            )}
          </div>
        </div>

        {/* Global Search Trigger - fills the empty space */}
        {!isMobile && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_GLOBAL_SEARCH' })}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-all flex-1 mx-2 sm:mx-3 md:mx-4 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg ${
                isDark
                  ? 'bg-dark-100 text-gray-400 hover:bg-dark-200 border border-dark-300'
                  : 'bg-light-200 text-gray-600 hover:bg-light-300 border border-light-400'
            }`}
            title="Search everywhere (Ctrl+Shift+F)"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs sm:text-sm truncate hidden xs:inline">
              Search everywhere...
            </span>
            <kbd className={`px-1 sm:px-1.5 py-0.5 text-xs rounded ml-auto hidden lg:inline flex-shrink-0 ${
              isDark ? 'bg-dark-300' : 'bg-light-300'
            }`}>
              Ctrl+Shift+F
            </kbd>
          </button>
        )}

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
          {/* Keyboard Shortcuts - Hide on mobile */}
          {!isMobile && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' })}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  isDark 
                    ? 'text-gray-400 hover:bg-dark-100' 
                    : 'text-gray-600 hover:bg-light-300'
              }`}
              title="Keyboard Shortcuts (?)"
            >
              <span className="text-base sm:text-lg">?</span>
            </button>
          )}

          {/* Global Search - Mobile icon */}
          {isMobile && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_GLOBAL_SEARCH' })}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-gray-200 hover:bg-dark-100'
                  : 'text-gray-700 hover:bg-light-300'
              }`}
              title="Global Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}

          {/* Command Palette */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE' })}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:bg-dark-100' 
                : 'text-gray-600 hover:bg-light-300'
            }`}
            title="Command Palette (Ctrl+K)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Divider - Hide on mobile */}
          {!isMobile && (
            <div className={`h-5 sm:h-6 w-px ${isDark ? 'bg-dark-100' : 'bg-light-400'}`} />
          )}

          {/* Templates Library - Hide on small screens */}
          {!(isMobile || isTablet) && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' })}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:bg-dark-100' 
                  : 'text-gray-600 hover:bg-light-300'
              }`}
              title="Prompt Templates (Ctrl+Shift+T)"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* Export Modal - Hide on small screens */}
          {!(isMobile || isTablet) && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_EXPORT_MODAL' })}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:bg-dark-100' 
                  : 'text-gray-600 hover:bg-light-300'
              }`}
              title="Export Chat (Ctrl+Shift+E)"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* Context Panel - Prominent with Creative Ripple Effect */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_CONTEXT_PANEL_MODE' })}
            className={`relative px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all ${
              state.isContextPanelMode
                ? 'bg-gradient-to-r from-theme-primary to-theme-primary-hover text-white shadow-lg ring-2 ring-theme-primary/50 context-panel-active'
                : state.theme === 'dark' 
                  ? 'text-gray-400 hover:bg-dark-100' 
                  : 'text-gray-600 hover:bg-light-300'
            }`}
            title={`Context Panel - ${state.isContextPanelMode ? 'Click to close' : 'Add custom context snippets'}`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`text-base sm:text-lg transition-transform ${state.isContextPanelMode ? 'context-panel-icon' : ''}`}>
                {state.isContextPanelMode ? '✨' : '📝'}
              </span>
              {!isMobile && state.isContextPanelMode && (
                <span className="text-xs font-semibold">Active</span>
              )}
            </div>
          </button>

          {/* Templates Library - Mobile quick access */}
          {isMobile && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' })}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-300 hover:bg-dark-100' 
                  : 'text-gray-600 hover:bg-light-300'
              }`}
              title="Prompt Templates"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* Divider - Hide on mobile */}
          {!isMobile && (
            <div className={`h-5 sm:h-6 w-px ${state.theme === 'dark' ? 'bg-dark-100' : 'bg-light-400'}`} />
          )}

          {/* Theme Settings */}
          {!isMobile && (
            <button
              onClick={() => { dispatch({ type: 'SET_THEME_SETTINGS_TAB', payload: 'appearance' }); dispatch({ type: 'TOGGLE_THEME_SETTINGS_MODAL' }); }}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:bg-dark-100' 
                  : 'text-gray-600 hover:bg-light-300'
              }`}
              title="Theme Settings"
            >
              <span className="text-base sm:text-lg">{state.theme === 'dark' ? '🌙' : '☀️'}</span>
            </button>
          )}

          {/* Admin Settings */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_ADMIN_PANEL' })}
            className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 ${
              state.isAdminPanelOpen
                ? 'bg-theme-primary text-white'
                : state.theme === 'dark'
                  ? 'text-gray-400 hover:bg-dark-100'
                  : 'text-gray-600 hover:bg-light-300'
            }`}
            title="Admin Settings - Configure LLM Providers"
          >
            <span className="text-base sm:text-lg">{state.isAdminPanelOpen ? '🛠️' : '⚙️'}</span>
          </button>

          {/* Mobile Actions Menu - Fixed Chevron Icon */}
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-all ${
                isDark
                  ? 'text-gray-200 hover:bg-dark-100'
                  : 'text-gray-700 hover:bg-light-300'
              }`}
              title="More actions"
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isMobile && isMobileMenuOpen && (
        <div className={`border-b ${isDark ? 'border-dark-100 bg-dark-200' : 'border-light-400 bg-light-100'}`}>
          <div className="max-h-[60vh] overflow-y-auto px-3 py-3 space-y-2">
            <button
              onClick={() => {
                dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' });
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left p-3 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300 text-gray-200' : 'border-light-400 bg-white text-gray-800'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">?</span>
                <span className="font-medium">Keyboard Shortcuts</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>See all available shortcuts</p>
            </button>

            <button
              onClick={() => {
                dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' });
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left p-3 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300 text-gray-200' : 'border-light-400 bg-white text-gray-800'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="font-medium">Prompt Templates</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Browse and reuse prompts</p>
            </button>

            <button
              onClick={() => {
                dispatch({ type: 'TOGGLE_CONTEXT_PANEL_MODE' });
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left p-3 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300 text-gray-200' : 'border-light-400 bg-white text-gray-800'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <span className="font-medium">Context Panel</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Toggle context snippets</p>
            </button>

            <button
              onClick={() => {
                dispatch({ type: 'SET_THEME_SETTINGS_TAB', payload: 'appearance' });
                dispatch({ type: 'TOGGLE_THEME_SETTINGS_MODAL' });
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left p-3 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300 text-gray-200' : 'border-light-400 bg-white text-gray-800'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🎨</span>
                <span className="font-medium">Theme Settings</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Customize colors and fonts</p>
            </button>

            {/* LLM Provider Selector - Mobile */}
            {state.providers.length > 0 && (
              <div className={`w-full p-3 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300 text-gray-200' : 'border-light-400 bg-white text-gray-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <span className="font-medium text-sm">Select Provider</span>
                </div>
                <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Choose LLM for this chat</p>
                <select
                  value={state.activeChat ? state.chats.find(c => c.id === state.activeChat)?.providerId || state.defaultProviderId || '' : state.defaultProviderId || ''}
                  onChange={(e) => {
                    if (state.activeChat) {
                      const currentChat = state.chats.find(c => c.id === state.activeChat);
                      if (currentChat) {
                        dispatch({
                          type: 'UPDATE_CHAT',
                          payload: { ...currentChat, providerId: e.target.value },
                        });
                      }
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2 text-xs rounded border font-medium transition-colors ${
                    isDark 
                      ? 'bg-dark-200 border-dark-100 text-gray-200 hover:bg-dark-100' 
                      : 'bg-white border-light-400 text-gray-800 hover:bg-light-100'
                  }`}
                >
                  <option value="">Default Provider</option>
                  {state.providers.filter(p => p.isEnabled).map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} — {provider.model}
                    </option>
                  ))}
                </select>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Chat/Sidebar Row */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Wrapped to prevent sidebar errors from crashing entire app */}
          <ErrorBoundary name="Sidebar">
            <Sidebar />
          </ErrorBoundary>

          {/* Main Chat Area - Wrapped to isolate chat errors */}
          <ErrorBoundary name="Chat Area">
            <ChatArea 
              quotedText={quotedText} 
              onClearQuote={clearQuote} 
              onQuote={handleQuote}
              templateContent={templateContent}
              onClearTemplate={clearTemplateContent}
              pwaStatus={pwaStatus}
            />
          </ErrorBoundary>

          {/* Context Panel (Conditional) - Wrapped to prevent context errors */}
          <ErrorBoundary name="Context Panel">
            <ContextPanel />
          </ErrorBoundary>
        </div>

        {/* Status Bar - Below chat, takes natural height */}
        <ErrorBoundary name="Status Bar">
          <StatusBar 
            minimizedOllamaWarnings={minimizedOllamaWarnings}
            onShowOllamaWarnings={showOllamaWarnings}
          />
        </ErrorBoundary>
      </div>

      {/* Modals - Wrapped in ErrorBoundary to prevent component errors from crashing app */}
      <ErrorBoundary><AdminPanel pwaStatus={pwaStatus} /></ErrorBoundary>
      <ErrorBoundary><GlobalSearch /></ErrorBoundary>
      <ErrorBoundary><CommandPalette /></ErrorBoundary>
      <ErrorBoundary><KeyboardShortcuts /></ErrorBoundary>
      <ErrorBoundary><TemplatesLibrary onSelectTemplate={handleSelectTemplate} /></ErrorBoundary>
      <ErrorBoundary><ExportModal /></ErrorBoundary>
      <ErrorBoundary>{state.isStarredModalOpen && <StarredModal onClose={() => dispatch({ type: 'TOGGLE_STARRED_MODAL' })} />}</ErrorBoundary>
      <ErrorBoundary>{isThemeSettingsOpen && <ThemeSettingsModal onClose={() => dispatch({ type: 'TOGGLE_THEME_SETTINGS_MODAL' })} />}</ErrorBoundary>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />

      {/* Connection Status Indicator */}
      <ConnectionStatus 
        minimized={minimizedOllamaWarnings} 
        onMinimize={minimizeOllamaWarnings} 
      />

      {/* PWA Components */}
      <PWAInstallPrompt pwaStatus={pwaStatus} />
      <PWAUpdateNotification pwaStatus={pwaStatus} />
      <PWAOfflineIndicator pwaStatus={pwaStatus} />

      {/* Silent Failure Prevention - Theme Health Indicator */}
      <ErrorBoundary name="Theme Health">
        <ThemeHealthIndicator />
      </ErrorBoundary>

      {/* Debug Mode - Ctrl+Shift+D */}
      <ErrorBoundary name="Debug Mode">
        <DebugMode />
      </ErrorBoundary>
    </div>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </ToastProvider>
  );
}
