import { useState, useCallback, KeyboardEvent, useEffect, useRef } from 'react';
import { useObservability } from '../../context/ObservabilityContext';
import { HealthService } from '../../utils/healthService';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { createMessage, createPromptResponse } from '../../utils/helpers';
import { getLLMResponse, buildSystemMessageParts } from '../../utils/llmService';
import { useMemory } from '../../context/MemoryContext';
import { buildChatHistory, truncateHistory } from '../../utils/chatHistoryBuilder';
import { getModelContextWindow } from '../../types';
import PromptResponseItem from './PromptResponseItem';
import PromptInput from './PromptInput';
import ChatSettings from './ChatSettings';
import type { LLMProviderConfig, Chat } from '../../types';
import type { PWAStatus } from '../../hooks/usePWA';

interface ChatAreaProps {
  quotedText?: string;
  onClearQuote?: () => void;
  onQuote?: (text: string) => void;
  templateContent?: string;
  onClearTemplate?: () => void;
  pwaStatus?: PWAStatus;
}

export default function ChatArea({ quotedText = '', onClearQuote, onQuote, templateContent = '', onClearTemplate }: ChatAreaProps) {
  const { state, activeChat, dispatch, isDark } = useChat();
  const { addToast } = useToast();
  const { getInjectionText, triggerExtraction, memoryState } = useMemory();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [isRenamingChat, setIsRenamingChat] = useState(false);
  const [chatTitleInput, setChatTitleInput] = useState('');
  const loadingRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevIsLoadingRef = useRef(false);
  const providerHoverCloseRef = useRef<number | null>(null);
  const providerHoverOpenRef = useRef<number | null>(null);
  const chatMenuHoverCloseRef = useRef<number | null>(null);
  const chatMenuHoverOpenRef = useRef<number | null>(null);
  
  // Get available providers and selected provider
  const enabledProviders = state.providers.filter(p => p.isEnabled);
  const chatProvider = activeChat?.providerId ? enabledProviders.find(p => p.id === activeChat.providerId) : null;
  const defaultProvider = enabledProviders.find(p => p.isDefault) || enabledProviders[0] || null;
  const [selectedProvider, setSelectedProvider] = useState<LLMProviderConfig | null>(chatProvider || defaultProvider);

  const { providerHealth } = useObservability();

  const getModelSizeForProvider = (providerId?: string) => {
    if (!providerId) return undefined;
    const h = providerHealth.find(p => p.providerId === providerId);
    return h?.modelSize;
  };

  // Update selectedProvider when activeChat or providers change
  useEffect(() => {
    const newChatProvider = activeChat?.providerId ? enabledProviders.find(p => p.id === activeChat.providerId) : null;
    const newDefaultProvider = enabledProviders.find(p => p.isDefault) || enabledProviders[0] || null;
    const newSelectedProvider = newChatProvider || newDefaultProvider;
    
    if (newSelectedProvider?.id !== selectedProvider?.id) {
      setSelectedProvider(newSelectedProvider);
    }
  }, [activeChat?.providerId, enabledProviders, selectedProvider?.id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (isProviderDropdownOpen || isChatMenuOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('.provider-dropdown') && !target.closest('.chat-menu-dropdown')) {
          setIsProviderDropdownOpen(false);
          setIsChatMenuOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isProviderDropdownOpen, isChatMenuOpen]);

  // Hover behavior: auto-open dropdowns on hover (desktop only)
  useEffect(() => {
    return () => {
      if (providerHoverCloseRef.current) window.clearTimeout(providerHoverCloseRef.current);
      if (providerHoverOpenRef.current) window.clearTimeout(providerHoverOpenRef.current);
      if (chatMenuHoverCloseRef.current) window.clearTimeout(chatMenuHoverCloseRef.current);
      if (chatMenuHoverOpenRef.current) window.clearTimeout(chatMenuHoverOpenRef.current);
    };
  }, []);

  // Reset loading state when switching chats
  useEffect(() => {
    setIsLoading(false);
  }, [activeChat?.id]);

  // Close dropdown menu when sidebar opens on mobile
  useEffect(() => {
    if (isMobile && state.isSidebarOpen) {
      setIsChatMenuOpen(false);
    }
  }, [isMobile, state.isSidebarOpen]);

  // Update input when quoted text changes
  useEffect(() => {
    if (quotedText) {
      setInputValue(prev => prev ? `${prev}\n\n${quotedText}` : quotedText);
      onClearQuote?.();
    }
  }, [quotedText, onClearQuote]);

  // Update input when template is selected
  useEffect(() => {
    if (templateContent) {
      setInputValue(prev => prev ? `${prev}\n\n${templateContent}` : templateContent);
      onClearTemplate?.();
    }
  }, [templateContent, onClearTemplate]);

  // Auto scroll to loading indicator
  useEffect(() => {
    if (isLoading && loadingRef.current) {
      loadingRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isLoading]);

  // When a chat opens, immediately jump to the bottom (no animation) for best performance
  useEffect(() => {
    if (!messagesRef.current) return;

    try {
      const el = messagesRef.current!;
      const contentHeight = el.scrollHeight;
      const viewHeight = el.clientHeight || 1;
      // Direct assignment is the fastest and avoids layout thrash from animated scrolling
      el.scrollTop = Math.max(0, contentHeight - viewHeight);
    } catch (e) {
      // ignore runtime issues
    }
  }, [activeChat?.id]);

  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTo({ top: 0, behavior });
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior });
  };

  // Auto-focus input when loading ends (response arrived, error, or cancel)
  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading) {
      setTimeout(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>('.chat-area textarea');
        textarea?.focus();
      }, 100);
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  // Close provider dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProviderDropdownOpen && !(event.target as Element).closest('.provider-dropdown')) {
        setIsProviderDropdownOpen(false);
      }
      if (isChatMenuOpen && !(event.target as Element).closest('.chat-menu-dropdown')) {
        setIsChatMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProviderDropdownOpen, isChatMenuOpen]);

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    addToast('info', 'Generation cancelled');
  }, [addToast]);

  const handleSendPrompt = useCallback(async (content: string) => {
    if (!activeChat || !content.trim() || isLoading) return;

    // Build the full prompt with active context panels
    const activeContextPanels = state.contextPanels.filter(panel => panel.isActive);
    let fullPrompt = content;

    // Prepend active context panels to the prompt
    if (activeContextPanels.length > 0) {
      const contextText = activeContextPanels
        .map(panel => `[Context: ${panel.title}]\n${panel.content}`)
        .join('\n\n');
      fullPrompt = `${contextText}\n\n---\n\nUser Prompt:\n${content}`;
    }

    const prompt = createMessage('user', content);
    const pnr = createPromptResponse(prompt);

    // Build chat history BEFORE adding the new PnR (so it only includes prior turns)
    const sendHistory = activeChat.settings.sendChatHistory ?? true;
    const provider = selectedProvider?.id
      ? state.providers.find(p => p.id === selectedProvider.id && p.isEnabled) || selectedProvider
      : selectedProvider;
    let chatHistory = sendHistory ? buildChatHistory(activeChat.promptResponses) : [];

    // Auto-truncate if context window is known
    if (chatHistory.length > 0 && provider?.model) {
      const contextWindow = getModelContextWindow(provider.model);
      if (contextWindow) {
        const systemParts = buildSystemMessageParts(undefined, activeChat.settings);
        const systemTokens = systemParts.reduce((s, p) => s + Math.ceil(p.content.length / 4), 0);
        chatHistory = truncateHistory(chatHistory, systemTokens, Math.ceil(fullPrompt.length / 4), contextWindow);
      }
    }

    dispatch({
      type: 'ADD_PROMPT_RESPONSE',
      payload: { chatId: activeChat.id, promptResponse: pnr },
    });

    setInputValue('');
    setIsLoading(true);

    // Create AbortController for cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // ── Memory injection: build a local copy of settings with memories appended ──
    let effectiveChatSettings = activeChat.settings;
    if (memoryState.settings.isEnabled) {
      const injectionText = getInjectionText();
      if (injectionText) {
        effectiveChatSettings = {
          ...activeChat.settings,
          customInstructions: activeChat.settings.customInstructions
            ? `${activeChat.settings.customInstructions}\n\n${injectionText}`
            : injectionText,
        };
      }
    }

    try {
      const { message, processingTime } = await getLLMResponse(
        fullPrompt,
        undefined,
        provider,
        effectiveChatSettings,
        chatHistory
      );

      // Check if cancelled while awaiting
      if (abortController.signal.aborted) return;

      const updatedPnR = {
        ...pnr,
        responses: [message],
        processingTime,
      };

      dispatch({
        type: 'UPDATE_PROMPT_RESPONSE',
        payload: { chatId: activeChat.id, promptResponse: updatedPnR },
      });

      // ── Memory extraction: fire-and-forget, never blocks chat ──
      // Uses raw 'content' (user's words only), not 'fullPrompt' (which may have context panels)
      triggerExtraction(content, message.content, pnr.id);
    } catch (error) {
      if (abortController.signal.aborted) return; // User cancelled — don't show error
      console.error('Failed to get response:', error);
      addToast(
        'error',
        'Failed to get response',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [activeChat, dispatch, isLoading, state.contextPanels, selectedProvider, state.providers, addToast]);

  const handleKeyDown = useCallback((_e: KeyboardEvent<HTMLTextAreaElement>, _content: string) => {
    // Key handling is now done in PromptInput for smart Enter behavior
    // Plain Enter adds newline (default behavior) - handled by PromptInput
  }, []);

  

  if (!activeChat) {
    return (
      <div className={`chat-area flex-1 flex items-center justify-center p-4 ${isDark ? 'bg-dark-300' : 'bg-light-200'}`}>
        <div className="text-center max-w-sm">
          <h2 className={`text-xl sm:text-2xl font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{'Samvada Studio'}</h2>
          {state.providers.length === 0 ? (
            <p className={`text-sm sm:text-base ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              No providers yet — add one via <strong>Settings ⚙️</strong> or use the <strong>Ollama</strong> tab to auto-discover local models.
            </p>
          ) : (
            <p className={`text-sm sm:text-base ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Select a chat or create a new one to get started</p>
          )}
        </div>
      </div>
    );
  }

  // Separate pinned and unpinned PnRs
  const pinnedPnRs = activeChat.promptResponses.filter(pnr => pnr.isPinned);
  const unpinnedPnRs = activeChat.promptResponses.filter(pnr => !pnr.isPinned);

  return (
    <div
      className={`chat-area flex-1 flex flex-col h-full overflow-hidden ${isDark ? 'bg-dark-300' : 'bg-light-200'}`}
      // Use CSS variable set by StatusBar to reserve exact overlay height; add small default padding
      style={{ paddingBottom: `calc(var(--bottom-overlay-height, 0px) + 0.5rem)` }}
    >
      {/* Dynamic padding: pb-20/pb-16 when disable warning shown (~80px/64px), minimal padding normally */}
      {/* Header */}
      <div className={`flex items-center justify-between p-2 sm:p-3 md:p-4 compact:p-1.5 border-b gap-2 compact:gap-1 flex-shrink-0 ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-1 min-w-0">
          {/* Chat Title or Rename Input */}
          {isRenamingChat ? (
            <input
              type="text"
              value={chatTitleInput}
              onChange={(e) => setChatTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatTitleInput.trim()) {
                  dispatch({ type: 'UPDATE_CHAT', payload: { ...activeChat, title: chatTitleInput.trim() } });
                  setIsRenamingChat(false);
                  addToast('success', 'Renamed', 'Chat title updated');
                } else if (e.key === 'Escape') {
                  setIsRenamingChat(false);
                }
              }}
              onBlur={() => {
                if (chatTitleInput.trim() && chatTitleInput !== activeChat.title) {
                  dispatch({ type: 'UPDATE_CHAT', payload: { ...activeChat, title: chatTitleInput.trim() } });
                  addToast('success', 'Renamed', 'Chat title updated');
                }
                setIsRenamingChat(false);
              }}
              autoFocus
              className={`text-sm sm:text-base md:text-lg font-semibold px-2 py-1 rounded border flex-1 min-w-0 ${
                isDark 
                  ? 'bg-dark-100 border-dark-300 text-gray-200' 
                  : 'bg-white border-light-400 text-gray-800'
              }`}
            />
          ) : (
            <>
              <h2 className={`text-sm sm:text-base md:text-lg font-semibold truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {activeChat.title}
              </h2>
              
              {/* Chat Actions Dropdown */}
              <div className="relative chat-menu-dropdown flex-shrink-0 z-10">
                <button
                  onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
                  onMouseEnter={() => {
                    if (isMobile) return;
                    if (chatMenuHoverCloseRef.current) window.clearTimeout(chatMenuHoverCloseRef.current);
                    chatMenuHoverOpenRef.current = window.setTimeout(() => setIsChatMenuOpen(true), 150) as unknown as number;
                  }}
                  onMouseLeave={() => {
                    if (isMobile) return;
                    if (chatMenuHoverOpenRef.current) window.clearTimeout(chatMenuHoverOpenRef.current);
                    chatMenuHoverCloseRef.current = window.setTimeout(() => setIsChatMenuOpen(false), 250) as unknown as number;
                  }}
                  className={`p-1 rounded-lg transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center ${
                    isChatMenuOpen
                      ? 'bg-theme-primary text-white'
                      : isDark
                        ? 'text-gray-400 hover:bg-dark-100 hover:text-gray-300'
                        : 'text-gray-600 hover:bg-light-300 hover:text-gray-700'
                  }`}
                  title="Chat actions"
                >
                  <svg className={`w-4 h-4 transition-transform ${isChatMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isChatMenuOpen && (
                  <div 
                    onMouseEnter={() => {
                      if (isMobile) return;
                      if (chatMenuHoverCloseRef.current) window.clearTimeout(chatMenuHoverCloseRef.current);
                    }}
                    onMouseLeave={() => {
                      if (isMobile) return;
                      chatMenuHoverCloseRef.current = window.setTimeout(() => setIsChatMenuOpen(false), 200) as unknown as number;
                    }}
                    className={`absolute top-full left-0 mt-1 w-48 sm:w-56 rounded-lg border shadow-2xl py-1 z-20 ${
                      isDark ? 'bg-dark-200 border-dark-300' : 'bg-white border-light-400'
                    }`}
                  >
                    {/* Rename */}
                    <button
                      onClick={() => {
                        setChatTitleInput(activeChat.title);
                        setIsRenamingChat(true);
                        setIsChatMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        isDark ? 'hover:bg-dark-100 text-gray-300' : 'hover:bg-light-200 text-gray-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Rename Chat
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => {
                        const newChat: Chat = { ...activeChat, id: Date.now().toString(), title: `${activeChat.title} (Copy)`, createdAt: new Date(), updatedAt: new Date() };
                        dispatch({ type: 'CREATE_CHAT', payload: newChat });
                        dispatch({ type: 'SET_ACTIVE_CHAT', payload: newChat.id });
                        setIsChatMenuOpen(false);
                        addToast('success', 'Duplicated', 'Chat copied successfully');
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        isDark ? 'hover:bg-dark-100 text-gray-300' : 'hover:bg-light-200 text-gray-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Duplicate Chat
                    </button>

                    {/* Pin/Unpin */}
                    <button
                      onClick={() => {
                        dispatch({ type: 'UPDATE_CHAT', payload: { ...activeChat, isPinned: !activeChat.isPinned } });
                        setIsChatMenuOpen(false);
                        addToast('success', activeChat.isPinned ? 'Unpinned' : 'Pinned', `Chat ${activeChat.isPinned ? 'unpinned' : 'pinned to top'}`);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        isDark ? 'hover:bg-dark-100 text-gray-300' : 'hover:bg-light-200 text-gray-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      {activeChat.isPinned ? 'Unpin Chat' : 'Pin to Top'}
                    </button>

                    {/* Archive */}
                    <button
                      onClick={() => {
                        dispatch({ type: 'ARCHIVE_CHAT', payload: activeChat.id });
                        setIsChatMenuOpen(false);
                        addToast('success', 'Archived', 'Chat moved to archive');
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        isDark ? 'hover:bg-dark-100 text-gray-300' : 'hover:bg-light-200 text-gray-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Archive Chat
                    </button>

                    {/* Export */}
                    <button
                      onClick={() => {
                        dispatch({ type: 'TOGGLE_EXPORT_MODAL' });
                        setIsChatMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        isDark ? 'hover:bg-dark-100 text-gray-300' : 'hover:bg-light-200 text-gray-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Chat
                    </button>

                    {/* Change Provider - Mobile Only */}
                    {isMobile && enabledProviders.length > 1 && (
                      <button
                        onClick={() => {
                          setIsChatMenuOpen(false);
                          // Open provider selection modal/submenu
                          setTimeout(() => setIsProviderDropdownOpen(true), 100);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                          isDark ? 'hover:bg-dark-100 text-purple-400' : 'hover:bg-light-200 text-purple-600'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Change Provider ({selectedProvider?.name || 'None'})
                      </button>
                    )}

                    {/* Divider */}
                    <div className={`my-1 h-px ${isDark ? 'bg-dark-100' : 'bg-light-300'}`} />

                    {/* Share (Future Feature) */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/?chat=${activeChat.id}`);
                        setIsChatMenuOpen(false);
                        addToast('success', 'Link Copied', 'Share link copied to clipboard');
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        isDark ? 'hover:bg-dark-100 text-blue-400' : 'hover:bg-light-200 text-blue-600'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Copy Share Link
                    </button>

                    {/* Divider */}
                    <div className={`my-1 h-px ${isDark ? 'bg-dark-100' : 'bg-light-300'}`} />

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${activeChat.title}"?\n\nThis will permanently delete this chat and all its messages.`)) {
                          dispatch({ type: 'DELETE_CHAT', payload: activeChat.id });
                          setIsChatMenuOpen(false);
                          addToast('success', 'Deleted', 'Chat deleted successfully');
                        }
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Chat
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          
          <span className="text-xs text-gray-500 hidden sm:inline flex-shrink-0">
            {activeChat.promptResponses.length} {isMobile ? '' : 'messages'}
          </span>
          
              {/* Expand/Collapse All Buttons + Scroll Controls */}
              {activeChat.promptResponses.length > 0 && (
                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              <button
                onClick={() => dispatch({ type: 'EXPAND_ALL', payload: { chatId: activeChat.id } })}
                className={`p-1 sm:px-2 sm:py-1 text-xs rounded transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center ${
                  isDark
                    ? 'bg-dark-100 text-gray-400 hover:bg-dark-50 hover:text-gray-300'
                    : 'bg-light-300 text-gray-600 hover:bg-light-400 hover:text-gray-700'
                }`}
                title="Expand all messages"
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              <button
                onClick={() => dispatch({ type: 'COLLAPSE_ALL', payload: { chatId: activeChat.id } })}
                className={`p-1 sm:px-2 sm:py-1 text-xs rounded transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center ${
                  isDark
                    ? 'bg-dark-100 text-gray-400 hover:bg-dark-50 hover:text-gray-300'
                    : 'bg-light-300 text-gray-600 hover:bg-light-400 hover:text-gray-700'
                }`}
                title="Collapse all messages"
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              </button>
                  {/* Scroll to top */}
                  <button
                    onClick={() => scrollToTop()}
                    className={`p-1 sm:px-2 sm:py-1 text-xs rounded transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center ${
                      isDark
                        ? 'bg-dark-100 text-gray-400 hover:bg-dark-50 hover:text-gray-300'
                        : 'bg-light-300 text-gray-600 hover:bg-light-400 hover:text-gray-700'
                    }`}
                    title="Go to top"
                  >
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  {/* Scroll to bottom */}
                  <button
                    onClick={() => scrollToBottom()}
                    className={`p-1 sm:px-2 sm:py-1 text-xs rounded transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center ${
                      isDark
                        ? 'bg-dark-100 text-gray-400 hover:bg-dark-50 hover:text-gray-300'
                        : 'bg-light-300 text-gray-600 hover:bg-light-400 hover:text-gray-700'
                    }`}
                    title="Go to bottom"
                  >
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
            </div>
          )}
          {/* Provider Selector - Mobile-friendly */}
            {enabledProviders.length > 0 && (
            <div className="relative provider-dropdown flex-shrink-0">
              <button
                onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
                onMouseEnter={() => {
                  if (isMobile) return;
                  if (providerHoverCloseRef.current) window.clearTimeout(providerHoverCloseRef.current);
                  providerHoverOpenRef.current = window.setTimeout(() => setIsProviderDropdownOpen(true), 120) as unknown as number;
                }}
                onMouseLeave={() => {
                  if (isMobile) return;
                  if (providerHoverOpenRef.current) window.clearTimeout(providerHoverOpenRef.current);
                  providerHoverCloseRef.current = window.setTimeout(() => setIsProviderDropdownOpen(false), 220) as unknown as number;
                }}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm border transition-colors ${
                  isDark
                    ? 'bg-dark-100 border-dark-300 text-gray-300 hover:bg-dark-200'
                    : 'bg-light-100 border-light-400 text-gray-700 hover:bg-light-200'
                } ${isMobile ? 'block' : 'hidden md:flex'}`}
                title="Select LLM Provider"
              >
                <span className="truncate max-w-[80px] sm:max-w-[100px] lg:max-w-[150px]">
                  {selectedProvider ? (
                    selectedProvider.type === 'ollama' ? `${selectedProvider.model} (${selectedProvider.name})` : selectedProvider.name
                  ) : 'Provider'}
                </span>
                <svg
                  className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${isProviderDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Options - Mobile responsive */}
              {isProviderDropdownOpen && (
                <div 
                  onMouseEnter={() => {
                    if (isMobile) return;
                    if (providerHoverCloseRef.current) window.clearTimeout(providerHoverCloseRef.current);
                  }}
                  onMouseLeave={() => {
                    if (isMobile) return;
                    providerHoverCloseRef.current = window.setTimeout(() => setIsProviderDropdownOpen(false), 200) as unknown as number;
                  }}
                  className={`absolute ${isMobile ? 'top-full right-0' : 'top-full left-0'} mt-1 w-48 sm:w-56 md:w-64 rounded-lg border shadow-lg z-50 max-h-[60vh] overflow-y-auto ${
                    isDark ? 'bg-dark-200 border-dark-300' : 'bg-light-100 border-light-400'
                  }`}
                >
                  {enabledProviders.map(provider => (
                    <div
                      key={provider.id}
                      className={`px-2 sm:px-3 py-2 text-xs sm:text-sm cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        selectedProvider?.id === provider.id
                          ? 'bg-theme-primary text-white'
                          : isDark ? 'text-gray-300 hover:bg-dark-100' : 'text-gray-700 hover:bg-light-200'
                      }`}
                      onClick={() => {
                        setSelectedProvider(provider);
                        if (activeChat) {
                          dispatch({
                            type: 'UPDATE_CHAT',
                            payload: { ...activeChat, providerId: provider.id },
                          });
                        }
                        setIsProviderDropdownOpen(false);
                      }}
                    >
                      {provider.type === 'ollama' ? (
                        <div>
                          <div className="font-medium">{provider.model}</div>
                          <div className={`text-xs ${selectedProvider?.id === provider.id ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {provider.name}
                            {getModelSizeForProvider(provider.id) ? (
                              <span className="ml-1 opacity-70"> • {HealthService.formatBytes(getModelSizeForProvider(provider.id)!)}</span>
                            ) : (
                              <span className="ml-1 opacity-50"> • size unknown</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{provider.name}</div>
                          <div className={`text-xs ${selectedProvider?.id === provider.id ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {provider.model}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Settings button - responsive sizing */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center ${
              showSettings 
                ? 'bg-theme-primary text-white' 
                : isDark 
                  ? 'bg-dark-100 text-gray-400 hover:bg-dark-200'
                  : 'bg-light-300 text-gray-600 hover:bg-light-400'
            }`}
            title={`Chat Settings - ${showSettings ? 'Click to close' : 'Configure role, instructions, and examples'}`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <ChatSettings chat={activeChat} onClose={() => setShowSettings(false)} />
      )}

      {/* Messages Area - responsive padding and spacing */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-4 compact:p-1.5 space-y-2 sm:space-y-3 md:space-y-4 compact:space-y-1 max-w-full scroll-touch">
        {/* Pinned Messages */}
        {pinnedPnRs.length > 0 && (
          <div className="mb-2 sm:mb-4">
            <h3 className="text-[10px] sm:text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-1.5 sm:mb-2 flex items-center gap-1">
              <span>📌</span> <span className="hidden xs:inline">Pinned</span>
            </h3>
            {pinnedPnRs.map(pnr => (
              <PromptResponseItem
                key={pnr.id}
                chatId={activeChat.id}
                promptResponse={pnr}
                pnrIndex={activeChat.promptResponses.indexOf(pnr)}
                onQuote={onQuote}
              />
            ))}
          </div>
        )}

        {/* Regular Messages */}
        {unpinnedPnRs.map(pnr => (
          <PromptResponseItem
            key={pnr.id}
            chatId={activeChat.id}
            promptResponse={pnr}
            pnrIndex={activeChat.promptResponses.indexOf(pnr)}
            onQuote={onQuote}
          />
        ))}

        {/* Loading Indicator with Cancel */}
        {isLoading && (
          <div ref={loadingRef} className={`flex items-center gap-2 compact:gap-1 p-2 sm:p-3 md:p-4 compact:p-1.5 rounded-lg ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}>
            <div className="animate-spin w-4 h-4 sm:w-5 sm:h-5 border-2 border-theme-primary border-t-transparent rounded-full flex-shrink-0" />
            <span className={`text-xs sm:text-sm flex-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Generating response...</span>
            <button
              onClick={handleCancelGeneration}
              className={`px-2 py-1 text-[10px] sm:text-xs rounded transition-colors flex-shrink-0 ${
                isDark ? 'text-gray-400 hover:text-white hover:bg-dark-300' : 'text-gray-500 hover:text-gray-900 hover:bg-light-400'
              }`}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <PromptInput
        onSend={handleSendPrompt}
        onKeyDown={handleKeyDown}
        disabled={isLoading || !selectedProvider}
        value={inputValue}
        onChange={setInputValue}
        hasProvider={!!selectedProvider}
        providerId={selectedProvider?.id}
      />
    </div>
  );
}
