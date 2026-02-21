import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import type { LLMProviderConfig } from '../../types';
import { formatDate } from '../../utils/helpers';
import { HealthService } from '../../utils/healthService';
import type { ProviderHealth } from '../../hooks/useProviderHealthMonitor';

interface ProviderCardProps {
  provider: LLMProviderConfig;
  isDefault: boolean;
  providerHealth?: ProviderHealth; // Passed from parent to avoid duplicate monitoring
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
}

export default function ProviderCard({
  provider,
  isDefault,
  providerHealth,
  onEdit,
  onDelete,
  onTest,
}: ProviderCardProps) {
  const { dispatch, isDark } = useChat();
  const [showTestDetails, setShowTestDetails] = useState(false);

  // Health status is passed from parent (AdminPanel) to avoid duplicate API calls

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
    <div className={`p-3 sm:p-4 rounded-lg border transition-colors ${
      !provider.isEnabled
        ? isDark
          ? 'border-gray-700 bg-dark-300/50 opacity-60'
          : 'border-gray-300 bg-light-200/50 opacity-60'
        : isDefault 
          ? 'border-theme-primary bg-theme-primary/10' 
          : isDark 
            ? 'border-dark-100 bg-dark-300 hover:border-dark-50' 
            : 'border-light-400 bg-light-200 hover:border-light-500'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
          <span className="text-xl sm:text-2xl flex-shrink-0">{getProviderIcon(provider.type)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col xs:flex-row xs:items-center gap-1.5 xs:gap-2 flex-wrap">
              <h4 className={`font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {provider.name}
              </h4>
              {isDefault && (
                <span className="px-2 py-0.5 text-xs bg-theme-primary text-white rounded-full whitespace-nowrap self-start">
                  Default
                </span>
              )}
              {!provider.isEnabled && (
                <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded-full whitespace-nowrap self-start">
                  Disabled
                </span>
              )}
              <div className="self-start">
                {getStatusBadge()}
              </div>
            </div>
            <p className={`text-sm mt-1.5 break-words ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="text-xs">Model:</span> <code className={`px-1 py-0.5 rounded text-xs break-all ${isDark ? 'bg-dark-100' : 'bg-light-400'}`}>
                {provider.model}
                {provider.type === 'ollama' && providerHealth?.modelSize && (
                  <span className="ml-1 opacity-75 whitespace-nowrap">
                    ({HealthService.formatBytes(providerHealth.modelSize)})
                  </span>
                )}
              </code>
            </p>
            <p className={`text-xs mt-1 break-all ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Endpoint: {provider.apiEndpoint || 'Not configured'}
            </p>
            {provider.lastTested && (
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                Last tested: {formatDate(provider.lastTested)}
              </p>
            )}
            
            {/* Test Result Error Message */}
            {provider.testMessage && provider.testStatus === 'failed' && (
              <div className="mt-2">
                <p className="text-xs text-red-400 break-words">
                  Error: {provider.testMessage}
                </p>
                
                {/* Show Technical Details Button if available */}
                {(provider.testErrorDetails || provider.testRawResponse) && (
                  <button
                    onClick={() => setShowTestDetails(!showTestDetails)}
                    className={`mt-1 text-xs font-medium transition-colors ${
                      isDark ? 'text-theme-primary hover:text-theme-primary-hover' : 'text-theme-primary hover:text-theme-primary-hover'
                    }`}
                  >
                    {showTestDetails ? '▼' : '▶'} Show Technical Details
                  </button>
                )}
                
                {/* Collapsible Technical Details */}
                {showTestDetails && (provider.testErrorDetails || provider.testRawResponse) && (
                  <div className={`mt-2 p-3 rounded-lg border text-xs overflow-x-auto max-w-full ${
                    isDark 
                      ? 'bg-dark-100 border-dark-50' 
                      : 'bg-gray-50 border-gray-300'
                  }`}>
                    {/* Error Category and User Action */}
                    {provider.testErrorDetails && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold ${
                            isDark ? 'text-red-300' : 'text-red-600'
                          }`}>
                            {provider.testErrorDetails.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            isDark 
                              ? 'bg-orange-900/30 text-orange-300' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {provider.testErrorDetails.category}
                          </span>
                        </div>
                        {provider.testErrorDetails.message && (
                          <p className={`break-words ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {provider.testErrorDetails.message}
                          </p>
                        )}
                        {provider.testErrorDetails.userAction && (
                          <p className={`mt-2 break-words ${isDark ? 'text-theme-primary' : 'text-theme-primary'}`}>
                            💡 {provider.testErrorDetails.userAction}
                          </p>
                        )}
                        {provider.testErrorDetails.documentationUrl && (
                          <a
                            href={provider.testErrorDetails.documentationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-1 inline-block ${
                              isDark ? 'text-theme-primary hover:text-theme-primary-hover' : 'text-theme-primary hover:text-theme-primary-hover'
                            }`}
                          >
                            📚 View Documentation
                          </a>
                        )}
                      </div>
                    )}
                    
                    {/* Raw API Response */}
                    {provider.testRawResponse && (
                      <div>
                        <p className={`font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Raw API Response
                        </p>
                        <pre className={`p-2 rounded overflow-x-auto text-xs max-w-full whitespace-pre-wrap break-words ${
                          isDark 
                            ? 'bg-dark-300 text-gray-300' 
                            : 'bg-white text-gray-800'
                        }`}>
                          {provider.testRawResponse}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Anthropic CORS Warning */}
            {provider.type === 'anthropic' && (
              <div className={`mt-2 p-2 rounded-lg border text-xs ${
                isDark 
                  ? 'bg-yellow-900/20 border-yellow-800 text-yellow-300' 
                  : 'bg-yellow-50 border-yellow-300 text-yellow-800'
              }`}>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0">⚠️</span>
                  <div>
                    <p className="font-semibold mb-1">CORS Limitation</p>
                    <p className="mb-1">
                      Anthropic's API blocks direct browser requests. You'll need a CORS proxy extension or use a different provider.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 sm:flex-shrink-0">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_PROVIDER_ENABLED', payload: provider.id })}
            className={`px-2.5 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              provider.isEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title={provider.isEnabled ? 'Disable provider' : 'Enable provider'}
          >
            {provider.isEnabled ? '✓' : '○'}
          </button>
          <button
            onClick={onTest}
            disabled={provider.testStatus === 'pending' || !provider.isEnabled}
            className={`px-2.5 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              provider.testStatus === 'pending' || !provider.isEnabled
                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                : 'bg-theme-primary hover:bg-theme-primary-hover'
            } text-white`}
          >
            {provider.testStatus === 'pending' ? '⟳' : '🔌'} Test
          </button>
          <button
            onClick={onEdit}
            className={`px-2.5 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              isDark 
                ? 'bg-dark-100 hover:bg-dark-50 text-gray-300' 
                : 'bg-light-300 hover:bg-light-400 text-gray-700'
            }`}
          >
            ✏️ Edit
          </button>
          <button
            onClick={onDelete}
            className="px-2.5 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Settings Summary */}
      <div className={`mt-3 pt-3 border-t flex flex-wrap gap-2 sm:gap-4 text-xs ${
        isDark ? 'border-dark-100 text-gray-500' : 'border-light-400 text-gray-500'
      }`}>
        <span className="whitespace-nowrap">Temperature: {provider.settings.temperature}</span>
        <span className="whitespace-nowrap">Max Tokens: {provider.settings.maxTokens}</span>
        {provider.settings.topP && <span className="whitespace-nowrap">Top P: {provider.settings.topP}</span>}
        <span className="whitespace-nowrap">API Key: {provider.apiKey ? '••••••••' : 'Not set'}</span>
      </div>
    </div>
  );
}
