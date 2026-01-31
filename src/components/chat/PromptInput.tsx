import { useRef, KeyboardEvent, useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { usePromptNavigation } from '../../hooks/usePromptNavigation';
import VoiceInput from './VoiceInput';
import TokenCounter from './TokenCounter';

interface PromptInputProps {
  onSend: (content: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, content: string) => void;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  hasProvider?: boolean;
}

export default function PromptInput({ onSend, onKeyDown, disabled, value = '', onChange, hasProvider = true }: PromptInputProps) {
  const { state } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDark = state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [multiLineMode, setMultiLineMode] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [listMode, setListMode] = useState<{ active: boolean; type: 'numbered' | 'bullet'; currentNumber: number }>({
    active: false,
    type: 'numbered',
    currentNumber: 1,
  });

  // Prompt navigation hook
  const {
    initializeNavigation,
    navigateToPrevious,
    navigateToNext,
    resetNavigation,
    isNavigating,
  } = usePromptNavigation();

  // Reset multi-line mode when input is cleared or becomes single line
  useEffect(() => {
    if (!value || !value.includes('\n')) {
      setMultiLineMode(false);
    }
  }, [value]);

  // Initialize prompt navigation when value changes
  useEffect(() => {
    if (state.themeSettings.promptNavigationEnabled) {
      initializeNavigation(value);
    }
  }, [value, state.themeSettings.promptNavigationEnabled, initializeNavigation]);

  // Detect list mode patterns
  useEffect(() => {
    const lines = value.split('\n');
    const lastLine = lines[lines.length - 1];
    
    // Check if last line starts a numbered list
    const numberedMatch = lastLine.match(/^(\d+)\.\s/);
    const bulletMatch = lastLine.match(/^[-*]\s/);
    
    if (numberedMatch && !listMode.active) {
      setListMode({
        active: true,
        type: 'numbered',
        currentNumber: parseInt(numberedMatch[1]),
      });
    } else if (bulletMatch && !listMode.active) {
      setListMode({
        active: true,
        type: 'bullet',
        currentNumber: 0,
      });
    }
  }, [value]);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value);
      onChange?.('');
      setListMode({ active: false, type: 'numbered', currentNumber: 1 });
      resetNavigation(); // Reset navigation when sending
    }
  };

  // Helper function to get the current line index from cursor position
  const getCurrentLineIndex = (textarea: HTMLTextAreaElement): number => {
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    return lines.length - 1;
  };

  const handleKeyDownInternal = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Handle prompt navigation with arrow keys (only if enabled)
    if (state.themeSettings.promptNavigationEnabled && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
      const lines = value.split('\n');
      const currentLineIndex = getCurrentLineIndex(textarea);
      const isFirstLine = currentLineIndex === 0;
      const isLastLine = currentLineIndex === lines.length - 1;

      if (e.key === 'ArrowUp' && isFirstLine) {
        // Navigate to previous prompt
        e.preventDefault();
        const previousContent = navigateToPrevious();
        if (previousContent !== null) {
          onChange?.(previousContent);
          // Move cursor to beginning of first line
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(0, 0);
          }, 0);
        }
        return;
      }

      if (e.key === 'ArrowDown' && isLastLine) {
        // Navigate to next prompt (or back to current)
        e.preventDefault();
        const nextContent = navigateToNext();
        if (nextContent !== null) {
          onChange?.(nextContent);
          // Move cursor to end of last line
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(nextContent.length, nextContent.length);
          }, 0);
        }
        return;
      }
    }

    // Handle list continuation on Enter
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && listMode.active) {
      e.preventDefault();
      
      const lines = value.split('\n');
      const lastLine = lines[lines.length - 1];
      
      // Check if list item is empty (just the marker)
      const emptyNumbered = /^\d+\.\s*$/.test(lastLine);
      const emptyBullet = /^[-*]\s*$/.test(lastLine);
      
      if (emptyNumbered || emptyBullet) {
        // End list mode - remove empty marker
        const newValue = lines.slice(0, -1).join('\n');
        onChange?.(newValue);
        setListMode({ active: false, type: 'numbered', currentNumber: 1 });
      } else {
        // Continue list
        if (listMode.type === 'numbered') {
          const nextNumber = listMode.currentNumber + 1;
          onChange?.(value + `\n${nextNumber}. `);
          setListMode({ ...listMode, currentNumber: nextNumber });
        } else {
          const bulletChar = lastLine.startsWith('-') ? '-' : '*';
          onChange?.(value + `\n${bulletChar} `);
        }
      }
      return;
    }

    // Smart Enter behavior
    if (e.key === 'Enter') {
      if (multiLineMode) {
        // In multi-line mode: Enter adds newline, Shift/Ctrl+Enter sends
        if (!e.shiftKey && !e.ctrlKey) {
          // Add newline
          e.preventDefault();
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = value.substring(0, start) + '\n' + value.substring(end);
            onChange?.(newValue);
            // Move cursor after newline
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + 1;
            }, 0);
          }
        } else {
          // Shift+Enter or Ctrl+Enter sends
          e.preventDefault();
          handleSend();
        }
      } else {
        // Single-line mode: Enter sends, Shift/Ctrl+Enter enters multi-line mode
        if (!e.shiftKey && !e.ctrlKey) {
          // Send
          e.preventDefault();
          handleSend();
        } else {
          // Enter multi-line mode and add newline
          e.preventDefault();
          setMultiLineMode(true);
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = value.substring(0, start) + '\n' + value.substring(end);
            onChange?.(newValue);
            // Move cursor after newline
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + 1;
            }, 0);
          }
        }
      }
      return;
    }

    // Handle Tab for indentation in lists
    if (e.key === 'Tab' && listMode.active) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange?.(newValue);
        // Move cursor after indentation
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
      return;
    }

    onKeyDown(e, value);
  };

  // Handle text formatting shortcuts
  const applyFormatting = (type: 'bold' | 'italic' | 'code' | 'link' | 'strikethrough' | 'quote' | 'heading' | 'clear') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let newText = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        cursorOffset = selectedText ? newText.length - 1 : 1;
        break;
      case 'strikethrough':
        newText = `~~${selectedText || 'strikethrough'}~~`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'quote':
        newText = `> ${selectedText || 'quote'}`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'heading':
        newText = `### ${selectedText || 'heading'}`;
        cursorOffset = selectedText ? newText.length : 4;
        break;
      case 'clear':
        // Remove common markdown formatting
        newText = selectedText
          .replace(/\*\*(.+?)\*\*/g, '$1') // bold
          .replace(/\*(.+?)\*/g, '$1') // italic
          .replace(/~~(.+?)~~/g, '$1') // strikethrough
          .replace(/`(.+?)`/g, '$1') // code
          .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
          .replace(/^#+\s/gm, '') // headings
          .replace(/^>\s/gm, ''); // quotes
        cursorOffset = newText.length;
        break;
    }

    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange?.(newValue);

    setTimeout(() => {
      textarea.focus();
      if (type === 'clear' || selectedText) {
        textarea.selectionStart = textarea.selectionEnd = start + newText.length;
      } else {
        textarea.selectionStart = start + cursorOffset;
        textarea.selectionEnd = start + newText.length - cursorOffset;
      }
    }, 0);
  };

  return (
    <div className={`border-t p-4 ${isDark ? 'border-dark-100 bg-dark-200' : 'border-light-400 bg-light-100'}`}>
      {/* Collapsible Formatting Toolbar */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showToolbar ? 'max-h-32 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'
        }`}
      >
        <div className={`flex flex-wrap items-center gap-1 pb-2 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          {/* Text Formatting */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyFormatting('bold')}
              className={`p-1.5 rounded font-bold text-sm transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('italic')}
              className={`p-1.5 rounded italic text-sm transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('strikethrough')}
              className={`p-1.5 rounded text-sm line-through transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
              title="Strikethrough"
            >
              S
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('code')}
              className={`p-1.5 rounded font-mono text-sm transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
              title="Inline Code"
            >
              {'</>'}
            </button>
          </div>

          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-dark-100' : 'bg-light-400'}`} />

          {/* Structure */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyFormatting('heading')}
              className={`p-1.5 rounded text-sm font-bold transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
              title="Heading"
            >
              H
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('quote')}
              className={`p-1.5 rounded text-sm transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
              title="Quote"
            >
              &ldquo;
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('link')}
              className={`p-1.5 rounded text-sm transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
              title="Link"
            >
              🔗
            </button>
          </div>

          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-dark-100' : 'bg-light-400'}`} />

          {/* Lists */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (!listMode.active) {
                  onChange?.(value + (value.endsWith('\n') || !value ? '' : '\n') + '1. ');
                  setListMode({ active: true, type: 'numbered', currentNumber: 1 });
                }
              }}
              className={`p-1.5 rounded text-sm transition-colors ${
                listMode.active && listMode.type === 'numbered'
                  ? 'bg-primary-600/20 text-primary-400'
                  : isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
              }`}
              title="Numbered List (type 1. to start)"
            >
              1.
            </button>
            <button
              type="button"
              onClick={() => {
                if (!listMode.active) {
                  onChange?.(value + (value.endsWith('\n') || !value ? '' : '\n') + '- ');
                  setListMode({ active: true, type: 'bullet', currentNumber: 0 });
                }
              }}
              className={`p-1.5 rounded text-sm transition-colors ${
                listMode.active && listMode.type === 'bullet'
                  ? 'bg-primary-600/20 text-primary-400'
                  : isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
              }`}
              title="Bullet List"
            >
              •
            </button>
          </div>

          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-dark-100' : 'bg-light-400'}`} />

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => applyFormatting('clear')}
            className={`p-1.5 rounded text-sm transition-colors ${isDark ? 'hover:bg-dark-100 text-red-400' : 'hover:bg-light-300 text-red-600'}`}
            title="Clear Formatting (remove markdown)"
          >
            ✕
          </button>

          {/* Status Indicators */}
          <div className="flex-1 flex items-center gap-2 ml-2">
            {listMode.active && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isDark ? 'bg-primary-600/20 text-primary-400' : 'bg-primary-100 text-primary-700'
              }`}>
                📝 List Mode (Enter for next, empty line to exit)
              </span>
            )}
            
            {isNavigating && state.themeSettings.promptNavigationEnabled && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isDark ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-700'
              }`}>
                🧭 History (↑↓)
              </span>
            )}
            
            {multiLineMode && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-700'
              }`}>
                📄 Multi-line
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDownInternal}
          onMouseEnter={() => textareaRef.current?.focus()}
          disabled={disabled}
          placeholder={
            !hasProvider
              ? "Please select and configure an LLM provider in Admin Settings to start chatting"
              : multiLineMode
                ? "Multi-line mode: Enter for newline, Shift+Enter to send"
                : "Type your message... (Enter to send, Shift+Enter for newline)"
          }
          className={`w-full p-4 pr-24 border rounded-lg focus:outline-none focus:border-primary-500 resize-none min-h-[60px] max-h-[300px] font-mono text-sm ${
            isDark 
              ? 'bg-dark-100 border-dark-300 text-gray-200 placeholder-gray-500' 
              : 'bg-white border-light-400 text-gray-800 placeholder-gray-400'
          }`}
          rows={1}
        />
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowToolbar(!showToolbar)}
            className={`p-2 rounded-lg transition-all ${
              showToolbar
                ? 'bg-primary-600 text-white'
                : isDark
                  ? 'hover:bg-dark-100 text-gray-400'
                  : 'hover:bg-light-300 text-gray-600'
            }`}
            title={showToolbar ? 'Hide formatting toolbar' : 'Show formatting toolbar'}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <text x="12" y="18" textAnchor="middle" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif" fill="currentColor">A</text>
            </svg>
          </button>
          <VoiceInput 
            onTranscript={(text) => onChange?.(value + (value ? ' ' : '') + text)}
            disabled={disabled}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="p-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title="Send (Ctrl+Enter or Shift+Enter)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
      <div className={`flex items-center justify-between mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
        <div className="flex items-center gap-4">
          <span>
            <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-dark-300' : 'bg-light-400'}`}>Ctrl</kbd>+
            <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-dark-300' : 'bg-light-400'}`}>Enter</kbd> or
            <kbd className={`px-1 py-0.5 rounded ml-1 ${isDark ? 'bg-dark-300' : 'bg-light-400'}`}>Shift</kbd>+
            <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-dark-300' : 'bg-light-400'}`}>Enter</kbd> to send
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TokenCounter text={value} />
          <span>{value.length} chars</span>
        </div>
      </div>
    </div>
  );
}
