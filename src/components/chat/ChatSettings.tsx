import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { createExample } from '../../utils/helpers';
import type { Chat, Example, FormattingProfile, FormattingRule } from '../../types';
import { DEFAULT_FORMATTING_PROFILES } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import type { PWAStatus } from '../../hooks/usePWA';

interface ChatSettingsProps {
  chat: Chat;
  onClose: () => void;
  pwaStatus?: PWAStatus;
}

export default function ChatSettings({ chat, onClose, pwaStatus }: ChatSettingsProps) {
  const { state, dispatch } = useChat();
  const [settings, setSettings] = useState(chat.settings);
  const [title, setTitle] = useState(chat.title);
  const [showFormattingSection, setShowFormattingSection] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    settings.formattingProfile?.id || 'none'
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
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

  const applyFormattingPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    
    if (presetId === 'none') {
      setSettings({ ...settings, formattingProfile: undefined });
      return;
    }

    const preset = DEFAULT_FORMATTING_PROFILES.find(p => p.id === presetId);
    if (preset) {
      setSettings({ ...settings, formattingProfile: { ...preset } });
    }
  };

  const createCustomProfile = () => {
    const customProfile: FormattingProfile = {
      id: `custom-${uuidv4()}`,
      name: 'Custom Profile',
      description: 'Your custom formatting rules',
      isCustom: true,
      rules: [],
      responseFormat: 'markdown',
      stylePreferences: '',
    };
    setSettings({ ...settings, formattingProfile: customProfile });
    setSelectedPresetId(customProfile.id);
  };

  const updateFormattingProfile = (updates: Partial<FormattingProfile>) => {
    if (settings.formattingProfile) {
      setSettings({
        ...settings,
        formattingProfile: { ...settings.formattingProfile, ...updates },
      });
    }
  };

  const addFormattingRule = () => {
    if (!settings.formattingProfile) return;
    
    const newRule: FormattingRule = {
      id: uuidv4(),
      type: 'response-format',
      name: 'New Rule',
      description: '',
      value: '',
      isEnabled: true,
    };

    updateFormattingProfile({
      rules: [...settings.formattingProfile.rules, newRule],
    });
  };

  const updateFormattingRule = (ruleId: string, updates: Partial<FormattingRule>) => {
    if (!settings.formattingProfile) return;

    updateFormattingProfile({
      rules: settings.formattingProfile.rules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ),
    });
  };

  const removeFormattingRule = (ruleId: string) => {
    if (!settings.formattingProfile) return;

    updateFormattingProfile({
      rules: settings.formattingProfile.rules.filter(rule => rule.id !== ruleId),
    });
  };

  const inputClass = `w-full p-2 border rounded ${
    isDark 
      ? 'bg-dark-300 border-dark-100 text-gray-200' 
      : 'bg-white border-light-400 text-gray-800'
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  return (
    <div className={`border-b p-4 max-h-[60vh] overflow-y-auto overflow-x-hidden ${
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
              className="text-sm text-theme-primary hover:text-theme-primary-hover"
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

        {/* Formatting Profile - NEW SECTION */}
        <div className={`border-t pt-4 ${isDark ? 'border-dark-300' : 'border-light-400'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                💎 Formatting Profile
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Control how responses are formatted for this chat
              </p>
            </div>
            <button
              onClick={() => setShowFormattingSection(!showFormattingSection)}
              className="text-theme-primary hover:text-theme-primary-hover text-sm"
            >
              {showFormattingSection ? '▼' : '▶'}
            </button>
          </div>

          {showFormattingSection && (
            <div className="space-y-4 mt-3">
              {/* Preset Selection */}
              <div>
                <label className={labelClass}>Choose Preset</label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => applyFormattingPreset(e.target.value)}
                  className={inputClass}
                >
                  <option value="none">None (Default)</option>
                  {DEFAULT_FORMATTING_PROFILES.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} — {profile.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Profile Button */}
              <button
                onClick={createCustomProfile}
                className={`w-full p-2 border-2 border-dashed rounded text-sm ${
                  isDark
                    ? 'border-dark-100 text-gray-400 hover:border-theme-primary hover:text-theme-primary'
                    : 'border-light-400 text-gray-600 hover:border-theme-primary hover:text-theme-primary'
                }`}
              >
                + Create Custom Profile
              </button>

              {/* Active Profile Details */}
              {settings.formattingProfile && (
                <div className={`p-4 rounded border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-300'}`}>
                  <div className="space-y-3">
                    {/* Profile Name & Description (editable for custom) */}
                    {settings.formattingProfile.isCustom && (
                      <>
                        <div>
                          <label className="text-xs text-gray-500">Profile Name</label>
                          <input
                            type="text"
                            value={settings.formattingProfile.name}
                            onChange={(e) => updateFormattingProfile({ name: e.target.value })}
                            className={`w-full p-2 text-sm border rounded mt-1 ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400'}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Description</label>
                          <input
                            type="text"
                            value={settings.formattingProfile.description}
                            onChange={(e) => updateFormattingProfile({ description: e.target.value })}
                            className={`w-full p-2 text-sm border rounded mt-1 ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400'}`}
                          />
                        </div>
                      </>
                    )}

                    {/* Response Format */}
                    <div>
                      <label className="text-xs text-gray-500">Response Format</label>
                      <select
                        value={settings.formattingProfile.responseFormat || 'markdown'}
                        onChange={(e) => updateFormattingProfile({ responseFormat: e.target.value })}
                        className={`w-full p-2 text-sm border rounded mt-1 ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400'}`}
                        disabled={!settings.formattingProfile.isCustom}
                      >
                        <option value="markdown">Markdown</option>
                        <option value="code-only">Code Only</option>
                        <option value="bullet-points">Bullet Points</option>
                        <option value="numbered-list">Numbered List</option>
                        <option value="table">Table Format</option>
                      </select>
                    </div>

                    {/* Style Preferences */}
                    <div>
                      <label className="text-xs text-gray-500">Style Preferences</label>
                      <textarea
                        value={settings.formattingProfile.stylePreferences || ''}
                        onChange={(e) => updateFormattingProfile({ stylePreferences: e.target.value })}
                        placeholder="Describe how you want responses formatted..."
                        className={`w-full p-2 text-sm border rounded mt-1 h-20 ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400'}`}
                        disabled={!settings.formattingProfile.isCustom}
                      />
                    </div>

                    {/* Formatting Rules */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-500">Formatting Rules</label>
                        {settings.formattingProfile.isCustom && (
                          <button
                            onClick={addFormattingRule}
                            className="text-xs text-theme-primary hover:text-theme-primary-hover"
                          >
                            + Add Rule
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {settings.formattingProfile.rules.map((rule) => (
                          <div
                            key={rule.id}
                            className={`p-2 rounded border text-xs ${isDark ? 'bg-dark-200 border-dark-100' : 'bg-white border-light-400'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1">
                                {settings.formattingProfile?.isCustom ? (
                                  <>
                                    <input
                                      type="text"
                                      value={rule.name}
                                      onChange={(e) => updateFormattingRule(rule.id, { name: e.target.value })}
                                      className={`w-full p-1 text-xs border rounded ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-300'}`}
                                      placeholder="Rule name"
                                    />
                                    <select
                                      value={rule.type}
                                      onChange={(e) => updateFormattingRule(rule.id, { type: e.target.value as FormattingRule['type'] })}
                                      className={`w-full p-1 text-xs border rounded ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-300'}`}
                                    >
                                      <option value="response-format">Response Format</option>
                                      <option value="always-include">Always Include</option>
                                      <option value="always-exclude">Always Exclude</option>
                                      <option value="style-guide">Style Guide</option>
                                    </select>
                                    <textarea
                                      value={rule.value}
                                      onChange={(e) => updateFormattingRule(rule.id, { value: e.target.value })}
                                      className={`w-full p-1 text-xs border rounded h-16 ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-300'}`}
                                      placeholder="Rule description..."
                                    />
                                  </>
                                ) : (
                                  <>
                                    <div className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {rule.name}
                                    </div>
                                    <div className="text-gray-500">{rule.description}</div>
                                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {rule.value}
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={rule.isEnabled}
                                  onChange={(e) => updateFormattingRule(rule.id, { isEnabled: e.target.checked })}
                                  className="rounded"
                                  disabled={!settings.formattingProfile?.isCustom}
                                />
                                {settings.formattingProfile?.isCustom && (
                                  <button
                                    onClick={() => removeFormattingRule(rule.id)}
                                    className="text-red-500 hover:text-red-400"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {settings.formattingProfile.rules.length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-2">
                            No rules defined. Add rules to customize formatting.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>



        {/* PWA Settings */}
        {pwaStatus && (
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-gray-200' : 'text-gray-800'
            }`}>App Installation</h3>
            
            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-dark-200 border-dark-300 border-l-4 border-l-theme-primary' : 'bg-light-200 border-light-400 border-l-4 border-l-theme-primary'
            }`}>
              {pwaStatus.isInstalled || pwaStatus.isStandalone ? (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className={`text-sm font-semibold ${
                      isDark ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      App is installed!
                    </div>
                    <div className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      You're using the installed version
                    </div>
                  </div>
                </div>
              ) : pwaStatus.isInstallable ? (
                <div className="space-y-3">
                  <div>
                    <div className={`text-sm font-semibold mb-1 ${
                      isDark ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      Install Samvada Studio
                    </div>
                    <p className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Get faster loading, offline support, and desktop experience
                    </p>
                  </div>

                  {installMessage && (
                    <div className={`text-xs px-3 py-2 rounded-lg ${
                      installMessage.type === 'success' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {installMessage.text}
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      setIsInstalling(true);
                      setInstallMessage(null);
                      const success = await pwaStatus.installApp();
                      setIsInstalling(false);
                      if (success) {
                        setInstallMessage({ type: 'success', text: 'App installed successfully! 🎉' });
                      } else {
                        setInstallMessage({ type: 'info', text: 'Installation was cancelled or not supported.' });
                      }
                    }}
                    disabled={isInstalling}
                    className={`flex items-center justify-center gap-2 px-4 py-2 w-full
                      bg-theme-primary hover:bg-theme-primary-hover
                      text-white text-sm font-medium rounded-lg transition-all
                      ${
                        isInstalling ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    {isInstalling ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Installing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Install App
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <div className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    App installation not available in this browser or context. Try Chrome, Edge, or Safari.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
            className="px-4 py-2 bg-theme-primary text-white rounded hover:bg-theme-primary-hover"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
