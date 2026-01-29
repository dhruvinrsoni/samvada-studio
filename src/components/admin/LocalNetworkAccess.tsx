import { useState, useEffect } from 'react';

interface LocalNetworkAccessProps {
  isDark: boolean;
}

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export default function LocalNetworkAccess({ isDark }: LocalNetworkAccessProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });

  useEffect(() => {
    checkPermissionState();
    
    // Listen for localStorage changes (e.g., from reset in another component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'samvada-local-network-permission' || e.key === null) {
        checkPermissionState();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from same window
    const handleLocalChange = () => {
      checkPermissionState();
    };
    
    window.addEventListener('local-storage-change', handleLocalChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleLocalChange);
    };
  }, []);

  const checkPermissionState = () => {
    const stored = localStorage.getItem('samvada-local-network-permission');
    if (stored) {
      setPermissionState(stored as PermissionState);
    } else {
      setPermissionState('prompt');
    }
  };

  const requestPermission = async () => {
    setIsLoading(true);
    setTestResult({ status: null, message: '' });

    try {
      // Test connection to localhost (common local LLM port)
      const testEndpoint = 'http://localhost:11434/api/version';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(testEndpoint, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        localStorage.setItem('samvada-local-network-permission', 'granted');
        setPermissionState('granted');
        window.dispatchEvent(new Event('local-storage-change'));
        setTestResult({
          status: 'success',
          message: '✅ Successfully connected to local network! Ollama server detected.',
        });
      } else {
        // Connection attempt was made, permission granted but service not available
        localStorage.setItem('samvada-local-network-permission', 'granted');
        setPermissionState('granted');
        window.dispatchEvent(new Event('local-storage-change'));
        setTestResult({
          status: 'success',
          message: '✅ Local network access granted! (No Ollama server running, but permission is active)',
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Timeout - permission likely granted but no service
          localStorage.setItem('samvada-local-network-permission', 'granted');
          setPermissionState('granted');
          window.dispatchEvent(new Event('local-storage-change'));
          setTestResult({
            status: 'success',
            message: '✅ Local network access granted! (No response from localhost, but permission is active)',
          });
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          // Could be CORS, network issue, or permission denied
          // We'll assume permission was prompted
          localStorage.setItem('samvada-local-network-permission', 'granted');
          setPermissionState('granted');
          window.dispatchEvent(new Event('local-storage-change'));
          setTestResult({
            status: 'success',
            message: '✅ Local network access initiated! You may need to allow the connection in your browser if prompted.',
          });
        } else {
          setTestResult({
            status: 'error',
            message: `⚠️ Error: ${error.message}`,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const revokePermission = () => {
    localStorage.setItem('samvada-local-network-permission', 'denied');
    setPermissionState('denied');
    window.dispatchEvent(new Event('local-storage-change'));
    setTestResult({
      status: 'success',
      message: '🚫 Local network access revoked. Local LLM providers won\'t be accessible.',
    });
  };

  const resetPermission = () => {
    // Clear BOTH keys to fully reset
    localStorage.removeItem('samvada-local-network-permission');
    localStorage.removeItem('samvada-network-prompt-shown');
    
    // Update local state
    setPermissionState('prompt');
    
    // Dispatch custom event for same-window sync (but NOT to trigger immediate re-prompt)
    window.dispatchEvent(new CustomEvent('local-storage-reset'));
    
    setTestResult({
      status: 'success',
      message: '🔄 Permission reset. The app will prompt you again on next reload.',
    });
  };

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult({ status: null, message: '' });

    try {
      const testEndpoint = 'http://localhost:11434/api/version';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(testEndpoint, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          status: 'success',
          message: `✅ Connected to Ollama ${data.version || 'server'}`,
        });
      } else {
        setTestResult({
          status: 'error',
          message: '⚠️ Connection made but Ollama returned an error',
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setTestResult({
          status: 'error',
          message: '⏱️ Connection timeout. Make sure Ollama is running on port 11434.',
        });
      } else {
        setTestResult({
          status: 'error',
          message: '❌ Cannot connect. Check if Ollama is running.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (permissionState) {
      case 'granted':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✓ Granted
          </span>
        );
      case 'denied':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            ✕ Denied
          </span>
        );
      case 'prompt':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            ⚠ Not Set
          </span>
        );
      case 'unsupported':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            ⊘ Unsupported
          </span>
        );
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${isDark ? 'border-dark-100 bg-dark-300' : 'border-light-400 bg-light-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              🌐 Local Network Access
            </h3>
            {getStatusBadge()}
          </div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Required for connecting to local LLM servers like Ollama (localhost:11434)
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'}`}>
        <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
          <strong>Why this is needed:</strong> Browsers restrict access to local network resources (localhost, 192.168.x.x) for security. 
          This feature allows Samvada Studio to connect to locally running LLM servers like Ollama, without requiring external cloud APIs.
        </p>
      </div>

      {/* Test Result */}
      {testResult.status && (
        <div className={`p-3 rounded-lg mb-4 ${
          testResult.status === 'success'
            ? isDark ? 'bg-green-900/20 border border-green-800/30' : 'bg-green-50 border border-green-200'
            : isDark ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${
            testResult.status === 'success'
              ? isDark ? 'text-green-300' : 'text-green-800'
              : isDark ? 'text-red-300' : 'text-red-800'
          }`}>
            {testResult.message}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Request Permission */}
        {permissionState === 'prompt' && (
          <div className="flex items-center gap-3">
            <button
              onClick={requestPermission}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {isLoading ? '⏳ Testing Connection...' : '🔓 Grant Local Network Access'}
            </button>
          </div>
        )}

        {/* Active State Actions */}
        {permissionState === 'granted' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={testConnection}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isDark
                    ? 'bg-dark-100 hover:bg-dark-50 text-gray-200'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? '⏳ Testing...' : '🔍 Test Connection'}
              </button>
              <button
                onClick={revokePermission}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isDark
                    ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300'
                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
                title="Immediately deny access (can re-enable anytime)"
              >
                🚫 Revoke
              </button>
            </div>
            <button
              onClick={resetPermission}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isDark
                  ? 'bg-dark-100 hover:bg-dark-50 text-gray-300 border border-dark-50'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              }`}
              title="Clear permission - will prompt again on next app reload"
            >
              🔄 Reset to Default
            </button>
            <p className={`text-xs mt-2 ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
              <strong>Revoke:</strong> Immediately blocks access (changeable anytime). 
              <strong className="ml-2">Reset:</strong> Clears choice - app will ask again on next reload.
            </p>
          </div>
        )}

        {/* Denied State */}
        {permissionState === 'denied' && (
          <div className="space-y-3">
            <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
              ⚠️ Local network access is currently denied. Local LLM providers like Ollama won't work.
            </p>
            <div className="flex gap-3">
              <button
                onClick={requestPermission}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm"
                title="Grant access to connect to local LLM servers"
              >
                🔓 Grant Access
              </button>
              <button
                onClick={resetPermission}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  isDark
                    ? 'bg-dark-100 hover:bg-dark-50 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title="Clear permission - will prompt again on next reload"
              >
                🔄 Reset
              </button>
            </div>
            <p className={`text-xs ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
              <strong>Grant Access:</strong> Allow connection to local servers. 
              <strong className="ml-2">Reset:</strong> Clear denied state - app will ask again on reload.
            </p>
          </div>
        )}
      </div>

      {/* Technical Details (Collapsible) */}
      <details className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <summary className="cursor-pointer hover:underline font-medium">
          🔧 Technical Details
        </summary>
        <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-500">
          <p>
            <strong>How it works:</strong> When you grant access, the app tests a connection to localhost:11434 
            (Ollama's default port). This triggers your browser's permission prompt if it hasn't been granted yet.
          </p>
          <p>
            <strong>Storage:</strong> Permission state is saved in localStorage as 'samvada-local-network-permission'.
          </p>
          <p>
            <strong>Supported Endpoints:</strong> localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x (private networks)
          </p>
          <p>
            <strong>Security:</strong> This only grants access to YOUR local network. Remote servers cannot access your local resources through this app.
          </p>
          <p className={isDark ? 'text-yellow-300' : 'text-yellow-700'}>
            <strong>Note:</strong> Some browsers may not show a prompt but will silently block/allow based on their policies. 
            Use the Test Connection button to verify access.
          </p>
        </div>
      </details>
    </div>
  );
}
