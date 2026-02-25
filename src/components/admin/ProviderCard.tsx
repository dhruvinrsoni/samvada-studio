import { useChat } from '../../context/ChatContext';
import type { LLMProviderConfig } from '../../types';
import { formatDate } from '../../utils/helpers';

interface ProviderCardProps {
  provider: LLMProviderConfig;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onTest: () => void;
}

export default function ProviderCard({
  provider,
  isDefault,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
}: ProviderCardProps) {
  const { state } = useChat();
  const isDark = state.theme === 'dark';

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'openai': return '🤖';
      case 'anthropic': return '🧠';
      case 'google': return '✨';
      case 'ollama': return '🦙';
      case 'azure': return '☁️';
      default: return '⚙️';
    }
  };

  const getStatusBadge = () => {
    switch (provider.testStatus) {
      case 'success':
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">✓ Connected</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">✗ Failed</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full animate-pulse">⟳ Testing...</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full">○ Not tested</span>;
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      isDefault 
        ? 'border-primary-500 bg-primary-500/10' 
        : isDark 
          ? 'border-dark-100 bg-dark-300 hover:border-dark-50' 
          : 'border-light-400 bg-light-200 hover:border-light-500'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{getProviderIcon(provider.type)}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {provider.name}
              </h4>
              {isDefault && (
                <span className="px-2 py-0.5 text-xs bg-primary-600 text-white rounded-full">
                  Default
                </span>
              )}
              {getStatusBadge()}
            </div>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Model: <code className={`px-1 py-0.5 rounded ${isDark ? 'bg-dark-100' : 'bg-light-400'}`}>{provider.model}</code>
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Endpoint: {provider.apiEndpoint || 'Not configured'}
            </p>
            {provider.lastTested && (
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                Last tested: {formatDate(provider.lastTested)}
              </p>
            )}
            {provider.testMessage && provider.testStatus === 'failed' && (
              <p className="text-xs mt-1 text-red-400">
                Error: {provider.testMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTest}
            disabled={provider.testStatus === 'pending'}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              provider.testStatus === 'pending'
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {provider.testStatus === 'pending' ? '⟳' : '🔌'} Test
          </button>
          {!isDefault && (
            <button
              onClick={onSetDefault}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isDark 
                  ? 'bg-dark-100 hover:bg-dark-50 text-gray-300' 
                  : 'bg-light-300 hover:bg-light-400 text-gray-700'
              }`}
            >
              Set Default
            </button>
          )}
          <button
            onClick={onEdit}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isDark 
                ? 'bg-dark-100 hover:bg-dark-50 text-gray-300' 
                : 'bg-light-300 hover:bg-light-400 text-gray-700'
            }`}
          >
            ✏️ Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded text-sm font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Settings Summary */}
      <div className={`mt-3 pt-3 border-t flex flex-wrap gap-4 text-xs ${
        isDark ? 'border-dark-100 text-gray-500' : 'border-light-400 text-gray-500'
      }`}>
        <span>Temperature: {provider.settings.temperature}</span>
        <span>Max Tokens: {provider.settings.maxTokens}</span>
        {provider.settings.topP && <span>Top P: {provider.settings.topP}</span>}
        <span>API Key: {provider.apiKey ? '••••••••' : 'Not set'}</span>
      </div>
    </div>
  );
}
