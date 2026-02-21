// Ollama Configuration Panel - Spring Boot-style auto-configuration dashboard
// Live endpoint status, model discovery, quick-add providers, network scanning
import React, { useState, useEffect, useCallback } from 'react';
import { ollamaDiscovery, type OllamaConfiguration } from '../../services/ollamaDiscovery';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { generateId } from '../../utils/helpers';
import type { LLMProviderConfig } from '../../types';

// Utility to format bytes
const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface EndpointStatus {
  baseUrl: string;
  label?: string;
  isHealthy: boolean;
  responseTime: number;
  version?: string;
  models: { name: string; size?: number }[];
  error?: string;
}

export const OllamaConfigPanel: React.FC = () => {
  const { state, dispatch } = useChat();
  const { addToast } = useToast();
  const isDark =
    state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [config, setConfig] = useState<OllamaConfiguration>(ollamaDiscovery.getConfiguration());
  const [endpointStatuses, setEndpointStatuses] = useState<EndpointStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNetworkSettings, setShowNetworkSettings] = useState(false);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('ollama-expanded-endpoints');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [newEndpoint, setNewEndpoint] = useState({
    host: '',
    port: 11434,
    protocol: 'http' as 'http' | 'https',
    label: '',
  });

  // Card / section styling
  const cardClass = `rounded-lg p-4 border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-400'}`;
  const inputClass = `w-full p-2 rounded-lg border text-sm ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400 text-gray-800'}`;
  const labelClass = `block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const textPrimary = isDark ? 'text-gray-200' : 'text-gray-800';

  // ---------- Refresh endpoint statuses ----------
  const refreshStatuses = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const results = await ollamaDiscovery.getEndpointsWithModels();
      setEndpointStatuses(results.map(r => ({
        baseUrl: r.baseUrl,
        label: r.endpoint.label,
        isHealthy: r.isHealthy,
        responseTime: r.responseTime,
        version: r.version,
        models: r.models,
        error: r.error,
      })));
    } catch (err) {
      console.warn('Failed to refresh endpoint statuses', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  // ---------- Toggle endpoint expansion with persistence ----------
  const toggleEndpointExpanded = (baseUrl: string) => {
    setExpandedEndpoints(prev => {
      const updated = new Set(prev);
      if (updated.has(baseUrl)) {
        updated.delete(baseUrl);
      } else {
        updated.add(baseUrl);
      }
      localStorage.setItem('ollama-expanded-endpoints', JSON.stringify(Array.from(updated)));
      return updated;
    });
  };

  // ---------- Run full discovery (LAN/WiFi/Port scans) ----------
  const handleDiscovery = async () => {
    setIsDiscovering(true);
    try {
      const result = await ollamaDiscovery.discoverEndpoint();
      if (result && result.isHealthy) {
        const existing = config.endpoints.find(
          e => e.host === result.endpoint.host && e.port === result.endpoint.port
        );
        if (!existing) {
          ollamaDiscovery.addEndpoint({
            host: result.endpoint.host,
            port: result.endpoint.port,
            protocol: result.endpoint.protocol,
            label: `Auto-discovered (${result.endpoint.host})`,
          });
          setConfig(ollamaDiscovery.getConfiguration());
        }

        const baseUrl = `${result.endpoint.protocol}://${result.endpoint.host}:${result.endpoint.port}/api/generate`;
        localStorage.setItem('ollama-discovered-base-url', baseUrl);

        window.dispatchEvent(new CustomEvent('ollama-discovered', {
          detail: {
            baseUrl,
            version: result.version,
            models: result.models || [],
            endpoint: result.endpoint,
          },
        }));

        addToast('success', 'Ollama Found!', `Discovered at ${result.endpoint.host}:${result.endpoint.port}${existing ? ' (already configured)' : ''}`);
      } else {
        addToast('error', 'Discovery Failed', 'No healthy Ollama endpoints found. Add a custom endpoint below.');
      }
    } catch (error: any) {
      addToast('error', 'Discovery Error', error.message);
    } finally {
      setIsDiscovering(false);
      await refreshStatuses();
    }
  };

  // ---------- Add endpoint ----------
  const handleAddEndpoint = () => {
    if (!newEndpoint.host) {
      addToast('error', 'Missing Host', 'Enter a host address or IP');
      return;
    }
    ollamaDiscovery.addEndpoint({
      host: newEndpoint.host,
      port: newEndpoint.port,
      protocol: newEndpoint.protocol,
      label: newEndpoint.label || `${newEndpoint.host}:${newEndpoint.port}`,
    });
    setConfig(ollamaDiscovery.getConfiguration());
    setNewEndpoint({ host: '', port: 11434, protocol: 'http', label: '' });
    setShowAddForm(false);
    addToast('success', 'Endpoint Added', `${newEndpoint.protocol}://${newEndpoint.host}:${newEndpoint.port}`);
    refreshStatuses();
  };

  const handleRemoveEndpoint = (host: string, port: number) => {
    ollamaDiscovery.removeEndpoint(host, port);
    setConfig(ollamaDiscovery.getConfiguration());
    refreshStatuses();
  };

  // ---------- Toggle model provider (add/remove) ----------
  const handleToggleModel = (baseUrl: string, modelName: string) => {
    const existing = state.providers.find(
      p => p.type === 'ollama' && p.apiEndpoint === `${baseUrl}/api/generate` && p.model === modelName
    );

    if (existing) {
      // Remove provider
      dispatch({ type: 'DELETE_PROVIDER', payload: existing.id });
      addToast('info', 'Provider Removed', `${modelName} removed from providers`);
    } else {
      // Add provider
      const newProvider: LLMProviderConfig = {
        id: generateId(),
        name: `Ollama · ${modelName}`,
        type: 'ollama',
        apiEndpoint: `${baseUrl}/api/generate`,
        model: modelName,
        isEnabled: true,
        isDefault: state.providers.length === 0,
        settings: { temperature: 0.7, maxTokens: 4096 },
        testStatus: 'untested',
      };
      dispatch({ type: 'ADD_PROVIDER', payload: newProvider });
      addToast('success', 'Provider Added', `${modelName} added as LLM provider`);
    }
  };

  // ---------- Bulk import all models from an endpoint ----------
  const handleImportAllModels = (baseUrl: string, models: { name: string; size?: number }[]) => {
    let added = 0;
    for (const model of models) {
      const exists = state.providers.find(
        p => p.type === 'ollama' && p.apiEndpoint === `${baseUrl}/api/generate` && p.model === model.name
      );
      if (!exists) {
        const newProvider: LLMProviderConfig = {
          id: generateId(),
          name: `Ollama · ${model.name}`,
          type: 'ollama',
          apiEndpoint: `${baseUrl}/api/generate`,
          model: model.name,
          isEnabled: true,
          isDefault: state.providers.length === 0 && added === 0,
          settings: { temperature: 0.7, maxTokens: 4096 },
          testStatus: 'untested',
        };
        dispatch({ type: 'ADD_PROVIDER', payload: newProvider });
        added++;
      }
    }
    if (added > 0) {
      addToast('success', 'Models Imported', `${added} model${added > 1 ? 's' : ''} added as providers from ${baseUrl}`);
    } else {
      addToast('info', 'No New Models', 'All models from this endpoint are already configured.');
    }
  };

  // ---------- Config changes ----------
  const handleConfigChange = (key: keyof OllamaConfiguration, value: any) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    ollamaDiscovery.saveConfiguration(updated);
  };

  const handleExport = () => {
    const json = ollamaDiscovery.exportConfiguration();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ollama-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        if (ollamaDiscovery.importConfiguration(text)) {
          setConfig(ollamaDiscovery.getConfiguration());
          addToast('success', 'Imported', 'Configuration imported successfully');
          refreshStatuses();
        } else {
          addToast('error', 'Import Failed', 'Invalid configuration file');
        }
      }
    };
    input.click();
  };

  const handleReset = () => {
    ollamaDiscovery.clearEndpoints();
    ollamaDiscovery.reset();
    setConfig(ollamaDiscovery.getConfiguration());
    setEndpointStatuses([]);
    addToast('info', 'Reset', 'Ollama configuration reset to defaults');
  };

  // Count healthy endpoints and total models
  const healthyCount = endpointStatuses.filter(e => e.isHealthy).length;
  const totalModels = endpointStatuses.reduce((sum, e) => sum + e.models.length, 0);

  return (
    <div className="space-y-5">
      {/* ────── Header ────── */}
      <div className={`pb-3 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold ${textPrimary}`}>🦙 Ollama Hub</h3>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              Auto-discovery · Live status · One-click provider setup
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              healthyCount > 0
                ? 'bg-green-500/20 text-green-500'
                : isDark ? 'bg-dark-100 text-gray-500' : 'bg-light-300 text-gray-500'
            }`}>
              {healthyCount} host{healthyCount !== 1 ? 's' : ''} online
            </span>
            {totalModels > 0 && (
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-dark-100 text-gray-400' : 'bg-light-300 text-gray-600'}`}>
                {totalModels} model{totalModels !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ────── Live Endpoint Dashboard ────── */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`font-semibold text-sm ${textPrimary}`}>📡 Endpoint Status</h4>
          <button
            onClick={refreshStatuses}
            disabled={isRefreshing}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
              isDark ? 'bg-dark-100 hover:bg-dark-50 text-gray-300' : 'bg-light-300 hover:bg-light-400 text-gray-700'
            } disabled:opacity-50`}
          >
            {isRefreshing ? '⟳ Checking...' : '⟳ Refresh'}
          </button>
        </div>

        {endpointStatuses.length === 0 && !isRefreshing ? (
          <p className={`text-sm text-center py-4 ${textMuted}`}>
            No endpoints tested yet. Click Refresh or Run Discovery.
          </p>
        ) : (
          <div className="space-y-3">
            {endpointStatuses.map((ep) => {
              const isExpanded = expandedEndpoints.has(ep.baseUrl);
              return (
                <div key={ep.baseUrl} className={`rounded-lg border p-3 ${
                  ep.isHealthy
                    ? isDark ? 'border-green-800/50 bg-green-900/10' : 'border-green-300 bg-green-50'
                    : isDark ? 'border-red-800/50 bg-red-900/10' : 'border-red-200 bg-red-50'
                }`}>
                  {/* Endpoint header row - clickable to toggle */}
                  <button
                    onClick={() => toggleEndpointExpanded(ep.baseUrl)}
                    className="w-full text-left flex items-center justify-between mb-1 hover:opacity-75 transition-opacity"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ep.isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`text-sm font-mono truncate ${textPrimary}`}>{ep.baseUrl}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {ep.isHealthy && (
                        <span className={`text-xs ${textMuted}`}>{ep.responseTime}ms</span>
                      )}
                      {ep.version && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-dark-100 text-gray-400' : 'bg-light-300 text-gray-600'}`}>
                          v{ep.version}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expandable content */}
                  {isExpanded && (
                    <>
                      {/* Error message */}
                      {!ep.isHealthy && ep.error && (
                        <p className={`text-xs mt-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                          {ep.error === 'Timeout' ? '⏱ Connection timed out' : `✗ ${ep.error}`}
                        </p>
                      )}

                      {/* Models list */}
                      {ep.isHealthy && ep.models.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-medium ${textMuted}`}>
                              {ep.models.length} model{ep.models.length !== 1 ? 's' : ''}
                            </span>
                            <button
                              onClick={() => handleImportAllModels(ep.baseUrl, ep.models)}
                              className="text-xs text-theme-primary hover:text-theme-primary-hover font-medium"
                            >
                              + Import All
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ep.models.map(model => {
                              const alreadyAdded = state.providers.some(
                                p => p.type === 'ollama' && p.apiEndpoint === `${ep.baseUrl}/api/generate` && p.model === model.name
                              );
                              return (
                                <button
                                  key={model.name}
                                  onClick={() => handleToggleModel(ep.baseUrl, model.name)}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                    alreadyAdded
                                      ? isDark ? 'bg-green-900/30 hover:bg-red-900/30 text-green-400 hover:text-red-400' : 'bg-green-100 hover:bg-red-100 text-green-700 hover:text-red-700'
                                      : isDark ? 'bg-dark-100 hover:bg-theme-primary/30 text-gray-300 hover:text-white' : 'bg-light-300 hover:bg-theme-primary/20 text-gray-700 hover:text-gray-900'
                                  }`}
                                  title={alreadyAdded ? `Click to remove ${model.name} from providers` : `Click to add ${model.name} as provider`}
                                >
                                  {alreadyAdded ? '✓' : '+'} {model.name}
                                  {model.size ? ` (${formatBytes(model.size)})` : ''}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {ep.isHealthy && ep.models.length === 0 && (
                        <p className={`text-xs mt-1 ${textMuted}`}>No models installed on this host</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ────── Auto Discovery & Add Endpoint ────── */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`font-semibold text-sm ${textPrimary}`}>🔍 Auto Discovery</h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoDiscovery}
              onChange={(e) => handleConfigChange('autoDiscovery', e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${
              isDark ? 'bg-dark-100 peer-checked:bg-theme-primary' : 'bg-light-400 peer-checked:bg-theme-primary'
            }`} />
          </label>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={handleDiscovery}
            disabled={isDiscovering}
            className="flex-1 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            {isDiscovering ? (
              <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Scanning...</>
            ) : (
              <><span>🔍</span> Run Discovery</>
            )}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDark ? 'bg-dark-100 hover:bg-dark-50 text-gray-300' : 'bg-light-300 hover:bg-light-400 text-gray-700'
            }`}
          >
            {showAddForm ? '✕' : '+ Add Host'}
          </button>
        </div>

        {/* Network scanning settings (collapsible) */}
        <button
          onClick={() => setShowNetworkSettings(!showNetworkSettings)}
          className={`w-full flex items-center justify-between text-xs px-2 py-1.5 rounded ${
            isDark ? 'hover:bg-dark-100 text-gray-500' : 'hover:bg-light-300 text-gray-500'
          }`}
        >
          <span>⚙ Network scan settings</span>
          <span>{showNetworkSettings ? '▲' : '▼'}</span>
        </button>

        {showNetworkSettings && (
          <div className={`mt-2 p-3 rounded-lg space-y-2 ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}>
            {([
              { key: 'enableLANScan', label: 'LAN Scan' },
              { key: 'enablePortScan', label: 'Port Scan' },
              { key: 'enableWiFiScan', label: 'WiFi Scan' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between">
                <span className={`text-xs ${textMuted}`}>{label}</span>
                <input
                  type="checkbox"
                  checked={(config.networkDetection as any)[key]}
                  onChange={(e) => handleConfigChange('networkDetection', {
                    ...config.networkDetection,
                    [key]: e.target.checked,
                  })}
                  className="rounded h-3.5 w-3.5"
                />
              </label>
            ))}
            <label className="flex items-center justify-between">
              <span className={`text-xs ${textMuted}`}>Scan Timeout (ms)</span>
              <input
                type="number"
                value={config.networkDetection.scanTimeout}
                onChange={(e) => handleConfigChange('networkDetection', {
                  ...config.networkDetection,
                  scanTimeout: parseInt(e.target.value) || 100,
                })}
                className={`w-20 text-xs px-2 py-1 rounded ${isDark ? 'bg-dark-100 text-gray-300 border-dark-50' : 'bg-white text-gray-700 border-light-400'} border`}
                min="20"
                max="10000"
                step="10"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className={`text-xs ${textMuted}`}>Fallback Strategy</span>
              <select
                value={config.fallbackBehavior}
                onChange={(e) => handleConfigChange('fallbackBehavior', e.target.value)}
                className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-dark-100 text-gray-300 border-dark-50' : 'bg-white text-gray-700 border-light-400'} border`}
              >
                <option value="first-healthy">First Healthy</option>
                <option value="fastest">Fastest</option>
                <option value="round-robin">Round Robin</option>
              </select>
            </label>
          </div>
        )}

        {/* Add endpoint form */}
        {showAddForm && (
          <div className={`mt-3 p-3 rounded-lg space-y-3 ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Host / IP *</label>
                <input
                  type="text"
                  value={newEndpoint.host}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, host: e.target.value })}
                  placeholder="192.168.1.100"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Port</label>
                <input
                  type="number"
                  value={newEndpoint.port}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, port: parseInt(e.target.value) || 11434 })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Protocol</label>
                <select
                  value={newEndpoint.protocol}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, protocol: e.target.value as 'http' | 'https' })}
                  className={inputClass}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Label</label>
                <input
                  type="text"
                  value={newEndpoint.label}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, label: e.target.value })}
                  placeholder="My Laptop"
                  className={inputClass}
                />
              </div>
            </div>
            <button
              onClick={handleAddEndpoint}
              className="w-full bg-theme-primary hover:bg-theme-primary-hover text-white text-sm px-3 py-2 rounded-lg font-medium transition-colors"
            >
              Add Endpoint
            </button>
          </div>
        )}
      </div>

      {/* ────── Configured Endpoints ────── */}
      {config.endpoints.length > 0 && (
        <div className={cardClass}>
          <h4 className={`font-semibold text-sm mb-2 ${textPrimary}`}>📋 Custom Endpoints ({config.endpoints.length})</h4>
          <p className={`text-xs mb-3 ${textMuted}`}>
            Tested in priority order. First healthy one is used.
          </p>
          <div className="space-y-1.5">
            {config.endpoints.map((ep, idx) => {
              const url = `${ep.protocol}://${ep.host}:${ep.port}`;
              const status = endpointStatuses.find(s => s.baseUrl === url);
              return (
                <div
                  key={`${ep.host}:${ep.port}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    isDark ? 'bg-dark-200' : 'bg-light-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-mono ${textMuted}`}>#{idx + 1}</span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      status?.isHealthy ? 'bg-green-500' : status ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <span className={`font-mono truncate ${textPrimary}`}>{url}</span>
                    {ep.label && (
                      <span className={`text-xs ${textMuted}`}>({ep.label})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        addToast('success', 'Copied', 'Endpoint URL copied to clipboard');
                      }}
                      className={`text-xs px-1.5 py-0.5 rounded hover:bg-theme-primary/20 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                      title="Copy endpoint URL"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleRemoveEndpoint(ep.host, ep.port)}
                      className={`text-xs px-1.5 py-0.5 rounded hover:bg-red-500/20 ${isDark ? 'text-red-400' : 'text-red-600'}`}
                      title="Remove endpoint"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ────── Actions ────── */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleExport} className={`flex-1 min-w-[100px] text-xs px-3 py-2 rounded-lg font-medium transition-colors ${isDark ? 'bg-dark-300 hover:bg-dark-100 text-gray-400 border border-dark-100' : 'bg-light-200 hover:bg-light-300 text-gray-600 border border-light-400'}`}>
          📥 Export
        </button>
        <button onClick={handleImport} className={`flex-1 min-w-[100px] text-xs px-3 py-2 rounded-lg font-medium transition-colors ${isDark ? 'bg-dark-300 hover:bg-dark-100 text-gray-400 border border-dark-100' : 'bg-light-200 hover:bg-light-300 text-gray-600 border border-light-400'}`}>
          📤 Import
        </button>
        <button onClick={handleReset} className={`flex-1 min-w-[100px] text-xs px-3 py-2 rounded-lg font-medium transition-colors text-red-500 ${isDark ? 'bg-dark-300 hover:bg-red-900/20 border border-dark-100' : 'bg-light-200 hover:bg-red-50 border border-light-400'}`}>
          🔄 Reset
        </button>
      </div>
    </div>
  );
};
