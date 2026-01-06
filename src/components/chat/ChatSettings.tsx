import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { createExample } from '../../utils/helpers';
import type { Chat, Example } from '../../types';

interface ChatSettingsProps {
  chat: Chat;
  onClose: () => void;
}

export default function ChatSettings({ chat, onClose }: ChatSettingsProps) {
  const { state, dispatch } = useChat();
  const [settings, setSettings] = useState(chat.settings);
  const [title, setTitle] = useState(chat.title);
  const isDark = state.theme === 'dark';

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_CHAT',
      payload: { ...chat, title, settings },
    });
    onClose();
  };

  const addExample = () => {
    setSettings({
      ...settings,
      examples: [...settings.examples, createExample()],
    });
  };

  const updateExample = (id: string, field: keyof Example, value: string) => {
    setSettings({
      ...settings,
      examples: settings.examples.map(ex =>
        ex.id === id ? { ...ex, [field]: value } : ex
      ),
    });
  };

  const removeExample = (id: string) => {
    setSettings({
      ...settings,
      examples: settings.examples.filter(ex => ex.id !== id),
    });
  };

  const addToList = (field: 'alwaysInclude' | 'alwaysExclude', value: string) => {
    if (value.trim()) {
      setSettings({
        ...settings,
        [field]: [...settings[field], value.trim()],
      });
    }
  };

  const removeFromList = (field: 'alwaysInclude' | 'alwaysExclude', index: number) => {
    setSettings({
      ...settings,
      [field]: settings[field].filter((_, i) => i !== index),
    });
  };

  const inputClass = `w-full p-2 border rounded ${
    isDark 
      ? 'bg-dark-300 border-dark-100 text-gray-200' 
      : 'bg-white border-light-400 text-gray-800'
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  return (
    <div className={`border-b p-4 max-h-[60vh] overflow-y-auto ${
      isDark ? 'bg-dark-100 border-dark-300' : 'bg-light-100 border-light-400'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Chat Settings</h3>
        <button
          onClick={onClose}
          className={isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        {/* Chat Title */}
        <div>
          <label className={labelClass}>
            Chat Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* System Role */}
        <div>
          <label className={labelClass}>
            System Role / Instructions
          </label>
          <textarea
            value={settings.role}
            onChange={(e) => setSettings({ ...settings, role: e.target.value })}
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="You are a helpful AI assistant..."
          />
        </div>

        {/* Custom Instructions */}
        <div>
          <label className={labelClass}>
            Custom Instructions
          </label>
          <textarea
            value={settings.customInstructions}
            onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Additional formatting or behavior instructions..."
          />
        </div>

        {/* Always Include */}
        <div>
          <label className={labelClass}>
            Always Include (Formatting)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {settings.alwaysInclude.map((item, index) => (
              <span
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm"
              >
                {item}
                <button onClick={() => removeFromList('alwaysInclude', index)}>✕</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add keyword and press Enter"
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addToList('alwaysInclude', (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>

        {/* Always Exclude */}
        <div>
          <label className={labelClass}>
            Always Exclude
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {settings.alwaysExclude.map((item, index) => (
              <span
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm"
              >
                {item}
                <button onClick={() => removeFromList('alwaysExclude', index)}>✕</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add keyword and press Enter"
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addToList('alwaysExclude', (e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>

        {/* Few-Shot Examples */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Few-Shot Examples
            </label>
            <button
              onClick={addExample}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              + Add Example
            </button>
          </div>
          <div className="space-y-3">
            {settings.examples.map((example, index) => (
              <div key={example.id} className={`p-3 rounded border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-400'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Example {index + 1}</span>
                  <button
                    onClick={() => removeExample(example.id)}
                    className="text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Input example..."
                    value={example.input}
                    onChange={(e) => updateExample(example.id, 'input', e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400 text-gray-800'}`}
                  />
                  <input
                    type="text"
                    placeholder="Expected output..."
                    value={example.output}
                    onChange={(e) => updateExample(example.id, 'output', e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400 text-gray-800'}`}
                  />
                </div>
              </div>
            ))}
            {settings.examples.length === 0 && (
              <p className="text-sm text-gray-500">No examples added. Add examples for few-shot learning.</p>
            )}
          </div>
        </div>

        {/* Model Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Temperature: {settings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className={labelClass}>
              Max Tokens
            </label>
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className={`flex justify-end gap-2 pt-4 border-t ${isDark ? 'border-dark-300' : 'border-light-400'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded ${isDark ? 'bg-dark-300 text-gray-300 hover:bg-dark-400' : 'bg-light-300 text-gray-700 hover:bg-light-400'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
