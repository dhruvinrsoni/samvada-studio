import React, { useState, useEffect } from 'react';

interface BackendProxySettingsProps {
  onProxyUrlChange?: (url: string) => void;
}

interface ProxyHealth {
  status: 'ok' | 'error' | 'checking';
  url?: string;
  message?: string;
  version?: string;
}

/**
 * Backend Proxy Settings Component
 * 
 * Features:
 * - Auto-discovery of local backend (localhost:3001)
 * - Manual URL input for hosted backends
 * - Health check and validation
 * - Clear status indicators
 */
export const BackendProxySettings: React.FC<BackendProxySettingsProps> = ({ onProxyUrlChange }) => {
  const [proxyUrl, setProxyUrl] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [health, setHealth] = useState<ProxyHealth>({ status: 'checking' });
  const [autoDiscovery, setAutoDiscovery] = useState<boolean>(true);

  // Load saved proxy URL from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('backendProxyUrl');
    if (saved) {
      setProxyUrl(saved);
      setAutoDiscovery(false);
      checkHealth(saved);
    } else {
      // Try auto-discovery
      attemptAutoDiscovery();
    }
  }, []);

  const attemptAutoDiscovery = async () => {
    const localUrls = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3000',
    ];

    setHealth({ status: 'checking', message: 'Auto-discovering local backend...' });

    for (const url of localUrls) {
      try {
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000), // 2s timeout
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok') {
            setProxyUrl(url);
            setHealth({
              status: 'ok',
              url,
              message: 'Local backend discovered',
              version: data.version,
            });
            localStorage.setItem('backendProxyUrl', url);
            onProxyUrlChange?.(url);
            return;
          }
        }
      } catch (error) {
        // Continue to next URL
        continue;
      }
    }

    // No local backend found
    setHealth({
      status: 'error',
      message: 'No local backend found. Please start the backend or enter a custom URL.',
    });
  };

  const checkHealth = async (url: string) => {
    if (!url) return;

    setHealth({ status: 'checking', message: 'Checking backend health...' });

    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        setHealth({
          status: 'ok',
          url,
          message: 'Backend is healthy',
          version: data.version,
        });
      } else {
        setHealth({
          status: 'error',
          url,
          message: `Backend responded with status ${response.status}`,
        });
      }
    } catch (error) {
      setHealth({
        status: 'error',
        url,
        message: error instanceof Error ? error.message : 'Failed to connect to backend',
      });
    }
  };

  const handleSaveCustomUrl = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) return;

    // Validate URL format
    try {
      new URL(trimmed);
    } catch {
      setHealth({
        status: 'error',
        message: 'Invalid URL format. Must start with http:// or https://',
      });
      return;
    }

    setProxyUrl(trimmed);
    setAutoDiscovery(false);
    localStorage.setItem('backendProxyUrl', trimmed);
    onProxyUrlChange?.(trimmed);
    checkHealth(trimmed);
  };

  const handleClear = () => {
    setProxyUrl('');
    setCustomUrl('');
    localStorage.removeItem('backendProxyUrl');
    setAutoDiscovery(true);
    onProxyUrlChange?.('');
    attemptAutoDiscovery();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">🔐 Backend Proxy</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Use a secure backend proxy to enable Anthropic and other providers that block direct browser access.
        </p>
      </div>

      {/* Status Indicator */}
      <div className={`p-4 rounded-lg border ${
        health.status === 'ok' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
        health.status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
        'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
      }`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {health.status === 'ok' && <span className="text-green-600 dark:text-green-400">✅</span>}
            {health.status === 'error' && <span className="text-red-600 dark:text-red-400">❌</span>}
            {health.status === 'checking' && <span className="text-blue-600 dark:text-blue-400">🔍</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {health.status === 'ok' && 'Backend Connected'}
              {health.status === 'error' && 'Backend Not Available'}
              {health.status === 'checking' && 'Checking Backend...'}
            </p>
            {health.url && (
              <p className="text-xs mt-1 font-mono break-all">{health.url}</p>
            )}
            {health.message && (
              <p className="text-xs mt-1 opacity-80">{health.message}</p>
            )}
            {health.version && (
              <p className="text-xs mt-1 opacity-60">Version: {health.version}</p>
            )}
          </div>
        </div>
      </div>

      {/* Current Configuration */}
      {proxyUrl && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Current Backend URL:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={proxyUrl}
              readOnly
              className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm"
            />
            <button
              onClick={() => checkHealth(proxyUrl)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              Recheck
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Custom URL Input */}
      {(!proxyUrl || !autoDiscovery) && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Custom Backend URL:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://your-backend.onrender.com"
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 font-mono text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomUrl()}
            />
            <button
              onClick={handleSaveCustomUrl}
              disabled={!customUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter the URL of your deployed backend (Render, Railway, etc.)
          </p>
        </div>
      )}

      {/* Quick Start Guide */}
      {health.status === 'error' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm space-y-2">
          <p className="font-semibold">🚀 Quick Start:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Open a new terminal</li>
            <li>Run: <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">cd backend && npm install && npm start</code></li>
            <li>Backend will start at <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">http://localhost:3001</code></li>
            <li>Click "Auto-discover" or "Recheck" above</li>
          </ol>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="font-semibold mb-1">📦 Deploy for Free:</p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Render: <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">render.com</a></li>
              <li>• Railway: <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">railway.app</a></li>
            </ul>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs">
        <p className="font-semibold mb-1">🔐 Security Note:</p>
        <p className="text-gray-600 dark:text-gray-400">
          The backend proxy does NOT store your API keys. Keys are sent from your browser through the proxy to the LLM provider. 
          You maintain full control of your keys at all times (BYOK - Bring Your Own Keys).
        </p>
      </div>
    </div>
  );
};
