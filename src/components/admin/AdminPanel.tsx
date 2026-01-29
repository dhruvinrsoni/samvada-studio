import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { generateId } from '../../utils/helpers';
import { testProviderConnection } from '../../utils/llmService';
import type { LLMProviderConfig } from '../../types';
import ProviderCard from './ProviderCard';
import ProviderForm from './ProviderForm';
import DeveloperTools from './DeveloperTools';
import LocalNetworkAccess from './LocalNetworkAccess';
import PWAStatusPanel from './PWAStatusPanel';
import useProviderHealthMonitor from '../../hooks/useProviderHealthMonitor';
import type { PWAStatus } from '../../hooks/usePWA';

interface AdminPanelProps {
  pwaStatus: PWAStatus;
}

export default function AdminPanel({ pwaStatus }: AdminPanelProps) {
  const { state, dispatch } = useChat();
  const [activeTab, setActiveTab] = useState<'providers' | 'settings' | 'developer'>('providers');
  const [editingProvider, setEditingProvider] = useState<LLMProviderConfig | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const isDark = state.theme === 'dark';

  // Centralized health monitoring for all providers (only when panel is open and on providers tab)
  const { healthStatus } = useProviderHealthMonitor({
    providers: state.providers,
    enabled: state.isAdminPanelOpen && activeTab === 'providers' && (state.healthMonitoringEnabled ?? true),
  });

  if (!state.isAdminPanelOpen) return null;

  const handleAddProvider = (config: Omit<LLMProviderConfig, 'id'>) => {
    const newProvider: LLMProviderConfig = {
      ...config,
      id: generateId(),
    };
    dispatch({ type: 'ADD_PROVIDER', payload: newProvider });
    setIsAddingProvider(false);
  };

  const handleUpdateProvider = (config: LLMProviderConfig) => {
    dispatch({ type: 'UPDATE_PROVIDER', payload: config });
    setEditingProvider(null);
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
          payload: { id: provider.id, status: 'success', message: result.message } 
        });
      } else {
        dispatch({ 
          type: 'TEST_PROVIDER', 
          payload: { 
            id: provider.id, 
            status: 'failed', 
            message: result.message 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'TOGGLE_ADMIN_PANEL' })}
      />
      
      {/* Panel */}
      <div className={`relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-dark-200' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-dark-100' : 'border-light-400'
        }`}>
          <div className="flex items-center gap-4">
            <h2 className={`text-xl font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              ⚙️ Admin Settings
            </h2>
            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('providers')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'providers'
                    ? 'bg-primary-600 text-white'
                    : isDark 
                      ? 'text-gray-400 hover:bg-dark-100' 
                      : 'text-gray-600 hover:bg-light-300'
                }`}
              >
                🤖 LLM Providers
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-primary-600 text-white'
                    : isDark 
                      ? 'text-gray-400 hover:bg-dark-100' 
                      : 'text-gray-600 hover:bg-light-300'
                }`}
              >
                🔧 General
              </button>
              <button
                onClick={() => setActiveTab('developer')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'developer'
                    ? 'bg-primary-600 text-white'
                    : isDark 
                      ? 'text-gray-400 hover:bg-dark-100' 
                      : 'text-gray-600 hover:bg-light-300'
                }`}
              >
                🛠️ Developer
              </button>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_ADMIN_PANEL' })}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {activeTab === 'providers' && (
            <div className="space-y-6">
              {/* Add Provider Button */}
              <div className="flex justify-between items-center">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configure your LLM backends. Add API keys and test connections.
                </p>
                <button
                  onClick={() => setIsAddingProvider(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                >
                  + Add Provider
                </button>
              </div>

              {/* Provider List */}
              {state.providers.length === 0 && !isAddingProvider ? (
                <div className={`text-center py-12 rounded-lg border-2 border-dashed ${
                  isDark ? 'border-dark-100 text-gray-500' : 'border-light-400 text-gray-400'
                }`}>
                  <p className="text-lg mb-2">No LLM providers configured</p>
                  <p className="text-sm mb-4">Add providers like OpenAI, Claude, Gemini, or Ollama</p>
                  <button
                    onClick={() => setIsAddingProvider(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Add Your First Provider
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {state.providers.map(provider => {
                    const health = healthStatus.find(h => h.providerId === provider.id);
                    return (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        isDefault={provider.id === state.defaultProviderId}
                        providerHealth={health}
                        onEdit={() => setEditingProvider(provider)}
                        onDelete={() => handleDeleteProvider(provider.id)}
                        onSetDefault={() => handleSetDefault(provider.id)}
                        onTest={() => handleTestProvider(provider)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Add/Edit Provider Form */}
              {(isAddingProvider || editingProvider) && (
                <ProviderForm
                  provider={editingProvider}
                  onSave={(config) => {
                    if (editingProvider) {
                      handleUpdateProvider({ ...editingProvider, ...config });
                    } else {
                      handleAddProvider(config);
                    }
                  }}
                  onCancel={() => {
                    setIsAddingProvider(false);
                    setEditingProvider(null);
                  }}
                />
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Local Network Access */}
              <LocalNetworkAccess isDark={isDark} />

              {/* PWA Status and Management */}
              <PWAStatusPanel pwaStatus={pwaStatus} isDark={isDark} />

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
                      value={state.theme}
                      onChange={(e) => dispatch({ type: 'SET_THEME', payload: e.target.value as 'light' | 'dark' })}
                      className={`px-3 py-2 rounded-lg border ${
                        isDark 
                          ? 'bg-dark-200 border-dark-100 text-gray-200' 
                          : 'bg-white border-light-400 text-gray-800'
                      }`}
                    >
                      <option value="dark">🌙 Dark</option>
                      <option value="light">☀️ Light</option>
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
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 ${
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
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
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

          {/* Developer Tab */}
          {activeTab === 'developer' && (
            <DeveloperTools />
          )}
        </div>
      </div>
    </div>
  );
}
