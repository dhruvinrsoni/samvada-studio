import { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { fetchOllamaModels } from '../../utils/llmService';
import type { LLMProviderConfig, LLMProviderType } from '../../types';

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
  google: 'https://generativelanguage.googleapis.com/v1beta/models',
  ollama: 'http://localhost:11434/api/generate',
  azure: '',
  custom: '',
};

const DEFAULT_MODELS: Record<LLMProviderType, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'],
  google: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  ollama: ['llama2', 'llama3', 'mistral', 'codellama', 'phi', 'neural-chat'],
  azure: ['gpt-4', 'gpt-4-turbo', 'gpt-35-turbo'],
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
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);

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
          if (result.models.length > 0 && !result.models.includes(formData.model)) {
            setFormData(prev => ({ ...prev, model: result.models[0] }));
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
                      <option key={model} value={model}>{model}</option>
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
