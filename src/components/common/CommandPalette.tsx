import { useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { captureViewport, captureFull, downloadBlob, copyBlobToClipboard, generateFilename } from '../../utils/screenshotService';

let pendingSeed = '';

/** Seed text that will pre-fill the palette on next open. */
export function seedCommandPalette(text: string) {
  pendingSeed = text;
}

type CommandCategory = 'chat' | 'navigation' | 'settings' | 'export';

interface Command {
  id: string;
  name: string;
  description: string;
  icon: string;
  shortcut?: string;
  category: CommandCategory;
  action: () => void;
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  chat: 'Chat',
  navigation: 'Navigation',
  settings: 'Settings',
  export: 'Export',
};

const CATEGORY_ORDER: CommandCategory[] = ['chat', 'navigation', 'settings', 'export'];

export default function CommandPalette() {
  const { state, dispatch, createChat, activeChat, exportChat } = useChat();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark =
    state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const close = () => dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });

  const commands: Command[] = useMemo(() => [
    // ── Chat ──────────────────────────────────────────────────────────────
    {
      id: 'new-chat', name: 'New Chat', description: 'Create a new conversation',
      icon: '💬', category: 'chat', shortcut: 'Ctrl+N',
      action: () => { createChat(); close(); },
    },
    {
      id: 'delete-chat', name: 'Delete Current Chat', description: 'Permanently delete the active chat',
      icon: '🗑️', category: 'chat',
      action: () => { if (activeChat) dispatch({ type: 'DELETE_CHAT', payload: activeChat.id }); close(); },
    },
    {
      id: 'archive-chat', name: 'Archive Current Chat', description: 'Archive the active chat',
      icon: '📦', category: 'chat',
      action: () => { if (activeChat) dispatch({ type: 'ARCHIVE_CHAT', payload: activeChat.id }); close(); },
    },
    {
      id: 'unarchive-chat', name: 'Unarchive Current Chat', description: 'Restore the active chat from archive',
      icon: '📬', category: 'chat',
      action: () => { if (activeChat) dispatch({ type: 'UNARCHIVE_CHAT', payload: activeChat.id }); close(); },
    },
    {
      id: 'expand-all', name: 'Expand All Messages', description: 'Expand all collapsed messages in this chat',
      icon: '⬇️', category: 'chat',
      action: () => { if (activeChat) dispatch({ type: 'EXPAND_ALL', payload: { chatId: activeChat.id } }); close(); },
    },
    {
      id: 'collapse-all', name: 'Collapse All Messages', description: 'Collapse all messages in this chat',
      icon: '⬆️', category: 'chat',
      action: () => { if (activeChat) dispatch({ type: 'COLLAPSE_ALL', payload: { chatId: activeChat.id } }); close(); },
    },
    {
      id: 'archive-all-chats', name: 'Archive All Chats', description: 'Archive every chat',
      icon: '📦', category: 'chat',
      action: () => { dispatch({ type: 'ARCHIVE_CHATS', payload: state.chats.map(c => c.id) }); close(); },
    },
    {
      id: 'delete-all-chats', name: 'Delete All Chats', description: 'Permanently delete every chat',
      icon: '🗑️', category: 'chat',
      action: () => { dispatch({ type: 'DELETE_CHATS', payload: state.chats.map(c => c.id) }); close(); },
    },

    // ── Navigation ────────────────────────────────────────────────────────
    {
      id: 'search', name: 'Global Search', description: 'Search across all chats',
      icon: '🔍', category: 'navigation', shortcut: 'Ctrl+Shift+F',
      action: () => { close(); dispatch({ type: 'TOGGLE_GLOBAL_SEARCH' }); },
    },
    {
      id: 'toggle-sidebar', name: 'Toggle Sidebar', description: 'Show/hide the chat list sidebar',
      icon: '☰', category: 'navigation',
      action: () => { dispatch({ type: 'TOGGLE_SIDEBAR' }); close(); },
    },
    {
      id: 'toggle-context-panel', name: 'Toggle Context Panel', description: 'Show/hide the context snippets panel',
      icon: '📄', category: 'navigation',
      action: () => { dispatch({ type: 'TOGGLE_CONTEXT_PANEL_MODE' }); close(); },
    },
    {
      id: 'go-to-starred', name: 'Starred Messages', description: 'View starred prompts and responses',
      icon: '⭐', category: 'navigation',
      action: () => { close(); dispatch({ type: 'TOGGLE_STARRED_MODAL' }); },
    },
    {
      id: 'go-to-templates', name: 'Templates Library', description: 'Browse and use saved prompt templates',
      icon: '📚', category: 'navigation',
      action: () => { close(); dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' }); },
    },
    {
      id: 'open-export', name: 'Export & Backup Dialog', description: 'Open the full export and backup dialog',
      icon: '💾', category: 'navigation',
      action: () => { close(); dispatch({ type: 'TOGGLE_EXPORT_MODAL' }); },
    },

    // ── Settings ──────────────────────────────────────────────────────────
    {
      id: 'admin', name: 'Open Settings', description: 'Configure LLM providers and preferences',
      icon: '⚙️', category: 'settings',
      action: () => { close(); dispatch({ type: 'TOGGLE_ADMIN_PANEL' }); },
    },
    {
      id: 'theme-toggle', name: 'Toggle Dark / Light Mode', description: 'Switch between dark and light theme',
      icon: '🌓', category: 'settings',
      action: () => {
        const newMode = state.themeSettings.mode === 'dark' ? 'light' : 'dark';
        dispatch({ type: 'UPDATE_THEME_SETTINGS', payload: { mode: newMode } });
        close();
      },
    },
    {
      id: 'toggle-compact', name: 'Toggle Compact Mode', description: `Switch to ${state.themeSettings.compactMode ? 'comfortable' : 'compact'} UI density`,
      icon: '⚡', category: 'settings',
      action: () => {
        dispatch({ type: 'UPDATE_THEME_SETTINGS', payload: { compactMode: !state.themeSettings.compactMode } });
        close();
      },
    },
    {
      id: 'change-font-size', name: 'Cycle Font Size', description: 'xs → small → medium → large → xl',
      icon: '🔠', category: 'settings',
      action: () => {
        const sizes: Array<'xs' | 'small' | 'medium' | 'large' | 'xl'> = ['xs', 'small', 'medium', 'large', 'xl'];
        const current = state.themeSettings.fontSize as typeof sizes[number];
        const next = sizes[(Math.max(0, sizes.indexOf(current)) + 1) % sizes.length];
        dispatch({ type: 'UPDATE_THEME_SETTINGS', payload: { fontSize: next } });
        close();
      },
    },
    {
      id: 'change-accent-color', name: 'Theme Appearance', description: 'Open theme settings to change accent color and style',
      icon: '🎨', category: 'settings',
      action: () => { close(); dispatch({ type: 'SET_THEME_SETTINGS_TAB', payload: 'appearance' }); dispatch({ type: 'TOGGLE_THEME_SETTINGS_MODAL' }); },
    },
    {
      id: 'shortcuts', name: 'Keyboard Shortcuts', description: 'View all keyboard shortcuts',
      icon: '⌨️', category: 'settings', shortcut: '?',
      action: () => { close(); dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' }); },
    },

    // ── Export ────────────────────────────────────────────────────────────
    {
      id: 'export-md', name: 'Export Chat as Markdown', description: 'Download current chat as .md file',
      icon: '📝', category: 'export',
      action: () => { if (activeChat) downloadFile(exportChat(activeChat.id, 'markdown'), `${activeChat.title}.md`, 'text/markdown'); close(); },
    },
    {
      id: 'export-json', name: 'Export Chat as JSON', description: 'Download current chat as .json file',
      icon: '📋', category: 'export',
      action: () => { if (activeChat) downloadFile(exportChat(activeChat.id, 'json'), `${activeChat.title}.json`, 'application/json'); close(); },
    },
    {
      id: 'export-html', name: 'Export Chat as HTML', description: 'Download current chat as .html file',
      icon: '🌐', category: 'export',
      action: () => { if (activeChat) downloadFile(exportChat(activeChat.id, 'html'), `${activeChat.title}.html`, 'text/html'); close(); },
    },
    {
      id: 'export-all-md', name: 'Export All Chats as Markdown', description: 'Download every chat as .md files',
      icon: '📝', category: 'export',
      action: () => { state.chats.forEach(c => downloadFile(exportChat(c.id, 'markdown'), `${c.title}.md`, 'text/markdown')); close(); },
    },
    {
      id: 'export-all-json', name: 'Export All Chats as JSON', description: 'Download every chat as .json files',
      icon: '📋', category: 'export',
      action: () => { state.chats.forEach(c => downloadFile(exportChat(c.id, 'json'), `${c.title}.json`, 'application/json')); close(); },
    },
    {
      id: 'export-all-html', name: 'Export All Chats as HTML', description: 'Download every chat as .html files',
      icon: '🌐', category: 'export',
      action: () => { state.chats.forEach(c => downloadFile(exportChat(c.id, 'html'), `${c.title}.html`, 'text/html')); close(); },
    },
    {
      id: 'screenshot-visible', name: 'Screenshot (Visible)', description: 'Capture what is currently visible in the chat area',
      icon: '📸', category: 'export',
      action: async () => {
        close();
        const el = document.querySelector('[data-chat-scroll]') as HTMLElement | null;
        if (!el) return;
        try {
          const blob = await captureViewport(el);
          const copied = await copyBlobToClipboard(blob);
          if (!copied) {
            downloadBlob(blob, generateFilename(activeChat?.title));
          }
        } catch (err) {
          console.error('Screenshot failed:', err);
        }
      },
    },
    {
      id: 'screenshot-full', name: 'Screenshot (Full Chat)', description: 'Capture the entire chat conversation as a long image',
      icon: '📷', category: 'export',
      action: async () => {
        close();
        const el = document.querySelector('[data-chat-scroll]') as HTMLElement | null;
        if (!el) return;
        try {
          const blob = await captureFull(el);
          downloadBlob(blob, generateFilename(activeChat?.title));
        } catch (err) {
          console.error('Full screenshot failed:', err);
        }
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [state.themeSettings, state.chats, activeChat, createChat, dispatch, exportChat]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.name.toLowerCase().includes(lower) ||
      cmd.description.toLowerCase().includes(lower) ||
      cmd.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  // Group by category for display, preserving flat index for keyboard nav
  const groupedCommands = useMemo(() => {
    const groups = new Map<CommandCategory, { cmd: Command; flatIndex: number }[]>();
    CATEGORY_ORDER.forEach(cat => groups.set(cat, []));
    filteredCommands.forEach((cmd, flatIndex) => {
      groups.get(cmd.category)?.push({ cmd, flatIndex });
    });
    return groups;
  }, [filteredCommands]);

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

  // Focus input when opened; consume any pending seed text
  useEffect(() => {
    if (state.isCommandPaletteOpen) {
      const seed = pendingSeed;
      pendingSeed = '';
      setQuery(seed);
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
          filteredCommands[selectedIndex]?.action();
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

      {/* Palette */}
      <div className={`relative w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl mx-auto rounded-xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-dark-200 border border-dark-300' : 'bg-white border border-gray-200'
      }`}>
        {/* Search Input */}
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

        {/* Commands List */}
        <div className="max-h-[50vh] sm:max-h-[60vh] md:max-h-[28rem] overflow-y-auto overflow-x-hidden py-1 sm:py-2 scroll-touch">
          {filteredCommands.length === 0 ? (
            <div className={`px-3 sm:px-4 py-6 sm:py-8 text-center text-xs sm:text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              No commands found
            </div>
          ) : (
            CATEGORY_ORDER.map(category => {
              const items = groupedCommands.get(category) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={category}>
                  {/* Category header */}
                  <div className={`px-3 sm:px-4 md:px-6 pt-2 pb-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {CATEGORY_LABELS[category]}
                  </div>
                  {items.map(({ cmd, flatIndex }) => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-left transition-colors ${
                        flatIndex === selectedIndex
                          ? isDark ? 'bg-theme-primary/20' : 'bg-theme-primary-light'
                          : isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base sm:text-lg w-6 sm:w-8 text-center flex-shrink-0">{cmd.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{cmd.name}</div>
                        <div className={`text-[10px] sm:text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{cmd.description}</div>
                      </div>
                      {cmd.shortcut && (
                        <kbd className={`hidden sm:block px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded flex-shrink-0 ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
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
