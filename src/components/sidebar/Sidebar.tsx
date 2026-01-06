import { useState, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import { searchInChat } from '../../utils/helpers';
import ChatListItem from './ChatListItem';
import FoldersSection from './FoldersSection';
import SearchBar from '../common/SearchBar';

interface SidebarProps {
  showArchived?: boolean;
}

export default function Sidebar({ showArchived = false }: SidebarProps) {
  const { state, dispatch, createChat } = useChat();
  const [localShowArchived, setLocalShowArchived] = useState(showArchived);
  const [isNewChatDropdownOpen, setIsNewChatDropdownOpen] = useState(false);

  // Get current theme mode
  const isDark = state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const filteredChats = state.chats.filter(chat => {
    const matchesArchive = localShowArchived ? chat.isArchived : !chat.isArchived;
    const matchesSearch = state.searchQuery
      ? searchInChat(chat, state.searchQuery)
      : true;
    return matchesArchive && matchesSearch;
  });

  const pinnedChats = filteredChats.filter(chat => chat.isPinned);
  const unpinnedChats = filteredChats.filter(chat => !chat.isPinned);

  const handleDeleteSelected = useCallback(() => {
    if (state.selectedChatIds.length > 0) {
      dispatch({ type: 'DELETE_CHATS', payload: state.selectedChatIds });
    }
  }, [dispatch, state.selectedChatIds]);

  const handleArchiveSelected = useCallback(() => {
    if (state.selectedChatIds.length > 0) {
      dispatch({ type: 'ARCHIVE_CHATS', payload: state.selectedChatIds });
    }
  }, [dispatch, state.selectedChatIds]);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredChats.map(chat => chat.id);
    dispatch({ type: 'SELECT_ALL_CHATS', payload: allIds });
  }, [dispatch, filteredChats]);

  const handleClearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, [dispatch]);

  return (
    <aside className={`sidebar w-72 border-r flex flex-col h-full ${
      isDark 
        ? 'bg-dark-200 border-dark-100' 
        : 'bg-light-100 border-light-400'
    }`}>
      {/* Header */}
      <div className={`p-3 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <div className="relative">
          <div className="flex items-stretch">
            <button
              onClick={() => createChat()}
              className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-l-lg transition-colors flex items-center text-sm flex-1"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </span>
            </button>
            <button
              onClick={() => setIsNewChatDropdownOpen(!isNewChatDropdownOpen)}
              onMouseEnter={() => setIsNewChatDropdownOpen(true)}
              className="py-2 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg transition-colors border-l border-white/20 flex items-center justify-center"
            >
              <svg className={`w-4 h-4 transition-transform ${isNewChatDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {isNewChatDropdownOpen && (
            <div 
              className={`absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-50 ${
                isDark ? 'bg-dark-200 border-dark-100' : 'bg-light-100 border-light-400'
              }`}
              onMouseEnter={() => setIsNewChatDropdownOpen(true)}
              onMouseLeave={() => setIsNewChatDropdownOpen(false)}
            >
              <button
                onClick={() => {
                  createChat();
                  setIsNewChatDropdownOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-blue-500 hover:text-white transition-colors rounded-t-lg ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  New Chat (Default)
                </span>
              </button>
              
              {/* Provider Options */}
              {state.providers.filter(p => p.isEnabled).map(provider => (
                <button
                  key={provider.id}
                  onClick={() => {
                    createChat(undefined, provider);
                    setIsNewChatDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-blue-500 hover:text-white transition-colors ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  } ${provider.id === state.providers.find(p => p.isDefault)?.id ? 'border-l-4 border-blue-500' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {provider.name} ({provider.model})
                    {provider.isDefault && <span className="text-xs text-theme-secondary">(Default)</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Search */}
      <div className={`px-3 py-2 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <SearchBar
          value={state.searchQuery}
          onChange={(value) => dispatch({ type: 'SET_SEARCH_QUERY', payload: value })}
          placeholder="Search chats..."
        />
      </div>

      {/* Starred Messages Button */}
      <div className={`p-3 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_STARRED_MODAL' })}
          className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            isDark
              ? 'bg-dark-100 text-gray-400 hover:bg-dark-200 hover:text-gray-300'
              : 'bg-light-300 text-gray-600 hover:bg-light-400 hover:text-gray-700'
          }`}
          title="View Starred Messages"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Starred Messages
        </button>
      </div>

      {/* Archive Toggle */}
      <div className="px-3 pb-2">
        <button
          onClick={() => setLocalShowArchived(!localShowArchived)}
          className={`text-sm px-3 py-1 rounded-full transition-colors ${
            localShowArchived
              ? 'bg-blue-500 text-white'
              : state.theme === 'dark'
                ? 'bg-dark-100 text-gray-400 hover:bg-dark-300'
                : 'bg-light-300 text-gray-600 hover:bg-light-400'
          }`}
        >
          {localShowArchived ? 'Showing Archived' : 'Show Archived'}
        </button>
      </div>

      {/* Bulk Actions */}
      {state.selectedChatIds.length > 0 && (
        <div className={`px-3 py-2 flex items-center justify-between text-sm ${
          isDark ? 'bg-dark-300' : 'bg-light-300'
        }`}>
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{state.selectedChatIds.length} selected</span>
          <div className="flex gap-2">
            <button
              onClick={handleArchiveSelected}
              className="text-yellow-500 hover:text-yellow-400"
              title="Archive selected"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
            <button
              onClick={handleDeleteSelected}
              className="text-red-500 hover:text-red-400"
              title="Delete selected"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={handleClearSelection}
              className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'}
              title="Clear selection"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Select All */}
      {filteredChats.length > 0 && (
        <div className="px-3 py-1">
          <button
            onClick={state.selectedChatIds.length === filteredChats.length ? handleClearSelection : handleSelectAll}
            className={`text-xs ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {state.selectedChatIds.length === filteredChats.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {pinnedChats.length > 0 && (
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              📌 Pinned
            </h3>
            {pinnedChats.map(chat => (
              <ChatListItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}

        {/* Folders Section */}
        {state.folders.length > 0 && (
          <FoldersSection
            renderChatItem={(chat) => <ChatListItem key={chat.id} chat={chat} />}
          />
        )}

        <div className="px-3 py-2">
          {(pinnedChats.length > 0 || state.folders.length > 0) && unpinnedChats.length > 0 && (
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Recent
            </h3>
          )}
          {unpinnedChats.filter(c => !c.folderId).map(chat => (
            <ChatListItem key={chat.id} chat={chat} />
          ))}
        </div>

        {filteredChats.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            {state.searchQuery ? 'No chats found' : 'No chats yet'}
          </div>
        )}
      </div>
    </aside>
  );
}
