import { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { searchInChat } from '../../utils/helpers';
import { useIsMobile } from '../../hooks/useMediaQuery';
import ChatListItem from './ChatListItem';
import { useObservability } from '../../context/ObservabilityContext';
import { HealthService } from '../../utils/healthService';
import FoldersSection from './FoldersSection';
import SearchBar from '../common/SearchBar';

interface SidebarProps {
  showArchived?: boolean;
}

export default function Sidebar({ showArchived = false }: SidebarProps) {
  const { state, dispatch, createChat } = useChat();
  const [localShowArchived, setLocalShowArchived] = useState(showArchived);
  const [isNewChatDropdownOpen, setIsNewChatDropdownOpen] = useState(false);
  const isMobile = useIsMobile();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('samvada-sidebar-collapsed');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('samvada-sidebar-collapsed', JSON.stringify(next));
      return next;
    });
  };

  // Get current theme mode
  const { isDark } = useChat();

  // Check if there are any enabled providers
  const hasEnabledProviders = state.providers.some(p => p.isEnabled);

  const filteredChats = state.chats.filter(chat => {
    const matchesArchive = localShowArchived ? chat.isArchived : !chat.isArchived;
    const matchesSearch = state.searchQuery
      ? searchInChat(chat, state.searchQuery)
      : true;
    return matchesArchive && matchesSearch;
  });

  const pinnedChats = filteredChats.filter(chat => chat.isPinned);
  const unpinnedChats = filteredChats.filter(chat => !chat.isPinned);
  const { providerHealth } = useObservability();

  const findModelSize = (providerId: string) => {
    const h = providerHealth.find(p => p.providerId === providerId);
    return h?.modelSize;
  };

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

  // Close sidebar on mobile when a chat is selected
  useEffect(() => {
    if (isMobile && state.activeChat) {
      dispatch({ type: 'SET_SIDEBAR_OPEN', payload: false });
    }
  }, [state.activeChat, isMobile, dispatch]);

  // Handle backdrop click on mobile
  const handleBackdropClick = () => {
    if (isMobile && state.isSidebarOpen) {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }
  };

  const isDesktopCollapsed = !isMobile && !state.isSidebarOpen;

  // Hover-expand flyout triggered by hamburger or collapsed icon strip.
  // All three zones (hamburger, strip, flyout) form one logical hover group.
  // Entering any zone cancels pending close; leaving all zones closes after a grace period.
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const collapsedStripRef = useRef<HTMLElement>(null);
  const isSidebarOpenRef = useRef(state.isSidebarOpen);
  isSidebarOpenRef.current = state.isSidebarOpen;

  const OPEN_DELAY = 250;
  const CLOSE_DELAY = 300;

  const cancelOpen = useCallback(() => { if (openTimerRef.current) { clearTimeout(openTimerRef.current); openTimerRef.current = null; } }, []);
  const cancelClose = useCallback(() => { if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; } }, []);

  const scheduleOpen = useCallback(() => {
    if (isSidebarOpenRef.current) return;
    cancelClose();
    if (!openTimerRef.current) {
      openTimerRef.current = setTimeout(() => { openTimerRef.current = null; setHoverExpanded(true); }, OPEN_DELAY);
    }
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelOpen();
    if (!closeTimerRef.current) {
      closeTimerRef.current = setTimeout(() => { closeTimerRef.current = null; setHoverExpanded(false); }, CLOSE_DELAY);
    }
  }, [cancelOpen]);

  const closeFlyout = useCallback(() => {
    cancelOpen();
    cancelClose();
    setHoverExpanded(false);
  }, [cancelOpen, cancelClose]);

  // Attach hover listeners to hamburger + collapsed strip
  useEffect(() => {
    if (isMobile || !isDesktopCollapsed) return;
    const hamburger = document.querySelector('[data-sidebar-hamburger]');
    const targets = [hamburger, collapsedStripRef.current].filter(Boolean) as Element[];
    if (targets.length === 0) return;

    const onEnter = () => scheduleOpen();
    const onLeave = () => scheduleClose();

    targets.forEach(el => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });
    return () => {
      targets.forEach(el => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
      cancelOpen();
      cancelClose();
    };
  }, [isMobile, isDesktopCollapsed, hoverExpanded, scheduleOpen, scheduleClose, cancelOpen, cancelClose]);

  // Close flyout on outside click (ignore hamburger + strip + flyout)
  useEffect(() => {
    if (!hoverExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      const hamburger = document.querySelector('[data-sidebar-hamburger]');
      if (hamburger?.contains(t)) return;
      if (collapsedStripRef.current?.contains(t)) return;
      if (flyoutRef.current?.contains(t)) return;
      closeFlyout();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hoverExpanded, closeFlyout]);

  // Close flyout when user selects a chat
  const prevActiveChatRef = useRef(state.activeChat);
  useEffect(() => {
    if (prevActiveChatRef.current !== state.activeChat) {
      prevActiveChatRef.current = state.activeChat;
      if (hoverExpanded) closeFlyout();
    }
  }, [state.activeChat, hoverExpanded, closeFlyout]);

  // Close flyout when sidebar gets pinned open
  useEffect(() => {
    if (state.isSidebarOpen && hoverExpanded) closeFlyout();
  }, [state.isSidebarOpen, hoverExpanded, closeFlyout]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobile && state.isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={handleBackdropClick}
        />
      )}

      {/* Collapsed Desktop Sidebar: slim icon strip (hidden when flyout is open) */}
      {isDesktopCollapsed && !hoverExpanded && (
        <aside
          ref={collapsedStripRef}
          className={`flex flex-col items-center py-3 gap-3 border-r flex-shrink-0 w-12 h-full ${
            isDark ? 'bg-dark-200 border-dark-100' : 'bg-light-100 border-light-400'
          }`}
        >
          <button
            onClick={() => createChat()}
            disabled={!hasEnabledProviders}
            className={`p-2 rounded-lg transition-colors ${
              hasEnabledProviders
                ? 'bg-theme-primary text-white hover:bg-theme-primary-hover'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
            title="New Chat (Ctrl+N)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <button
            onClick={() => dispatch({ type: 'TOGGLE_STARRED_MODAL' })}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'text-gray-400 hover:bg-dark-100 hover:text-gray-200' : 'text-gray-500 hover:bg-light-300 hover:text-gray-700'
            }`}
            title="Starred Messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* Bottom expand button */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'text-gray-400 hover:bg-dark-100 hover:text-gray-200' : 'text-gray-500 hover:bg-light-300 hover:text-gray-700'
            }`}
            title="Expand sidebar (Ctrl+B)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
            </svg>
          </button>
        </aside>
      )}

      {/* Hover-expand flyout (triggered by hamburger hover, sits below the top bar) */}
      {isDesktopCollapsed && hoverExpanded && (
        <div
          ref={flyoutRef}
          style={{ top: document.querySelector('[data-sidebar-hamburger]')?.closest('.border-b')?.getBoundingClientRect().bottom ?? 0 }}
          className={`fixed left-0 bottom-0 w-72 z-50 border-r shadow-xl flex flex-col overflow-hidden ${
            isDark ? 'bg-dark-200 border-dark-100' : 'bg-light-100 border-light-400'
          }`}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <FlyoutContent
            state={state} dispatch={dispatch} createChat={createChat}
            isDark={isDark} hasEnabledProviders={hasEnabledProviders}
            pinnedChats={pinnedChats} unpinnedChats={unpinnedChats}
            filteredChats={filteredChats} collapsedSections={collapsedSections}
            toggleSection={toggleSection} localShowArchived={localShowArchived}
            setLocalShowArchived={setLocalShowArchived} folders={state.folders}
          />
        </div>
      )}

      {/* Sidebar (full expanded) */}
      <aside 
        className={`
          sidebar border-r flex flex-col h-full overflow-hidden
          ${isMobile ? 'fixed top-0 left-0 bottom-0 z-40 w-[85vw] max-w-[320px]' : 'w-64 lg:w-72'}
          ${isMobile && !state.isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          ${isDesktopCollapsed ? 'hidden' : ''}
          transition-transform duration-300 ease-in-out
          ${isDark ? 'bg-dark-200 border-dark-100' : 'bg-light-100 border-light-400'}
        `}
      >
      {/* Header */}
      <div className={`p-2 sm:p-3 border-b flex-shrink-0 ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <div className="relative">
          <div className="flex items-stretch">
            <button
              onClick={() => createChat()}
              disabled={!hasEnabledProviders}
              className={`py-2 px-2 sm:px-3 text-white rounded-l-lg transition-colors flex items-center text-xs sm:text-sm flex-1 min-h-[44px] ${
                hasEnabledProviders
                  ? 'bg-theme-primary hover:bg-theme-primary-hover'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              title={hasEnabledProviders ? "Create new chat (Ctrl+N)" : "No enabled providers available"}
            >
              <span className="flex items-center gap-1 sm:gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="truncate">New Chat</span>
              </span>
            </button>
            <button
              onClick={() => setIsNewChatDropdownOpen(!isNewChatDropdownOpen)}
              onMouseEnter={() => setIsNewChatDropdownOpen(true)}
              disabled={!hasEnabledProviders}
              className={`py-2 px-2 rounded-r-lg transition-colors border-l border-white/20 flex items-center justify-center min-h-[44px] min-w-[36px] ${
                hasEnabledProviders
                  ? 'bg-theme-primary hover:bg-theme-primary-hover text-white'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
              title={hasEnabledProviders ? "More new chat options" : "No enabled providers available"}
            >
              <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${isNewChatDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {isNewChatDropdownOpen && (
            <div 
              className={`absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-50 max-h-[60vh] overflow-y-auto ${
                isDark ? 'bg-dark-200 border-dark-100' : 'bg-light-100 border-light-400'
              }`}
              onMouseEnter={() => setIsNewChatDropdownOpen(true)}
              onMouseLeave={() => setIsNewChatDropdownOpen(false)}
            >
              {hasEnabledProviders ? (
                <>
                  <button
                    onClick={() => {
                      createChat();
                      setIsNewChatDropdownOpen(false);
                    }}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-2 text-left hover:bg-theme-primary hover:text-white transition-colors rounded-t-lg text-sm ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="truncate">New Chat (Default)</span>
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
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-2 text-left hover:bg-theme-primary hover:text-white transition-colors text-sm ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      } ${provider.id === state.providers.find(p => p.isDefault)?.id ? 'border-l-4 border-theme-primary' : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">
                          {provider.type === 'ollama' ? (
                            <>
                              {provider.model} <span className="opacity-75">({provider.name})</span>
                              {findModelSize(provider.id) ? (
                                <span className="ml-2 text-xs opacity-60">• {HealthService.formatBytes(findModelSize(provider.id)!)}</span>
                              ) : null}
                            </>
                          ) : (
                            <>{provider.name} <span className="opacity-60">({provider.model})</span></>
                          )}
                        </span>
                        {provider.isDefault && <span className="text-xs text-theme-secondary flex-shrink-0">(Default)</span>}
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-3 text-center text-sm text-gray-500">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="font-medium">No Providers Available</p>
                  <p className="text-xs mt-1">Please add and enable a provider in Admin Settings</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Search */}
      <div className={`px-2 sm:px-3 py-2 border-b flex-shrink-0 ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <SearchBar
          value={state.searchQuery}
          onChange={(value) => dispatch({ type: 'SET_SEARCH_QUERY', payload: value })}
          placeholder="Search chats..."
        />
      </div>

      {/* Starred Messages Button */}
      <div className={`p-2 sm:p-3 border-b flex-shrink-0 ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_STARRED_MODAL' })}
          className={`w-full py-2 px-3 sm:px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm min-h-[44px] ${
            isDark
              ? 'bg-dark-100 text-gray-400 hover:bg-dark-200 hover:text-gray-300'
              : 'bg-light-300 text-gray-600 hover:bg-light-400 hover:text-gray-700'
          }`}
          title="View Starred Messages"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="truncate">Starred Messages</span>
        </button>
      </div>

      {/* Archive Toggle */}
      <div className="px-2 sm:px-3 pb-2 flex-shrink-0">
        <button
          onClick={() => setLocalShowArchived(!localShowArchived)}
          className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full transition-colors ${
            localShowArchived
              ? 'bg-theme-primary text-white'
              : isDark
                ? 'bg-dark-100 text-gray-400 hover:bg-dark-300'
                : 'bg-light-300 text-gray-600 hover:bg-light-400'
          }`}
          title={localShowArchived ? 'Click to show active chats' : 'View archived chats'}
        >
          {localShowArchived ? 'Showing Archived' : 'Show Archived'}
        </button>
      </div>

      {/* Bulk Actions */}
      {state.selectedChatIds.length > 0 && (
        <div className={`px-2 sm:px-3 py-2 flex items-center justify-between text-xs sm:text-sm flex-shrink-0 ${
          isDark ? 'bg-dark-300' : 'bg-light-300'
        }`}>
          <span className={`truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{state.selectedChatIds.length} selected</span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleArchiveSelected}
              className="text-yellow-500 hover:text-yellow-400 p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Archive selected"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
            <button
              onClick={handleDeleteSelected}
              className="text-red-500 hover:text-red-400 p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Delete selected"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={handleClearSelection}
              className={`p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'}`}
              title="Clear selection"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Select All */}
      {filteredChats.length > 0 && (
        <div className="px-2 sm:px-3 py-1 flex-shrink-0">
          <button
            onClick={state.selectedChatIds.length === filteredChats.length ? handleClearSelection : handleSelectAll}
            className={`text-xs ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {state.selectedChatIds.length === filteredChats.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-touch">
        {pinnedChats.length > 0 && (
          <div className="px-2 sm:px-3 py-2">
            <button
              onClick={() => toggleSection('pinned')}
              className={`flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider mb-1 group ${
                isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <svg className={`w-3 h-3 transition-transform ${collapsedSections['pinned'] ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Pinned
              </span>
              <span className="text-[10px] font-normal opacity-70">{pinnedChats.length}</span>
            </button>
            {!collapsedSections['pinned'] && pinnedChats.map(chat => (
              <ChatListItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}

        {/* Folders Section */}
        {state.folders.length > 0 && (
          <div className="px-2 sm:px-3 py-1">
            <button
              onClick={() => toggleSection('folders')}
              className={`flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider mb-1 group ${
                isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <svg className={`w-3 h-3 transition-transform ${collapsedSections['folders'] ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Folders
              </span>
              <span className="text-[10px] font-normal opacity-70">{state.folders.length}</span>
            </button>
            {!collapsedSections['folders'] && (
              <FoldersSection
                renderChatItem={(chat) => <ChatListItem key={chat.id} chat={chat} />}
              />
            )}
          </div>
        )}

        <div className="px-2 sm:px-3 py-2">
          {(pinnedChats.length > 0 || state.folders.length > 0) && unpinnedChats.length > 0 && (
            <button
              onClick={() => toggleSection('recent')}
              className={`flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider mb-1 group ${
                isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <svg className={`w-3 h-3 transition-transform ${collapsedSections['recent'] ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Recent
              </span>
              <span className="text-[10px] font-normal opacity-70">{unpinnedChats.filter(c => !c.folderId).length}</span>
            </button>
          )}
          {!collapsedSections['recent'] && unpinnedChats.filter(c => !c.folderId).map(chat => (
            <ChatListItem key={chat.id} chat={chat} />
          ))}
        </div>

        {filteredChats.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            {state.searchQuery ? 'No chats found' : 'No chats yet'}
          </div>
        )}
      </div>

      {/* Bottom collapse button (Jira/Confluence style) -- desktop only */}
      {!isMobile && (
        <div className={`p-2 border-t flex-shrink-0 ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
              isDark
                ? 'text-gray-500 hover:bg-dark-100 hover:text-gray-300'
                : 'text-gray-400 hover:bg-light-300 hover:text-gray-600'
            }`}
            title="Collapse sidebar (Ctrl+B)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
            </svg>
            <span>Collapse</span>
          </button>
        </div>
      )}
    </aside>
    </>
  );
}

// Flyout content rendered inside the hover-expand overlay (reuses same structure as expanded sidebar chat list)
function FlyoutContent({
  state, dispatch, createChat, isDark, hasEnabledProviders,
  pinnedChats, unpinnedChats, filteredChats,
  collapsedSections, toggleSection,
  localShowArchived, setLocalShowArchived, folders,
}: any) {
  return (
    <>
      {/* Header */}
      <div className={`p-2 border-b flex-shrink-0 ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <button
          onClick={() => createChat()}
          disabled={!hasEnabledProviders}
          className={`w-full py-2 px-3 text-white rounded-lg transition-colors flex items-center text-sm min-h-[40px] ${
            hasEnabledProviders
              ? 'bg-theme-primary hover:bg-theme-primary-hover'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="truncate">New Chat</span>
          </span>
        </button>
      </div>

      {/* Search */}
      <div className={`px-2 py-2 border-b flex-shrink-0 ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <SearchBar
          value={state.searchQuery}
          onChange={(value: string) => dispatch({ type: 'SET_SEARCH_QUERY', payload: value })}
          placeholder="Search chats..."
        />
      </div>

      {/* Archive Toggle */}
      <div className="px-2 pb-1 pt-2 flex-shrink-0">
        <button
          onClick={() => setLocalShowArchived(!localShowArchived)}
          className={`text-xs px-2 py-1 rounded-full transition-colors ${
            localShowArchived
              ? 'bg-theme-primary text-white'
              : isDark
                ? 'bg-dark-100 text-gray-400 hover:bg-dark-300'
                : 'bg-light-300 text-gray-600 hover:bg-light-400'
          }`}
        >
          {localShowArchived ? 'Showing Archived' : 'Show Archived'}
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-touch">
        {pinnedChats.length > 0 && (
          <div className="px-2 py-2">
            <button
              onClick={() => toggleSection('pinned')}
              className={`flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider mb-1 ${
                isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <svg className={`w-3 h-3 transition-transform ${collapsedSections['pinned'] ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Pinned
              </span>
              <span className="text-[10px] font-normal opacity-70">{pinnedChats.length}</span>
            </button>
            {!collapsedSections['pinned'] && pinnedChats.map((chat: any) => (
              <ChatListItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}

        {folders.length > 0 && (
          <div className="px-2 py-1">
            <button
              onClick={() => toggleSection('folders')}
              className={`flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider mb-1 ${
                isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <svg className={`w-3 h-3 transition-transform ${collapsedSections['folders'] ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Folders
              </span>
              <span className="text-[10px] font-normal opacity-70">{folders.length}</span>
            </button>
            {!collapsedSections['folders'] && (
              <FoldersSection
                renderChatItem={(chat: any) => <ChatListItem key={chat.id} chat={chat} />}
              />
            )}
          </div>
        )}

        <div className="px-2 py-2">
          {(pinnedChats.length > 0 || folders.length > 0) && unpinnedChats.length > 0 && (
            <button
              onClick={() => toggleSection('recent')}
              className={`flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider mb-1 ${
                isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <svg className={`w-3 h-3 transition-transform ${collapsedSections['recent'] ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Recent
              </span>
              <span className="text-[10px] font-normal opacity-70">{unpinnedChats.filter((c: any) => !c.folderId).length}</span>
            </button>
          )}
          {!collapsedSections['recent'] && unpinnedChats.filter((c: any) => !c.folderId).map((chat: any) => (
            <ChatListItem key={chat.id} chat={chat} />
          ))}
        </div>

        {filteredChats.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            {state.searchQuery ? 'No chats found' : 'No chats yet'}
          </div>
        )}
      </div>
    </>
  );
}
