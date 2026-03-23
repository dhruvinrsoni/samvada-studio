import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { getFirstWords, formatDate } from '../../utils/helpers';
import type { Chat } from '../../types';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface ChatListItemProps {
  chat: Chat;
}

export default function ChatListItem({ chat }: ChatListItemProps) {
  const { state, dispatch, isDark } = useChat();
  const isMobile = useIsMobile();
  const isActive = state.activeChat === chat.id;
  const isSelected = state.selectedChatIds.includes(chat.id);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);
  const [isDeleteHover, setIsDeleteHover] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const lastMessage = chat.promptResponses.length > 0
    ? (chat.promptResponses[chat.promptResponses.length - 1]?.prompt?.content || 'No messages yet')
    : 'No messages yet';

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== chat.title) {
      dispatch({ type: 'UPDATE_CHAT', payload: { ...chat, title: newTitle.trim() } });
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setNewTitle(chat.title);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename();
    } else if (e.key === 'Escape') {
      setNewTitle(chat.title);
      setIsRenaming(false);
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
        isActive
          ? 'bg-theme-primary/20 border border-theme-primary/50'
          : isSelected
          ? isDark 
            ? 'bg-dark-100 border border-theme-primary/30' 
            : 'bg-light-300 border border-theme-primary/30'
          : isDark 
            ? 'hover:bg-dark-100 border border-transparent' 
            : 'hover:bg-light-300 border border-transparent'
      }`}
      onClick={() => dispatch({ type: 'SET_ACTIVE_CHAT', payload: chat.id })}
    >
      {/* Selection Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation();
          dispatch({ type: 'TOGGLE_SELECT_CHAT', payload: chat.id });
        }}
        className={`w-4 h-4 sm:w-4 sm:h-4 rounded text-theme-primary focus:ring-theme-primary flex-shrink-0 ${isDark ? 'border-gray-600 bg-dark-300' : 'border-gray-400 bg-white'}`}
      />

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {chat.isPinned && <span className="text-xs" title="Pinned">📌</span>}
          {chat.isArchived && <span className="text-xs" title="Archived">📦</span>}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={() => {
                // On mobile, avoid cancelling on blur because tapping the
                // Save/Cancel buttons can trigger a blur before the button
                // click handler runs. Require explicit Save/Cancel on mobile.
                if (!isMobile) {
                  handleRename();
                }
              }}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className={`font-medium text-sm px-1 py-0.5 rounded border w-full ${
                isDark 
                  ? 'bg-dark-300 border-dark-100 text-gray-200' 
                  : 'bg-white border-light-400 text-gray-800'
              }`}
            />
          ) : (
            <h4 
              className={`font-medium truncate text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setNewTitle(chat.title);
              }}
              title="Double-click to rename"
            >
              {chat.title}
            </h4>
          )}
        </div>
        <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          {getFirstWords(lastMessage, 5)}
        </p>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
          {formatDate(chat.updatedAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex gap-0.5 sm:gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isRenaming) {
              handleRename();
              return;
            }
            setIsRenaming(true);
            setNewTitle(chat.title);
          }}
          className={`p-1 sm:p-1.5 rounded text-gray-500 min-w-[24px] min-h-[24px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center text-xs sm:text-sm ${isDark ? 'hover:bg-dark-300' : 'hover:bg-light-400'}`}
          title={isRenaming ? 'Save' : 'Rename chat'}
        >
          {isRenaming ? '💾' : '✏️'}
        </button>
        {isRenaming && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRenameCancel();
            }}
            className={`p-1 sm:p-1.5 rounded text-gray-500 min-w-[24px] min-h-[24px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center text-xs sm:text-sm ${isDark ? 'hover:bg-dark-300' : 'hover:bg-light-400'}`}
            title="Cancel rename"
          >
            ✖️
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'UPDATE_CHAT', payload: { ...chat, isPinned: !chat.isPinned } });
          }}
          className={`p-1 sm:p-1.5 rounded min-w-[24px] min-h-[24px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center text-xs sm:text-sm ${isDark ? 'hover:bg-dark-300' : 'hover:bg-light-400'} ${chat.isPinned ? 'text-yellow-500' : 'text-gray-500'}`}
          title={chat.isPinned ? 'Unpin chat' : 'Pin chat'}
        >
          {chat.isPinned ? '📌' : '📍'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (chat.isArchived) {
              dispatch({ type: 'UNARCHIVE_CHAT', payload: chat.id });
            } else {
              dispatch({ type: 'ARCHIVE_CHAT', payload: chat.id });
            }
          }}
          className={`p-1 sm:p-1.5 rounded text-gray-500 min-w-[24px] min-h-[24px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center text-xs sm:text-sm hidden xs:flex ${isDark ? 'hover:bg-dark-300' : 'hover:bg-light-400'}`}
          title={chat.isArchived ? 'Unarchive chat' : 'Archive chat'}
        >
          {chat.isArchived ? '📤' : '📦'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this chat?')) {
              dispatch({ type: 'DELETE_CHAT', payload: chat.id });
            }
          }}
          onMouseEnter={() => setIsDeleteHover(true)}
          onMouseLeave={() => setIsDeleteHover(false)}
          className={`p-1 sm:p-1.5 rounded text-red-500 min-w-[24px] min-h-[24px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center text-xs sm:text-sm ${isDark ? 'hover:bg-dark-300' : 'hover:bg-light-400'}`}
          title="Delete"
        >
          {isDeleteHover ? '❌' : '🗑️'}
        </button>
      </div>
    </div>
  );
}
