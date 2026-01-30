import { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { fetchOllamaModels, fetchOpenAIModels, fetchAnthropicModels, fetchGoogleModels } from '../../utils/llmService';
import type { LLMProviderConfig, LLMProviderType } from '../../types';

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
  ollama: ['llama2', 'llama3', 'mistral', 'codellama', 'phi', 'neural-chat'],
  azure: ['your-gpt-4-deployment', 'your-gpt-35-turbo-deployment'], // Azure uses deployment names, not model names
  custom: [],
};

export default function ProviderForm({ provider, onSave, onCancel }: ProviderFormProps) {
  const { state } = useChat();
  const isDark = state.theme === 'dark';
  const isEditing = !!provider;

  const [formData, setFormData] = useState({
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
  });

  // State for Ollama models
  const [ollamaModels, setOllamaModels] = useState<{ name: string; size?: number }[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  
  // State for dynamic models from API providers
  const [dynamicModels, setDynamicModels] = useState<string[]>([]);

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
            setFormData(prev => ({ ...prev, model: result.models[0].name }));
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
  }, [formData.type, formData.apiEndpoint]);
  
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
          result = await fetchOpenAIModels(formData.apiKey);
          break;
        case 'anthropic':
          result = await fetchAnthropicModels(formData.apiKey);
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
        if (!result.models.includes(formData.model)) {
          setFormData(prev => ({ ...prev, model: result.models[0] }));
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
  }, [formData.type, formData.apiKey]);

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
          <div className="grid grid-cols-3 gap-2">
            {PROVIDER_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, type })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formData.type === type
                    ? 'border-primary-500 bg-primary-500/20'
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
        <div className="grid grid-cols-2 gap-4">
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
                    <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
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
                    <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
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
          
          {/* Anthropic CORS Warning */}
          {formData.type === 'anthropic' && (
            <div className={`mt-3 p-3 rounded-lg border ${
              isDark 
                ? 'bg-yellow-900/20 border-yellow-800 text-yellow-300' 
                : 'bg-yellow-50 border-yellow-300 text-yellow-800'
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <div className="text-xs">
                  <p className="font-semibold mb-1">CORS Limitation</p>
                  <p className="mb-2">
                    Anthropic's API blocks direct browser requests for security. You'll need one of these solutions:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Install a CORS proxy browser extension (e.g., "CORS Unblock")</li>
                    <li>Use a local proxy server</li>
                    <li>Build a backend API</li>
                    <li>Consider OpenAI, Google Gemini, or Ollama (no CORS issues)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>API Endpoint</label>
          <input
            type="url"
            value={formData.apiEndpoint}
            onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
            className={inputClass}
            placeholder="https://api.example.com/v1/chat"
            required
          />
          
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
                    If you encounter CORS errors, consider using a CORS proxy extension or backend proxy.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Model Parameters */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}>
          <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Model Parameters
          </h4>
          <div className="grid grid-cols-2 gap-4">
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDark 
                ? 'bg-dark-100 text-gray-300 hover:bg-dark-50' 
                : 'bg-light-300 text-gray-700 hover:bg-light-400'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            {isEditing ? 'Save Changes' : 'Add Provider'}
          </button>
        </div>
      </form>
    </div>
  );
}
