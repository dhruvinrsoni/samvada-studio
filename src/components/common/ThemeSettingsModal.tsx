import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import type { ThemeMode, CustomTheme } from '../../types';
import { getAllThemePresets, getThemePreset } from '../../utils/theme';
import ColorPicker from './ColorPicker';
import type { PWAStatus } from '../../hooks/usePWA';

interface ThemeSettingsModalProps {
  onClose: () => void;
  pwaStatus?: PWAStatus;
}

export default function ThemeSettingsModal({ onClose, pwaStatus }: ThemeSettingsModalProps) {
  const { state, dispatch } = useChat();
  const [activeTab, setActiveTab] = useState<'appearance' | 'colors' | 'advanced'>('appearance');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="w-full max-w-6xl h-[90vh] mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header with Theme Gradient */}
        <div className="relative bg-gradient-to-r from-theme-primary via-theme-accent to-theme-secondary p-6">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                🎨 Theme Customization
              </h2>
              <p className="text-white/90 text-sm mt-1">Personalize your workspace with live preview</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b ${
          isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          {[
            { id: 'appearance', label: 'Appearance', icon: '🌓' },
            { id: 'colors', label: 'Colors', icon: '🎨' },
            { id: 'advanced', label: 'Advanced', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-6 py-4 font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'text-theme-primary'
                  : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">{tab.icon}</span>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-theme-primary to-theme-accent"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Settings Panel */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                {/* Theme Mode */}
                <div>
                  <h3 className={`text-xl font-semibold mb-4 ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>Display Mode</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { mode: 'light' as ThemeMode, icon: '☀️', label: 'Light', desc: 'Bright theme' },
                      { mode: 'dark' as ThemeMode, icon: '🌙', label: 'Dark', desc: 'Easy on eyes' },
                      { mode: 'auto' as ThemeMode, icon: '🔄', label: 'Auto', desc: 'System default' }
                    ].map(({ mode, icon, label, desc }) => (
                      <button
                        key={mode}
                        onClick={() => handleModeChange(mode)}
                        className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                          state.themeSettings.mode === mode
                            ? 'border-theme-primary bg-theme-primary/10 shadow-lg'
                            : isDark
                              ? 'border-gray-700 hover:border-gray-600 bg-gray-800'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="text-3xl mb-2">{icon}</div>
                        <div className={`font-semibold ${
                          state.themeSettings.mode === mode ? 'text-theme-primary' : ''
                        }`}>{label}</div>
                        <div className={`text-xs mt-1 ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <h3 className={`text-xl font-semibold mb-4 ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>Font Size</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { size: 'small' as const, label: 'Small', preview: 'Aa' },
                      { size: 'medium' as const, label: 'Medium', preview: 'Aa' },
                      { size: 'large' as const, label: 'Large', preview: 'Aa' }
                    ].map(({ size, label, preview }) => (
                      <button
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                          state.themeSettings.fontSize === size
                            ? 'border-theme-primary bg-theme-primary/10'
                            : isDark
                              ? 'border-gray-700 hover:border-gray-600 bg-gray-800'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`mb-2 ${
                          size === 'small' ? 'text-xl' : size === 'medium' ? 'text-2xl' : 'text-3xl'
                        }`}>{preview}</div>
                        <div className={`font-semibold capitalize ${
                          state.themeSettings.fontSize === size ? 'text-theme-primary' : ''
                        }`}>{label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                  {[
                    {
                      id: 'compact',
                      title: 'Compact Mode',
                      desc: 'Reduce spacing for denser layout',
                      icon: '📐',
                      enabled: state.themeSettings.compactMode,
                      toggle: handleCompactModeToggle
                    },
                    {
                      id: 'prompt-nav',
                      title: 'Prompt Navigation',
                      desc: 'Use arrow keys to navigate prompts',
                      icon: '⌨️',
                      enabled: state.themeSettings.promptNavigationEnabled,
                      toggle: () => dispatch({
                        type: 'UPDATE_THEME_SETTINGS',
                        payload: { ...state.themeSettings, promptNavigationEnabled: !state.themeSettings.promptNavigationEnabled }
                      })
                    },
                    {
                      id: 'health',
                      title: 'Health Monitoring',
                      desc: 'Show provider status in status bar',
                      icon: '💚',
                      enabled: state.healthMonitoringEnabled,
                      toggle: () => dispatch({ type: 'TOGGLE_HEALTH_MONITORING', payload: !state.healthMonitoringEnabled })
                    }
                  ].map(item => (
                    <div key={item.id} className={`p-4 rounded-xl flex items-center justify-between ${
                      isDark ? 'bg-gray-800' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <h4 className={`font-semibold ${
                            isDark ? 'text-gray-100' : 'text-gray-900'
                          }`}>{item.title}</h4>
                          <p className={`text-sm ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>{item.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={item.toggle}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          item.enabled ? 'bg-theme-primary' : isDark ? 'bg-gray-700' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                          item.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COLORS TAB */}
            {activeTab === 'colors' && (
              <div className="space-y-6">
                {/* Color Theme Presets */}
                <div>
                  <h3 className={`text-xl font-semibold mb-4 ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>🎨 Theme Presets</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {themePresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset.id)}
                        className={`p-4 rounded-xl border-2 transition-all hover:scale-105 text-left ${
                          state.themeSettings.preset === preset.id
                            ? 'border-theme-primary bg-theme-primary/10 shadow-lg'
                            : isDark
                              ? 'border-gray-700 hover:border-gray-600 bg-gray-800'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex gap-1.5">
                            <div
                              className="w-8 h-8 rounded-full shadow-md"
                              style={{ backgroundColor: preset.preview.primary }}
                            />
                            <div
                              className="w-8 h-8 rounded-full shadow-md"
                              style={{ backgroundColor: preset.preview.secondary }}
                            />
                          </div>
                        </div>
                        <h4 className={`font-bold mb-1 ${
                          state.themeSettings.preset === preset.id ? 'text-theme-primary' : ''
                        }`}>{preset.name}</h4>
                        <p className={`text-xs ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Colors */}
                <div>
                  <h3 className={`text-xl font-semibold mb-4 ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>🖌️ Custom Colors</h3>
                  <div className="space-y-4">
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
                </div>
              </div>
            )}

            {/* ADVANCED TAB */}
            {activeTab === 'advanced' && pwaStatus && (
              <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-xl">📱</span>
                Install App
              </h3>
              
              {pwaStatus.isInstalled || pwaStatus.isStandalone ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">App is installed!</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    You're using the installed version
                  </span>
                </div>
              ) : pwaStatus.isInstallable ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Install Samvada Studio for a faster, app-like experience with offline support.
                  </p>
                  
                  {/* Benefits */}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-dark-200 rounded-full border border-gray-200 dark:border-gray-700">
                      <span className="text-green-500">✓</span> Works offline
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-dark-200 rounded-full border border-gray-200 dark:border-gray-700">
                      <span className="text-green-500">✓</span> Faster loading
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-dark-200 rounded-full border border-gray-200 dark:border-gray-700">
                      <span className="text-green-500">✓</span> Desktop icon
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-dark-200 rounded-full border border-gray-200 dark:border-gray-700">
                      <span className="text-green-500">✓</span> Full-screen
                    </span>
                  </div>

                  {installMessage && (
                    <div className={`text-sm px-3 py-2 rounded-lg ${
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
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 
                      bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                      text-white font-medium rounded-lg transition-all duration-200 
                      ${isInstalling ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-[1.02] active:scale-[0.98]'}`}
                  >
                    {isInstalling ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Installing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Install App
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    App installation is not available in this browser or context.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Try opening in Chrome, Edge, or Safari on a supported device.
                  </p>
                </div>
              )}

              {/* Service Worker Status - Enhanced for Devs */}
              <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-mono">Service Worker</span>
                  <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
                    pwaStatus.swStatus === 'active' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : pwaStatus.swStatus === 'waiting'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {pwaStatus.swStatus.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-mono">Network</span>
                  <span className={`flex items-center gap-1.5 font-mono font-semibold ${
                    pwaStatus.isOnline ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${pwaStatus.isOnline ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></span>
                    {pwaStatus.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-mono">Display Mode</span>
                  <span className="text-gray-700 dark:text-gray-300 font-mono">
                    {pwaStatus.isStandalone ? 'STANDALONE' : 'BROWSER'}
                  </span>
                </div>

                {pwaStatus.swRegistration && (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400 font-mono">Cache Strategy</span>
                      <span className="text-gray-700 dark:text-gray-300 font-mono text-[10px]">
                        Network-First
                      </span>
                    </div>
                    
                    <button
                      onClick={async () => {
                        await pwaStatus.checkForUpdates();
                        setInstallMessage({ type: 'info', text: 'Update check completed.' });
                        setTimeout(() => setInstallMessage(null), 3000);
                      }}
                      className="w-full mt-2 px-3 py-1.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 
                        hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 
                        rounded border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        CHECK FOR UPDATES
                      </span>
                    </button>
                  </>
                )}

                {/* Developer Info */}
                <details className="mt-3 pt-2 border-t border-blue-100 dark:border-blue-900">
                  <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 font-mono">
                    🔧 Developer Info
                  </summary>
                  <div className="mt-2 space-y-1 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Version:</span>
                      <span className="text-gray-700 dark:text-gray-300">v0.1.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Installable:</span>
                      <span className="text-gray-700 dark:text-gray-300">{pwaStatus.isInstallable ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Update Available:</span>
                      <span className="text-gray-700 dark:text-gray-300">{pwaStatus.needsUpdate ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">PWA Standard:</span>
                      <span className="text-gray-700 dark:text-gray-300">Manifest + SW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Scope:</span>
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]" title={window.location.origin}>
                        {window.location.pathname}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Build:</span>
                      <span className="text-gray-700 dark:text-gray-300">Production</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Features:</span>
                      <span className="text-gray-700 dark:text-gray-300">26+</span>
                    </div>
                  </div>
                </details>
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Live Preview Panel - Right Side */}
          <div className={`w-96 border-l p-6 overflow-y-auto ${
            isDark ? 'border-gray-700 bg-gray-850' : 'border-gray-200 bg-gray-50'
          }`}>
            <h3 className={`text-xl font-bold mb-6 ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>✨ Live Preview</h3>
            
            {/* Current Theme Name */}
            <div className="mb-4">
              <p className={`text-sm font-medium ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>Current Theme</p>
              <p className="text-lg font-bold text-theme-primary">
                {getThemePreset(state.themeSettings.preset)?.name || 'Custom Theme'}
              </p>
            </div>

            {/* Color Circles */}
            <div className="flex gap-3 mb-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-theme-primary shadow-lg border-4 border-white dark:border-gray-700"></div>
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">Primary</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-theme-secondary shadow-lg border-4 border-white dark:border-gray-700"></div>
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">Secondary</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-theme-accent shadow-lg border-4 border-white dark:border-gray-700"></div>
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">Accent</span>
              </div>
            </div>

            {/* Buttons Preview */}
            <div className="space-y-3 mb-6">
              <button className="w-full px-4 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg">
                Primary Button
              </button>
              <button className="w-full px-4 py-3 border-2 border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white rounded-lg font-medium transition-all">
                Outline Button
              </button>
              <button className="w-full px-4 py-3 bg-theme-secondary hover:bg-theme-accent text-white rounded-lg font-medium transition-all">
                Secondary Button
              </button>
            </div>

            {/* Mini UI Preview */}
            <div className={`p-4 rounded-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}>
              <div className="h-2 w-full bg-gradient-to-r from-theme-primary via-theme-accent to-theme-secondary rounded-full mb-4"></div>
              <div className="space-y-3">
                <div className={`h-3 rounded ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                } w-3/4`}></div>
                <div className={`h-3 rounded ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                } w-full`}></div>
                <div className={`h-3 rounded ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                } w-5/6`}></div>
                <div className="flex gap-2 mt-4">
                  <div className="h-8 w-8 rounded bg-theme-primary"></div>
                  <div className="h-8 flex-1 rounded bg-theme-primary/20"></div>
                </div>
              </div>
            </div>

            {/* Theme Info */}
            <div className={`mt-6 p-3 rounded-lg text-xs ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              <p className={`font-semibold mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>Applied To:</p>
              <ul className={`space-y-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <li>• Top bar accent strip</li>
                <li>• App branding</li>
                <li>• Buttons & links</li>
                <li>• Selection highlights</li>
                <li>• Active states</li>
              </ul>
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