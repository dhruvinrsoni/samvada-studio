import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import type { ExportFormat } from '../../types';

export default function ExportModal() {
  const { state, dispatch, activeChat, exportChat } = useChat();
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [selectedChats, setSelectedChats] = useState<string[]>(activeChat ? [activeChat.id] : []);
  const isDark = state.theme === 'dark';

  if (!state.isExportModalOpen) return null;

  const handleExport = () => {
    selectedChats.forEach(chatId => {
      const content = exportChat(chatId, format as 'json' | 'markdown' | 'html');
      const chat = state.chats.find(c => c.id === chatId);
      if (!chat || !content) return;

      const extensions: Record<ExportFormat, string> = {
        json: 'json',
        markdown: 'md',
        html: 'html',
        txt: 'txt',
      };

      const mimeTypes: Record<ExportFormat, string> = {
        json: 'application/json',
        markdown: 'text/markdown',
        html: 'text/html',
        txt: 'text/plain',
      };

      const blob = new Blob([content], { type: mimeTypes[format] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_')}.${extensions[format]}`;
      a.click();
      URL.revokeObjectURL(url);
    });

    dispatch({ type: 'TOGGLE_EXPORT_MODAL' });
  };

  const handleExportAll = () => {
    // Export all chats as a single JSON file
    const allData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      chats: state.chats,
      templates: state.templates,
      folders: state.folders,
      providers: state.providers.map(p => ({ ...p, apiKey: undefined })), // Remove API keys
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `samvada-studio-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch({ type: 'TOGGLE_EXPORT_MODAL' });
  };

  const toggleChatSelection = (chatId: string) => {
    setSelectedChats(prev =>
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'TOGGLE_EXPORT_MODAL' })}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden ${
        isDark ? 'bg-dark-200 border-dark-300' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📤 Export Chats
          </h2>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_EXPORT_MODAL' })}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-300 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'markdown', label: 'Markdown', icon: '📝' },
                { value: 'json', label: 'JSON', icon: '📋' },
                { value: 'html', label: 'HTML', icon: '🌐' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value as ExportFormat)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    format === opt.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : isDark
                      ? 'border-dark-400 hover:border-dark-300'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{opt.icon}</div>
                  <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {opt.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Chats to Export
            </label>
            <div className={`max-h-48 overflow-y-auto rounded-lg border ${isDark ? 'border-dark-400' : 'border-gray-200'}`}>
              {state.chats.filter(c => !c.isArchived).map(chat => (
                <label
                  key={chat.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b last:border-b-0 ${
                    isDark
                      ? 'border-dark-400 hover:bg-dark-300'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedChats.includes(chat.id)}
                    onChange={() => toggleChatSelection(chat.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`flex-1 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {chat.title}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {chat.promptResponses.length} messages
                  </span>
                </label>
              ))}
              {state.chats.filter(c => !c.isArchived).length === 0 && (
                <div className={`p-4 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No chats to export
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className={`flex items-center gap-3 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={includeTimestamps}
                onChange={(e) => setIncludeTimestamps(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">Include timestamps</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <button
            onClick={handleExportAll}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-dark-300'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            📦 Export All Data
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_EXPORT_MODAL' })}
              className={`px-4 py-2 rounded-lg font-medium ${isDark ? 'text-gray-400 hover:bg-dark-300' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={selectedChats.length === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export ({selectedChats.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
