// Ollama Configuration Panel - Spring-style manual configuration UI
import React, { useState, useEffect } from 'react';
import { ollamaDiscovery, OllamaEndpoint, OllamaConfiguration } from '../../services/ollamaDiscovery';

export const OllamaConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<OllamaConfiguration>(ollamaDiscovery.getConfiguration());
  const [discoveryResults, setDiscoveryResults] = useState<Map<string, any>>(new Map());
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState({
    host: '',
    port: 11434,
    protocol: 'http' as 'http' | 'https',
    basePath: '',
    apiKey: '',
    label: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setConfig(ollamaDiscovery.getConfiguration());
  }, []);

  const handleDiscovery = async () => {
    setIsDiscovering(true);
    try {
      const result = await ollamaDiscovery.discoverEndpoint();
      setDiscoveryResults(ollamaDiscovery.getDiscoveryResults());
      
      if (result && result.isHealthy) {
        alert(`✅ Found healthy Ollama endpoint:\n${result.endpoint.protocol}://${result.endpoint.host}:${result.endpoint.port}\nResponse time: ${result.responseTime}ms`);
      } else {
        alert('❌ No healthy Ollama endpoints found. Try adding a custom endpoint.');
      }
    } catch (error: any) {
      alert(`Discovery failed: ${error.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAddEndpoint = () => {
    if (!newEndpoint.host) {
      alert('Please enter a host address');
      return;
    }

    ollamaDiscovery.addEndpoint(newEndpoint);
    setConfig(ollamaDiscovery.getConfiguration());
    setNewEndpoint({
      host: '',
      port: 11434,
      protocol: 'http',
      basePath: '',
      apiKey: '',
      label: '',
    });
    setShowAddForm(false);
  };

  const handleRemoveEndpoint = (host: string, port: number) => {
    if (confirm(`Remove endpoint ${host}:${port}?`)) {
      ollamaDiscovery.removeEndpoint(host, port);
      setConfig(ollamaDiscovery.getConfiguration());
    }
  };

  const handleConfigChange = (key: keyof OllamaConfiguration, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    ollamaDiscovery.saveConfiguration(newConfig);
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
          alert('✅ Configuration imported successfully');
        } else {
          alert('❌ Failed to import configuration');
        }
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm('Reset all Ollama configuration? This will clear cached endpoints and custom settings.')) {
      ollamaDiscovery.clearEndpoints();
      ollamaDiscovery.reset();
      setConfig(ollamaDiscovery.getConfiguration());
      setDiscoveryResults(new Map());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-4">
        <h3 className="text-xl font-bold text-white mb-2">🔧 Ollama Configuration</h3>
        <p className="text-sm text-gray-400">
          Production-grade auto-discovery with manual configuration fallbacks
        </p>
      </div>

      {/* Auto-Discovery Section */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-white mb-1">Auto-Discovery</h4>
            <p className="text-sm text-gray-400">Automatically find available Ollama endpoints</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoDiscovery}
              onChange={(e) => handleConfigChange('autoDiscovery', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <button
          onClick={handleDiscovery}
          disabled={isDiscovering}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isDiscovering ? (
            <>
              <span className="animate-spin">🔍</span>
              Discovering...
            </>
          ) : (
            <>
              <span>🔍</span>
              Run Discovery
            </>
          )}
        </button>

        {discoveryResults.size > 0 && (
          <div className="mt-4 space-y-2">
            <h5 className="text-sm font-semibold text-gray-300">Discovery Results:</h5>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {Array.from(discoveryResults.entries()).map(([url, result]) => (
                <div
                  key={url}
                  className={`p-3 rounded text-sm ${
                    result.isHealthy
                      ? 'bg-green-900/30 border border-green-700'
                      : 'bg-red-900/30 border border-red-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{url}</span>
                    <span className={result.isHealthy ? 'text-green-400' : 'text-red-400'}>
                      {result.isHealthy ? '✅' : '❌'} {result.responseTime}ms
                    </span>
                  </div>
                  {result.error && (
                    <div className="text-xs text-red-400 mt-1">Error: {result.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Network Detection Settings */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-white mb-2">Network Detection</h4>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Enable LAN Scan</span>
          <input
            type="checkbox"
            checked={config.networkDetection.enableLANScan}
            onChange={(e) => handleConfigChange('networkDetection', {
              ...config.networkDetection,
              enableLANScan: e.target.checked,
            })}
            className="rounded"
          />
        </label>

        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Enable Port Scan</span>
          <input
            type="checkbox"
            checked={config.networkDetection.enablePortScan}
            onChange={(e) => handleConfigChange('networkDetection', {
              ...config.networkDetection,
              enablePortScan: e.target.checked,
            })}
            className="rounded"
          />
        </label>

        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Scan Timeout (ms)</span>
          <input
            type="number"
            value={config.networkDetection.scanTimeout}
            onChange={(e) => handleConfigChange('networkDetection', {
              ...config.networkDetection,
              scanTimeout: parseInt(e.target.value),
            })}
            className="w-24 bg-gray-700 text-white px-2 py-1 rounded text-sm"
            min="500"
            max="10000"
            step="500"
          />
        </label>
      </div>

      {/* Custom Endpoints */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white">Custom Endpoints</h4>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            {showAddForm ? '✕ Cancel' : '+ Add Endpoint'}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Host/IP *</label>
                <input
                  type="text"
                  value={newEndpoint.host}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, host: e.target.value })}
                  placeholder="192.168.1.100"
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Port</label>
                <input
                  type="number"
                  value={newEndpoint.port}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, port: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Protocol</label>
                <select
                  value={newEndpoint.protocol}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, protocol: e.target.value as 'http' | 'https' })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Label</label>
                <input
                  type="text"
                  value={newEndpoint.label}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, label: e.target.value })}
                  placeholder="My Server"
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Base Path (optional)</label>
              <input
                type="text"
                value={newEndpoint.basePath}
                onChange={(e) => setNewEndpoint({ ...newEndpoint, basePath: e.target.value })}
                placeholder="/api"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">API Key (optional)</label>
              <input
                type="password"
                value={newEndpoint.apiKey}
                onChange={(e) => setNewEndpoint({ ...newEndpoint, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            <button
              onClick={handleAddEndpoint}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium"
            >
              Add Endpoint
            </button>
          </div>
        )}

        {config.endpoints.length > 0 ? (
          <div className="space-y-2">
            {config.endpoints.map((endpoint, idx) => (
              <div key={idx} className="bg-gray-900 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm text-white">
                    {endpoint.protocol}://{endpoint.host}:{endpoint.port}{endpoint.basePath}
                  </div>
                  {endpoint.label && (
                    <div className="text-xs text-gray-400 mt-1">{endpoint.label}</div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveEndpoint(endpoint.host, endpoint.port)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            No custom endpoints configured
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
        >
          📥 Export Config
        </button>
        <button
          onClick={handleImport}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
        >
          📤 Import Config
        </button>
        <button
          onClick={handleReset}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium"
        >
          🔄 Reset
        </button>
      </div>
    </div>
  );
};
