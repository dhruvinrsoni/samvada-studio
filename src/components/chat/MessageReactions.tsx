import { useChat } from '../../context/ChatContext';
import type { ReactionType } from '../../types';

interface MessageReactionsProps {
  chatId: string;
  pnrId: string;
  messageId: string;
  currentReaction?: ReactionType;
  onSpeak?: () => void;
}

export default function MessageReactions({ 
  chatId, 
  pnrId, 
  messageId, 
  currentReaction,
  onSpeak 
}: MessageReactionsProps) {
  const { state, dispatch } = useChat();
  const isDark = state.theme === 'dark';

  const handleReaction = (reaction: ReactionType) => {
    dispatch({
      type: 'SET_MESSAGE_REACTION',
      payload: {
        chatId,
        pnrId,
        messageId,
        reaction: currentReaction === reaction ? null : reaction,
      },
    });
  };

  return (
    <div className="flex items-center gap-1">
      {/* Thumbs Up */}
      <button
        onClick={() => handleReaction('thumbsUp')}
        className={`p-1.5 rounded-lg transition-colors ${
          currentReaction === 'thumbsUp'
            ? 'text-green-500 bg-green-500/10'
            : isDark
            ? 'text-gray-500 hover:text-gray-300 hover:bg-dark-300'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="Good response"
      >
        <svg className="w-4 h-4" fill={currentReaction === 'thumbsUp' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      </button>

      {/* Thumbs Down */}
      <button
        onClick={() => handleReaction('thumbsDown')}
        className={`p-1.5 rounded-lg transition-colors ${
          currentReaction === 'thumbsDown'
            ? 'text-red-500 bg-red-500/10'
            : isDark
            ? 'text-gray-500 hover:text-gray-300 hover:bg-dark-300'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="Poor response"
      >
        <svg className="w-4 h-4" fill={currentReaction === 'thumbsDown' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
        </svg>
      </button>

      {/* Bookmark */}
      <button
        onClick={() => handleReaction('bookmark')}
        className={`p-1.5 rounded-lg transition-colors ${
          currentReaction === 'bookmark'
            ? 'text-yellow-500 bg-yellow-500/10'
            : isDark
            ? 'text-gray-500 hover:text-gray-300 hover:bg-dark-300'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="Bookmark"
      >
        <svg className="w-4 h-4" fill={currentReaction === 'bookmark' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </button>

      {/* Text-to-Speech */}
      {onSpeak && (
        <button
          onClick={onSpeak}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark
              ? 'text-gray-500 hover:text-gray-300 hover:bg-dark-300'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="Read aloud (Ctrl+.)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      )}
    </div>
  );
}
