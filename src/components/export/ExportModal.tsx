import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import type { ExportFormat } from '../../types';

export default function ExportModal() {
  const { state, dispatch, activeChat, exportChat, isDark } = useChat();
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [selectedChats, setSelectedChats] = useState<string[]>(activeChat ? [activeChat.id] : []);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'TOGGLE_EXPORT_MODAL' })}
      />
      
      {/* Modal - responsive width */}
      <div className={`relative w-full max-w-[95vw] sm:max-w-md md:max-w-lg mx-auto rounded-xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col ${
        isDark ? 'bg-dark-200 border-dark-300' : 'bg-white border-gray-200'
      }`}>
        {/* Header - responsive padding */}
        <div className={`flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b flex-shrink-0 ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <h2 className={`text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📤 <span className="hidden xs:inline">Export Chats</span><span className="xs:hidden">Export</span>
          </h2>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_EXPORT_MODAL' })}
            className={`p-1.5 sm:p-2 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center ${isDark ? 'hover:bg-dark-300 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-y-auto scroll-touch flex-1">
          {/* Format Selection - responsive grid */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-2 sm:mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {[
                { value: 'markdown', label: 'MD', fullLabel: 'Markdown', icon: '📝' },
                { value: 'json', label: 'JSON', fullLabel: 'JSON', icon: '📋' },
                { value: 'html', label: 'HTML', fullLabel: 'HTML', icon: '🌐' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value as ExportFormat)}
                  className={`p-2 sm:p-3 rounded-lg border text-center transition-colors ${
                    format === opt.value
                      ? 'border-theme-primary bg-theme-primary/10'
                      : isDark
                      ? 'border-dark-400 hover:border-dark-300'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg sm:text-2xl mb-0.5 sm:mb-1">{opt.icon}</div>
                  <div className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <span className="sm:hidden">{opt.label}</span>
                    <span className="hidden sm:inline">{opt.fullLabel}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Selection - responsive height */}
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-2 sm:mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Chats
            </label>
            <div className={`max-h-32 sm:max-h-40 md:max-h-48 overflow-y-auto rounded-lg border scroll-touch ${isDark ? 'border-dark-400' : 'border-gray-200'}`}>
              {state.chats.filter(c => !c.isArchived).map(chat => (
                <label
                  key={chat.id}
                  className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 cursor-pointer border-b last:border-b-0 ${
                    isDark
                      ? 'border-dark-400 hover:bg-dark-300'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedChats.includes(chat.id)}
                    onChange={() => toggleChatSelection(chat.id)}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-gray-300 text-theme-primary focus:ring-theme-primary flex-shrink-0"
                  />
                  <span className={`flex-1 truncate text-xs sm:text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {chat.title}
                  </span>
                  <span className={`text-[10px] sm:text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {chat.promptResponses.length} <span className="hidden sm:inline">messages</span>
                  </span>
                </label>
              ))}
              {state.chats.filter(c => !c.isArchived).length === 0 && (
                <div className={`p-3 sm:p-4 text-center text-xs sm:text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No chats to export
                </div>
              )}
            </div>
          </div>

          {/* Options - responsive */}
          <div className="space-y-2">
            <label className={`flex items-center gap-2 sm:gap-3 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={includeTimestamps}
                onChange={(e) => setIncludeTimestamps(e.target.checked)}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-gray-300 text-theme-primary focus:ring-theme-primary"
              />
              <span className="text-xs sm:text-sm">Include timestamps</span>
            </label>
          </div>
        </div>

        {/* Footer - responsive buttons */}
        <div className={`flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t flex-shrink-0 ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <button
            onClick={handleExportAll}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium order-2 xs:order-1 ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-dark-300'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            📦 <span className="hidden sm:inline">Export All Data</span><span className="sm:hidden">All Data</span>
          </button>
          <div className="flex gap-2 order-1 xs:order-2">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_EXPORT_MODAL' })}
              className={`flex-1 xs:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400 hover:bg-dark-300' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={selectedChats.length === 0}
              className="flex-1 xs:flex-none px-3 sm:px-4 py-2 bg-theme-primary text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export ({selectedChats.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
