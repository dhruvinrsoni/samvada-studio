import { useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';

interface Command {
  id: string;
  name: string;
  description: string;
  icon: string;
  shortcut?: string;
  category: 'chat' | 'navigation' | 'settings' | 'export' | 'templates';
  action: () => void;
}

export default function CommandPalette() {
  const { state, dispatch, createChat, activeChat, exportChat } = useChat();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark =
    state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const commands: Command[] = useMemo(() => [
    // Chat Commands
    { id: 'new-chat', name: 'New Chat', description: 'Create a new conversation', icon: '💬', category: 'chat', shortcut: 'Ctrl+N', action: () => { createChat(); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'delete-chat', name: 'Delete Current Chat', description: 'Delete the active chat', icon: '🗑️', category: 'chat', action: () => { if (activeChat) { dispatch({ type: 'DELETE_CHAT', payload: activeChat.id }); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'archive-chat', name: 'Archive Current Chat', description: 'Archive the active chat', icon: '📦', category: 'chat', action: () => { if (activeChat) { dispatch({ type: 'ARCHIVE_CHAT', payload: activeChat.id }); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    
    // Additional Chat Commands
    { id: 'archive-all-chats', name: 'Archive All Chats', description: 'Archive all chats', icon: '📦', category: 'chat', action: () => { dispatch({ type: 'ARCHIVE_CHATS', payload: state.chats.map(chat => chat.id) }); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'delete-all-chats', name: 'Delete All Chats', description: 'Delete all chats', icon: '🗑️', category: 'chat', action: () => { dispatch({ type: 'DELETE_CHATS', payload: state.chats.map(chat => chat.id) }); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },

    // Navigation Commands
    { id: 'search', name: 'Global Search', description: 'Search across all chats', icon: '🔍', category: 'navigation', shortcut: 'Ctrl+Shift+F', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); setTimeout(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', ctrlKey: true, shiftKey: true })), 100); } },
    { id: 'toggle-sidebar', name: 'Toggle Context Panel', description: 'Show/hide context panel', icon: '📄', category: 'navigation', action: () => { dispatch({ type: 'TOGGLE_CONTEXT_PANEL_MODE' }); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    
    // Additional Navigation Commands
    { id: 'go-to-templates', name: 'Go to Templates', description: 'Open the Templates Library', icon: '📂', category: 'navigation', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); dispatch({ type: 'TOGGLE_TEMPLATES' }); } },
    { id: 'go-to-starred', name: 'Go to Starred Messages', description: 'Open Starred Messages', icon: '⭐', category: 'navigation', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); dispatch({ type: 'TOGGLE_STARRED_MODAL' }); } },

    // Settings Commands
    { id: 'admin', name: 'Open Settings', description: 'Configure LLM providers and preferences', icon: '⚙️', category: 'settings', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); dispatch({ type: 'TOGGLE_ADMIN_PANEL' }); } },
    { id: 'theme-toggle', name: 'Toggle Dark/Light Mode', description: 'Switch between themes', icon: '🌓', category: 'settings', action: () => { const newMode = state.themeSettings.mode === 'dark' ? 'light' : 'dark'; dispatch({ type: 'UPDATE_THEME_SETTINGS', payload: { mode: newMode } }); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'shortcuts', name: 'Keyboard Shortcuts', description: 'View all keyboard shortcuts', icon: '⌨️', category: 'settings', shortcut: '?', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' }); } },
    
    // Additional Settings Commands
    { id: 'change-accent-color', name: 'Change Accent Color', description: 'Change the app accent color', icon: '🎨', category: 'settings', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); dispatch({ type: 'TOGGLE_THEME_SETTINGS_MODAL' }); } },
    { id: 'change-font-size', name: 'Change Font Size', description: 'Cycle font sizes (xs → small → medium → large → xl)', icon: '🔠', category: 'settings', action: () => {
        // Cycle through font sizes and apply immediately without opening modal
        const sizes: Array<'xs'|'small'|'medium'|'large'|'xl'> = ['xs','small','medium','large','xl'];
        const current = state.themeSettings.fontSize as typeof sizes[number];
        const idx = Math.max(0, sizes.indexOf(current));
        const next = sizes[(idx + 1) % sizes.length];
        dispatch({ type: 'UPDATE_THEME_SETTINGS', payload: { fontSize: next } });
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
      } },

    // Export Commands
    { id: 'export-md', name: 'Export as Markdown', description: 'Export current chat as .md file', icon: '📝', category: 'export', action: () => { if (activeChat) { downloadFile(exportChat(activeChat.id, 'markdown'), `${activeChat.title}.md`, 'text/markdown'); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'export-json', name: 'Export as JSON', description: 'Export current chat as .json file', icon: '📋', category: 'export', action: () => { if (activeChat) { downloadFile(exportChat(activeChat.id, 'json'), `${activeChat.title}.json`, 'application/json'); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'export-html', name: 'Export as HTML', description: 'Export current chat as .html file', icon: '🌐', category: 'export', action: () => { if (activeChat) { downloadFile(exportChat(activeChat.id, 'html'), `${activeChat.title}.html`, 'text/html'); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    
    // Additional Export Commands
    { id: 'export-all-md', name: 'Export All Chats as Markdown', description: 'Export all chats as .md files', icon: '📝', category: 'export', action: () => { state.chats.forEach(chat => { downloadFile(exportChat(chat.id, 'markdown'), `${chat.title}.md`, 'text/markdown'); }); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'export-all-json', name: 'Export All Chats as JSON', description: 'Export all chats as .json files', icon: '📋', category: 'export', action: () => { state.chats.forEach(chat => { downloadFile(exportChat(chat.id, 'json'), `${chat.title}.json`, 'application/json'); }); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    
    // Template Commands
    { id: 'templates', name: 'Prompt Templates', description: 'Browse and use saved templates', icon: '📚', category: 'templates', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' }); } },
  ], [state.themeSettings, activeChat, createChat, dispatch, exportChat]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.name.toLowerCase().includes(lower) || 
      cmd.description.toLowerCase().includes(lower) ||
      cmd.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  // Keyboard shortcut to open (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  // Focus input when opened
  useEffect(() => {
    if (state.isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state.isCommandPaletteOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!state.isCommandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isCommandPaletteOpen, filteredCommands, selectedIndex, dispatch]);

  if (!state.isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-[10vh] md:pt-[15vh] px-2 sm:px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE' })}
      />
      
      {/* Palette - responsive width and sizing */}
      <div className={`relative w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl mx-auto rounded-xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-dark-200 border-dark-300' : 'bg-white border-gray-200'
      }`}>
        {/* Search Input - responsive padding and sizing */}
        <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <span className="text-lg sm:text-xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command..."
            className={`flex-1 bg-transparent outline-none text-sm sm:text-base md:text-lg min-w-0 ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
          />
          <kbd className={`hidden sm:block px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>ESC</kbd>
        </div>

        {/* Commands List - responsive height */}
        <div className="max-h-[50vh] sm:max-h-[60vh] md:max-h-96 overflow-y-auto overflow-x-hidden py-1 sm:py-2 scroll-touch">
          {filteredCommands.length === 0 ? (
            <div className={`px-3 sm:px-4 py-6 sm:py-8 text-center text-xs sm:text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-left transition-colors ${
                  index === selectedIndex
                    ? isDark ? 'bg-theme-primary/20' : 'bg-theme-primary-light'
                    : ''
                } ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-50'}`}
              >
                <span className="text-base sm:text-lg md:text-xl w-6 sm:w-8 text-center flex-shrink-0">{cmd.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs sm:text-sm md:text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{cmd.name}</div>
                  <div className={`text-[10px] sm:text-xs md:text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{cmd.description}</div>
                </div>
                {cmd.shortcut && (
                  <kbd className={`hidden sm:block px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded flex-shrink-0 ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer - responsive, hidden on mobile */}
        <div className={`hidden sm:flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs border-t ${isDark ? 'border-dark-300 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
