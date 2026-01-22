import { ChatProvider, useChat } from './context/ChatContext';
import { ToastProvider, useToast } from './context/ToastContext';
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
import ToastContainer from './components/toast/ToastContainer';
import { useState, useEffect } from 'react';
import BRAND from './constants/brand';

function AppContent() {
  const { state, dispatch } = useChat();
  const { toasts, removeToast } = useToast();
  const [quotedText, setQuotedText] = useState<string>('');
  const [templateContent, setTemplateContent] = useState<string>('');
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);

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

  return (
    <>
      <div className={`flex flex-col h-screen ${state.theme === 'dark' ? 'bg-dark-300 text-gray-200' : 'bg-light-200 text-gray-800'}`}>
      {/* Top Bar with Global Search */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        state.theme === 'dark' ? 'bg-dark-200 border-dark-100' : 'bg-light-100 border-light-400'
      }`}>
          <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{BRAND.displayName}</h1>
        </div>

        {/* Global Search Trigger - fills the empty space */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_GLOBAL_SEARCH' })}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105 ${
            state.theme === 'dark'
              ? 'bg-dark-100 text-gray-400 hover:bg-dark-200 border border-dark-300'
              : 'bg-light-200 text-gray-600 hover:bg-light-300 border border-light-400'
          }`}
          title="Search everywhere (Ctrl+Shift+F)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm">Search everywhere...</span>
          <kbd className={`px-1.5 py-0.5 text-xs rounded ml-2 ${
            state.theme === 'dark' ? 'bg-dark-300' : 'bg-light-300'
          }`}>
            Ctrl+Shift+F
          </kbd>
        </button>

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Keyboard Shortcuts */}
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

          {/* Divider */}
          <div className={`h-6 w-px ${state.theme === 'dark' ? 'bg-dark-100' : 'bg-light-400'}`} />

          {/* Templates Library */}
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

          {/* Export Modal */}
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
            style={{ transform: state.isAdminPanelOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
            title="Admin Settings - Configure LLM Providers"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
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
      <ConnectionStatus />
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
