import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { createExample } from '../../utils/helpers';
import type { Chat, Example, FormattingProfile, FormattingRule } from '../../types';
import { DEFAULT_FORMATTING_PROFILES } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Toggle } from '../ui';
import ContextUtilization from './ContextUtilization';
import TokenCounter from './TokenCounter';

interface ChatSettingsProps {
  chat: Chat;
  onClose: () => void;
  inputValue?: string;
  providerId?: string;
}
export default function ChatSettings({ chat, onClose, inputValue = '', providerId }: ChatSettingsProps) {
  const { dispatch, isDark } = useChat();
  const [settings, setSettings] = useState(chat.settings);
  const [title, setTitle] = useState(chat.title);
  const [showFormattingSection, setShowFormattingSection] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    settings.formattingProfile?.id || 'none'
  );
  

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
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 ${isDark ? 'bg-black/50' : 'bg-black/30'}`}>
      <div className={`border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden ${isDark ? 'bg-dark-100 border-dark-300' : 'bg-light-100 border-light-400'}`}>
        <div className={`border-b p-3 sm:p-4 ${isDark ? 'border-dark-300' : 'border-light-400'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Chat Settings</h3>
            <div className="flex items-center gap-2">
              {/* Context utilization — visible on mobile only (desktop shows it in the title bar) */}
              <div className={`sm:hidden flex items-center gap-1.5 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <ContextUtilization currentInputText={inputValue} providerId={providerId} />
                <TokenCounter text={inputValue} />
                <span className="whitespace-nowrap">{inputValue.length}c</span>
              </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-dark-200' : 'text-gray-500 hover:text-gray-700 hover:bg-light-200'
              }`}
            >
              ✕
            </button>
            </div>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-3 sm:p-4">
          <div className="space-y-4 sm:space-y-6">
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
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
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
                <div className="space-y-4 sm:space-y-4 mt-3">
                  {/* Preset Selection */}
                  <div>
                    <label className={`${labelClass} text-base sm:text-sm`}>Choose Preset</label>
                    <select
                      value={selectedPresetId}
                      onChange={(e) => applyFormattingPreset(e.target.value)}
                      className={`${inputClass} text-base sm:text-sm py-3 sm:py-2`}
                    >
                      <option value="none">None (Default)</option>
                      {DEFAULT_FORMATTING_PROFILES.map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name} — {profile.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Profile Button - More prominent on mobile */}
                  <button
                    onClick={createCustomProfile}
                    className={`w-full p-4 sm:p-2 border-2 border-dashed rounded-lg text-base sm:text-sm font-medium transition-colors ${
                      isDark
                        ? 'border-dark-100 text-gray-400 hover:border-theme-primary hover:text-theme-primary bg-dark-200/50'
                        : 'border-light-400 text-gray-600 hover:border-theme-primary hover:text-theme-primary bg-light-200/50'
                    }`}
                  >
                    + Create Custom Profile
                  </button>

                  {/* Active Profile Details */}
                  {settings.formattingProfile && (
                    <div className={`p-4 sm:p-4 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-300'}`}>
                      <div className="space-y-4 sm:space-y-3">
                        {/* Profile Name & Description (editable for custom) */}
                        {settings.formattingProfile.isCustom && (
                          <>
                            <div>
                              <label className="text-sm font-medium text-gray-500 mb-2 block">Profile Name</label>
                              <input
                                type="text"
                                value={settings.formattingProfile.name}
                                onChange={(e) => updateFormattingProfile({ name: e.target.value })}
                                className={`w-full p-3 sm:p-2 text-base sm:text-sm border rounded-lg mt-1 ${
                                  isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400'
                                }`}
                                placeholder="Enter profile name"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500 mb-2 block">Description</label>
                              <input
                                type="text"
                                value={settings.formattingProfile.description}
                                onChange={(e) => updateFormattingProfile({ description: e.target.value })}
                                className={`w-full p-3 sm:p-2 text-base sm:text-sm border rounded-lg mt-1 ${
                                  isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400'
                                }`}
                                placeholder="Describe what this profile is for"
                              />
                            </div>
                          </>
                        )}

                        {/* Response Format */}
                        <div>
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Response Format</label>
                          <select
                            value={settings.formattingProfile.responseFormat || 'markdown'}
                            onChange={(e) => updateFormattingProfile({ responseFormat: e.target.value })}
                            className={`w-full p-3 sm:p-2 text-base sm:text-sm border rounded-lg mt-1 ${
                              isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400'
                            } ${!settings.formattingProfile.isCustom ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          <label className="text-sm font-medium text-gray-500 mb-2 block">Style Preferences</label>
                          <textarea
                            value={settings.formattingProfile.stylePreferences || ''}
                            onChange={(e) => updateFormattingProfile({ stylePreferences: e.target.value })}
                            placeholder="Describe how you want responses formatted..."
                            className={`w-full p-3 sm:p-2 text-base sm:text-sm border rounded-lg mt-1 h-24 sm:h-20 resize-none ${
                              isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400'
                            } ${!settings.formattingProfile.isCustom ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!settings.formattingProfile.isCustom}
                          />
                        </div>

                        {/* Formatting Rules */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-500">Formatting Rules</label>
                            {settings.formattingProfile.isCustom && (
                              <button
                                onClick={addFormattingRule}
                                className="px-3 py-2 text-sm bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
                              >
                                + Add Rule
                              </button>
                            )}
                          </div>
                          <div className="space-y-3">
                            {settings.formattingProfile.rules.map((rule) => (
                              <div
                                key={rule.id}
                                className={`p-4 sm:p-2 rounded-lg border text-sm ${isDark ? 'bg-dark-200 border-dark-100' : 'bg-white border-light-400'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 space-y-3 sm:space-y-1">
                                    {settings.formattingProfile?.isCustom ? (
                                      <>
                                        <input
                                          type="text"
                                          value={rule.name}
                                          onChange={(e) => updateFormattingRule(rule.id, { name: e.target.value })}
                                          className={`w-full p-3 sm:p-1 text-base sm:text-xs border rounded-lg ${
                                            isDark ? 'bg-dark-300 border-dark-100 text-gray-200' : 'bg-light-200 border-light-300'
                                          }`}
                                          placeholder="Rule name"
                                        />
                                        <select
                                          value={rule.type}
                                          onChange={(e) => updateFormattingRule(rule.id, { type: e.target.value as FormattingRule['type'] })}
                                          className={`w-full p-3 sm:p-1 text-base sm:text-xs border rounded-lg ${
                                            isDark ? 'bg-dark-300 border-dark-100 text-gray-200' : 'bg-light-200 border-light-300'
                                          }`}
                                        >
                                          <option value="response-format">Response Format</option>
                                          <option value="always-include">Always Include</option>
                                          <option value="always-exclude">Always Exclude</option>
                                          <option value="style-guide">Style Guide</option>
                                        </select>
                                        <textarea
                                          value={rule.value}
                                          onChange={(e) => updateFormattingRule(rule.id, { value: e.target.value })}
                                          className={`w-full p-3 sm:p-1 text-base sm:text-xs border rounded-lg h-20 sm:h-16 resize-none ${
                                            isDark ? 'bg-dark-300 border-dark-100 text-gray-200' : 'bg-light-200 border-light-300'
                                          }`}
                                          placeholder="Rule description..."
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <div className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                          {rule.name}
                                        </div>
                                        <div className="text-gray-500">{rule.description}</div>
                                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {rule.value}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={rule.isEnabled}
                                        onChange={(e) => updateFormattingRule(rule.id, { isEnabled: e.target.checked })}
                                        className="w-5 h-5 sm:w-4 sm:h-4 rounded"
                                        disabled={!settings.formattingProfile?.isCustom}
                                      />
                                      <span className="text-sm text-gray-500 hidden sm:inline">Enabled</span>
                                    </label>
                                    {settings.formattingProfile?.isCustom && (
                                      <button
                                        onClick={() => removeFormattingRule(rule.id)}
                                        className="p-2 text-red-500 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {settings.formattingProfile.rules.length === 0 && (
                              <p className="text-sm text-gray-500 text-center py-6 sm:py-2">
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

            {/* Chat History Toggle */}
            <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-light-300'}`}>
              <div>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Send Chat History
                </span>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Include previous messages for multi-turn conversation context
                </p>
              </div>
              <Toggle
                checked={settings.sendChatHistory ?? true}
                onChange={(v) => setSettings({ ...settings, sendChatHistory: v })}
                label="Send Chat History"
              />
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
          </div>
        </div>

        {/* Save Button - Sticky on mobile */}
        <div className={`sticky bottom-0 flex gap-3 pt-4 border-t mt-6 ${
          isDark ? 'border-dark-300 bg-dark-100' : 'border-light-400 bg-light-100'
        }`}>
          <button
            onClick={onClose}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              isDark ? 'bg-dark-300 text-gray-300 hover:bg-dark-400' : 'bg-light-300 text-gray-700 hover:bg-light-400'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-4 bg-theme-primary text-white rounded-lg font-medium hover:bg-theme-primary-hover transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
