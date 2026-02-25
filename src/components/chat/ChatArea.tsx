import { useState, useCallback, KeyboardEvent, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { createMessage, createPromptResponse } from '../../utils/helpers';
import { getLLMResponse } from '../../utils/llmService';
import PromptResponseItem from './PromptResponseItem';
import PromptInput from './PromptInput';
import ChatSettings from './ChatSettings';
import type { LLMProviderConfig } from '../../types';

interface ChatAreaProps {
  quotedText?: string;
  onClearQuote?: () => void;
  onQuote?: (text: string) => void;
  templateContent?: string;
  onClearTemplate?: () => void;
}

export default function ChatArea({ quotedText = '', onClearQuote, onQuote, templateContent = '', onClearTemplate }: ChatAreaProps) {
  const { state, activeChat, dispatch } = useChat();
  const { addToast } = useToast();
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
        content,
        activeChat.settings.role,
        currentProvider || selectedProvider
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
  }, [activeChat, dispatch, isLoading]);

  const handleKeyDown = useCallback((_e: KeyboardEvent<HTMLTextAreaElement>, _content: string) => {
    // Key handling is now done in PromptInput for smart Enter behavior
    // Plain Enter adds newline (default behavior) - handled by PromptInput
  }, []);

  const isDark = state.theme === 'dark';

  if (!activeChat) {
    return (
      <div className={`chat-area flex-1 flex items-center justify-center ${isDark ? 'bg-dark-300' : 'bg-light-200'}`}>
        <div className="text-center">
          <h2 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{'Samvada Studio'}</h2>
          <p className={isDark ? 'text-gray-500' : 'text-gray-500'}>Select a chat or create a new one to get started</p>
        </div>
      </div>
    );
  }

  // Separate pinned and unpinned PnRs
  const pinnedPnRs = activeChat.promptResponses.filter(pnr => pnr.isPinned);
  const unpinnedPnRs = activeChat.promptResponses.filter(pnr => !pnr.isPinned);

  return (
    <div className={`chat-area flex-1 flex flex-col h-full max-w-full overflow-hidden ${isDark ? 'bg-dark-300' : 'bg-light-200'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <div className="flex items-center gap-3">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{activeChat.title}</h2>
          <span className="text-xs text-gray-500">
            {activeChat.promptResponses.length} messages
          </span>
          {/* Provider Selector - moved to left side */}
          {enabledProviders.length > 0 && (
            <div 
              className="relative provider-dropdown"
              onMouseEnter={() => setIsProviderDropdownOpen(true)}
              onMouseLeave={() => setIsProviderDropdownOpen(false)}
            >
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-dark-100 border-dark-300 text-gray-300 hover:bg-dark-200'
                    : 'bg-light-100 border-light-400 text-gray-700 hover:bg-light-200'
                }`}
                title="Select LLM Provider"
              >
                <span className="truncate max-w-32">
                  {selectedProvider ? `${selectedProvider.name} (${selectedProvider.model})` : 'Select Provider'}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isProviderDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {/* Dropdown Options - positioned with no gap */}
              {isProviderDropdownOpen && (
                <div 
                  className={`absolute top-full left-0 w-64 rounded-lg border shadow-lg z-50 ${
                    isDark ? 'bg-dark-200 border-dark-300' : 'bg-light-100 border-light-400'
                  }`}
                  style={{ marginTop: '1px' }} // Ensure no gap
                >
                  {enabledProviders.map(provider => (
                    <div
                      key={provider.id}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg ${
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings 
                ? 'bg-primary-600 text-white' 
                : isDark 
                  ? 'bg-dark-100 text-gray-400 hover:bg-dark-200'
                  : 'bg-light-300 text-gray-600 hover:bg-light-400'
            }`}
            title="Chat Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-full">
        {/* Pinned Messages */}
        {pinnedPnRs.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>📌</span> Pinned
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

        {/* Loading Indicator */}
        {isLoading && (
          <div ref={loadingRef} className={`flex items-center gap-2 p-4 rounded-lg ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}>
            <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Generating response...</span>
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
