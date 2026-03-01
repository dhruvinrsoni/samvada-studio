import { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { createLLMReport } from '../../utils/debug';
import { getAllThemePresets, getThemePreset } from '../../utils/theme';
import type { CustomTheme, ThemeMode } from '../../types';
import ColorPicker from './ColorPicker';
import { Toggle } from '../ui';

interface ThemeSettingsModalProps {
  onClose: () => void;
}

export default function ThemeSettingsModal({ onClose }: ThemeSettingsModalProps) {
  const { state, dispatch } = useChat();
  const [activeTab, setActiveTab] = useState<'appearance' | 'colors' | 'advanced'>(state.themeSettingsActiveTab || 'appearance');

  // Keep local activeTab in sync with global state when opened programmatically
  useEffect(() => {
    if (state.themeSettingsActiveTab) setActiveTab(state.themeSettingsActiveTab);
  }, [state.themeSettingsActiveTab]);
  const [customColors, setCustomColors] = useState<CustomTheme>(
    state.themeSettings.customColors || {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#60a5fa',
    }
  );

  const isDark = state.themeSettings.mode === 'dark' || 
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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

  const handleFontSizeChange = (fontSize: 'xs' | 'small' | 'medium' | 'large' | 'xl') => {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-1 xs:p-2 sm:p-4">
      <div className="w-full max-w-[99vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-[95vh] sm:h-[90vh] mx-auto bg-white dark:bg-gray-900 rounded-lg sm:rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header with Theme Gradient */}
        <div className="relative bg-gradient-to-r from-theme-primary via-theme-accent to-theme-secondary p-3 sm:p-4 md:p-6 compact:p-2 flex-shrink-0">
          <div className="flex items-center justify-between relative z-10 gap-2">
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl md:text-2xl compact:text-sm font-bold text-white drop-shadow-lg truncate">
                <span className="hidden xs:inline">🎨 </span>Theme<span className="hidden sm:inline"> Customization</span>
              </h2>
              <p className="text-white/90 text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 hidden xs:block compact:hidden">Personalize your workspace<span className="hidden md:inline"> with live preview</span></p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center flex-shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b overflow-x-auto scroll-touch flex-shrink-0 ${
          isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          {[
            { id: 'appearance', label: 'Appearance', icon: '🌓', shortLabel: 'Look' },
            { id: 'colors', label: 'Colors', icon: '🎨', shortLabel: 'Color' },
            { id: 'advanced', label: 'Advanced', icon: '⚙️', shortLabel: 'More' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-0 px-2 sm:px-4 md:px-6 compact:px-2 py-2 sm:py-3 md:py-4 compact:py-1.5 font-medium transition-all relative text-xs sm:text-sm md:text-base whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-theme-primary'
                  : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center justify-center gap-1 sm:gap-2">
                <span className="text-base sm:text-lg md:text-xl">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-theme-primary to-theme-accent"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Settings Panel */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-touch p-3 sm:p-4 md:p-6 compact:p-2">

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Theme Mode */}
                <div>
                  <h3 className={`text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4 ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>Display Mode</h3>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { mode: 'light' as ThemeMode, icon: '☀️', label: 'Light', desc: 'Bright theme' },
                      { mode: 'dark' as ThemeMode, icon: '🌙', label: 'Dark', desc: 'Easy on eyes' },
                      { mode: 'auto' as ThemeMode, icon: '🔄', label: 'Auto', desc: 'System default' }
                    ].map(({ mode, icon, label, desc }) => (
                      <button
                        key={mode}
                        onClick={() => handleModeChange(mode)}
                        className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all hover:scale-105 ${
                          state.themeSettings.mode === mode
                            ? 'border-theme-primary bg-theme-primary/10 shadow-lg'
                            : isDark
                              ? 'border-gray-700 hover:border-gray-600 bg-gray-800'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2">{icon}</div>
                        <div className={`font-semibold text-xs sm:text-sm md:text-base ${
                          state.themeSettings.mode === mode ? 'text-theme-primary' : ''
                        }`}>{label}</div>
                        <div className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 hidden xs:block ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <h3 className={`text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4 ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>Font Size</h3>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {[
                      { size: 'xs' as const, label: 'XS', preview: 'Aa', desc: 'Extra Small' },
                      { size: 'small' as const, label: 'S', preview: 'Aa', desc: 'Small' },
                      { size: 'medium' as const, label: 'M', preview: 'Aa', desc: 'Medium' },
                      { size: 'large' as const, label: 'L', preview: 'Aa', desc: 'Large' },
                      { size: 'xl' as const, label: 'XL', preview: 'Aa', desc: 'Extra Large' }
                    ].map(({ size, label, preview, desc }) => (
                      <button
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        title={desc}
                        className={`p-2 sm:p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          state.themeSettings.fontSize === size
                            ? 'border-theme-primary bg-theme-primary/10'
                            : isDark
                              ? 'border-gray-700 hover:border-gray-600 bg-gray-800'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`mb-1 ${
                          size === 'xs' ? 'text-base' : 
                          size === 'small' ? 'text-lg' : 
                          size === 'medium' ? 'text-xl' : 
                          size === 'large' ? 'text-2xl' : 
                          'text-3xl'
                        }`}>{preview}</div>
                        <div className={`font-semibold text-xs sm:text-sm ${
                          state.themeSettings.fontSize === size ? 'text-theme-primary' : ''
                        }`}>{label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {[
                    {
                      id: 'compact',
                      title: 'Compact Mode',
                      desc: 'Reduce spacing for denser layout',
                      icon: '📐',
                      enabled: state.themeSettings.compactMode,
                      toggle: handleCompactModeToggle
                    }
                  ].map(item => (
                    <div key={item.id} className={`p-2 sm:p-3 md:p-4 compact:p-1.5 rounded-lg sm:rounded-xl flex items-center justify-between gap-2 sm:gap-3 compact:gap-1.5 ${
                      isDark ? 'bg-gray-800' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2 sm:gap-3 compact:gap-1.5 min-w-0">
                        <span className="text-lg sm:text-xl md:text-2xl compact:text-base flex-shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <h4 className={`font-semibold text-xs sm:text-sm md:text-base truncate ${
                            isDark ? 'text-gray-100' : 'text-gray-900'
                          }`}>{item.title}</h4>
                          <p className={`text-[10px] sm:text-xs md:text-sm hidden xs:block compact:hidden truncate ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>{item.desc}</p>
                        </div>
                      </div>
                      <Toggle
                        checked={item.enabled}
                        onChange={item.toggle}
                        label={item.title}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COLORS TAB */}
            {activeTab === 'colors' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Color Theme Presets */}
                <div>
                  <h3 className={`text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4 ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>🎨 Theme Presets</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    {themePresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset.id)}
                        className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all hover:scale-105 text-left ${
                          state.themeSettings.preset === preset.id
                            ? 'border-theme-primary bg-theme-primary/10 shadow-lg'
                            : isDark
                              ? 'border-gray-700 hover:border-gray-600 bg-gray-800'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-1.5 sm:mb-2 md:mb-3">
                          <div className="flex gap-1 sm:gap-1.5">
                            <div
                              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full shadow-md"
                              style={{ backgroundColor: preset.preview.primary }}
                            />
                            <div
                              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full shadow-md"
                              style={{ backgroundColor: preset.preview.secondary }}
                            />
                          </div>
                        </div>
                        <h4 className={`font-bold text-xs sm:text-sm mb-0.5 sm:mb-1 truncate ${
                          state.themeSettings.preset === preset.id ? 'text-theme-primary' : ''
                        }`}>{preset.name}</h4>
                        <p className={`text-[10px] sm:text-xs hidden xs:block line-clamp-2 ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Colors */}
                <div>
                  <h3 className={`text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4 ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>🖌️ Custom Colors</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <ColorPicker
                      label="Primary Color"
                      value={customColors.primary}
                      onChange={(color: string) => handleCustomColorChange('primary', color)}
                    />
                    <ColorPicker
                      label="Secondary Color"
                      value={customColors.secondary}
                      onChange={(color: string) => handleCustomColorChange('secondary', color)}
                    />
                    <ColorPicker
                      label="Accent Color"
                      value={customColors.accent}
                      onChange={(color: string) => handleCustomColorChange('accent', color)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ADVANCED TAB */}
            {activeTab === 'advanced' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 sm:mb-3 flex items-center gap-2">
                    <span className="text-base sm:text-lg md:text-xl">⚙️</span>
                    Advanced Theme Options
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Advanced theme customization options are not available at the moment.
                  </p>

                  {/* Dev-only Bug Report Button - placed inside Advanced tab for discoverability */}
                  {import.meta.env.DEV && (
                    <div className="mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const report = createLLMReport.themeIssue();
                          const markdown = createLLMReport.toMarkdown(report);
                          createLLMReport.copyToClipboard(report);
                          console.log('🐛 Theme Bug Report Generated and Copied!');
                          console.log(markdown);
                          // Friendly non-blocking notification for devs
                          try {
                            // Prefer toast if available
                            const evt = new CustomEvent('dev:bug-report-copied');
                            window.dispatchEvent(evt);
                          } catch (err) {
                            /* ignore */
                          }
                        }}
                        title="Generate theme bug report (Dev only)"
                        className="mt-2 inline-flex items-center px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium gap-2"
                      >
                        🐛 <span className="hidden sm:inline">Generate Bug Report</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Preview Panel - Right Side - Hidden on mobile */}
          <div className={`hidden lg:block w-64 xl:w-80 2xl:w-96 border-l p-4 xl:p-6 overflow-y-auto overflow-x-hidden scroll-touch flex-shrink-0 ${
            isDark ? 'border-gray-700 bg-gray-850' : 'border-gray-200 bg-gray-50'
          }`}>
            <h3 className={`text-base xl:text-lg 2xl:text-xl font-bold mb-4 xl:mb-6 ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>✨ Live Preview</h3>
            
            {/* Current Theme Name */}
            <div className="mb-3 xl:mb-4">
              <p className={`text-[10px] xl:text-xs 2xl:text-sm font-medium ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>Current Theme</p>
              <p className="text-sm xl:text-base 2xl:text-lg font-bold text-theme-primary truncate">
                {getThemePreset(state.themeSettings.preset)?.name || 'Custom Theme'}
              </p>
            </div>

            {/* Color Circles */}
            <div className="flex gap-2 xl:gap-3 mb-4 xl:mb-6">
              <div className="flex flex-col items-center gap-1 xl:gap-2">
                <div className="w-10 h-10 xl:w-12 xl:h-12 2xl:w-16 2xl:h-16 rounded-full bg-theme-primary shadow-lg border-2 xl:border-4 border-white dark:border-gray-700"></div>
                <span className="text-[8px] xl:text-[10px] 2xl:text-xs font-mono text-gray-500 dark:text-gray-400">Primary</span>
              </div>
              <div className="flex flex-col items-center gap-1 xl:gap-2">
                <div className="w-10 h-10 xl:w-12 xl:h-12 2xl:w-16 2xl:h-16 rounded-full bg-theme-secondary shadow-lg border-2 xl:border-4 border-white dark:border-gray-700"></div>
                <span className="text-[8px] xl:text-[10px] 2xl:text-xs font-mono text-gray-500 dark:text-gray-400">Secondary</span>
              </div>
              <div className="flex flex-col items-center gap-1 xl:gap-2">
                <div className="w-10 h-10 xl:w-12 xl:h-12 2xl:w-16 2xl:h-16 rounded-full bg-theme-accent shadow-lg border-2 xl:border-4 border-white dark:border-gray-700"></div>
                <span className="text-[8px] xl:text-[10px] 2xl:text-xs font-mono text-gray-500 dark:text-gray-400">Accent</span>
              </div>
            </div>

            {/* Buttons Preview */}
            <div className="space-y-2 xl:space-y-3 mb-4 xl:mb-6">
              <button className="w-full px-3 xl:px-4 py-2 xl:py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg text-xs xl:text-sm 2xl:text-base">
                Primary Button
              </button>
              <button className="w-full px-3 xl:px-4 py-2 xl:py-3 border-2 border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white rounded-lg font-medium transition-all text-xs xl:text-sm 2xl:text-base">
                Outline Button
              </button>
              <button className="w-full px-3 xl:px-4 py-2 xl:py-3 bg-theme-secondary hover:bg-theme-accent text-white rounded-lg font-medium transition-all text-xs xl:text-sm 2xl:text-base">
                Secondary Button
              </button>
            </div>

            {/* Mini UI Preview */}
            <div className={`p-3 xl:p-4 rounded-lg xl:rounded-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}>
              <div className="h-1.5 xl:h-2 w-full bg-gradient-to-r from-theme-primary via-theme-accent to-theme-secondary rounded-full mb-3 xl:mb-4"></div>
              <div className="space-y-2 xl:space-y-3">
                <div className={`h-2 xl:h-3 rounded ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                } w-3/4`}></div>
                <div className={`h-2 xl:h-3 rounded ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                } w-full`}></div>
                <div className={`h-2 xl:h-3 rounded ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                } w-5/6`}></div>
                <div className="flex gap-1.5 xl:gap-2 mt-3 xl:mt-4">
                  <div className="h-6 xl:h-8 w-6 xl:w-8 rounded bg-theme-primary"></div>
                  <div className="h-6 xl:h-8 flex-1 rounded bg-theme-primary/20"></div>
                </div>
              </div>
            </div>

            {/* Theme Info */}
            <div className={`mt-4 xl:mt-6 p-2 xl:p-3 rounded-lg text-[10px] xl:text-xs ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              <p className={`font-semibold mb-1 xl:mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>Applied To:</p>
              <ul className={`space-y-0.5 xl:space-y-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <li>• Top bar accent strip</li>
                <li>• App branding</li>
                <li>• Buttons & links</li>
                <li className="hidden xl:list-item">• Selection highlights</li>
                <li className="hidden xl:list-item">• Active states</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bug report moved into Advanced tab */}
      </div>
    </div>
  );
}