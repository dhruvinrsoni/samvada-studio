import { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { HealthService } from '../../utils/healthService';

interface ConnectionStatusProps {
  minimized?: boolean;
  onMinimize?: () => void;
}

export default function ConnectionStatus({ minimized = false, onMinimize }: ConnectionStatusProps) {
  const { state } = useChat();
  const [connectivity, setConnectivity] = useState<{
    online: boolean;
    ollama: boolean;
    internet: boolean;
    ollamaModels: string[];
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const isDark = state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const status = await HealthService.checkBasicConnectivity();
      setConnectivity({
        online: navigator.onLine,
        ...status,
      });
    } catch (error) {
      console.error('Failed to check connectivity:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Re-check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!connectivity) return null;

  const hasOllamaProvider = state.providers.some(p => p.type === 'ollama' && p.isEnabled);
  const ollamaIsDefault = state.providers.some(p => p.type === 'ollama' && p.isDefault);
  
  // Check if the configured model exists
  const ollamaProvider = state.providers.find(p => p.type === 'ollama' && p.isEnabled);
  const configuredModel = ollamaProvider?.model || 'llama2';
  const modelInstalled = connectivity.ollamaModels.some(m => 
    m === configuredModel || m.startsWith(configuredModel + ':')
  );
  
  const showWarning = hasOllamaProvider && (!connectivity.ollama || (connectivity.ollama && !modelInstalled));

  if (!showWarning && connectivity.online) {
    return null; // Everything is fine
  }

  if (minimized) {
    return null; // Minimized to status bar
  }

  if (isDismissed) {
    return null; // User dismissed the warning
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-md ${showDetails ? 'w-96' : 'w-auto'}`}>
      <div
        className={`rounded-lg shadow-lg border transition-all ${
          isDark
            ? 'bg-dark-200 border-dark-100'
            : 'bg-white border-light-400'
        }`}
      >
        {/* Header - Always visible */}
        <div
          className={`p-4 flex items-start gap-3 cursor-pointer ${
            isDark ? 'hover:bg-dark-100' : 'hover:bg-light-200'
          }`}
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex-shrink-0">
            {isChecking ? (
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            ) : showWarning ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : !connectivity.online ? (
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
              {!connectivity.ollama
                ? 'Ollama Not Running'
                : !modelInstalled
                ? `Model "${configuredModel}" Not Installed`
                : !connectivity.online
                ? 'Offline'
                : 'Connection Status'}
            </p>
            {showWarning && (
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Click to see how to fix
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onMinimize) {
                  onMinimize(); // Minimize to status bar for Ollama
                } else {
                  setIsDismissed(true); // Regular dismiss for others
                }
              }}
              className={`p-1 rounded hover:bg-opacity-10 hover:bg-gray-500 ${
                isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
              }`}
              title={onMinimize ? "Minimize to status bar" : "Dismiss"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <svg
              className={`w-4 h-4 flex-shrink-0 transition-transform ${
                showDetails ? 'rotate-180' : ''
              } ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Details - Expandable */}
        {showDetails && (
          <div className={`px-4 pb-4 border-t ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
            <div className="mt-3 space-y-3">
              {/* Status items */}
              <div className="space-y-2">
                <StatusItem
                  label="Internet"
                  status={connectivity.internet}
                  isDark={isDark}
                />
                <StatusItem
                  label="Browser Online"
                  status={connectivity.online}
                  isDark={isDark}
                />
                {hasOllamaProvider && (
                  <StatusItem
                    label="Ollama (localhost:11434)"
                    status={connectivity.ollama}
                    isDark={isDark}
                  />
                )}
              </div>

              {/* Help text for Ollama */}
              {showWarning && !connectivity.ollama && (
                <div className={`p-3 rounded-lg text-xs ${
                  isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-800'
                }`}>
                  <p className="font-semibold mb-2">Ollama is not running:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-1">
                    <li>Install Ollama: <code className={`px-1 py-0.5 rounded ${
                      isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
                    }`}>https://ollama.ai</code></li>
                    <li>Start the server: <code className={`px-1 py-0.5 rounded ${
                      isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
                    }`}>ollama serve</code></li>
                  </ol>
                  {!ollamaIsDefault && (
                    <p className="mt-2 text-xs opacity-80">
                      💡 Or select a different provider (OpenAI, Claude, Gemini) in Admin Settings
                    </p>
                  )}
                </div>
              )}

              {/* Help text for missing model */}
              {showWarning && connectivity.ollama && !modelInstalled && (
                <div className={`p-3 rounded-lg text-xs ${
                  isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-800'
                }`}>
                  <p className="font-semibold mb-2">Model "{configuredModel}" not installed:</p>
                  <p className="mb-2">Run this command in your terminal:</p>
                  <code className={`block px-2 py-1.5 rounded font-mono ${
                    isDark ? 'bg-orange-500/20' : 'bg-orange-100'
                  }`}>ollama pull {configuredModel}</code>
                  
                  {connectivity.ollamaModels.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-1">Available models ({connectivity.ollamaModels.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {connectivity.ollamaModels.slice(0, 5).map(m => (
                          <span key={m} className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isDark ? 'bg-dark-200' : 'bg-white'
                          }`}>{m}</span>
                        ))}
                        {connectivity.ollamaModels.length > 5 && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isDark ? 'bg-dark-200' : 'bg-white'
                          }`}>+{connectivity.ollamaModels.length - 5} more</span>
                        )}
                      </div>
                      <p className="mt-2 text-xs opacity-80">
                        💡 Tip: Update model in Admin → Ollama provider to use an installed model
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    checkStatus();
                  }}
                  disabled={isChecking}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isDark
                      ? 'bg-dark-100 hover:bg-dark-300 text-gray-300'
                      : 'bg-light-300 hover:bg-light-400 text-gray-700'
                  } disabled:opacity-50`}
                >
                  {isChecking ? 'Checking...' : 'Refresh'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open('https://ollama.ai/download', '_blank');
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isDark
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }`}
                >
                  Install Ollama
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusItem({ label, status, isDark }: { label: string; status: boolean; isDark: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
      <div className="flex items-center gap-1">
        <div
          className={`w-2 h-2 rounded-full ${
            status ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className={`text-xs font-medium ${
          status
            ? 'text-green-500'
            : 'text-red-500'
        }`}>
          {status ? 'Connected' : 'Not available'}
        </span>
      </div>
    </div>
  );
}
