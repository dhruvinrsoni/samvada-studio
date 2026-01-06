import { useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { formatDate } from '../../utils/helpers';

export default function GlobalSearch() {
  const { state, dispatch, searchGlobal } = useChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = state.theme === 'dark';
  const { globalSearch } = state;

  // Check if global search should be open
  const isOpen = state.globalSearch.isOpen || false;

  // Keyboard shortcut to open search (Ctrl+Shift+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_GLOBAL_SEARCH' });
      }
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (globalSearch.query.length >= 2) {
        searchGlobal(globalSearch.query);
      } else if (globalSearch.query.length === 0) {
        dispatch({ type: 'CLEAR_GLOBAL_SEARCH' });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [globalSearch.query]);

  const handleClose = () => {
    dispatch({ type: 'TOGGLE_GLOBAL_SEARCH' });
    dispatch({ type: 'CLEAR_GLOBAL_SEARCH' });
  };

  const handleResultClick = (result: typeof globalSearch.results[0]) => {
    dispatch({ type: 'NAVIGATE_TO_SEARCH_RESULT', payload: result });
    handleClose();
    
    // Scroll to the message after navigation
    setTimeout(() => {
      const element = document.getElementById(`pnr-${result.pnrId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-flash');
        setTimeout(() => element.classList.remove('highlight-flash'), 2000);
      }
    }, 100);
  };

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.min(globalSearch.selectedResultIndex + 1, globalSearch.results.length - 1);
      dispatch({ type: 'SET_GLOBAL_SEARCH_INDEX', payload: newIndex });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.max(globalSearch.selectedResultIndex - 1, 0);
      dispatch({ type: 'SET_GLOBAL_SEARCH_INDEX', payload: newIndex });
    } else if (e.key === 'Enter' && globalSearch.results[globalSearch.selectedResultIndex]) {
      handleResultClick(globalSearch.results[globalSearch.selectedResultIndex]);
    }
  };

  // Highlight matched text
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded">{part}</mark>
        : part
    );
  };

  if (!isOpen) {
    return null; // No floating trigger button - it's now in the top bar
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Search Panel */}
      <div className={`relative w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-dark-200' : 'bg-white'
      }`}>
        {/* Search Input */}
        <div className={`flex items-center gap-3 p-6 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={globalSearch.query}
            onChange={(e) => dispatch({ type: 'SET_GLOBAL_SEARCH_QUERY', payload: e.target.value })}
            onKeyDown={handleKeyNavigation}
            placeholder="Search all chats, prompts, and responses..."
            className={`flex-1 bg-transparent outline-none text-lg ${
              isDark ? 'text-gray-200 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
            }`}
          />
          {globalSearch.query && (
            <button
              onClick={() => dispatch({ type: 'SET_GLOBAL_SEARCH_QUERY', payload: '' })}
              className={`p-1 rounded ${isDark ? 'hover:bg-dark-100 text-gray-500' : 'hover:bg-light-300 text-gray-400'}`}
            >
              ✕
            </button>
          )}
          <kbd className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-dark-300 text-gray-500' : 'bg-light-300 text-gray-500'}`}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[70vh] overflow-y-auto">
          {globalSearch.isSearching ? (
            <div className={`p-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              Searching...
            </div>
          ) : globalSearch.results.length === 0 && globalSearch.query.length >= 2 ? (
            <div className={`p-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <p className="text-lg mb-1">No results found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : globalSearch.results.length > 0 ? (
            <div>
              <div className={`px-6 py-3 text-xs ${isDark ? 'text-gray-500 bg-dark-300' : 'text-gray-500 bg-light-200'}`}>
                {globalSearch.results.length} result{globalSearch.results.length !== 1 ? 's' : ''} found
              </div>
              {globalSearch.results.map((result, index) => (
                <button
                  key={`${result.chatId}-${result.pnrId}-${result.messageId}`}
                  onClick={() => handleResultClick(result)}
                  className={`w-full text-left p-6 border-b transition-colors ${
                    index === globalSearch.selectedResultIndex
                      ? 'bg-primary-500/20'
                      : isDark 
                        ? 'border-dark-100 hover:bg-dark-300' 
                        : 'border-light-400 hover:bg-light-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      result.messageType === 'prompt'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {result.messageType === 'prompt' ? '📤 Prompt' : '📥 Response'}
                    </span>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {result.chatTitle}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {formatDate(result.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    ...{highlightMatch(result.matchedText, globalSearch.query)}...
                  </p>
                </button>
              ))}
            </div>
          ) : globalSearch.query.length > 0 && globalSearch.query.length < 2 ? (
            <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Type at least 2 characters to search
            </div>
          ) : (
            <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <p className="text-lg mb-2">🔍 Global Search</p>
              <p className="text-sm mb-4">Search across all your chats, prompts, and responses</p>
              <div className="flex justify-center gap-4 text-xs">
                <span>
                  <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-dark-300' : 'bg-light-300'}`}>↑</kbd>
                  <kbd className={`px-1 py-0.5 rounded ml-1 ${isDark ? 'bg-dark-300' : 'bg-light-300'}`}>↓</kbd>
                  {' '}Navigate
                </span>
                <span>
                  <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-dark-300' : 'bg-light-300'}`}>Enter</kbd>
                  {' '}Go to result
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
