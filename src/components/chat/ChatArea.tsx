import { useState, useCallback, KeyboardEvent, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { createMessage, createPromptResponse } from '../../utils/helpers';
import { getLLMResponse } from '../../utils/llmService';
import PromptResponseItem from './PromptResponseItem';
import PromptInput from './PromptInput';
import ChatSettings from './ChatSettings';
import type { LLMProviderConfig } from '../../types';
import type { PWAStatus } from '../../hooks/usePWA';

interface ChatAreaProps {
  quotedText?: string;
  onClearQuote?: () => void;
  onQuote?: (text: string) => void;
  templateContent?: string;
  onClearTemplate?: () => void;
  pwaStatus?: PWAStatus;
}

export default function ChatArea({ quotedText = '', onClearQuote, onQuote, templateContent = '', onClearTemplate, pwaStatus }: ChatAreaProps) {
  const { state, activeChat, dispatch } = useChat();
  const { addToast } = useToast();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const loadingRef = useRef<HTMLDivElement>(null);
  
  // Get available providers and selected provider
  const enabledProviders = state.providers.filter(p => p.isEnabled);
  const chatProvider = activeChat?.providerId ? enabledProviders.find(p => p.id === activeChat.providerId) : null;
  const defaultProvider = enabledProviders.find(p => p.isDefault) || enabledProviders[0] || null;
  const [selectedProvider, setSelectedProvider] = useState<LLMProviderConfig | null>(chatProvider || defaultProvider);

  // Update selected provider when providers change or chat changes
  useEffect(() => {
    const newChatProvider = activeChat?.providerId ? enabledProviders.find(p => p.id === activeChat.providerId) : null;
    const newDefault = enabledProviders.find(p => p.isDefault) || enabledProviders[0] || null;
    const newProvider = newChatProvider || newDefault;
    if (!selectedProvider || selectedProvider.id !== newProvider?.id) {
      setSelectedProvider(newProvider);
    }
  }, [state.providers, enabledProviders, selectedProvider, activeChat]);

  // Reset loading state when switching chats
  useEffect(() => {
    setIsLoading(false);
  }, [activeChat?.id]);

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

  // Close provider dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProviderDropdownOpen && !(event.target as Element).closest('.provider-dropdown')) {
        setIsProviderDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProviderDropdownOpen]);

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

    dispatch({
      type: 'ADD_PROMPT_RESPONSE',
      payload: { chatId: activeChat.id, promptResponse: pnr },
    });

    setInputValue('');
    setIsLoading(true);

    try {
      // Get the current provider from state to ensure it's fresh
      const currentProvider = selectedProvider?.id ? state.providers.find(p => p.id === selectedProvider.id && p.isEnabled) : null;
      const { message, processingTime } = await getLLMResponse(
        fullPrompt, // Use the full prompt with context
        undefined, // System prompt will be built from chat settings
        currentProvider || selectedProvider,
        activeChat.settings // Pass chat settings for formatting profile
      );

      const updatedPnR = {
        ...pnr,
        responses: [message],
        processingTime,
      };

      dispatch({
        type: 'UPDATE_PROMPT_RESPONSE',
        payload: { chatId: activeChat.id, promptResponse: updatedPnR },
      });
    } catch (error) {
      console.error('Failed to get response:', error);
      addToast(
        'error',
        'Failed to get response',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeChat, dispatch, isLoading, state.contextPanels, selectedProvider, state.providers, addToast]);

  const handleKeyDown = useCallback((_e: KeyboardEvent<HTMLTextAreaElement>, _content: string) => {
    // Key handling is now done in PromptInput for smart Enter behavior
    // Plain Enter adds newline (default behavior) - handled by PromptInput
  }, []);

  const isDark = state.theme === 'dark';

  if (!activeChat) {
    return (
      <div className={`chat-area flex-1 flex items-center justify-center p-4 ${isDark ? 'bg-dark-300' : 'bg-light-200'}`}>
        <div className="text-center max-w-sm">
          <h2 className={`text-xl sm:text-2xl font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{'Samvada Studio'}</h2>
          <p className={`text-sm sm:text-base ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Select a chat or create a new one to get started</p>
        </div>
      </div>
    );
  }

  // Separate pinned and unpinned PnRs
  const pinnedPnRs = activeChat.promptResponses.filter(pnr => pnr.isPinned);
  const unpinnedPnRs = activeChat.promptResponses.filter(pnr => !pnr.isPinned);

  return (
    <div className={`chat-area flex-1 flex flex-col h-full overflow-hidden ${isDark ? 'bg-dark-300' : 'bg-light-200'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-2 sm:p-3 md:p-4 border-b gap-2 flex-shrink-0 ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-1 min-w-0 overflow-hidden">
          <h2 className={`text-sm sm:text-base md:text-lg font-semibold truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{activeChat.title}</h2>
          <span className="text-xs text-gray-500 hidden sm:inline flex-shrink-0">
            {activeChat.promptResponses.length} {isMobile ? '' : 'messages'}
          </span>
          
          {/* Expand/Collapse All Buttons */}
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
            </div>
          )}
          {/* Provider Selector - Hide on mobile, simplified on tablet */}
          {enabledProviders.length > 0 && !isMobile && (
            <div 
              className="relative provider-dropdown flex-shrink-0 hidden md:block"
              onMouseEnter={() => setIsProviderDropdownOpen(true)}
              onMouseLeave={() => setIsProviderDropdownOpen(false)}
            >
              <div
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-dark-100 border-dark-300 text-gray-300 hover:bg-dark-200'
                    : 'bg-light-100 border-light-400 text-gray-700 hover:bg-light-200'
                }`}
                title="Select LLM Provider"
              >
                <span className="truncate max-w-[100px] lg:max-w-[150px]">
                  {selectedProvider ? `${selectedProvider.name}` : 'Provider'}
                </span>
                <svg
                  className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${isProviderDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {/* Dropdown Options - positioned with NO gap to prevent collapse */}
              {isProviderDropdownOpen && (
                <div 
                  className={`absolute top-full left-0 w-48 sm:w-56 md:w-64 rounded-lg border shadow-lg z-50 max-h-[60vh] overflow-y-auto ${
                    isDark ? 'bg-dark-200 border-dark-300' : 'bg-light-100 border-light-400'
                  }`}
                  style={{ marginTop: '0px' }}
                >
                  {enabledProviders.map(provider => (
                    <div
                      key={provider.id}
                      className={`px-2 sm:px-3 py-2 text-xs sm:text-sm cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        selectedProvider?.id === provider.id
                          ? isDark ? 'bg-primary-600 text-white' : 'bg-primary-500 text-white'
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
                      <div className="font-medium">{provider.name}</div>
                      <div className={`text-xs ${selectedProvider?.id === provider.id ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {provider.model}
                      </div>
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
                ? 'bg-primary-600 text-white' 
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
        <ChatSettings chat={activeChat} onClose={() => setShowSettings(false)} pwaStatus={pwaStatus} />
      )}

      {/* Messages Area - responsive padding and spacing */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4 max-w-full scroll-touch">
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
            onQuote={onQuote}
          />
        ))}

        {/* Loading Indicator - responsive */}
        {isLoading && (
          <div ref={loadingRef} className={`flex items-center gap-2 p-2 sm:p-3 md:p-4 rounded-lg ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}>
            <div className="animate-spin w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-500 border-t-transparent rounded-full flex-shrink-0" />
            <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Generating response...</span>
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
      />
    </div>
  );
}
