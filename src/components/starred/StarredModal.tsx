import { useChat } from '../../context/ChatContext';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-[80vh] rounded-lg shadow-xl ${
        isDark ? 'bg-dark-200' : 'bg-light-100'
      } overflow-hidden`}>
        {/* Header */}
        <div className={`p-6 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                Starred Messages
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {starredMessages.length} starred message{starredMessages.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {starredMessages.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                No starred messages yet
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Star important messages by clicking the ⭐ icon on any message
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {starredMessages.map(({ chat, pnr, message }) => (
                <div key={`${pnr.id}-${message.id}`} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Chat and timestamp info */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {chat.title}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          message.role === 'user'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {message.role === 'user' ? 'You' : 'AI'}
                        </span>
                      </div>

                      {/* Message content */}
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                        {message.content.length > 200
                          ? `${message.content.substring(0, 200)}...`
                          : message.content
                        }
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleNavigateToMessage(chat.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
                        }`}
                        title="Go to message"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleUnstarMessage(chat.id, pnr.id, message.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
                        }`}
                        title="Remove star"
                      >
                        <svg className="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}