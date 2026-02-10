import { useEffect } from 'react';
import { useChat } from '../../context/ChatContext';

interface ShortcutGroup {
  category: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    category: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Ctrl', 'Shift', 'F'], description: 'Global search' },
      { keys: ['Escape'], description: 'Close modal / Cancel' },
    ],
  },
  {
    category: 'Chat',
    shortcuts: [
      { keys: ['Ctrl', 'N'], description: 'New chat' },
      { keys: ['Ctrl', 'Enter'], description: 'Send message' },
      { keys: ['Shift', 'Enter'], description: 'Send (in list mode)' },
      { keys: ['Enter'], description: 'New line / Continue list' },
      { keys: ['Tab'], description: 'Indent list item' },
    ],
  },
  {
    category: 'Prompt Input',
    shortcuts: [
      { keys: ['Ctrl', 'B'], description: 'Bold text' },
      { keys: ['Ctrl', 'I'], description: 'Italic text' },
      { keys: ['Ctrl', '`'], description: 'Inline code' },
      { keys: ['Ctrl', 'L'], description: 'Insert link' },
    ],
  },
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Navigate lists / search results' },
      { keys: ['Ctrl', '1-9'], description: 'Quick switch to chat 1-9' },
    ],
  },
  {
    category: 'Voice',
    shortcuts: [
      { keys: ['Ctrl', 'M'], description: 'Toggle voice input' },
      { keys: ['Ctrl', '.'], description: 'Read response aloud' },
    ],
  },
];

export default function KeyboardShortcuts() {
  const { state, dispatch, isDark } = useChat();

  // Open with ? key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  // Close on Escape
  useEffect(() => {
    if (!state.isShortcutsHelpOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isShortcutsHelpOpen, dispatch]);

  if (!state.isShortcutsHelpOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' })}
      />
      
      {/* Modal - responsive width */}
      <div className={`relative w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl mx-auto max-h-[90vh] sm:max-h-[80vh] rounded-xl shadow-2xl border overflow-hidden flex flex-col ${
        isDark ? 'bg-dark-200 border-dark-300' : 'bg-white border-gray-200'
      }`}>
        {/* Header - responsive padding */}
        <div className={`flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b flex-shrink-0 ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <h2 className={`text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ⌨️ <span className="hidden xs:inline">Keyboard Shortcuts</span><span className="xs:hidden">Shortcuts</span>
          </h2>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS_HELP' })}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center ${isDark ? 'hover:bg-dark-300 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="p-3 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden flex-1 scroll-touch">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {SHORTCUTS.map((group) => (
              <div key={group.category}>
                <h3 className={`text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wide mb-2 sm:mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {group.category}
                </h3>
                <div className="space-y-1.5 sm:space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}
                    >
                      <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-2">
                        {shortcut.keys.map((key, i) => (
                          <span key={i} className="flex items-center">
                            <kbd className={`px-1 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-mono rounded border ${
                              isDark 
                                ? 'bg-dark-100 border-dark-300 text-gray-300' 
                                : 'bg-white border-gray-300 text-gray-700'
                            }`}>
                              {key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className={`mx-0.5 sm:mx-1 text-[10px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer - responsive, simplified on mobile */}
        <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-t text-center text-[10px] sm:text-xs md:text-sm flex-shrink-0 ${isDark ? 'border-dark-300 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          Press <kbd className={`px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs rounded ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>?</kbd> to toggle
        </div>
      </div>
    </div>
  );
}
