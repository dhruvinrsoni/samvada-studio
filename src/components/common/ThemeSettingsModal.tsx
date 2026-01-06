import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import type { ThemeMode, ThemePreset, CustomTheme } from '../../types';
import { getAllThemePresets, getThemePreset } from '../../utils/theme';
import ColorPicker from './ColorPicker';

interface ThemeSettingsModalProps {
  onClose: () => void;
}

interface ThemeCardProps {
  preset: ThemePreset;
  isSelected: boolean;
  onClick: () => void;
}

const ThemeCard = ({ preset, isSelected, onClick }: ThemeCardProps) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
      isSelected
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="flex gap-1">
        <div
          className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: preset.preview.primary }}
        />
        <div
          className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: preset.preview.secondary }}
        />
      </div>
      <div className="text-left">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{preset.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</p>
      </div>
    </div>
    {/* Live Preview */}
    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex gap-2 mb-2">
        <button
          className="px-3 py-1 text-xs rounded"
          style={{
            backgroundColor: preset.preview.primary,
            color: 'white'
          }}
        >
          Button
        </button>
        <button
          className="px-3 py-1 text-xs rounded border"
          style={{
            borderColor: preset.preview.secondary,
            color: preset.preview.primary
          }}
        >
          Outline
        </button>
      </div>
      <div
        className="h-1 rounded-full"
        style={{ backgroundColor: preset.preview.secondary }}
      />
    </div>
  </button>
);

export default function ThemeSettingsModal({ onClose }: ThemeSettingsModalProps) {
  const { state, dispatch } = useChat();
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [customColors, setCustomColors] = useState<CustomTheme>(
    state.themeSettings.customColors || {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#60a5fa',
    }
  );

  const themePresets = getAllThemePresets();

  const handleModeChange = (mode: ThemeMode) => {
    dispatch({
      type: 'UPDATE_THEME_SETTINGS',
      payload: { ...state.themeSettings, mode }
    });
  };

  const handlePresetSelect = (presetId: string) => {
    dispatch({
      type: 'UPDATE_THEME_SETTINGS',
      payload: {
        ...state.themeSettings,
        preset: presetId,
        customColors: null
      }
    });
  };

  const handleCustomColorChange = (key: keyof CustomTheme, color: string) => {
    const newColors = { ...customColors, [key]: color };
    setCustomColors(newColors);
    dispatch({
      type: 'UPDATE_THEME_SETTINGS',
      payload: {
        ...state.themeSettings,
        preset: 'custom',
        customColors: newColors
      }
    });
  };

  const handleFontSizeChange = (fontSize: 'small' | 'medium' | 'large') => {
    dispatch({
      type: 'UPDATE_THEME_SETTINGS',
      payload: { ...state.themeSettings, fontSize }
    });
  };

  const handleCompactModeToggle = () => {
    dispatch({
      type: 'UPDATE_THEME_SETTINGS',
      payload: { ...state.themeSettings, compactMode: !state.themeSettings.compactMode }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Theme Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Current Theme Preview */}
          <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Current Theme Preview</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-theme-primary"></div>
                <div className="w-6 h-6 rounded-full bg-theme-secondary"></div>
                <div className="w-6 h-6 rounded-full bg-theme-accent"></div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {getThemePreset(state.themeSettings.preset)?.name || 'Custom Theme'}
              </span>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors">
                Primary Button
              </button>
              <button className="px-4 py-2 border border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white rounded-lg transition-colors">
                Outline Button
              </button>
              <button className="px-4 py-2 bg-theme-secondary hover:bg-theme-accent text-gray-800 dark:text-gray-200 rounded-lg transition-colors">
                Secondary Button
              </button>
            </div>
          </div>

          {/* Theme Mode */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Theme Mode</h3>
            <div className="flex gap-3">
              {(['light', 'dark', 'auto'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`px-4 py-2 rounded-lg border transition-colors capitalize ${
                    state.themeSettings.mode === mode
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Color Theme Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Color Theme</h3>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-4">
              <button
                onClick={() => setActiveTab('presets')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'presets'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Preset Themes
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'custom'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Custom Colors
              </button>
            </div>

            {/* Preset Themes */}
            {activeTab === 'presets' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {themePresets.map((preset) => (
                  <ThemeCard
                    key={preset.id}
                    preset={preset}
                    isSelected={state.themeSettings.preset === preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                  />
                ))}
              </div>
            )}

            {/* Custom Colors */}
            {activeTab === 'custom' && (
              <div className="space-y-6">
                <ColorPicker
                  label="Primary Color"
                  value={customColors.primary}
                  onChange={(color) => handleCustomColorChange('primary', color)}
                />
                <ColorPicker
                  label="Secondary Color"
                  value={customColors.secondary}
                  onChange={(color) => handleCustomColorChange('secondary', color)}
                />
                <ColorPicker
                  label="Accent Color"
                  value={customColors.accent}
                  onChange={(color) => handleCustomColorChange('accent', color)}
                />
              </div>
            )}
          </div>

          {/* Additional Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Additional Settings</h3>

            <div className="space-y-4">
              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Size
                </label>
                <div className="flex gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSizeChange(size)}
                      className={`px-4 py-2 rounded-lg border transition-colors capitalize ${
                        state.themeSettings.fontSize === size
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Compact Mode</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reduce spacing and padding for a denser layout</p>
                </div>
                <button
                  onClick={handleCompactModeToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    state.themeSettings.compactMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      state.themeSettings.compactMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Prompt Navigation */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Prompt Navigation</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Navigate through previous prompts with ↑↓ arrow keys on first/last line</p>
                </div>
                <button
                  onClick={() => dispatch({
                    type: 'UPDATE_THEME_SETTINGS',
                    payload: { ...state.themeSettings, promptNavigationEnabled: !state.themeSettings.promptNavigationEnabled }
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    state.themeSettings.promptNavigationEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      state.themeSettings.promptNavigationEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}