import { useState, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { getFirstWords, formatTimestamp, formatDuration } from '../../utils/helpers';
import { regenerateResponse } from '../../utils/llmService';
import type { PromptResponse } from '../../types';
import MessageContent from './MessageContent';

interface PromptResponseItemProps {
  chatId: string;
  promptResponse: PromptResponse;
  onQuote?: (text: string) => void;
}

export default function PromptResponseItem({ chatId, promptResponse, onQuote }: PromptResponseItemProps) {
  const { state, dispatch, getChat } = useChat();
  const { addToast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(promptResponse.prompt.content);
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [editedResponse, setEditedResponse] = useState(
    promptResponse.responses[promptResponse.activeResponseIndex]?.content || ''
  );

  const isDark = state.theme === 'dark';
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
        chat.providerId ? state.providers.find(p => p.id === chat.providerId) : undefined
      );

      const updatedPnR = {
        ...promptResponse,
        responses: [...promptResponse.responses, message],
        activeResponseIndex: promptResponse.responses.length,
        processingTime,
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

  const handleSaveResponseEdit = () => {
    if (!activeResponse) return;
    const updatedResponses = [...promptResponse.responses];
    updatedResponses[promptResponse.activeResponseIndex] = {
      ...activeResponse,
      content: editedResponse,
    };
    const updatedPnR = {
      ...promptResponse,
      responses: updatedResponses,
    };
    dispatch({
      type: 'UPDATE_PROMPT_RESPONSE',
      payload: { chatId, promptResponse: updatedPnR },
    });
    setIsEditingResponse(false);
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
    <div className={`rounded-lg border transition-colors mb-3 ${
      promptResponse.isPinned 
        ? 'border-yellow-500/50 bg-yellow-500/5' 
        : isDark 
          ? 'border-dark-100 bg-dark-200'
          : 'border-light-400 bg-light-100'
    }`}>
      {/* Header - Always visible */}
      <div
        className={`flex items-center justify-between p-3 cursor-pointer rounded-t-lg ${
          isDark ? 'hover:bg-dark-100/50' : 'hover:bg-light-300/50'
        }`}
        onClick={handleToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <button className={isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}>
            {promptResponse.isCollapsed ? '▶' : '▼'}
          </button>
          <span className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>#{promptResponse.id.slice(0, 8)}</span>
          <span className={`text-sm truncate max-w-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {getFirstWords(promptResponse.prompt.content, 6)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {promptResponse.processingTime && (
            <span className="text-xs text-gray-500" title="Processing time">
              ⏱️ {formatDuration(promptResponse.processingTime)}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {formatTimestamp(promptResponse.createdAt)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleTogglePin(); }}
            className={`p-1 rounded ${promptResponse.isPinned ? 'text-yellow-500' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            title={promptResponse.isPinned ? 'Unpin' : 'Pin'}
          >
            📌
          </button>
        </div>
      </div>

      {/* Content - Collapsible */}
      {!promptResponse.isCollapsed && (
        <div className="px-4 pb-4 space-y-4 max-w-full overflow-hidden">
          {/* User Prompt */}
          <div className="relative group">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                U
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>You</span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(promptResponse.prompt.timestamp)}
                  </span>
                  <button
                    onClick={handleStarPrompt}
                    className={`text-sm ${promptResponse.prompt.isStarred ? 'text-yellow-500' : 'text-gray-500 opacity-0 group-hover:opacity-100'}`}
                  >
                    ⭐
                  </button>
                </div>
                {isEditingPrompt ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className={`w-full p-2 border rounded resize-none ${
                        isDark 
                          ? 'bg-dark-300 border-dark-100 text-gray-200' 
                          : 'bg-white border-light-400 text-gray-800'
                      }`}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSavePromptEdit}
                        className="px-3 py-1 bg-primary-600 text-white rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setIsEditingPrompt(false); setEditedPrompt(promptResponse.prompt.content); }}
                        className={`px-3 py-1 rounded text-sm ${isDark ? 'bg-dark-100 text-gray-300' : 'bg-light-300 text-gray-700'}`}
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
                      className={`absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 rounded ${
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
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-medium">
                  AI
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Assistant</span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(activeResponse.timestamp)}
                    </span>
                    <button
                      onClick={handleStarResponse}
                      className={`text-sm ${activeResponse.isStarred ? 'text-yellow-500' : 'text-gray-500 opacity-0 group-hover:opacity-100'}`}
                    >
                      ⭐
                    </button>
                  </div>

                  {/* Draft Navigation */}
                  {promptResponse.responses.length > 1 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">Draft</span>
                      {promptResponse.responses.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectDraft(index)}
                          className={`w-6 h-6 rounded text-xs ${
                            index === promptResponse.activeResponseIndex
                              ? 'bg-primary-600 text-white'
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

                  {isEditingResponse ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedResponse}
                        onChange={(e) => setEditedResponse(e.target.value)}
                        className={`w-full p-2 border rounded resize-none ${
                          isDark 
                            ? 'bg-dark-300 border-dark-100 text-gray-200' 
                            : 'bg-white border-light-400 text-gray-800'
                        }`}
                        rows={5}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveResponseEdit}
                          className="px-3 py-1 bg-primary-600 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setIsEditingResponse(false); setEditedResponse(activeResponse.content); }}
                          className={`px-3 py-1 rounded text-sm ${isDark ? 'bg-dark-100 text-gray-300' : 'bg-light-300 text-gray-700'}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <MessageContent content={activeResponse.content} />
                      <button
                        onClick={() => setIsEditingResponse(true)}
                        className={`absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 rounded ${
                          isDark ? 'text-gray-500 hover:bg-dark-100' : 'text-gray-500 hover:bg-light-300'
                        }`}
                        title="Edit response (Gemini-style inline edit)"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className={`flex items-center gap-1 px-3 py-1 text-sm rounded disabled:opacity-50 ${
                  isDark 
                    ? 'bg-dark-100 text-gray-300 hover:bg-dark-300' 
                    : 'bg-light-300 text-gray-700 hover:bg-light-400'
                }`}
              >
                {isRegenerating ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <span>🔄</span>
                )}
                Regenerate
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeResponse?.content || '');
                }}
                className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${
                  isDark 
                    ? 'bg-dark-100 text-gray-300 hover:bg-dark-300' 
                    : 'bg-light-300 text-gray-700 hover:bg-light-400'
                }`}
              >
                📋 Copy
              </button>
              {onQuote && activeResponse && (
                <button
                  onClick={() => onQuote(activeResponse.content)}
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${
                    isDark 
                      ? 'bg-dark-100 text-gray-300 hover:bg-dark-300' 
                      : 'bg-light-300 text-gray-700 hover:bg-light-400'
                  }`}
                  title="Quote in next prompt (ChatGPT-style)"
                >
                  💬 Quote
                </button>
              )}
            </div>
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm text-red-500 hover:bg-red-500/10 rounded"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
