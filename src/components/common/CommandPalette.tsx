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
  const isDark = state.theme === 'dark';

  const commands: Command[] = useMemo(() => [
    // Chat Commands
    { id: 'new-chat', name: 'New Chat', description: 'Create a new conversation', icon: '💬', category: 'chat', shortcut: 'Ctrl+N', action: () => { createChat(); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'delete-chat', name: 'Delete Current Chat', description: 'Delete the active chat', icon: '🗑️', category: 'chat', action: () => { if (activeChat) { dispatch({ type: 'DELETE_CHAT', payload: activeChat.id }); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'archive-chat', name: 'Archive Current Chat', description: 'Archive the active chat', icon: '📦', category: 'chat', action: () => { if (activeChat) { dispatch({ type: 'ARCHIVE_CHAT', payload: activeChat.id }); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    
    // Navigation Commands
    { id: 'search', name: 'Global Search', description: 'Search across all chats', icon: '🔍', category: 'navigation', shortcut: 'Ctrl+Shift+F', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); setTimeout(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', ctrlKey: true, shiftKey: true })), 100); } },
    { id: 'toggle-sidebar', name: 'Toggle Context Panel', description: 'Show/hide context panel', icon: '📄', category: 'navigation', action: () => { dispatch({ type: 'TOGGLE_CONTEXT_PANEL_MODE' }); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    
    // Settings Commands
    { id: 'admin', name: 'Open Settings', description: 'Configure LLM providers and preferences', icon: '⚙️', category: 'settings', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); dispatch({ type: 'TOGGLE_ADMIN_PANEL' }); } },
    { id: 'theme-toggle', name: 'Toggle Dark/Light Mode', description: 'Switch between themes', icon: '🌓', category: 'settings', action: () => { dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' }); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'shortcuts', name: 'Keyboard Shortcuts', description: 'View all keyboard shortcuts', icon: '⌨️', category: 'settings', shortcut: '?', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' }); } },
    
    // Export Commands
    { id: 'export-md', name: 'Export as Markdown', description: 'Export current chat as .md file', icon: '📝', category: 'export', action: () => { if (activeChat) { downloadFile(exportChat(activeChat.id, 'markdown'), `${activeChat.title}.md`, 'text/markdown'); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'export-json', name: 'Export as JSON', description: 'Export current chat as .json file', icon: '📋', category: 'export', action: () => { if (activeChat) { downloadFile(exportChat(activeChat.id, 'json'), `${activeChat.title}.json`, 'application/json'); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    { id: 'export-html', name: 'Export as HTML', description: 'Export current chat as .html file', icon: '🌐', category: 'export', action: () => { if (activeChat) { downloadFile(exportChat(activeChat.id, 'html'), `${activeChat.title}.html`, 'text/html'); } dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); } },
    
    // Template Commands
    { id: 'templates', name: 'Prompt Templates', description: 'Browse and use saved templates', icon: '📚', category: 'templates', action: () => { dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }); dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' }); } },
  ], [state.theme, activeChat, createChat, dispatch, exportChat]);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'TOGGLE_COMMAND_PALETTE' })}
      />
      
      {/* Palette */}
      <div className={`relative w-full max-w-2xl mx-4 rounded-xl shadow-2xl border overflow-hidden ${
        isDark ? 'bg-dark-200 border-dark-300' : 'bg-white border-gray-200'
      }`}>
        {/* Search Input */}
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <span className="text-xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or search..."
            className={`flex-1 bg-transparent outline-none text-lg ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
          />
          <kbd className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>ESC</kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className={`px-4 py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                  index === selectedIndex
                    ? isDark ? 'bg-primary-600/20' : 'bg-primary-50'
                    : ''
                } ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-50'}`}
              >
                <span className="text-xl w-8 text-center">{cmd.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{cmd.name}</div>
                  <div className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{cmd.description}</div>
                </div>
                {cmd.shortcut && (
                  <kbd className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-4 py-2 text-xs border-t ${isDark ? 'border-dark-300 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
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
