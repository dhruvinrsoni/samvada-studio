import { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { fetchOllamaModels, fetchOpenAIModels, fetchAnthropicModels, fetchGoogleModels, testProviderConnection } from '../../utils/llmService';
import { ollamaDiscovery } from '../../services/ollamaDiscovery';
import { getAutoProxySync, checkProxyHealth, type ProxyHealthResult } from '../../services/proxyDiscovery';
import type { LLMProviderConfig, LLMProviderType } from '../../types';

// Check if app is running on localhost or hosted
const isLocalhost = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === '[::1]' || 
         hostname.includes('local');
};

// Utility function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface ProviderFormProps {
  provider?: LLMProviderConfig | null;
  onSave: (config: Omit<LLMProviderConfig, 'id'>) => void;
  onCancel: () => void;
  onFormChange?: (hasChanges: boolean) => void;
}

const PROVIDER_TYPES: { type: LLMProviderType; label: string; icon: string }[] = [
  { type: 'openai', label: 'OpenAI (ChatGPT)', icon: '🤖' },
  { type: 'anthropic', label: 'Anthropic (Claude)', icon: '🧠' },
  { type: 'google', label: 'Google (Gemini)', icon: '✨' },
  { type: 'ollama', label: 'Ollama (Local)', icon: '🦙' },
  { type: 'azure', label: 'Azure OpenAI', icon: '☁️' },
  { type: 'custom', label: 'Custom Provider', icon: '⚙️' },
];

const DEFAULT_ENDPOINTS: Record<LLMProviderType, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://localhost:11434/api/generate',
  azure: 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT/chat/completions?api-version=2024-02-01',
  custom: 'https://api.example.com/v1/chat/completions',
};

const DEFAULT_MODELS: Record<LLMProviderType, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  ollama: ['llama2:latest', 'llama3:latest', 'llama3.2:latest', 'mistral:latest', 'codellama:latest', 'phi:latest', 'gemma3:latest'],
  azure: ['your-gpt-4-deployment', 'your-gpt-35-turbo-deployment'], // Azure uses deployment names, not model names
  custom: [],
};

/**
 * Shows proxy auto-detection status for providers that need CORS proxy.
 * Green = proxy found (auto or manual), Yellow = no proxy.
 */
function ProxyStatusBanner({ isDark, corsProxy }: { isDark: boolean; corsProxy: string }) {
  const [healthResult, setHealthResult] = useState<ProxyHealthResult | null>(null);
  const autoProxy = getAutoProxySync();

  // Check proxy health on mount
  useEffect(() => {
    const urlToCheck = corsProxy || autoProxy?.url;
    if (urlToCheck) {
      checkProxyHealth(urlToCheck).then(setHealthResult);
    }
  }, [corsProxy, autoProxy?.url]);

  // Auto-proxy is available and healthy
  if (!corsProxy && autoProxy && healthResult?.isHealthy) {
    return (
      <div className={`mt-3 p-3 rounded-lg border ${
        isDark
          ? 'bg-green-900/20 border-green-800 text-green-300'
          : 'bg-green-50 border-green-300 text-green-800'
      }`}>
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">✓</span>
          <div className="text-xs">
            <p className="font-semibold">Proxy Connected</p>
            <p className="mt-1">
              Auto-detected proxy{healthResult && ` (${healthResult.responseTime}ms)`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Explicit proxy override set and healthy
  if (corsProxy && healthResult?.isHealthy) {
    return (
      <div className={`mt-3 p-3 rounded-lg border ${
        isDark
          ? 'bg-green-900/20 border-green-800 text-green-300'
          : 'bg-green-50 border-green-300 text-green-800'
      }`}>
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">✓</span>
          <div className="text-xs">
            <p className="font-semibold">Proxy Connected (manual override)</p>
            <p className="mt-1 font-mono">{corsProxy}</p>
          </div>
        </div>
      </div>
    );
  }

  // Proxy configured but unhealthy
  if ((corsProxy || autoProxy) && healthResult && !healthResult.isHealthy) {
    return (
      <div className={`mt-3 p-3 rounded-lg border ${
        isDark
          ? 'bg-orange-900/20 border-orange-800 text-orange-300'
          : 'bg-orange-50 border-orange-300 text-orange-800'
      }`}>
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div className="text-xs">
            <p className="font-semibold">Proxy Unreachable</p>
            <p className="mt-1">
              {healthResult.error || 'Could not connect to proxy'}. API calls may fail.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No proxy at all
  if (!corsProxy && !autoProxy) {
    return (
      <div className={`mt-3 p-3 rounded-lg border ${
        isDark
          ? 'bg-yellow-900/20 border-yellow-800 text-yellow-300'
          : 'bg-yellow-50 border-yellow-300 text-yellow-800'
      }`}>
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div className="text-xs">
            <p className="font-semibold mb-1">Proxy Required</p>
            <p className="mb-2">
              This API blocks direct browser requests. A CORS proxy is needed.
            </p>
            {isLocalhost() ? (
              <p>
                The dev server has a built-in proxy — just run <code className="px-1 py-0.5 rounded bg-opacity-50 bg-theme-primary">npm run dev</code> and it should auto-detect.
                If not working, try reloading the page.
              </p>
            ) : (
              <p>
                Deploy the app on Vercel for a built-in proxy, or set a custom proxy URL in Advanced Settings below.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Discovery still running
  return null;
}

export default function ProviderForm({ provider, onSave, onCancel, onFormChange }: ProviderFormProps) {
  const { isDark } = useChat();
  const isEditing = !!provider;

  const initialFormData = {
    type: provider?.type || 'openai' as LLMProviderType,
    name: provider?.name || '',
    apiKey: provider?.apiKey || '',
    apiEndpoint: provider?.apiEndpoint || DEFAULT_ENDPOINTS.openai,
    model: provider?.model || 'gpt-4',
    isEnabled: provider?.isEnabled ?? true,
    isDefault: provider?.isDefault ?? false,
    temperature: provider?.settings.temperature ?? 0.7,
    maxTokens: provider?.settings.maxTokens ?? 4096,
    topP: provider?.settings.topP ?? 1,
    frequencyPenalty: provider?.settings.frequencyPenalty ?? 0,
    presencePenalty: provider?.settings.presencePenalty ?? 0,
    corsProxy: provider?.corsProxy || '',
  };

  const [formData, setFormData] = useState(initialFormData);
  
  // Show advanced settings (CORS proxy, etc.)
  const [showAdvanced, setShowAdvanced] = useState(!!provider?.corsProxy);

  // State for Ollama models
  const [ollamaModels, setOllamaModels] = useState<{ name: string; size?: number }[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  
  // State for dynamic models from API providers
  const [dynamicModels, setDynamicModels] = useState<string[]>([]);
  
  // State for discovered Ollama endpoints (for dropdown)
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<string[]>([]);
  const [useCustomEndpoint, setUseCustomEndpoint] = useState(false);

  // Inline test connection using current (unsaved) form values
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const tempProvider: Partial<LLMProviderConfig> & { type: string; model: string } = {
        type: formData.type,
        name: formData.name || 'Test',
        apiKey: formData.apiKey,
        apiEndpoint: formData.apiEndpoint,
        model: formData.model,
        isEnabled: true,
        corsProxy: formData.corsProxy || undefined,
        settings: { temperature: formData.temperature, maxTokens: formData.maxTokens },
      };
      const result = await testProviderConnection(tempProvider as LLMProviderConfig);
      if (result.success) {
        setTestStatus('success');
        setTestMessage(result.message || 'Connected successfully');
      } else {
        setTestStatus('failed');
        setTestMessage(result.message || 'Connection failed');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestMessage(err?.message || 'Test failed');
    }
  };

  // Detect form changes and notify parent
  useEffect(() => {
    if (!onFormChange) return;
    
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    onFormChange(hasChanges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]); // Only trigger on formData changes, not onFormChange

  // Fetch Ollama models when type is ollama and endpoint changes
  useEffect(() => {
    if (formData.type === 'ollama' && formData.apiEndpoint) {
      const fetchModels = async () => {
        setIsFetchingModels(true);
        setModelFetchError(null);
        const result = await fetchOllamaModels(formData.apiEndpoint);
        if (result.success) {
          setOllamaModels(result.models);
          // Select first model if current model not in list
          if (result.models.length > 0 && !result.models.some(m => m.name === formData.model)) {
            setFormData(prev => ({ ...prev, model: result.models[0]?.name || '' }));
          }
        } else {
          setModelFetchError(result.error || 'Failed to fetch models');
          setOllamaModels([]);
        }
        setIsFetchingModels(false);
      };
      // Debounce the fetch
      const timeoutId = setTimeout(fetchModels, 500);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [formData.type, formData.apiEndpoint]);

  // Auto-fill discovered Ollama base URL when switching to Ollama type (NEW PROVIDERS ONLY)
  useEffect(() => {
    if (formData.type === 'ollama' && !isEditing) {
      const discoveredBaseUrl = localStorage.getItem('ollama-discovered-base-url');
      if (discoveredBaseUrl && discoveredBaseUrl !== formData.apiEndpoint) {
        // Only auto-fill if endpoint is still the default
        if (formData.apiEndpoint === DEFAULT_ENDPOINTS.ollama || formData.apiEndpoint === DEFAULT_ENDPOINTS.openai) {
          setFormData(prev => ({
            ...prev,
            apiEndpoint: discoveredBaseUrl
          }));
        }
      }
    }
  }, [formData.type, isEditing]);

  // Load discovered/configured Ollama endpoints for dropdown
  useEffect(() => {
    if (formData.type === 'ollama') {
      const urls = ollamaDiscovery.getConfiguredEndpointUrls();
      // Convert base URLs to /api/generate format for Ollama provider
      const endpointUrls = urls.map(u => `${u}/api/generate`);
      setDiscoveredEndpoints(endpointUrls);
      // If current endpoint isn't in the list and isn't the default, show custom input
      if (isEditing && !endpointUrls.includes(formData.apiEndpoint) && formData.apiEndpoint !== DEFAULT_ENDPOINTS.ollama) {
        setUseCustomEndpoint(true);
      }
    } else {
      setDiscoveredEndpoints([]);
      setUseCustomEndpoint(false);
    }
  }, [formData.type, isEditing, formData.apiEndpoint]);
  
  // Fetch models dynamically when API key is added for supported providers
  useEffect(() => {
    const fetchDynamicModels = async () => {
      // Only fetch if we have an API key and it's a supported type
      if (!formData.apiKey || formData.type === 'ollama' || formData.type === 'azure' || formData.type === 'custom') {
        setDynamicModels([]);
        return;
      }
      
      // Minimum key length check to avoid unnecessary API calls
      if (formData.apiKey.length < 10) {
        return;
      }
      
      setIsFetchingModels(true);
      setModelFetchError(null);
      
      let result: { success: boolean; models: string[]; error?: string };
      
      switch (formData.type) {
        case 'openai':
          result = await fetchOpenAIModels(formData.apiKey, formData.apiEndpoint, formData.corsProxy || undefined);
          break;
        case 'anthropic':
          result = await fetchAnthropicModels(formData.apiKey, formData.apiEndpoint, formData.corsProxy || undefined);
          break;
        case 'google':
          result = await fetchGoogleModels(formData.apiKey);
          break;
        default:
          result = { success: false, models: [], error: 'Unsupported provider type' };
      }
      
      if (result.success && result.models.length > 0) {
        setDynamicModels(result.models);
        // Select first model if current model not in list
        const firstModel = result.models[0];
        if (firstModel && !result.models.includes(formData.model)) {
          const modelName = typeof firstModel === 'string' ? firstModel : ((firstModel as Record<string, unknown>)['name'] as string) || '';
          setFormData(prev => ({ ...prev, model: modelName }));
        }
      } else if (result.error) {
        setModelFetchError(result.error);
        setDynamicModels([]);
      }
      
      setIsFetchingModels(false);
    };
    
    // Debounce the fetch (wait for user to finish typing)
    const timeoutId = setTimeout(fetchDynamicModels, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.type, formData.apiKey, formData.apiEndpoint, formData.corsProxy]);

  // Update defaults when type changes
  useEffect(() => {
    if (!isEditing) {
      const typeInfo = PROVIDER_TYPES.find(p => p.type === formData.type);
      setFormData(prev => ({
        ...prev,
        name: typeInfo?.label || '',
        apiEndpoint: DEFAULT_ENDPOINTS[formData.type],
        model: DEFAULT_MODELS[formData.type][0] || '',
      }));
    }
  }, [formData.type, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type: formData.type,
      name: formData.name,
      apiKey: formData.apiKey,
      apiEndpoint: formData.apiEndpoint,
      model: formData.model,
      isEnabled: formData.isEnabled,
      isDefault: formData.isDefault,
      corsProxy: formData.corsProxy || undefined,
      settings: {
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        topP: formData.topP,
        frequencyPenalty: formData.frequencyPenalty,
        presencePenalty: formData.presencePenalty,
      },
      testStatus: 'untested',
    });
  };

  const inputClass = `w-full p-2 rounded-lg border ${
    isDark 
      ? 'bg-dark-200 border-dark-100 text-gray-200' 
      : 'bg-white border-light-400 text-gray-800'
  }`;

  const labelClass = `block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

  

  return (
    <div className={`mt-4 p-6 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300' : 'border-light-400 bg-light-200'}`}>
      <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        {isEditing ? '✏️ Edit Provider' : '➕ Add New Provider'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Type */}
        <div>
          <label className={labelClass}>Provider Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDER_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, type })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formData.type === type
                    ? 'border-theme-primary bg-theme-primary/20'
                    : isDark
                      ? 'border-dark-100 bg-dark-200 hover:border-dark-50'
                      : 'border-light-400 bg-white hover:border-light-500'
                }`}
              >
                <span className="text-lg">{icon}</span>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className={labelClass}>Display Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              placeholder="My ChatGPT"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Model</label>
            {formData.type === 'ollama' ? (
              <div>
                {isFetchingModels ? (
                  <div className={`${inputClass} flex items-center gap-2`}>
                    <div className="animate-spin w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full" />
                    <span className="text-sm">Fetching models...</span>
                  </div>
                ) : ollamaModels.length > 0 ? (
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={inputClass}
                  >
                    {ollamaModels.map(model => (
                      <option key={model.name} value={model.name}>
                        {model.name}{model.size ? ` (${formatBytes(model.size)})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={inputClass}
                    placeholder="llama2"
                    required
                  />
                )}
                {modelFetchError && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ {modelFetchError}. Make sure Ollama is running.
                  </p>
                )}
                {ollamaModels.length > 0 && (
                  <p className="text-xs text-green-500 mt-1">
                    ✓ Found {ollamaModels.length} models
                  </p>
                )}
              </div>
            ) : (
              // For other providers - use dynamic models if available
              <div>
                {isFetchingModels ? (
                  <div className={`${inputClass} flex items-center gap-2`}>
                    <div className="animate-spin w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full" />
                    <span className="text-sm">Fetching models from API...</span>
                  </div>
                ) : dynamicModels.length > 0 ? (
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={inputClass}
                  >
                    {dynamicModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : DEFAULT_MODELS[formData.type].length > 0 ? (
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={inputClass}
                  >
                    {DEFAULT_MODELS[formData.type].map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={inputClass}
                    placeholder="model-name"
                    required
                  />
                )}
                {dynamicModels.length > 0 && (
                  <p className="text-xs text-green-500 mt-1">
                    ✓ Loaded {dynamicModels.length} models from API
                  </p>
                )}
                {modelFetchError && (
                  <p className="text-xs text-yellow-500 mt-1">
                    ⚠️ {modelFetchError}. Using default models.
                  </p>
                )}
                {!dynamicModels.length && !isFetchingModels && formData.apiKey && formData.type !== 'azure' && formData.type !== 'custom' && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Add your API key to load available models
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* API Settings */}
        <div>
          <label className={labelClass}>API Key</label>
          <input
            type="password"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            className={inputClass}
            placeholder={formData.type === 'ollama' ? 'Not required for Ollama' : 'sk-...'}
          />
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {formData.type === 'ollama' 
              ? 'Ollama runs locally and typically doesn\'t require an API key'
              : 'Your API key is stored locally and never sent to our servers'}
          </p>
          
          {/* CORS Proxy Status - shown for providers that need a proxy */}
          {(formData.type === 'openai' || formData.type === 'anthropic') && (
            <ProxyStatusBanner isDark={isDark} corsProxy={formData.corsProxy} />
          )}

          {/* Inline test button */}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || (!formData.apiKey && formData.type !== 'ollama')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                testStatus === 'testing'
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-theme-primary hover:bg-theme-primary-hover text-white'
              } disabled:opacity-50`}
            >
              {testStatus === 'testing' ? '⟳ Testing...' : '🔌 Test Connection'}
            </button>
            {testStatus === 'success' && (
              <span className={`text-xs font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>✓ {testMessage}</span>
            )}
            {testStatus === 'failed' && (
              <span className={`text-xs font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>✗ {testMessage}</span>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>API Endpoint</label>
          {formData.type === 'ollama' && discoveredEndpoints.length > 0 && !useCustomEndpoint ? (
            <div>
              <select
                value={formData.apiEndpoint}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setUseCustomEndpoint(true);
                  } else {
                    setFormData({ ...formData, apiEndpoint: e.target.value });
                  }
                }}
                className={inputClass}
              >
                {discoveredEndpoints.map(url => (
                  <option key={url} value={url}>{url}</option>
                ))}
                <option value="__custom__">✏️ Enter custom URL...</option>
              </select>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                💡 Endpoints from Admin → Ollama settings. Select or enter a custom URL.
              </p>
            </div>
          ) : (
            <div>
              <input
                type="url"
                value={formData.apiEndpoint}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                className={inputClass}
                placeholder="https://api.example.com/v1/chat"
                required
              />
              {formData.type === 'ollama' && useCustomEndpoint && discoveredEndpoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomEndpoint(false);
                    // Reset to first discovered endpoint if current isn't in the list
                    if (!discoveredEndpoints.includes(formData.apiEndpoint) && discoveredEndpoints[0]) {
                      setFormData(prev => ({ ...prev, apiEndpoint: discoveredEndpoints[0] || prev.apiEndpoint }));
                    }
                  }}
                  className={`text-xs mt-1 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                >
                  ← Use discovered endpoint
                </button>
              )}
            </div>
          )}
          
          {/* Incomplete Endpoint Warning for OpenAI */}
          {formData.type === 'openai' && formData.apiEndpoint && 
           !formData.apiEndpoint.includes('/v1/') && 
           !formData.apiEndpoint.endsWith('/v1') && (
            <div className={`mt-2 p-2 rounded-lg border text-xs ${
              isDark 
                ? 'bg-red-900/20 border-red-800 text-red-300' 
                : 'bg-red-50 border-red-300 text-red-800'
            }`}>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0">❌</span>
                <div>
                  <p className="font-semibold mb-1">Incomplete Endpoint</p>
                  <p className="mb-1">
                    OpenAI endpoint should include the full API path.
                  </p>
                  <p className="font-mono text-xs">
                    Current: {formData.apiEndpoint}
                  </p>
                  <p className="font-mono text-xs text-green-400 mt-1">
                    Should be: {formData.apiEndpoint}/v1/chat/completions
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Custom OpenAI Endpoint Warning */}
          {formData.type === 'openai' && formData.apiEndpoint && !formData.apiEndpoint.includes('api.openai.com') && (
            <div className={`mt-2 p-2 rounded-lg border text-xs ${
              isDark 
                ? 'bg-yellow-900/20 border-yellow-800 text-yellow-300' 
                : 'bg-yellow-50 border-yellow-300 text-yellow-800'
            }`}>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0">⚠️</span>
                <div>
                  <p className="font-semibold mb-1">Custom OpenAI Endpoint</p>
                  <p>
                    Custom OpenAI endpoints may have CORS restrictions when called from browsers. 
                    Configure a CORS Proxy URL in Advanced Settings below if you encounter CORS errors.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings (CORS Proxy Override) */}
        {(formData.type === 'openai' || formData.type === 'anthropic' || formData.type === 'azure' || formData.type === 'custom') && (
          <div className={`border rounded-lg ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`w-full p-3 flex items-center justify-between text-left ${
                isDark ? 'hover:bg-dark-200' : 'hover:bg-light-200'
              } rounded-lg transition-colors`}
            >
              <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                🔧 Advanced Settings
                {formData.corsProxy && <span className="ml-2 text-xs text-green-500">• Proxy override set</span>}
              </span>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                {showAdvanced ? '▲' : '▼'}
              </span>
            </button>

            {showAdvanced && (
              <div className={`p-4 border-t ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
                <div>
                  <label className={labelClass}>
                    CORS Proxy URL Override
                    <span className={`ml-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.corsProxy}
                    onChange={(e) => setFormData({ ...formData, corsProxy: e.target.value })}
                    className={inputClass}
                    placeholder="https://your-proxy.vercel.app or http://localhost:8080"
                  />
                  <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Override the auto-detected proxy for this provider. Leave empty to use the auto-discovered proxy.
                  </p>
                </div>

                {/* Local proxy hint for development */}
                {isLocalhost() && (
                  <div className={`mt-3 p-2 rounded-lg text-xs ${isDark ? 'bg-dark-200 text-gray-400' : 'bg-light-300 text-gray-600'}`}>
                    <p>💡 The dev server already has a built-in proxy — you typically don't need to set this.</p>
                    <p className="mt-1">If you still want to use the standalone proxy: <code className="px-1 py-0.5 rounded bg-opacity-50 bg-theme-primary">npm run proxy</code> and enter <code className="px-1 py-0.5 rounded bg-opacity-50 bg-theme-primary">http://localhost:8080</code></p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Model Parameters */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}>
          <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Model Parameters
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelClass}>
                Temperature: {formData.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Controls randomness (0 = focused, 2 = creative)
              </p>
            </div>
            <div>
              <label className={labelClass}>Max Tokens</label>
              <input
                type="number"
                min="1"
                max="128000"
                value={formData.maxTokens}
                onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Top P: {formData.topP}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.topP}
                onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className={labelClass}>
                Frequency Penalty: {formData.frequencyPenalty}
              </label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={formData.frequencyPenalty}
                onChange={(e) => setFormData({ ...formData, frequencyPenalty: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Security Warning */}
        {formData.apiKey && formData.type !== 'ollama' && (
          <div className={`p-3 rounded-lg border ${
            isDark ? 'border-yellow-600 bg-yellow-900/20' : 'border-yellow-400 bg-yellow-50'
          }`}>
            <div className="flex items-start gap-2">
              <span className="text-yellow-500">⚠️</span>
              <div className="text-sm">
                <p className={`font-medium ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
                  Security Notice
                </p>
                <p className={isDark ? 'text-yellow-300' : 'text-yellow-700'}>
                  API keys are stored locally in your browser. While convenient for development, this is not secure for production use. 
                  Consider using environment variables or server-side storage for sensitive credentials.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions -- sticky so they're always visible in long forms */}
        <div className={`sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 pb-1 -mx-6 px-6 border-t backdrop-blur-sm ${
          isDark
            ? 'bg-dark-300/90 border-dark-100'
            : 'bg-light-200/90 border-light-400'
        }`}>
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              isDark 
                ? 'bg-dark-100 text-gray-300 hover:bg-dark-50' 
                : 'bg-light-300 text-gray-700 hover:bg-light-400'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-theme-primary text-white rounded-lg font-medium hover:bg-theme-primary-hover whitespace-nowrap"
          >
            {isEditing ? 'Save Changes' : 'Add Provider'}
          </button>
        </div>
      </form>
    </div>
  );
}
