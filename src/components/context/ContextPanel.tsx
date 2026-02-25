import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { createContextPanel } from '../../utils/helpers';

export default function ContextPanel() {
  const { state, dispatch } = useChat();
  const [newPanelTitle, setNewPanelTitle] = useState('');
  const isDark = state.theme === 'dark';

  const handleAddPanel = () => {
    if (newPanelTitle.trim()) {
      dispatch({
        type: 'ADD_CONTEXT_PANEL',
        payload: createContextPanel(newPanelTitle),
      });
      setNewPanelTitle('');
    }
  };

  const handleUpdateContent = (id: string, content: string) => {
    const panel = state.contextPanels.find(p => p.id === id);
    if (panel) {
      dispatch({
        type: 'UPDATE_CONTEXT_PANEL',
        payload: { ...panel, content },
      });
    }
  };

  const handleDeletePanel = (id: string) => {
    dispatch({ type: 'DELETE_CONTEXT_PANEL', payload: id });
  };

  const handleToggleActive = (id: string) => {
    const panel = state.contextPanels.find(p => p.id === id);
    if (panel) {
      dispatch({
        type: 'UPDATE_CONTEXT_PANEL',
        payload: { ...panel, isActive: !panel.isActive },
      });
    }
  };

  if (!state.isContextPanelMode) return null;

  return (
    <div className={`w-80 border-l flex flex-col h-full ${isDark ? 'bg-dark-200 border-dark-100' : 'bg-light-200 border-light-400'}`}>
      <div className={`p-4 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Context Panels</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPanelTitle}
            onChange={(e) => setNewPanelTitle(e.target.value)}
            placeholder="New panel title..."
            className={`flex-1 p-2 border rounded text-sm ${isDark ? 'bg-dark-100 border-dark-300 text-gray-200' : 'bg-white border-light-400 text-gray-800'}`}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPanel()}
          />
          <button
            onClick={handleAddPanel}
            className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.contextPanels.map(panel => (
          <div
            key={panel.id}
            className={`p-3 rounded-lg border ${
              panel.isActive
                ? 'border-primary-500 bg-primary-500/10'
                : isDark 
                  ? 'border-dark-100 bg-dark-300' 
                  : 'border-light-400 bg-light-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{panel.title}</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(panel.id)}
                  className={`text-xs px-2 py-1 rounded ${
                    panel.isActive
                      ? 'bg-primary-600 text-white'
                      : isDark 
                        ? 'bg-dark-100 text-gray-400' 
                        : 'bg-light-400 text-gray-600'
                  }`}
                >
                  {panel.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDeletePanel(panel.id)}
                  className="text-red-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </div>
            <textarea
              value={panel.content}
              onChange={(e) => handleUpdateContent(panel.id, e.target.value)}
              placeholder="Paste your context here..."
              className={`w-full p-2 border rounded text-sm resize-none ${isDark ? 'bg-dark-200 border-dark-100 text-gray-300' : 'bg-white border-light-400 text-gray-800'}`}
              rows={6}
            />
          </div>
        ))}

        {state.contextPanels.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No context panels yet.</p>
            <p className="text-xs mt-1">Add panels to include custom context in your queries.</p>
          </div>
        )}
      </div>
    </div>
  );
}
