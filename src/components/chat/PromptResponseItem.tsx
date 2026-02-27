import { useState, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { getFirstWords, formatTimestamp, formatDuration } from '../../utils/helpers';
import { regenerateResponse } from '../../utils/llmService';
import type { PromptResponse } from '../../types';
import MessageContent from './MessageContent';
import TTSButton from './TTSButton';

interface PromptResponseItemProps {
  chatId: string;
  promptResponse: PromptResponse;
  onQuote?: (text: string) => void;
}

export default function PromptResponseItem({ chatId, promptResponse, onQuote }: PromptResponseItemProps) {
  const { state, dispatch, getChat, isDark } = useChat();
  const { addToast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(promptResponse.prompt.content);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(promptResponse.name || '');

  
  const activeResponse = promptResponse.responses[promptResponse.activeResponseIndex];

  const handleToggleCollapse = () => {
    dispatch({
      type: 'TOGGLE_COLLAPSE',
      payload: { chatId, pnrId: promptResponse.id },
    });
  };

  const handleTogglePin = () => {
    dispatch({
      type: 'TOGGLE_PIN_PNR',
      payload: { chatId, pnrId: promptResponse.id },
    });
  };

  const handleStarPnR = () => {
    dispatch({
      type: 'TOGGLE_STAR_PNR',
      payload: { chatId, pnrId: promptResponse.id },
    });
  };

  const handleStarPrompt = () => {
    dispatch({
      type: 'TOGGLE_STAR_MESSAGE',
      payload: { chatId, pnrId: promptResponse.id, messageId: promptResponse.prompt.id },
    });
  };

  const handleStarResponse = () => {
    if (activeResponse) {
      dispatch({
        type: 'TOGGLE_STAR_MESSAGE',
        payload: { chatId, pnrId: promptResponse.id, messageId: activeResponse.id },
      });
    }
  };

  const handleRegenerate = useCallback(async () => {
    const chat = getChat(chatId);
    if (!chat) return;

    setIsRegenerating(true);
    try {
      const { message, processingTime } = await regenerateResponse(
        promptResponse.prompt.content,
        chat.providerId ? state.providers.find(p => p.id === chat.providerId) : undefined,
        chat.settings // Pass chat settings for formatting profile
      );

      const now = new Date();
      const updatedPnR = {
        ...promptResponse,
        responses: [...promptResponse.responses, message],
        activeResponseIndex: promptResponse.responses.length,
        processingTime,
        createdAt: now, // Update timestamp to reflect regeneration time
        updatedAt: now,
      };

      dispatch({
        type: 'UPDATE_PROMPT_RESPONSE',
        payload: { chatId, promptResponse: updatedPnR },
      });
    } catch (error) {
      console.error('Failed to regenerate response:', error);
      addToast(
        'error',
        'Failed to regenerate response',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsRegenerating(false);
    }
  }, [chatId, promptResponse, getChat, state.providers, dispatch, addToast]);

  const handleSavePromptEdit = () => {
    const updatedPnR = {
      ...promptResponse,
      prompt: { ...promptResponse.prompt, content: editedPrompt },
    };
    dispatch({
      type: 'UPDATE_PROMPT_RESPONSE',
      payload: { chatId, promptResponse: updatedPnR },
    });
    setIsEditingPrompt(false);
  };

  const handleSaveNameEdit = () => {
    const updatedPnR = {
      ...promptResponse,
      name: editedName.trim() || undefined, // Remove name if empty
    };
    dispatch({
      type: 'UPDATE_PROMPT_RESPONSE',
      payload: { chatId, promptResponse: updatedPnR },
    });
    setIsEditingName(false);
  };

  const handleSelectDraft = (index: number) => {
    const updatedPnR = {
      ...promptResponse,
      activeResponseIndex: index,
    };
    dispatch({
      type: 'UPDATE_PROMPT_RESPONSE',
      payload: { chatId, promptResponse: updatedPnR },
    });
  };

  const handleDelete = () => {
    if (confirm('Delete this prompt and response?')) {
      dispatch({
        type: 'DELETE_PROMPT_RESPONSE',
        payload: { chatId, pnrId: promptResponse.id },
      });
    }
  };

  return (
    <div className={`rounded-lg border transition-colors mb-2 sm:mb-3 max-w-full overflow-hidden ${
      promptResponse.isPinned 
        ? 'border-yellow-500/50 bg-yellow-500/5' 
        : isDark 
          ? 'border-dark-100 bg-dark-200'
          : 'border-light-400 bg-light-100'
    }`}>
      {/* Header - Always visible, responsive */}
      <div
        className={`flex items-center justify-between p-2 sm:p-3 cursor-pointer rounded-t-lg gap-1 sm:gap-2 ${
          isDark ? 'hover:bg-dark-100/50' : 'hover:bg-light-300/50'
        }`}
        onClick={handleToggleCollapse}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button 
            className={`flex-shrink-0 text-sm sm:text-base ${
              isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
            title={promptResponse.isCollapsed ? 'Expand' : 'Collapse'}
          >
            {promptResponse.isCollapsed ? '▶' : '▼'}
          </button>
          
          {/* PnR ID Badge - Compact */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(promptResponse.id);
              addToast('success', 'Copied!', `PnR ID copied to clipboard`);
            }}
            className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${
              isDark 
                ? 'border-gray-700 text-gray-500 hover:border-theme-primary hover:text-theme-primary' 
                : 'border-gray-300 text-gray-600 hover:border-theme-primary hover:text-theme-primary'
            }`}
            title={`PnR ID: ${promptResponse.id} (click to copy)`}
          >
            #{promptResponse.id.slice(0, 4)}
          </button>
          
          {isEditingName ? (
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveNameEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false);
                    setEditedName(promptResponse.name || '');
                  }
                }}
                className={`text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1 border rounded w-full max-w-[120px] sm:max-w-[200px] md:max-w-xs ${isDark ? 'bg-dark-100 border-dark-300 text-gray-200' : 'bg-white border-light-400 text-gray-800'}`}
                placeholder="Enter name..."
                autoFocus
              />
              <button
                onClick={handleSaveNameEdit}
                className="text-green-600 hover:text-green-700 text-xs sm:text-sm p-1 min-w-[24px] min-h-[24px] flex items-center justify-center"
                title="Save name"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  setEditedName(promptResponse.name || '');
                }}
                className="text-red-600 hover:text-red-700 text-xs sm:text-sm p-1 min-w-[24px] min-h-[24px] flex items-center justify-center"
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 group/name">
              <span
                className={`text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px] md:max-w-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                title={promptResponse.name || getFirstWords(promptResponse.prompt.content, 10)}
              >
                {promptResponse.name || getFirstWords(promptResponse.prompt.content, 4)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                  setEditedName(promptResponse.name || '');
                }}
                className={`opacity-0 group-hover/name:opacity-100 text-xs p-0.5 sm:p-1 rounded transition-all flex-shrink-0 ${isDark ? 'hover:bg-dark-100 text-gray-500 hover:text-gray-300' : 'hover:bg-light-300 text-gray-500 hover:text-gray-700'}`}
                title="Edit PnR name"
              >
                ✏️
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
          {promptResponse.processingTime && (
            <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:inline" title="Processing time">
              ⏱️ {formatDuration(promptResponse.processingTime)}
            </span>
          )}
          <span className="text-[10px] sm:text-xs text-gray-500 hidden xs:inline">
            {formatTimestamp(promptResponse.createdAt)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleStarPnR(); }}
            className={`p-0.5 sm:p-1 rounded transition-all duration-200 min-w-[24px] min-h-[24px] flex items-center justify-center ${
              promptResponse.isStarred
                ? 'text-yellow-500 scale-110'
                : isDark
                ? 'text-gray-500 hover:text-yellow-400 hover:scale-105'
                : 'text-gray-400 hover:text-yellow-400 hover:scale-105'
            }`}
            title={promptResponse.isStarred ? 'Unstar conversation' : 'Star entire conversation'}
          >
            <span className="text-sm sm:text-base">{promptResponse.isStarred ? '⭐' : '☆'}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleTogglePin(); }}
            className={`p-0.5 sm:p-1 rounded min-w-[24px] min-h-[24px] flex items-center justify-center ${promptResponse.isPinned ? 'text-yellow-500' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            title={promptResponse.isPinned ? 'Unpin' : 'Pin'}
          >
            <span className="text-sm sm:text-base">{promptResponse.isPinned ? '🔒' : '🔓'}</span>
          </button>
        </div>
      </div>

      {/* Content - Collapsible, responsive */}
      {!promptResponse.isCollapsed && (
        <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 md:pb-4 space-y-2 sm:space-y-3 md:space-y-4 max-w-full overflow-hidden">
          {/* User Prompt */}
          <div className="relative group">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-theme-primary flex items-center justify-center text-white text-xs sm:text-sm font-medium flex-shrink-0">
                U
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-nowrap whitespace-nowrap">
                  <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>You</span>
                  <span className="text-[10px] sm:text-xs text-gray-500">
                    {formatTimestamp(promptResponse.prompt.timestamp)}
                  </span>
                  <button
                    onClick={handleStarPrompt}
                    className={`text-sm sm:text-base transition-all duration-200 ${promptResponse.prompt.isStarred ? 'text-yellow-500 scale-110' : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-yellow-400 hover:scale-105'}`}
                    title={promptResponse.prompt.isStarred ? 'Unstar message' : 'Star message'}
                  >
                    {promptResponse.prompt.isStarred ? '⭐' : '☆'}
                  </button>
                </div>
                {isEditingPrompt ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className={`w-full p-2 border rounded resize-none text-xs sm:text-sm ${
                        isDark 
                          ? 'bg-dark-300 border-dark-100 text-gray-200' 
                          : 'bg-white border-light-400 text-gray-800'
                      }`}
                      rows={3}
                    />
                    <div className="flex gap-1.5 sm:gap-2">
                      <button
                        onClick={handleSavePromptEdit}
                        className="px-2 sm:px-3 py-1 bg-theme-primary text-white rounded text-xs sm:text-sm hover:bg-theme-primary-hover"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setIsEditingPrompt(false); setEditedPrompt(promptResponse.prompt.content); }}
                        className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${isDark ? 'bg-dark-100 text-gray-300' : 'bg-light-300 text-gray-700'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <MessageContent content={promptResponse.prompt.content} />
                    <button
                      onClick={() => setIsEditingPrompt(true)}
                      className={`absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 rounded text-xs sm:text-sm ${
                        isDark ? 'text-gray-500 hover:bg-dark-100' : 'text-gray-500 hover:bg-light-300'
                      }`}
                      title="Edit prompt"
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Response */}
          {activeResponse && (
            <div className="relative group">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-[10px] sm:text-sm font-medium flex-shrink-0">
                  AI
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-nowrap whitespace-nowrap">
                    <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Assistant</span>
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      {formatTimestamp(activeResponse.timestamp)}
                    </span>
                    <button
                      onClick={handleStarResponse}
                      className={`text-sm sm:text-base transition-all duration-200 ${activeResponse.isStarred ? 'text-yellow-500 scale-110' : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-yellow-400 hover:scale-105'}`}
                      title={activeResponse.isStarred ? 'Unstar response' : 'Star response'}
                    >
                      {activeResponse.isStarred ? '⭐' : '☆'}
                    </button>
                  </div>

                  {/* Draft Navigation - responsive */}
                  {promptResponse.responses.length > 1 && (
                    <div className="flex items-center gap-1 sm:gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] sm:text-xs text-gray-500">Draft</span>
                      {promptResponse.responses.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectDraft(index)}
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded text-[10px] sm:text-xs flex items-center justify-center ${
                            index === promptResponse.activeResponseIndex
                              ? 'bg-theme-primary text-white'
                              : isDark 
                                ? 'bg-dark-100 text-gray-400 hover:bg-dark-300'
                                : 'bg-light-300 text-gray-600 hover:bg-light-400'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  <MessageContent content={activeResponse.content} />
                </div>
              </div>
            </div>
          )}

          {/* Actions - responsive with flex-wrap */}
          <div className={`flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pt-2 border-t ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm rounded min-h-[28px] sm:min-h-[32px] transition-colors ${
                  isRegenerating
                    ? isDark
                      ? 'bg-theme-primary/30 text-theme-primary cursor-not-allowed'
                      : 'bg-theme-primary/20 text-theme-primary cursor-not-allowed'
                    : isDark
                      ? 'bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20'
                      : 'bg-theme-primary/5 text-theme-primary hover:bg-theme-primary/10'
                }`}
              >
                {isRegenerating ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <span>🔄</span>
                )}
                <span className="hidden xs:inline">Regenerate</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeResponse?.content || '');
                  addToast('success', 'Copied!', 'Response copied to clipboard');
                }}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm rounded min-h-[28px] sm:min-h-[32px] transition-colors ${
                  isDark 
                    ? 'bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20' 
                    : 'bg-theme-primary/5 text-theme-primary hover:bg-theme-primary/10'
                }`}
              >
                📋 <span className="hidden xs:inline">Copy</span>
              </button>
              <TTSButton text={activeResponse?.content || ''} />
              {onQuote && activeResponse && (
                <button
                  onClick={() => {
                    onQuote(activeResponse.content);
                    addToast('success', 'Quoted!', 'Response added to your next prompt');
                  }}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm rounded border-2 border-dashed min-h-[28px] sm:min-h-[32px] ${
                    isDark 
                      ? 'border-theme-primary/50 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 hover:border-theme-primary' 
                      : 'border-theme-primary/50 bg-theme-primary-light text-theme-primary hover:bg-theme-primary-light hover:border-theme-primary'
                  }`}
                  title="Quote in next prompt (ChatGPT-style)"
                >
                  💬 <span className="hidden sm:inline">Quote</span>
                </button>
              )}
            </div>
            <button
              onClick={handleDelete}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-red-500 hover:bg-red-500/10 rounded min-h-[28px] sm:min-h-[32px]"
            >
              🗑️ <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
