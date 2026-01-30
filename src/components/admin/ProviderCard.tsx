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
  onSetDefault: () => void;
  onTest: () => void;
}

export default function ProviderCard({
  provider,
  isDefault,
  providerHealth,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
}: ProviderCardProps) {
  const { state } = useChat();
  const isDark = state.theme === 'dark';
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
              Model: <code className={`px-1 py-0.5 rounded ${isDark ? 'bg-dark-100' : 'bg-light-400'}`}>
                {provider.model}
                {provider.type === 'ollama' && (
                  <span className="ml-1 opacity-75 text-gray-700">
                    ({providerHealth?.modelSize 
                      ? HealthService.formatBytes(providerHealth.modelSize)
                      : 'size unknown'})
                  </span>
                )}
              </code>
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
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
                      isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
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
                          <p className={`mt-2 break-words ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                            💡 {provider.testErrorDetails.userAction}
                          </p>
                        )}
                        {provider.testErrorDetails.documentationUrl && (
                          <a
                            href={provider.testErrorDetails.documentationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-1 inline-block ${
                              isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
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
