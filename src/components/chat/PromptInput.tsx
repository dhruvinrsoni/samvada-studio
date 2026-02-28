import { useRef, KeyboardEvent, useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { usePromptNavigation } from '../../hooks/usePromptNavigation';
import VoiceInput from './VoiceInput';
import TokenCounter from './TokenCounter';
import ContextUtilization from './ContextUtilization';

interface PromptInputProps {
  onSend: (content: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, content: string) => void;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  hasProvider?: boolean;
  providerId?: string;
}

export default function PromptInput({ onSend, onKeyDown, disabled, value = '', onChange, hasProvider = true, providerId }: PromptInputProps) {
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

  // Undo/Redo History
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Prompt navigation hook - pass current value so it's always in sync
  const {
    startNavigation,
    navigateToPrevious,
    navigateToNext,
    restoreOriginal,
    resetNavigation,
    isNavigating,
  } = usePromptNavigation(value);

  // Track history changes when value prop changes
  useEffect(() => {
    if (value !== history[historyIndex]) {
      // Create new history entry if current value is different from last saved
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(value);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [value]);

  // Undo handler
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const text = history[newIndex];
      if (text !== undefined) onChange?.(text);
    }
  };

  // Redo handler
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const text = history[newIndex];
      if (text !== undefined) onChange?.(text);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Reset multi-line mode when input is cleared or becomes single line
  useEffect(() => {
    if (!value || !value.includes('\n')) {
      setMultiLineMode(false);
    }
  }, [value]);

  // Detect list mode patterns
  useEffect(() => {
    const lines = value.split('\n');
    const lastLine = lines[lines.length - 1] || '';
    
    // Check if last line starts a numbered list
    const numberedMatch = lastLine.match(/^(\d+)\.\s/);
    const bulletMatch = lastLine.match(/^[-*]\s/);
    
    if (numberedMatch && !listMode.active) {
      const number = numberedMatch[1] ? parseInt(numberedMatch[1]) : 1;
      setListMode({
        active: true,
        type: 'numbered',
        currentNumber: number,
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

    // Handle Undo (Ctrl+Z / Cmd+Z)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Handle Redo (Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z)
    if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Handle prompt navigation with arrow keys (only if enabled)
    if (state.promptNavigationEnabled && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
      const lines = value.split('\n');
      const currentLineIndex = getCurrentLineIndex(textarea);
      const cursorPosition = textarea.selectionStart;
      
      // For single-line inputs (most common case), check line position
      // For multi-line, check cursor at start/end of line
      const isFirstLine = currentLineIndex === 0;
      const isLastLine = currentLineIndex === lines.length - 1;
      
      // Get the start position of the current line
      const lineStartPos = lines.slice(0, currentLineIndex).join('\n').length + (currentLineIndex > 0 ? 1 : 0);
      const currentLine = lines[currentLineIndex] ?? '';
      const lineEndPos = lineStartPos + currentLine.length;
      const cursorAtLineStart = cursorPosition === lineStartPos;
      const cursorAtLineEnd = cursorPosition === lineEndPos;

      if (e.key === 'ArrowUp' && isFirstLine && cursorAtLineStart) {
        // Navigate to previous prompt - cursor goes to end
        e.preventDefault();
        // First time navigating - save current content
        if (!isNavigating) {
          startNavigation(value);
        }
        const result = navigateToPrevious();
        if (result !== null) {
          onChange?.(result.content);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(result.content.length, result.content.length);
          }, 0);
        }
        return;
      }

      if (e.key === 'ArrowDown' && isLastLine && cursorAtLineEnd) {
        // Navigate to next prompt - cursor goes to start
        e.preventDefault();
        const result = navigateToNext();
        if (result !== null) {
          onChange?.(result.content);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(0, 0);
          }, 0);
        }
        return;
      }

      if (e.key === 'Escape' && isNavigating) {
        // ESC: Restore original content and exit navigation
        e.preventDefault();
        const originalContent = restoreOriginal();
        onChange?.(originalContent);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(originalContent.length, originalContent.length);
        }, 0);
        return;
      }
    }

    // Handle list continuation on Enter
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && listMode.active) {
      e.preventDefault();
      
      const lines = value.split('\n');
      const lastLine = lines[lines.length - 1] || '';
      
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
        newText = `[${selectedText || 'link'}](url)`;
        cursorOffset = selectedText ? newText.length - 1 : 7; // Position at start of 'url'
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
      } else if (type === 'link') {
        // For links, select only the URL part
        textarea.selectionStart = start + 7; // Position of 'u' in '[link](url)'
        textarea.selectionEnd = start + 10; // Position after 'l' in 'url'
      } else {
        textarea.selectionStart = start + cursorOffset;
        textarea.selectionEnd = start + newText.length - cursorOffset;
      }
    }, 0);
  };

  return (
    <div className={`border-t p-2 sm:p-3 md:p-4 flex-shrink-0 ${isDark ? 'border-dark-100 bg-dark-200' : 'border-light-400 bg-light-100'}`}>
      {/* Collapsible Formatting Toolbar - responsive */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showToolbar ? 'max-h-48 sm:max-h-32 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'
        }`}
      >
        <div className={`flex flex-wrap items-center gap-0.5 sm:gap-1 pb-2 border-b rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${
          isDark 
            ? 'border-dark-300 bg-dark-100/40' 
            : 'border-light-400 bg-theme-primary/5'
        }`}>
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className={`p-1 sm:p-1.5 rounded text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${
                canUndo
                  ? isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'
                  : isDark ? 'text-theme-primary/30 cursor-not-allowed' : 'text-theme-primary/30 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className={`p-1 sm:p-1.5 rounded text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${
                canRedo
                  ? isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'
                  : isDark ? 'text-theme-primary/30 cursor-not-allowed' : 'text-theme-primary/30 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>

          <div className={`w-px h-4 mx-0.5 sm:mx-1 ${isDark ? 'bg-dark-100' : 'bg-light-400'}`} />

          {/* Text Formatting */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => applyFormatting('bold')}
              className={`p-1 sm:p-1.5 rounded font-bold text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'}`}
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('italic')}
              className={`p-1 sm:p-1.5 rounded italic text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'}`}
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('strikethrough')}
              className={`p-1 sm:p-1.5 rounded text-xs sm:text-sm line-through transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'}`}
              title="Strikethrough"
            >
              S
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('code')}
              className={`p-1 sm:p-1.5 rounded font-mono text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'}`}
              title="Inline Code"
            >
              {'</>'}
            </button>
          </div>

          <div className={`w-px h-4 mx-0.5 sm:mx-1 ${isDark ? 'bg-dark-100' : 'bg-light-400'}`} />

          {/* Structure */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => applyFormatting('heading')}
              className={`p-1 sm:p-1.5 rounded text-xs sm:text-sm font-bold transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'}`}
              title="Heading"
            >
              H
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('quote')}
              className={`p-1 sm:p-1.5 rounded text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'}`}
              title="Quote"
            >
              &ldquo;
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('link')}
              className={`p-1 sm:p-1.5 rounded text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'}`}
              title="Link"
            >
              🔗
            </button>
          </div>

          <div className={`w-px h-4 mx-0.5 sm:mx-1 ${isDark ? 'bg-dark-100' : 'bg-light-400'}`} />

          {/* Lists */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => {
                if (!listMode.active) {
                  onChange?.(value + (value.endsWith('\n') || !value ? '' : '\n') + '1. ');
                  setListMode({ active: true, type: 'numbered', currentNumber: 1 });
                }
              }}
              className={`p-1 sm:p-1.5 rounded text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${
                listMode.active && listMode.type === 'numbered'
                  ? isDark ? 'bg-theme-primary/20 text-theme-primary' : 'bg-theme-primary/15 text-theme-primary'
                  : isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'
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
              className={`p-1 sm:p-1.5 rounded text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${
                listMode.active && listMode.type === 'bullet'
                  ? isDark ? 'bg-theme-primary/20 text-theme-primary' : 'bg-theme-primary/15 text-theme-primary'
                  : isDark ? 'text-theme-primary hover:bg-theme-primary/10' : 'text-theme-primary hover:bg-theme-primary/5'
              }`}
              title="Bullet List"
            >
              •
            </button>
          </div>

          <div className={`w-px h-4 mx-0.5 sm:mx-1 ${isDark ? 'bg-dark-100' : 'bg-light-400'}`} />

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => applyFormatting('clear')}
            className={`p-1 sm:p-1.5 rounded text-xs sm:text-sm transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${isDark ? 'hover:bg-dark-100 text-red-400' : 'hover:bg-light-300 text-red-600'}`}
            title="Clear Formatting (remove markdown)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Status Indicators - Always visible, outside collapsible toolbar */}
      <div className="flex items-center gap-1 sm:gap-2 mb-2 flex-wrap">
        {listMode.active && (
          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap ${
            isDark ? 'bg-theme-primary/20 text-theme-primary' : 'bg-theme-primary-light text-theme-primary-dark'
          }`}>
            📝 <span className="hidden md:inline">List Mode</span>
          </span>
        )}
        
        {state.promptNavigationEnabled && isNavigating && (
          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 ${
            isDark ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-700'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
            <span className="hidden md:inline">Navigating History</span>
            <span className="md:hidden">History</span>
          </span>
        )}
        
        {multiLineMode && (
          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap ${
            isDark ? 'bg-theme-primary/20 text-theme-primary' : 'bg-theme-primary/20 text-theme-primary'
          }`}>
            📄 <span className="hidden md:inline">Multi-line</span>
          </span>
        )}
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
              ? "Select a provider in Admin Settings to start"
              : multiLineMode
                ? "Multi-line: Enter for newline, Shift+Enter to send"
                : "Type message... (Enter to send)"
          }
          className={`w-full p-2 sm:p-3 md:p-4 pr-20 sm:pr-24 md:pr-28 border rounded-lg focus:outline-none focus:border-theme-primary resize-none min-h-[48px] sm:min-h-[56px] md:min-h-[60px] max-h-[200px] sm:max-h-[250px] md:max-h-[300px] font-mono text-xs sm:text-sm ${
            !hasProvider
              ? 'bg-red-50 border-red-300 text-red-700 placeholder-red-500 focus:border-red-500 focus:ring-red-500'
              : isDark 
                ? 'bg-dark-100 border-dark-300 text-gray-200 placeholder-gray-500' 
                : 'bg-white border-light-400 text-gray-800 placeholder-gray-400'
          }`}
          rows={1}
        />
        <div className="absolute right-1.5 sm:right-2 md:right-3 bottom-1.5 sm:bottom-2 md:bottom-3 flex items-center gap-1 sm:gap-1.5 md:gap-2">
          {/* Clear Button - Show when has content */}
          {value && (
            <button
              type="button"
              onClick={() => onChange?.('')}
              className={`p-1.5 sm:p-2 rounded-lg transition-all min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center ${
                isDark
                  ? 'text-theme-primary hover:bg-theme-primary/10'
                  : 'text-theme-primary hover:bg-theme-primary/5'
              }`}
              title="Clear prompt input (Esc)"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <button
            type="button"
            onClick={() => setShowToolbar(!showToolbar)}
            className={`p-1.5 sm:p-2 rounded-lg transition-all min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center ${
              showToolbar
                ? 'bg-theme-primary text-white'
                : isDark
                  ? 'text-theme-primary hover:bg-theme-primary/10'
                  : 'text-theme-primary hover:bg-theme-primary/5'
            }`}
            title={showToolbar ? 'Hide formatting toolbar' : 'Show formatting toolbar'}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
              <text x="12" y="18" textAnchor="middle" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif" fill="currentColor">A</text>
            </svg>
          </button>
          {/* Voice Input - Always visible */}
          <div>
            <VoiceInput 
              onTranscript={(text) => onChange?.(value + (value ? ' ' : '') + text)}
              disabled={disabled}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="p-1.5 sm:p-2 bg-theme-primary hover:bg-theme-primary-hover disabled:bg-theme-primary/25 disabled:cursor-not-allowed text-white disabled:text-white/40 rounded-lg transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center"
            title="Send (Ctrl+Enter or Shift+Enter)"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
      {/* Footer hints - compact, hidden below 475px */}
      <div className={`hidden xs:flex items-center justify-between mt-1 sm:mt-1.5 text-[10px] sm:text-xs leading-none ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
        <div className="hidden md:flex items-center gap-2">
          <span>
            <kbd className={`px-1 py-0.5 rounded text-[10px] ${isDark ? 'bg-dark-300' : 'bg-light-400'}`}>Ctrl</kbd>+
            <kbd className={`px-1 py-0.5 rounded text-[10px] ${isDark ? 'bg-dark-300' : 'bg-light-400'}`}>Enter</kbd> to send
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <ContextUtilization currentInputText={value} providerId={providerId} />
          <TokenCounter text={value} />
          <span className="whitespace-nowrap">{value.length} <span className="hidden sm:inline">chars</span></span>
        </div>
      </div>
    </div>
  );
}
