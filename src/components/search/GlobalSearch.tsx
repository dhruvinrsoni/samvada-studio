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
    } else if (e.key === 'Enter' && globalSearch.results.length > 0 && globalSearch.selectedResultIndex >= 0) {
      const result = globalSearch.results[globalSearch.selectedResultIndex];
      if (result) handleResultClick(result);
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-12 md:pt-20 px-2 sm:px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Search Panel - responsive width and padding */}
      <div className={`relative w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto rounded-xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-dark-200' : 'bg-white'
      }`}>
        {/* Search Input - responsive padding and font size */}
        <div className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-6 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          <svg className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={globalSearch.query}
            onChange={(e) => dispatch({ type: 'SET_GLOBAL_SEARCH_QUERY', payload: e.target.value })}
            onKeyDown={handleKeyNavigation}
            placeholder="Search chats..."
            className={`flex-1 bg-transparent outline-none text-sm sm:text-base md:text-lg min-w-0 ${
              isDark ? 'text-gray-200 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
            }`}
          />
          {globalSearch.query && (
            <button
              onClick={() => dispatch({ type: 'SET_GLOBAL_SEARCH_QUERY', payload: '' })}
              className={`p-1 rounded min-w-[28px] min-h-[28px] flex items-center justify-center ${isDark ? 'hover:bg-dark-100 text-gray-500' : 'hover:bg-light-300 text-gray-400'}`}
            >
              ✕
            </button>
          )}
          <kbd className={`hidden sm:block px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded ${isDark ? 'bg-dark-300 text-gray-500' : 'bg-light-300 text-gray-500'}`}>
            ESC
          </kbd>
        </div>

        {/* Results - responsive height and padding */}
        <div className="max-h-[60vh] sm:max-h-[65vh] md:max-h-[70vh] overflow-y-auto overflow-x-hidden scroll-touch">
          {globalSearch.isSearching ? (
            <div className={`p-6 sm:p-8 md:p-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-2 border-theme-primary border-t-transparent rounded-full mx-auto mb-2 sm:mb-3"></div>
              <span className="text-xs sm:text-sm">Searching...</span>
            </div>
          ) : globalSearch.results.length === 0 && globalSearch.query.length >= 2 ? (
            <div className={`p-6 sm:p-8 md:p-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <p className="text-sm sm:text-lg mb-1">No results found</p>
              <p className="text-xs sm:text-sm">Try a different search term</p>
            </div>
          ) : globalSearch.results.length > 0 ? (
            <div>
              <div className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-xs ${isDark ? 'text-gray-500 bg-dark-300' : 'text-gray-500 bg-light-200'}`}>
                {globalSearch.results.length} result{globalSearch.results.length !== 1 ? 's' : ''}
              </div>
              {globalSearch.results.map((result, index) => (
                <button
                  key={`${result.chatId}-${result.pnrId}-${result.messageId}`}
                  onClick={() => handleResultClick(result)}
                  className={`w-full text-left p-3 sm:p-4 md:p-6 border-b transition-colors ${
                    index === globalSearch.selectedResultIndex
                      ? 'bg-theme-primary/20'
                      : isDark 
                        ? 'border-dark-100 hover:bg-dark-300' 
                        : 'border-light-400 hover:bg-light-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${
                      result.messageType === 'prompt'
                        ? 'bg-theme-primary/20 text-theme-primary'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {result.messageType === 'prompt' ? '📤' : '📥'}<span className="hidden sm:inline"> {result.messageType === 'prompt' ? 'Prompt' : 'Response'}</span>
                    </span>
                    <span className={`text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {result.chatTitle}
                    </span>
                    <span className={`text-[10px] sm:text-xs hidden xs:inline ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {formatDate(result.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs sm:text-sm break-words ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    ...{highlightMatch(result.matchedText, globalSearch.query)}...
                  </p>
                </button>
              ))}
            </div>
          ) : globalSearch.query.length > 0 && globalSearch.query.length < 2 ? (
            <div className={`p-4 sm:p-6 md:p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <span className="text-xs sm:text-sm">Type at least 2 characters to search</span>
            </div>
          ) : (
            <div className={`p-4 sm:p-6 md:p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <p className="text-sm sm:text-lg mb-1 sm:mb-2">🔍 Global Search</p>
              <p className="text-xs sm:text-sm mb-2 sm:mb-4">Search across all your chats</p>
              <div className="hidden sm:flex justify-center gap-4 text-xs">
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
