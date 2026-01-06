import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { getFirstWords, formatDate } from '../../utils/helpers';
import type { Chat } from '../../types';

interface ChatListItemProps {
  chat: Chat;
}

export default function ChatListItem({ chat }: ChatListItemProps) {
  const { state, dispatch } = useChat();
  const isActive = state.activeChat === chat.id;
  const isSelected = state.selectedChatIds.includes(chat.id);
  const isDark = state.theme === 'dark';
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);

  const lastMessage = chat.promptResponses.length > 0
    ? chat.promptResponses[chat.promptResponses.length - 1].prompt.content
    : 'No messages yet';

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== chat.title) {
      dispatch({ type: 'UPDATE_CHAT', payload: { ...chat, title: newTitle.trim() } });
    }
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
      className={`group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
        isActive
          ? 'bg-primary-600/20 border border-primary-600/50'
          : isSelected
          ? isDark 
            ? 'bg-dark-100 border border-primary-500/30' 
            : 'bg-light-300 border border-primary-500/30'
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
        className={`w-4 h-4 rounded text-primary-500 focus:ring-primary-500 ${isDark ? 'border-gray-600 bg-dark-300' : 'border-gray-400 bg-white'}`}
      />

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {chat.isPinned && <span className="text-xs" title="Pinned">📌</span>}
          {chat.isArchived && <span className="text-xs" title="Archived">📦</span>}
          {isRenaming ? (
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleRename}
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
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsRenaming(true);
            setNewTitle(chat.title);
          }}
          className={`p-1 rounded text-gray-500 ${isDark ? 'hover:bg-dark-300' : 'hover:bg-light-400'}`}
          title="Rename chat"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'UPDATE_CHAT', payload: { ...chat, isPinned: !chat.isPinned } });
          }}
          className={`p-1 rounded ${isDark ? 'hover:bg-dark-300' : 'hover:bg-light-400'} ${chat.isPinned ? 'text-yellow-500' : 'text-gray-500'}`}
          title={chat.isPinned ? 'Unpin chat' : 'Pin chat'}
        >
          📌
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
          className={`p-1 rounded text-gray-500 ${isDark ? 'hover:bg-dark-300' : 'hover:bg-light-400'}`}
          title={chat.isArchived ? 'Unarchive chat' : 'Archive chat'}
        >
          📦
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this chat?')) {
              dispatch({ type: 'DELETE_CHAT', payload: chat.id });
            }
          }}
          className={`p-1 rounded text-red-500 ${isDark ? 'hover:bg-dark-300' : 'hover:bg-light-400'}`}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
