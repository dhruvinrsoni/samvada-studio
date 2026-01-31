import { useChat } from '../../context/ChatContext';
import { toPlainTextPreview } from '../../utils/contentSanitizer';

interface StarredModalProps {
  onClose: () => void;
}

export default function StarredModal({ onClose }: StarredModalProps) {
  const { state, dispatch, getStarredMessages } = useChat();
  const isDark = state.theme === 'dark';
  const starredMessages = getStarredMessages();

  const handleNavigateToMessage = (chatId: string) => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: chatId });
    // Could scroll to the specific message, but for now just switch to the chat
    onClose();
  };

  const handleUnstarMessage = (chatId: string, pnrId: string, messageId: string) => {
    dispatch({ type: 'TOGGLE_STAR_MESSAGE', payload: { chatId, pnrId, messageId } });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1 xs:p-2 sm:p-4">
      <div className={`w-full max-w-[98vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[95vh] sm:max-h-[90vh] md:max-h-[80vh] mx-auto rounded-lg sm:rounded-xl shadow-xl ${
        isDark ? 'bg-dark-200' : 'bg-light-100'
      } overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-3 sm:p-4 md:p-6 border-b flex-shrink-0 ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h2 className={`text-base sm:text-lg md:text-xl font-semibold truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                <span className="hidden xs:inline">Starred </span>Messages
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center flex-shrink-0 ${
                isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className={`mt-1.5 sm:mt-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {starredMessages.length} starred message{starredMessages.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-touch min-h-0">
          {starredMessages.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p className={`text-base sm:text-lg font-medium mb-1.5 sm:mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                No starred messages yet
              </p>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Star important messages by clicking the ⭐ icon on any message
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {starredMessages.map(({ chat, pnr, message, isPnrStar }) => {
                try {
                  // Safety checks
                  if (!chat || !pnr) {
                    console.error('Missing chat or pnr in starred message');
                    return null;
                  }

                  // Render entire PnR conversation
                  if (isPnrStar) {
                    const activeResponse = pnr.responses?.[pnr.activeResponseIndex];
                    if (!activeResponse) {
                      console.error('No active response for starred PnR:', pnr);
                      return null;
                    }
                    
                    return (
                      <div key={`pnr-${pnr.id}`} className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l-4 border-yellow-500`}>
                        <div className="flex items-start justify-between gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                              <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 whitespace-nowrap`}>
                                ⭐ <span className="hidden xs:inline">Full </span>Convo
                              </span>
                              <span className={`text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {chat.title || 'Untitled Chat'}
                              </span>
                              <span className={`text-[10px] sm:text-xs hidden xs:inline ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                {(() => {
                                  try {
                                    const date = pnr.createdAt;
                                    if (!date) return 'Unknown time';
                                    const dateObj = typeof date === 'string' ? new Date(date) : date;
                                    return dateObj.toLocaleString();
                                  } catch (e) {
                                    return 'Unknown time';
                                  }
                                })()}
                              </span>
                            </div>

                            {/* Prompt */}
                            <div className="mb-2 sm:mb-3">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-medium flex-shrink-0">U</span>
                                <span className={`text-[10px] sm:text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>You</span>
                              </div>
                              <div className={`text-xs sm:text-sm pl-6 sm:pl-8 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {toPlainTextPreview(pnr.prompt.content, 200)}
                              </div>
                            </div>

                            {/* Response */}
                            {activeResponse && (
                              <div>
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-medium flex-shrink-0">AI</span>
                                  <span className={`text-[10px] sm:text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Assistant</span>
                                  {pnr.responses.length > 1 && (
                                    <span className={`text-[10px] sm:text-xs hidden xs:inline ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                      (Draft {pnr.activeResponseIndex + 1} of {pnr.responses.length})
                                    </span>
                                  )}
                                </div>
                                <div className={`text-xs sm:text-sm pl-6 sm:pl-8 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {toPlainTextPreview(activeResponse.content, 200)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleNavigateToMessage(chat.id)}
                              className={`p-1.5 sm:p-2 rounded-lg transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${
                                isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
                              }`}
                              title="Go to conversation"
                            >
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                dispatch({ type: 'TOGGLE_STAR_PNR', payload: { chatId: chat.id, pnrId: pnr.id } });
                              }}
                              className={`p-1.5 sm:p-2 rounded-lg transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${
                                isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
                              }`}
                              title="Unstar conversation"
                            >
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Render individual message (existing code)
                  if (!message) return null;
                  
                  return (
                    <div key={`${pnr.id}-${message.id}`} className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Chat and timestamp info */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                            <span className={`text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {chat.title || 'Untitled Chat'}
                            </span>
                            <span className={`text-[10px] sm:text-xs hidden xs:inline ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                              {(() => {
                                try {
                                  const date = message.timestamp;
                                  if (!date) return 'Unknown time';
                                  const dateObj = typeof date === 'string' ? new Date(date) : date;
                                  return dateObj.toLocaleString();
                                } catch (e) {
                                  return 'Unknown time';
                                }
                              })()}
                            </span>
                            <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded-full ${
                              message.role === 'user'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {message.role === 'user' ? 'You' : 'AI'}
                            </span>
                          </div>

                          {/* Message content - clean plain text preview */}
                          <div className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed line-clamp-3`}>
                            {(() => {
                              try {
                                const content = message.content;
                                if (!content || typeof content !== 'string') {
                                  return <span className="text-red-500 italic text-xs">[Invalid content]</span>;
                                }
                                if (content.trim().length === 0) {
                                  return <span className="text-gray-500 italic text-xs">[Empty message]</span>;
                                }
                                
                                // Use plain text preview - this removes markdown/code for clean display
                                return toPlainTextPreview(content, 300);
                              } catch (error) {
                                console.error('Error rendering starred message:', error, message);
                                return (
                                  <span className="text-red-500 italic text-xs">
                                    [Error - click "Go to message" to view]
                                  </span>
                                );
                              }
                            })()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleNavigateToMessage(chat.id)}
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${
                              isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
                            }`}
                            title="Go to message"
                          >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleUnstarMessage(chat.id, pnr.id, message.id)}
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center ${
                              isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
                            }`}
                            title="Remove star"
                          >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.error('Error rendering starred message item:', error, { chat, pnr, message, isPnrStar });
                  const errorKey = isPnrStar ? `pnr-error-${pnr?.id || Math.random()}` : `msg-error-${message?.id || Math.random()}`;
                  return (
                    <div key={errorKey} className={`p-3 sm:p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20`}>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-red-500">⚠️</span>
                        <span className="text-red-700 dark:text-red-400 text-xs sm:text-sm">
                          Failed to load starred {isPnrStar ? 'conversation' : 'message'}
                        </span>
                        {chat?.id && pnr?.id && (
                          <button
                            onClick={() => {
                              if (isPnrStar) {
                                dispatch({ type: 'TOGGLE_STAR_PNR', payload: { chatId: chat.id, pnrId: pnr.id } });
                              } else if (message?.id) {
                                dispatch({ type: 'TOGGLE_STAR_MESSAGE', payload: { chatId: chat.id, pnrId: pnr.id, messageId: message.id } });
                              }
                            }}
                            className="ml-auto px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-300 rounded min-h-[24px] sm:min-h-[28px]"
                            title="Remove corrupted star"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}