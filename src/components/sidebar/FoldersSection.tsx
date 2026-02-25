import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { generateId } from '../../utils/helpers';
import type { ChatFolder, Chat } from '../../types';

const FOLDER_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
];

const FOLDER_ICONS = ['📁', '💼', '📚', '🏠', '💡', '🎯', '🔧', '📝', '🎨', '🚀'];

interface FoldersSectionProps {
  renderChatItem: (chat: Chat) => React.ReactNode;
}

export default function FoldersSection({ renderChatItem }: FoldersSectionProps) {
  const { state, dispatch } = useChat();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ChatFolder | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const isDark = state.theme === 'dark';

  const handleCreateFolder = (name: string, color: string, icon: string) => {
    dispatch({
      type: 'CREATE_FOLDER',
      payload: {
        id: generateId(),
        name,
        color,
        icon,
        chatIds: [],
        isExpanded: true,
        createdAt: new Date(),
      },
    });
    setIsCreatingFolder(false);
  };

  const handleDropChat = (folderId: string, chatId: string) => {
    dispatch({ type: 'MOVE_CHAT_TO_FOLDER', payload: { chatId, folderId } });
    setDragOverFolderId(null);
  };

  const getChatsInFolder = (folderId: string) => {
    return state.chats.filter(c => c.folderId === folderId && !c.isArchived);
  };

  const getUnfolderedChats = () => {
    return state.chats.filter(c => !c.folderId && !c.isArchived);
  };

  return (
    <div className="space-y-2">
      {/* Folders */}
      {state.folders.map(folder => (
        <div key={folder.id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
              dragOverFolderId === folder.id 
                ? 'ring-2 ring-primary-500' 
                : ''
            } ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-100'}`}
            onClick={() => dispatch({ type: 'TOGGLE_FOLDER_EXPAND', payload: folder.id })}
            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => {
              e.preventDefault();
              const chatId = e.dataTransfer.getData('chatId');
              if (chatId) handleDropChat(folder.id, chatId);
            }}
          >
            <span className="text-lg">{folder.icon}</span>
            <span 
              className={`flex-1 font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ color: folder.color }}
            >
              {folder.name}
            </span>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {getChatsInFolder(folder.id).length}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); }}
              className={`opacity-0 group-hover:opacity-100 p-1 rounded ${isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-200'}`}
            >
              ✏️
            </button>
            <span className={`transition-transform ${folder.isExpanded ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </div>
          
          {/* Chats in folder */}
          {folder.isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {getChatsInFolder(folder.id).map(chat => (
                <div
                  key={chat.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('chatId', chat.id)}
                >
                  {renderChatItem(chat)}
                </div>
              ))}
              {getChatsInFolder(folder.id).length === 0 && (
                <div className={`text-xs py-2 px-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  Drag chats here
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Create Folder Button */}
      <button
        onClick={() => setIsCreatingFolder(true)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          isDark ? 'text-gray-400 hover:bg-dark-300 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span>+ New Folder</span>
      </button>

      {/* Unfoldered Chats Section */}
      {state.folders.length > 0 && getUnfolderedChats().length > 0 && (
        <div>
          <div 
            className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId('none'); }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => {
              e.preventDefault();
              const chatId = e.dataTransfer.getData('chatId');
              if (chatId) dispatch({ type: 'MOVE_CHAT_TO_FOLDER', payload: { chatId, folderId: null } });
              setDragOverFolderId(null);
            }}
          >
            Unfiled
          </div>
          <div className={`mt-1 space-y-1 ${dragOverFolderId === 'none' ? 'ring-2 ring-primary-500 rounded-lg' : ''}`}>
            {getUnfolderedChats().map(chat => (
              <div
                key={chat.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('chatId', chat.id)}
              >
                {renderChatItem(chat)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folder Form Modal */}
      {(isCreatingFolder || editingFolder) && (
        <FolderForm
          folder={editingFolder}
          onSave={(name, color, icon) => {
            if (editingFolder) {
              dispatch({ type: 'UPDATE_FOLDER', payload: { ...editingFolder, name, color, icon } });
              setEditingFolder(null);
            } else {
              handleCreateFolder(name, color, icon);
            }
          }}
          onDelete={editingFolder ? () => {
            dispatch({ type: 'DELETE_FOLDER', payload: editingFolder.id });
            setEditingFolder(null);
          } : undefined}
          onCancel={() => { setIsCreatingFolder(false); setEditingFolder(null); }}
          isDark={isDark}
        />
      )}
    </div>
  );
}

interface FolderFormProps {
  folder?: ChatFolder | null;
  onSave: (name: string, color: string, icon: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
  isDark: boolean;
}

function FolderForm({ folder, onSave, onDelete, onCancel, isDark }: FolderFormProps) {
  const [name, setName] = useState(folder?.name || '');
  const [color, setColor] = useState(folder?.color || FOLDER_COLORS[0].value);
  const [icon, setIcon] = useState(folder?.icon || FOLDER_ICONS[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className={`relative w-full max-w-sm rounded-xl shadow-xl p-6 ${isDark ? 'bg-dark-200' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {folder ? 'Edit Folder' : 'New Folder'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work Projects"
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-400 text-white' : 'bg-white border-gray-300'}`}
              autoFocus
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_ICONS.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    icon === i
                      ? 'bg-primary-600 text-white'
                      : isDark ? 'bg-dark-300 hover:bg-dark-400' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c.value ? 'scale-125 ring-2 ring-white ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-medium"
            >
              Delete Folder
            </button>
          )}
          <div className={`flex gap-2 ${!onDelete ? 'ml-auto' : ''}`}>
            <button
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg font-medium ${isDark ? 'text-gray-400 hover:bg-dark-300' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cancel
            </button>
            <button
              onClick={() => name.trim() && onSave(name.trim(), color, icon)}
              disabled={!name.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
