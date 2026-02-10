import { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { generateId } from '../../utils/helpers';
import { testProviderConnection } from '../../utils/llmService';
import type { LLMProviderConfig } from '../../types';
import ProviderCard from './ProviderCard';
import ProviderForm from './ProviderForm';
import { OllamaConfigPanel } from './OllamaConfigPanel';
import DeveloperTools from './DeveloperTools';
import LocalNetworkAccess from './LocalNetworkAccess';
import PWAStatusPanel from './PWAStatusPanel';
import PWAAdvancedControls from './PWAAdvancedControls';
import useProviderHealthMonitor from '../../hooks/useProviderHealthMonitor';
import type { PWAStatus } from '../../hooks/usePWA';

interface AdminPanelProps {
  pwaStatus: PWAStatus;
}

export default function AdminPanel({ pwaStatus }: AdminPanelProps) {
  const { state, dispatch } = useChat();
  const [activeTab, setActiveTab] = useState<'providers' | 'settings' | 'pwa' | 'developer' | 'ollama'>('providers');
  const [editingProvider, setEditingProvider] = useState<LLMProviderConfig | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingEditProvider, setPendingEditProvider] = useState<LLMProviderConfig | 'add' | null>(null);
  const isDark =
    state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const repoUrl = 'https://github.com/dhruvinrsoni/samvada-studio';
  const appVersion = import.meta.env.APP_VERSION || '0.0.0';
  const gitCommit = import.meta.env.GIT_COMMIT || 'unknown';
  const gitCommitDate = (import.meta.env as any).GIT_COMMIT_DATE || 'unknown';
  const buildTimestamp = (import.meta.env as any).BUILD_TIMESTAMP || 'unknown';
  const [ciStatus, setCiStatus] = useState<{
    status: 'loading' | 'success' | 'failure' | 'running' | 'error' | 'unknown';
    url?: string;
    updatedAt?: string;
  }>({ status: 'loading' });

  // Centralized health monitoring for all providers (only when panel is open and on providers tab)
  const { healthStatus } = useProviderHealthMonitor({
    providers: state.providers,
    enabled: state.isAdminPanelOpen && activeTab === 'providers' && (state.healthMonitoringEnabled ?? true),
  });

  // Auto-create Ollama provider when discovered
  useEffect(() => {
    const handleOllamaDiscovered = (event: CustomEvent) => {
      const { baseUrl, models, endpoint } = event.detail;
      
      // Check if Ollama provider already exists with this endpoint
      const existingProvider = state.providers.find(
        p => p.type === 'ollama' && p.apiEndpoint === baseUrl
      );
      
      if (existingProvider) {
        console.log('Ollama provider already exists:', existingProvider.name);
        return;
      }
      
      // Auto-create Ollama provider
      const newProvider: LLMProviderConfig = {
        id: generateId(),
        name: `Ollama (${endpoint.host})`,
        type: 'ollama',
        apiEndpoint: baseUrl, // This should already include /api/generate from the event
        model: models && models.length > 0 ? models[0] : 'llama2',
        isEnabled: true,
        isDefault: state.providers.length === 0, // Set as default if no other providers
        settings: {
          temperature: 0.7,
          maxTokens: 4096,
        },
      };
      
      dispatch({ type: 'ADD_PROVIDER', payload: newProvider });
      
      // Show notification
      console.log('Auto-created Ollama provider:', newProvider.name);
    };
    
    window.addEventListener('ollama-discovered', handleOllamaDiscovered as EventListener);
    return () => window.removeEventListener('ollama-discovered', handleOllamaDiscovered as EventListener);
  }, [state.providers, dispatch]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchCiStatus = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/dhruvinrsoni/samvada-studio/actions/runs?per_page=1',
          { signal: controller.signal }
        );
        if (!response.ok) {
          setCiStatus({ status: 'error' });
          return;
        }
        const data = await response.json();
        const latest = data.workflow_runs?.[0];
        if (!latest) {
          setCiStatus({ status: 'unknown' });
          return;
        }
        const runStatus = latest.status as string | undefined;
        const conclusion = latest.conclusion as string | undefined;
        const status = runStatus !== 'completed'
          ? 'running'
          : conclusion === 'success'
            ? 'success'
            : conclusion === 'failure' || conclusion === 'cancelled'
              ? 'failure'
              : 'unknown';

        setCiStatus({
          status,
          url: latest.html_url,
          updatedAt: latest.updated_at,
        });
      } catch {
        setCiStatus({ status: 'error' });
      }
    };

    fetchCiStatus();
    return () => controller.abort();
  }, []);

  if (!state.isAdminPanelOpen) return null;

  const handleEditProvider = (provider: LLMProviderConfig) => {
    // If already editing and has unsaved changes, ask for confirmation
    if ((editingProvider || isAddingProvider) && hasUnsavedChanges) {
      setPendingEditProvider(provider);
      return;
    }
    
    // Otherwise, switch to editing this provider
    setIsAddingProvider(false);
    setEditingProvider(provider);
    setHasUnsavedChanges(false);
    setPendingEditProvider(null);
    
    // Scroll to the provider card after a brief delay to allow rendering
    setTimeout(() => {
      const element = document.getElementById(`provider-${provider.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleAddNewProvider = () => {
    // If already editing and has unsaved changes, ask for confirmation
    if ((editingProvider || isAddingProvider) && hasUnsavedChanges) {
      setPendingEditProvider('add'); // Use 'add' to signal "add new"
      return;
    }
    
    // Otherwise, switch to add mode
    setEditingProvider(null);
    setIsAddingProvider(true);
    setHasUnsavedChanges(false);
    
    // Scroll to top after a brief delay
    setTimeout(() => {
      const element = document.getElementById('add-provider-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleConfirmSwitch = () => {
    if (pendingEditProvider === 'add') {
      // User wants to add new provider
      setEditingProvider(null);
      setIsAddingProvider(true);
      setHasUnsavedChanges(false);
      setPendingEditProvider(null);
    } else if (pendingEditProvider) {
      // User wants to edit another provider
      setIsAddingProvider(false);
      setEditingProvider(pendingEditProvider);
      setHasUnsavedChanges(false);
      setPendingEditProvider(null);
      
      // Scroll to the provider
      setTimeout(() => {
        const element = document.getElementById(`provider-${pendingEditProvider.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  const handleCancelSwitch = () => {
    setPendingEditProvider(null);
  };

  const handleAddProvider = (config: Omit<LLMProviderConfig, 'id'>) => {
    const newProvider: LLMProviderConfig = {
      ...config,
      id: generateId(),
    };
    dispatch({ type: 'ADD_PROVIDER', payload: newProvider });
    setIsAddingProvider(false);
    setHasUnsavedChanges(false);
  };

  const handleUpdateProvider = (config: LLMProviderConfig) => {
    dispatch({ type: 'UPDATE_PROVIDER', payload: config });
    setEditingProvider(null);
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
    setIsAddingProvider(false);
    setEditingProvider(null);
    setHasUnsavedChanges(false);
  };

  const handleDeleteProvider = (id: string) => {
    if (confirm('Are you sure you want to delete this provider?')) {
      dispatch({ type: 'DELETE_PROVIDER', payload: id });
    }
  };

  const handleSetDefault = (id: string) => {
    dispatch({ type: 'SET_DEFAULT_PROVIDER', payload: id });
  };

  const handleTestProvider = async (provider: LLMProviderConfig) => {
    dispatch({ type: 'TEST_PROVIDER', payload: { id: provider.id, status: 'pending' } });
    
    try {
      const result = await testProviderConnection(provider);
      
      if (result.success) {
        dispatch({ 
          type: 'TEST_PROVIDER', 
          payload: { 
            id: provider.id, 
            status: 'success', 
            message: result.message 
          } 
        });
      } else {
        dispatch({ 
          type: 'TEST_PROVIDER', 
          payload: { 
            id: provider.id, 
            status: 'failed', 
            message: result.message,
            errorDetails: result.errorDetails,
            rawResponse: result.rawResponse
          } 
        });
      }
    } catch (error) {
      dispatch({ 
        type: 'TEST_PROVIDER', 
        payload: { 
          id: provider.id, 
          status: 'failed', 
          message: error instanceof Error ? error.message : 'Test failed' 
        } 
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'TOGGLE_ADMIN_PANEL' })}
      />
      
      {/* Panel - responsive width and height */}
      <div className={`relative w-full max-w-[98vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] mx-0 sm:mx-4 rounded-xl shadow-2xl overflow-hidden flex flex-col ${
        isDark ? 'bg-dark-200' : 'bg-white'
      }`}>
        {/* Header - responsive with vertical tabs on mobile */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 md:p-4 border-b gap-2 sm:gap-4 flex-shrink-0 ${
          isDark ? 'border-dark-100' : 'border-light-400'
        }`}>
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
            <h2 className={`text-base sm:text-lg md:text-xl font-bold flex items-center gap-1 sm:gap-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              ⚙️ <span className="hidden xs:inline">Admin Settings</span><span className="xs:hidden">Settings</span>
            </h2>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_ADMIN_PANEL' })}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors sm:hidden min-w-[32px] min-h-[32px] flex items-center justify-center ${
                isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
              }`}
            >
              ✕
            </button>
          </div>
          {/* Tabs - horizontal scroll on mobile, always show labels */}
          <div className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-1 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth">
            <button
              onClick={() => setActiveTab('providers')}
              className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-1.5 snap-start ${
                activeTab === 'providers'
                  ? 'bg-theme-primary text-white shadow-lg'
                  : isDark 
                    ? 'text-gray-400 hover:bg-dark-100 hover:text-gray-200' 
                    : 'text-gray-600 hover:bg-light-300 hover:text-gray-800'
              }`}
            >
              <span className="text-sm sm:text-base">🤖</span>
              <span className="text-xs sm:text-sm">Providers</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-1.5 snap-start ${
                activeTab === 'settings'
                  ? 'bg-theme-primary text-white shadow-lg'
                  : isDark 
                    ? 'text-gray-400 hover:bg-dark-100 hover:text-gray-200' 
                    : 'text-gray-600 hover:bg-light-300 hover:text-gray-800'
              }`}
            >
              <span className="text-sm sm:text-base">🔧</span>
              <span className="text-xs sm:text-sm">General</span>
            </button>
            <button
              onClick={() => setActiveTab('pwa')}
              className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-1.5 snap-start ${
                activeTab === 'pwa'
                  ? 'bg-theme-primary text-white shadow-lg'
                  : isDark 
                    ? 'text-gray-400 hover:bg-dark-100 hover:text-gray-200' 
                    : 'text-gray-600 hover:bg-light-300 hover:text-gray-800'
              }`}
            >
              <span className="text-sm sm:text-base">📱</span>
              <span className="text-[11px] sm:text-xs md:text-sm">PWA</span>
            </button>
            <button
              onClick={() => setActiveTab('developer')}
              className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-1.5 snap-start ${
                activeTab === 'developer'
                  ? 'bg-theme-primary text-white shadow-lg'
                  : isDark 
                    ? 'text-gray-400 hover:bg-dark-100 hover:text-gray-200' 
                    : 'text-gray-600 hover:bg-light-300 hover:text-gray-800'
              }`}
            >
              <span className="text-sm sm:text-base">🛠️</span>
              <span className="text-[11px] sm:text-xs md:text-sm">Developer</span>
            </button>
            <button
              onClick={() => setActiveTab('ollama')}
              className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 sm:gap-1.5 snap-start ${
                activeTab === 'ollama'
                  ? 'bg-theme-primary text-white shadow-lg'
                  : isDark 
                    ? 'text-gray-400 hover:bg-dark-100 hover:text-gray-200' 
                    : 'text-gray-600 hover:bg-light-300 hover:text-gray-800'
              }`}
            >
              <span className="text-sm sm:text-base">🦙</span>
              <span className="text-[11px] sm:text-xs md:text-sm">Ollama</span>
            </button>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_ADMIN_PANEL' })}
            className={`hidden sm:flex p-1.5 sm:p-2 rounded-lg transition-colors min-w-[32px] min-h-[32px] items-center justify-center flex-shrink-0 ${
              isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="p-2 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden flex-1 scroll-touch">
          {activeTab === 'providers' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Add Provider Button - responsive layout */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configure your LLM backends.
                </p>
                <button
                  onClick={handleAddNewProvider}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  + Add Provider
                </button>
              </div>

              {/* Add New Provider Form (at top) */}
              {isAddingProvider && (
                <div id="add-provider-form">
                  <ProviderForm
                    provider={null}
                    onSave={handleAddProvider}
                    onCancel={handleCancel}
                    onFormChange={(hasChanges) => setHasUnsavedChanges(hasChanges)}
                  />
                </div>
              )}

              {/* Unsaved Changes Confirmation Dialog - responsive */}
              {pendingEditProvider !== null && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancelSwitch} />
                  <div className={`relative p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-md ${
                    isDark ? 'bg-dark-200' : 'bg-white'
                  }`}>
                    <h3 className={`text-base sm:text-lg font-bold mb-2 sm:mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      ⚠️ Unsaved Changes
                    </h3>
                    <p className={`text-xs sm:text-sm mb-3 sm:mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      You have unsaved changes. Discard them?
                    </p>
                    <div className="flex gap-2 sm:gap-3 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelSwitch();
                        }}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium ${
                          isDark 
                            ? 'bg-dark-100 text-gray-400 hover:bg-dark-50' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmSwitch();
                        }}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs sm:text-sm font-medium"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Provider List - responsive empty state */}
              {state.providers.length === 0 && !isAddingProvider ? (
                <div className={`text-center py-8 sm:py-12 rounded-lg border-2 border-dashed ${
                  isDark ? 'border-dark-100 text-gray-500' : 'border-light-400 text-gray-400'
                }`}>
                  <p className="text-sm sm:text-lg mb-1 sm:mb-2">No LLM providers configured</p>
                  <p className="text-xs sm:text-sm mb-3 sm:mb-4">Add OpenAI, Claude, Gemini, or Ollama</p>
                  <button
                    onClick={handleAddNewProvider}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-xs sm:text-sm"
                  >
                    Add Your First Provider
                  </button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {state.providers.map(provider => {
                    const health = healthStatus.find(h => h.providerId === provider.id);
                    const isEditingThis = editingProvider?.id === provider.id;
                    
                    return (
                      <div key={provider.id} id={`provider-${provider.id}`}>
                        {/* Provider Card */}
                        <ProviderCard
                          provider={provider}
                          isDefault={provider.id === state.defaultProviderId}
                          providerHealth={health}
                          onEdit={() => handleEditProvider(provider)}
                          onDelete={() => handleDeleteProvider(provider.id)}
                          onSetDefault={() => handleSetDefault(provider.id)}
                          onTest={() => handleTestProvider(provider)}
                        />
                        
                        {/* Inline Edit Form */}
                        {isEditingThis && (
                          <div className="mt-4">
                            <ProviderForm
                              provider={editingProvider}
                              onSave={(config) => handleUpdateProvider({ ...editingProvider, ...config })}
                              onCancel={handleCancel}
                              onFormChange={(hasChanges) => setHasUnsavedChanges(hasChanges)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Local Network Access */}
              <LocalNetworkAccess isDark={isDark} />

              <div className={`p-4 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300' : 'border-light-400 bg-light-200'}`}>
                <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  General Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Theme</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Choose your preferred theme
                      </p>
                    </div>
                    <select
                      value={state.themeSettings.mode}
                      onChange={(e) => dispatch({ type: 'UPDATE_THEME_SETTINGS', payload: { mode: e.target.value as 'light' | 'dark' | 'auto' } })}
                      className={`px-3 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-dark-200 border-dark-100 text-gray-200' 
                          : 'bg-white border-light-400 text-gray-800'
                      }`}
                    >
                      <option value="dark">🌙 Dark</option>
                      <option value="light">☀️ Light</option>
                      <option value="auto">🖥️ Auto (system)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Default Provider
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Select the default LLM provider for new chats
                      </p>
                    </div>
                    <select
                      value={state.defaultProviderId || ''}
                      onChange={(e) => dispatch({ type: 'SET_DEFAULT_PROVIDER', payload: e.target.value })}
                      className={`px-3 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-dark-200 border-dark-100 text-gray-200' 
                          : 'bg-white border-light-400 text-gray-800'
                      }`}
                    >
                      <option value="">None</option>
                      {state.providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* System Settings */}
              <div className={`p-4 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300' : 'border-light-400 bg-light-200'}`}>
                <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  System Settings
                </h3>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        App Version
                      </p>
                      <div className={`text-sm font-mono ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        <a
                          href={`${repoUrl}/releases/tag/v${appVersion}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                          title="View release on GitHub"
                        >
                          v{appVersion}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Git Commit
                      </p>
                      <div className={`text-sm font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {gitCommit !== 'unknown' ? (
                          <a
                            href={`${repoUrl}/commit/${gitCommit}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                            title="View commit on GitHub"
                          >
                            {gitCommit}
                          </a>
                        ) : (
                          gitCommit
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Committed
                      </p>
                      <div className={`text-sm font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {gitCommitDate}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Built
                      </p>
                      <div className={`text-sm font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {buildTimestamp}
                      </div>
                    </div>

                    <div className="mt-2">
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Release build, git commit, commit date, and build timestamp (IST +05:30)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        CI Status
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Latest GitHub Actions run
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ciStatus.status === 'success'
                          ? (isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')
                          : ciStatus.status === 'failure'
                            ? (isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')
                            : ciStatus.status === 'running'
                              ? (isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800')
                              : (isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700')
                      }`}>
                        {ciStatus.status === 'loading' ? 'Checking…' : ciStatus.status}
                      </span>
                      <a
                        href={ciStatus.url || `${repoUrl}/actions`}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-sm font-medium hover:underline ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        View
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Health Monitoring
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Monitor LLM provider connectivity and response times
                      </p>
                      {!state.healthMonitoringEnabled && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                          Status bar is hidden when disabled
                        </p>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.healthMonitoringEnabled ?? true}
                        onChange={(e) => dispatch({ type: 'TOGGLE_HEALTH_MONITORING', payload: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary ${
                        isDark ? 'bg-gray-600' : 'bg-gray-300'
                      }`}></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Prompt Navigation
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Navigate between prompts using arrow keys (like VS Code)
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        ↑ on first line = previous prompt, ↓ on last line = next prompt, ESC = exit
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.promptNavigationEnabled ?? true}
                        onChange={(e) => dispatch({ type: 'TOGGLE_PROMPT_NAVIGATION', payload: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary ${
                        isDark ? 'bg-gray-600' : 'bg-gray-300'
                      }`}></div>
                    </label>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300' : 'border-light-400 bg-light-200'}`}>
                <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  Data Management
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Export Data
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Download all your chats and settings
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const data = JSON.stringify(state, null, 2);
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `samvada-studio-export-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                      }}
                      className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-sm"
                    >
                      📥 Export JSON
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium text-red-500`}>Clear All Data</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Delete all chats, providers, and settings
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure? This will delete ALL your data!')) {
                          try {
                            // Clear app state only
                            localStorage.removeItem('samvada-studio-state');
                            alert('All data cleared. You can reload the page to see the changes take effect.');
                          } catch (e) {
                            // fallback to clear all if removal fails
                            localStorage.clear();
                            alert('All data cleared (including fallback). You can reload the page to see the changes take effect.');
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      🗑️ Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PWA Tab */}
          {activeTab === 'pwa' && (
            <div className="space-y-6">
              {/* PWA Info Banner */}
              <div className={`p-4 rounded-lg border ${
                isDark ? 'border-purple-900 bg-purple-900/20' : 'border-purple-200 bg-purple-50'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📱</span>
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 ${
                      isDark ? 'text-purple-200' : 'text-purple-900'
                    }`}>
                      Progressive Web App (PWA)
                    </h3>
                    <p className={`text-sm ${
                      isDark ? 'text-purple-300' : 'text-purple-700'
                    }`}>
                      Install Samvada Studio as a native app for offline access, faster performance, and desktop integration.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main PWA Installation & Status */}
              <PWAStatusPanel pwaStatus={pwaStatus} isDark={isDark} />

              {/* Advanced PWA Controls */}
              <PWAAdvancedControls pwaStatus={pwaStatus} isDark={isDark} />
            </div>
          )}

          {/* Developer Tab */}
          {activeTab === 'developer' && (
            <div className="space-y-6">
              <DeveloperTools />
            </div>
          )}

          {/* Ollama Configuration Tab */}
          {activeTab === 'ollama' && (
            <div className="space-y-6">
              <OllamaConfigPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
