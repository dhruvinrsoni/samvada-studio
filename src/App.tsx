import { ChatProvider, useChat } from './context/ChatContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { useIsMobile, useIsTablet } from './hooks/useMediaQuery';
import { useLocalNetworkPermission } from './hooks/useLocalNetworkPermission';
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
import ThemeSettingsModal from './components/common/ThemeSettingsModal';
import ConnectionStatus from './components/common/ConnectionStatus';
import StatusBar from './components/common/StatusBar';
import ToastContainer from './components/toast/ToastContainer';
import { PWAInstallPrompt, PWAUpdateNotification, PWAOfflineIndicator } from './components/pwa';
import { usePWA } from './hooks/usePWA';
import { useState, useEffect } from 'react';
import BRAND from './constants/brand';
import { HealthService } from './utils/healthService';

function AppContent() {
  const { state, dispatch, createChat } = useChat();
  const { toasts, removeToast } = useToast();
  const pwaStatus = usePWA();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  // Local network permission hook - prompts on first use with Ollama
  useLocalNetworkPermission();
  
  const [quotedText, setQuotedText] = useState<string>('');
  const [templateContent, setTemplateContent] = useState<string>('');
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);
  const [minimizedOllamaWarnings, setMinimizedOllamaWarnings] = useState(false);

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

  return (
    <>
      <div className={`flex flex-col h-screen ${state.theme === 'dark' ? 'bg-dark-300 text-gray-200' : 'bg-light-200 text-gray-800'}`}>
      {/* Top Bar with Global Search - Theme-colored */}
      <div className={`flex items-center justify-between px-2 sm:px-4 py-3 border-b relative overflow-hidden ${
        state.theme === 'dark' ? 'bg-dark-200 border-dark-100' : 'bg-light-100 border-light-400'
      }`}>
        {/* Theme color accent strip */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-theme-primary via-theme-accent to-theme-primary opacity-80"></div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Burger Menu */}
            {isMobile && (
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                className={`p-2 rounded-lg transition-colors ${
                  state.theme === 'dark' 
                    ? 'text-gray-400 hover:bg-dark-100' 
                    : 'text-gray-600 hover:bg-light-300'
                }`}
                title="Toggle Sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-theme-primary to-theme-accent bg-clip-text text-transparent">
            {BRAND.displayName}
          </h1>
        </div>

        {/* Global Search Trigger - fills the empty space */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_GLOBAL_SEARCH' })}
          className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all hover:scale-105 ${
            state.theme === 'dark'
              ? 'bg-dark-100 text-gray-400 hover:bg-dark-200 border border-dark-300'
              : 'bg-light-200 text-gray-600 hover:bg-light-300 border border-light-400'
          }`}
          title="Search everywhere (Ctrl+Shift+F)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm hidden sm:inline">Search everywhere...</span>
          <span className="text-sm sm:hidden">Search...</span>
          <kbd className={`px-1.5 py-0.5 text-xs rounded ml-2 hidden lg:inline ${
            state.theme === 'dark' ? 'bg-dark-300' : 'bg-light-300'
          }`}>
            Ctrl+Shift+F
          </kbd>
        </button>

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Keyboard Shortcuts - Hide on mobile */}
          {!isMobile && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' })}
              className={`p-2 rounded-lg transition-colors hover:scale-105 ${
                state.theme === 'dark' 
                  ? 'text-gray-400 hover:bg-dark-100' 
                  : 'text-gray-600 hover:bg-light-300'
              }`}
              title="Keyboard Shortcuts (?)"
            >
              <span className="text-lg">?</span>
            </button>
          )}

          {/* Command Palette */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE' })}
            className={`p-2 rounded-lg transition-colors hover:scale-105 ${
              state.theme === 'dark' 
                ? 'text-gray-400 hover:bg-dark-100' 
                : 'text-gray-600 hover:bg-light-300'
            }`}
            title="Command Palette (Ctrl+K)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Divider - Hide on mobile */}
          {!isMobile && (
            <div className={`h-6 w-px ${state.theme === 'dark' ? 'bg-dark-100' : 'bg-light-400'}`} />
          )}

          {/* Templates Library - Hide on small screens */}
          {!(isMobile || isTablet) && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' })}
              className={`p-2 rounded-lg transition-colors hover:scale-105 ${
                state.theme === 'dark' 
                  ? 'text-gray-400 hover:bg-dark-100' 
                  : 'text-gray-600 hover:bg-light-300'
              }`}
              title="Prompt Templates (Ctrl+Shift+T)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* Export Modal - Hide on small screens */}
          {!(isMobile || isTablet) && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_EXPORT_MODAL' })}
              className={`p-2 rounded-lg transition-colors hover:scale-105 ${
                state.theme === 'dark' 
                  ? 'text-gray-400 hover:bg-dark-100' 
                  : 'text-gray-600 hover:bg-light-300'
              }`}
              title="Export Chat (Ctrl+Shift+E)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* Context Panel */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_CONTEXT_PANEL_MODE' })}
            className={`p-2 rounded-lg transition-all hover:scale-105 ${
              state.isContextPanelMode
                ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                : state.theme === 'dark' 
                  ? 'text-gray-400 hover:bg-dark-100' 
                  : 'text-gray-600 hover:bg-light-300'
            }`}
            title={`Context Panel - ${state.isContextPanelMode ? 'Click to close' : 'Add custom context snippets for on-demand inclusion'}`}
          >
            <span className="text-lg">{state.isContextPanelMode ? '📋' : '📄'}</span>
          </button>

          {/* Divider */}
          <div className={`h-6 w-px ${state.theme === 'dark' ? 'bg-dark-100' : 'bg-light-400'}`} />

          {/* Theme Settings */}
          <button
            onClick={() => setIsThemeSettingsOpen(true)}
            className={`p-2 rounded-lg transition-colors hover:scale-105 ${
              state.theme === 'dark' 
                ? 'text-gray-400 hover:bg-dark-100' 
                : 'text-gray-600 hover:bg-light-300'
            }`}
            title="Theme Settings"
          >
            <span className="text-lg">{state.theme === 'dark' ? '🌙' : '☀️'}</span>
          </button>

          {/* Admin Settings */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_ADMIN_PANEL' })}
            className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 ${
              state.isAdminPanelOpen
                ? 'bg-theme-primary text-white'
                : state.theme === 'dark'
                  ? 'text-gray-400 hover:bg-dark-100'
                  : 'text-gray-600 hover:bg-light-300'
            }`}
            title="Admin Settings - Configure LLM Providers"
          >
            <span className="text-lg">{state.isAdminPanelOpen ? '🛠️' : '⚙️'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Chat Area */}
        <ChatArea 
          quotedText={quotedText} 
          onClearQuote={clearQuote} 
          onQuote={handleQuote}
          templateContent={templateContent}
          onClearTemplate={clearTemplateContent}
          pwaStatus={pwaStatus}
        />

        {/* Context Panel (Conditional) */}
        <ContextPanel />
      </div>

      {/* Modals */}
      <AdminPanel />
      <GlobalSearch />
      <CommandPalette />
      <KeyboardShortcuts />
      <TemplatesLibrary onSelectTemplate={handleSelectTemplate} />
      <ExportModal />
      {state.isStarredModalOpen && <StarredModal onClose={() => dispatch({ type: 'TOGGLE_STARRED_MODAL' })} />}
      {isThemeSettingsOpen && <ThemeSettingsModal onClose={() => setIsThemeSettingsOpen(false)} />}

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

      {/* Status Bar */}
      <StatusBar 
        minimizedOllamaWarnings={minimizedOllamaWarnings}
        onShowOllamaWarnings={showOllamaWarnings}
      />
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
