import { useState, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import {
  getRecentLogs,
  getErrorSummary,
  getSystemInfo,
  clearLogs,
  LogEntry,
} from '../../utils/debug';
import { HealthService } from '../../utils/healthService';
import { STORAGE_KEY, SENSITIVE_STORAGE_KEY } from '../../utils/storage';

// Helper to safely convert date (handles both Date objects and ISO strings from localStorage)
const safeToISOString = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined;
  if (typeof date === 'string') return date; // Already a string from JSON parse
  if (date instanceof Date) return date.toISOString();
  return undefined;
};

interface DiagnosticsReport {
  generatedAt: string;
  system: ReturnType<typeof getSystemInfo>;
  connectivity: ConnectivityResult;
  storage: {
    stateSize: number;
    sensitiveSize: number;
    totalSize: number;
    chatsCount: number;
    providersCount: number;
    templatesCount: number;
    foldersCount: number;
  };
  errorSummary: ReturnType<typeof getErrorSummary>;
  recentErrors: LogEntry[];
  recentLogs: LogEntry[];
  providers: Array<{
    id: string;
    name: string;
    type: string;
    isEnabled: boolean;
    isDefault: boolean;
    hasApiKey: boolean;
    endpoint: string;
    model: string;
    lastTested?: string;
    testStatus?: string;
  }>;
}

// Individual check results
interface ConnectivityResult {
  online: boolean;
  ollama: boolean;
  internet: boolean;
  ollamaModels: string[];
}

interface StorageResult {
  stateSize: number;
  sensitiveSize: number;
  totalSize: number;
  chatsCount: number;
  providersCount: number;
  templatesCount: number;
  foldersCount: number;
}

export default function DeveloperTools() {
  const { state } = useChat();
  const { addToast } = useToast();
  
  // States for different checks
  const [isRunningFull, setIsRunningFull] = useState(false);
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);
  
  // Individual results
  const [connectivityResult, setConnectivityResult] = useState<ConnectivityResult | null>(null);
  const [storageResult, setStorageResult] = useState<StorageResult | null>(null);
  const [systemInfo, setSystemInfo] = useState<ReturnType<typeof getSystemInfo> | null>(null);
  const [logsVisible, setLogsVisible] = useState(false);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  
  // Full report
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [showRawLogs, setShowRawLogs] = useState(false);

  const isDark = state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Individual check: Connectivity
  const checkConnectivityOnly = useCallback(async () => {
    setIsCheckingConnectivity(true);
    try {
      const result = await HealthService.checkBasicConnectivity();
      setConnectivityResult({
        online: navigator.onLine,
        ...result,
      });
      addToast(
        result.ollama ? 'success' : 'warning',
        'Connectivity Check',
        result.ollama 
          ? `Ollama running with ${result.ollamaModels.length} model(s)` 
          : 'Ollama not running'
      );
    } catch (error) {
      addToast('error', 'Check Failed', String(error));
    } finally {
      setIsCheckingConnectivity(false);
    }
  }, [addToast]);

  // Individual check: Storage
  const checkStorageOnly = useCallback(() => {
    setIsCheckingStorage(true);
    try {
      const stateData = localStorage.getItem(STORAGE_KEY) || '';
      const sensitiveData = localStorage.getItem(SENSITIVE_STORAGE_KEY) || '';
      
      const result: StorageResult = {
        stateSize: new Blob([stateData]).size,
        sensitiveSize: new Blob([sensitiveData]).size,
        totalSize: new Blob([stateData]).size + new Blob([sensitiveData]).size,
        chatsCount: state.chats.length,
        providersCount: state.providers.length,
        templatesCount: state.templates.length,
        foldersCount: state.folders.length,
      };
      setStorageResult(result);
      addToast('success', 'Storage Check', `Total: ${(result.totalSize / 1024).toFixed(1)} KB`);
    } catch (error) {
      addToast('error', 'Check Failed', String(error));
    } finally {
      setIsCheckingStorage(false);
    }
  }, [state, addToast]);

  // Individual check: System Info
  const checkSystemInfo = useCallback(() => {
    const info = getSystemInfo();
    setSystemInfo(info);
    addToast('success', 'System Info', `${info.platform} - ${info.windowSize}`);
  }, [addToast]);

  // Individual check: View Logs
  const viewLogs = useCallback(() => {
    const logs = getRecentLogs();
    setRecentLogs(logs);
    setLogsVisible(true);
    addToast('info', 'Logs Loaded', `${logs.length} log entries`);
  }, [addToast]);

  // Full diagnostics (all checks combined)
  const runDiagnostics = useCallback(async () => {
    setIsRunningFull(true);
    try {
      const [connectivityResult, sysInfo] = await Promise.all([
        HealthService.checkBasicConnectivity(),
        Promise.resolve(getSystemInfo()),
      ]);

      const connectivity = {
        online: navigator.onLine,
        ...connectivityResult,
      };

      // Calculate storage sizes
      const stateData = localStorage.getItem(STORAGE_KEY) || '';
      const sensitiveData = localStorage.getItem(SENSITIVE_STORAGE_KEY) || '';

      const diagnosticsReport: DiagnosticsReport = {
        generatedAt: new Date().toISOString(),
        system: sysInfo,
        connectivity,
        storage: {
          stateSize: new Blob([stateData]).size,
          sensitiveSize: new Blob([sensitiveData]).size,
          totalSize: new Blob([stateData]).size + new Blob([sensitiveData]).size,
          chatsCount: state.chats.length,
          providersCount: state.providers.length,
          templatesCount: state.templates.length,
          foldersCount: state.folders.length,
        },
        errorSummary: getErrorSummary(),
        recentErrors: getRecentLogs().filter(l => l.level === 'error').slice(-10),
        recentLogs: getRecentLogs().slice(-20),
        providers: state.providers.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          isEnabled: p.isEnabled,
          isDefault: p.isDefault,
          hasApiKey: !!p.apiKey,
          endpoint: p.apiEndpoint || '',
          model: p.model,
          lastTested: safeToISOString(p.lastTested),
          testStatus: p.testStatus,
        })),
      };

      setReport(diagnosticsReport);
      // Also update individual results
      setConnectivityResult(connectivity);
      setStorageResult(diagnosticsReport.storage);
      setSystemInfo(sysInfo);
      
      addToast('success', 'Diagnostics Complete', 'Full report generated');
    } catch (error) {
      addToast('error', 'Diagnostics Failed', String(error));
    } finally {
      setIsRunningFull(false);
    }
  }, [state, addToast]);

  const generatePlainTextReport = (r: DiagnosticsReport): string => {
    const lines: string[] = [];
    const hr = '='.repeat(60);
    const hr2 = '-'.repeat(40);

    lines.push(hr);
    lines.push('SAMVADA STUDIO - DIAGNOSTICS REPORT');
    lines.push(hr);
    lines.push(`Generated: ${new Date(r.generatedAt).toLocaleString()}`);
    lines.push('');

    // System Info
    lines.push(hr2);
    lines.push('SYSTEM INFORMATION');
    lines.push(hr2);
    lines.push(`Platform: ${r.system.platform}`);
    lines.push(`User Agent: ${r.system.userAgent}`);
    lines.push(`Language: ${r.system.language}`);
    lines.push(`Screen: ${r.system.screenResolution}`);
    lines.push(`Window: ${r.system.windowSize}`);
    lines.push(`Online: ${r.system.online ? 'Yes' : 'No'}`);
    lines.push(`Cookies: ${r.system.cookiesEnabled ? 'Enabled' : 'Disabled'}`);
    lines.push(`Memory: ${r.system.deviceMemory}`);
    lines.push(`CPU Cores: ${r.system.hardwareConcurrency}`);
    lines.push(`Connection: ${r.system.connection}`);
    lines.push('');

    // Connectivity
    lines.push(hr2);
    lines.push('CONNECTIVITY STATUS');
    lines.push(hr2);
    lines.push(`Browser Online: ${r.connectivity.online ? '✓ Yes' : '✗ No'}`);
    lines.push(`Internet: ${r.connectivity.internet ? '✓ Connected' : '✗ Not available'}`);
    lines.push(`Ollama (localhost:11434): ${r.connectivity.ollama ? '✓ Running' : '✗ Not running'}`);
    if (r.connectivity.ollama && r.connectivity.ollamaModels.length > 0) {
      lines.push(`Ollama Models: ${r.connectivity.ollamaModels.join(', ')}`);
    }
    lines.push('');

    // Storage
    lines.push(hr2);
    lines.push('STORAGE');
    lines.push(hr2);
    lines.push(`State Size: ${(r.storage.stateSize / 1024).toFixed(2)} KB`);
    lines.push(`Sensitive Size: ${(r.storage.sensitiveSize / 1024).toFixed(2)} KB`);
    lines.push(`Total: ${(r.storage.totalSize / 1024).toFixed(2)} KB`);
    lines.push(`Chats: ${r.storage.chatsCount}`);
    lines.push(`Providers: ${r.storage.providersCount}`);
    lines.push(`Templates: ${r.storage.templatesCount}`);
    lines.push(`Folders: ${r.storage.foldersCount}`);
    lines.push('');

    // Providers
    lines.push(hr2);
    lines.push('LLM PROVIDERS');
    lines.push(hr2);
    r.providers.forEach((p, i) => {
      lines.push(`[${i + 1}] ${p.name}`);
      lines.push(`    Type: ${p.type}`);
      lines.push(`    Model: ${p.model}`);
      lines.push(`    Endpoint: ${p.endpoint || 'Not set'}`);
      lines.push(`    Enabled: ${p.isEnabled ? 'Yes' : 'No'}`);
      lines.push(`    Default: ${p.isDefault ? 'Yes' : 'No'}`);
      lines.push(`    API Key: ${p.hasApiKey ? 'Set' : 'Not set'}`);
      lines.push(`    Test Status: ${p.testStatus || 'Not tested'}`);
      if (p.lastTested) {
        lines.push(`    Last Tested: ${new Date(p.lastTested).toLocaleString()}`);
      }
      lines.push('');
    });

    // Error Summary
    lines.push(hr2);
    lines.push('ERROR SUMMARY');
    lines.push(hr2);
    lines.push(`Total Errors: ${r.errorSummary.total}`);
    if (Object.keys(r.errorSummary.byCategory).length > 0) {
      lines.push('By Category:');
      Object.entries(r.errorSummary.byCategory).forEach(([cat, count]) => {
        lines.push(`  - ${cat}: ${count}`);
      });
    }
    lines.push('');

    // Recent Errors
    if (r.recentErrors.length > 0) {
      lines.push(hr2);
      lines.push('RECENT ERRORS (Last 10)');
      lines.push(hr2);
      r.recentErrors.forEach((log, i) => {
        lines.push(`[${i + 1}] ${new Date(log.timestamp).toLocaleTimeString()}`);
        lines.push(`    Category: ${log.category}`);
        lines.push(`    Message: ${log.message}`);
        if (log.data) {
          lines.push(`    Data: ${JSON.stringify(log.data, null, 2).split('\n').map((l, idx) => idx === 0 ? l : '          ' + l).join('\n')}`);
        }
        lines.push('');
      });
    }

    // Footer
    lines.push(hr);
    lines.push('END OF REPORT');
    lines.push(hr);
    lines.push('');
    lines.push('To get help, share this report with:');
    lines.push('- GitHub Issues: https://github.com/dhruvinrsoni/samvada-studio/issues');
    lines.push('- Support chat or LLM for troubleshooting');
    lines.push('');
    lines.push('Note: API keys are NOT included in this report for security.');

    return lines.join('\n');
  };

  const copyToClipboard = async () => {
    if (!report) return;
    try {
      const text = generatePlainTextReport(report);
      await navigator.clipboard.writeText(text);
      addToast('success', 'Copied!', 'Report copied to clipboard');
    } catch (error) {
      addToast('error', 'Copy Failed', 'Could not copy to clipboard');
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const text = generatePlainTextReport(report);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `samvada-diagnostics-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Downloaded!', 'Report saved as .txt file');
  };

  const handleClearLogs = () => {
    clearLogs();
    setReport(null);
    setConnectivityResult(null);
    setStorageResult(null);
    setSystemInfo(null);
    setLogsVisible(false);
    setRecentLogs([]);
    addToast('info', 'All Cleared', 'Logs and results have been cleared');
  };

  return (
    <div className={`rounded-lg border ${isDark ? 'bg-dark-200 border-dark-100' : 'bg-white border-light-400'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Developer Tools
            </h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
            For Debugging
          </span>
        </div>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Run individual checks or full diagnostics for troubleshooting
        </p>
      </div>

      {/* Individual Quick Actions */}
      <div className={`p-4 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <h4 className={`text-xs font-medium uppercase tracking-wide mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          Quick Actions
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={checkConnectivityOnly}
            disabled={isCheckingConnectivity}
            className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
              isDark
                ? 'bg-dark-100 hover:bg-dark-300 text-gray-300 disabled:opacity-50'
                : 'bg-light-200 hover:bg-light-300 text-gray-700 disabled:opacity-50'
            }`}
          >
            {isCheckingConnectivity ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>🌐</span>
            )}
            <span>Connectivity</span>
          </button>

          <button
            onClick={checkStorageOnly}
            disabled={isCheckingStorage}
            className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
              isDark
                ? 'bg-dark-100 hover:bg-dark-300 text-gray-300 disabled:opacity-50'
                : 'bg-light-200 hover:bg-light-300 text-gray-700 disabled:opacity-50'
            }`}
          >
            <span>💾</span>
            <span>Storage</span>
          </button>

          <button
            onClick={checkSystemInfo}
            className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
              isDark
                ? 'bg-dark-100 hover:bg-dark-300 text-gray-300'
                : 'bg-light-200 hover:bg-light-300 text-gray-700'
            }`}
          >
            <span>💻</span>
            <span>System Info</span>
          </button>

          <button
            onClick={viewLogs}
            className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
              isDark
                ? 'bg-dark-100 hover:bg-dark-300 text-gray-300'
                : 'bg-light-200 hover:bg-light-300 text-gray-700'
            }`}
          >
            <span>📜</span>
            <span>View Logs</span>
          </button>
        </div>
      </div>

      {/* Individual Results (shown when available) */}
      {(connectivityResult || storageResult || systemInfo) && (
        <div className={`p-4 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          <h4 className={`text-xs font-medium uppercase tracking-wide mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Quick Results
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {connectivityResult && (
              <>
                <StatusCard
                  icon={connectivityResult.online ? '🌐' : '📵'}
                  label="Internet"
                  value={connectivityResult.online ? 'Online' : 'Offline'}
                  status={connectivityResult.online ? 'success' : 'error'}
                  isDark={isDark}
                />
                <StatusCard
                  icon={connectivityResult.ollama ? '🦙' : '⚠️'}
                  label="Ollama"
                  value={connectivityResult.ollama ? `${connectivityResult.ollamaModels.length} models` : 'Not Running'}
                  status={connectivityResult.ollama ? 'success' : 'warning'}
                  isDark={isDark}
                />
              </>
            )}
            {storageResult && (
              <StatusCard
                icon="💾"
                label="Storage"
                value={`${(storageResult.totalSize / 1024).toFixed(1)} KB`}
                status="info"
                isDark={isDark}
              />
            )}
            {systemInfo && (
              <StatusCard
                icon="💻"
                label="Platform"
                value={systemInfo.platform}
                status="info"
                isDark={isDark}
              />
            )}
          </div>

          {/* Ollama Models List */}
          {connectivityResult?.ollama && connectivityResult.ollamaModels.length > 0 && (
            <div className={`mt-3 p-2 rounded text-xs ${isDark ? 'bg-dark-100' : 'bg-light-200'}`}>
              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                Installed models: {connectivityResult.ollamaModels.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Logs Section (shown when View Logs clicked) */}
      {logsVisible && (
        <div className={`p-4 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Recent Logs ({recentLogs.length})
            </h4>
            <button
              onClick={() => setLogsVisible(false)}
              className={`text-xs ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600'}`}
            >
              ✕ Close
            </button>
          </div>
          <div className={`space-y-1 max-h-48 overflow-y-auto text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {recentLogs.length === 0 ? (
              <p>No logs recorded yet</p>
            ) : (
              recentLogs.slice(-15).map((log, i) => (
                <div
                  key={i}
                  className={`p-2 rounded flex items-start gap-2 ${
                    log.level === 'error'
                      ? isDark ? 'bg-red-500/10' : 'bg-red-50'
                      : log.level === 'warn'
                      ? isDark ? 'bg-yellow-500/10' : 'bg-yellow-50'
                      : isDark ? 'bg-dark-100' : 'bg-light-200'
                  }`}
                >
                  <span className="shrink-0">
                    {log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        log.level === 'error'
                          ? isDark ? 'text-red-400' : 'text-red-600'
                          : log.level === 'warn'
                          ? isDark ? 'text-yellow-400' : 'text-yellow-600'
                          : isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        [{log.category}]
                      </span>
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="truncate">{log.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Full Diagnostics Section */}
      <div className={`p-4 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <h4 className={`text-xs font-medium uppercase tracking-wide mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          Full Report
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runDiagnostics}
            disabled={isRunningFull}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              isDark
                ? 'bg-primary-600 hover:bg-primary-700 text-white disabled:bg-gray-700'
                : 'bg-primary-500 hover:bg-primary-600 text-white disabled:bg-gray-400'
            }`}
          >
            {isRunningFull ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running All...
              </>
            ) : (
              <>
                <span>🔍</span>
                Run Full Diagnostics
              </>
            )}
          </button>

          {report && (
            <>
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                  isDark
                    ? 'bg-dark-100 hover:bg-dark-300 text-gray-300'
                    : 'bg-light-300 hover:bg-light-400 text-gray-700'
                }`}
              >
                <span>📋</span>
                Copy Report
              </button>
              <button
                onClick={downloadReport}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                  isDark
                    ? 'bg-dark-100 hover:bg-dark-300 text-gray-300'
                    : 'bg-light-300 hover:bg-light-400 text-gray-700'
                }`}
              >
                <span>💾</span>
                Download .txt
              </button>
            </>
          )}

          <button
            onClick={handleClearLogs}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              isDark
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                : 'bg-red-50 hover:bg-red-100 text-red-600'
            }`}
          >
            <span>🗑️</span>
            Clear All
          </button>
        </div>
      </div>

      {/* Report Display */}
      {report && (
        <div className="p-4 space-y-4">
          {/* Quick Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatusCard
              icon={report.connectivity.online ? '🌐' : '📵'}
              label="Internet"
              value={report.connectivity.online ? 'Online' : 'Offline'}
              status={report.connectivity.online ? 'success' : 'error'}
              isDark={isDark}
            />
            <StatusCard
              icon={report.connectivity.ollama ? '🦙' : '⚠️'}
              label="Ollama"
              value={report.connectivity.ollama ? 'Running' : 'Not Running'}
              status={report.connectivity.ollama ? 'success' : 'warning'}
              isDark={isDark}
            />
            <StatusCard
              icon="💾"
              label="Storage"
              value={`${(report.storage.totalSize / 1024).toFixed(1)} KB`}
              status="info"
              isDark={isDark}
            />
            <StatusCard
              icon={report.errorSummary.total === 0 ? '✅' : '❌'}
              label="Errors"
              value={`${report.errorSummary.total} found`}
              status={report.errorSummary.total === 0 ? 'success' : 'error'}
              isDark={isDark}
            />
          </div>

          {/* Providers Summary */}
          <div className={`p-3 rounded-lg ${isDark ? 'bg-dark-100' : 'bg-light-200'}`}>
            <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              LLM Providers ({report.providers.length})
            </h4>
            <div className="space-y-2">
              {report.providers.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between text-xs p-2 rounded ${
                    isDark ? 'bg-dark-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${p.isEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{p.name}</span>
                    {p.isDefault && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'
                      }`}>
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>{p.model}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      p.testStatus === 'success'
                        ? 'bg-green-500/20 text-green-500'
                        : p.testStatus === 'failed'
                        ? 'bg-red-500/20 text-red-500'
                        : isDark
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {p.testStatus || 'untested'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Errors Section */}
          {report.recentErrors.length > 0 && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                Recent Errors ({report.recentErrors.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {report.recentErrors.map((err, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded ${isDark ? 'bg-dark-200' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {err.category}
                      </span>
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                        {new Date(err.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      {err.message || JSON.stringify(err.data)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Raw Logs */}
          <button
            onClick={() => setShowRawLogs(!showRawLogs)}
            className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <span>{showRawLogs ? '▼' : '▶'}</span>
            {showRawLogs ? 'Hide' : 'Show'} Raw Report Preview
          </button>

          {showRawLogs && (
            <pre className={`text-xs p-3 rounded-lg overflow-auto max-h-64 ${
              isDark ? 'bg-dark-100 text-gray-400' : 'bg-gray-100 text-gray-700'
            }`}>
              {generatePlainTextReport(report)}
            </pre>
          )}
        </div>
      )}

      {/* Help Text */}
      {!report && (
        <div className={`p-4 text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          <p className="text-sm">Click "Run Diagnostics" to generate a report</p>
          <p className="text-xs mt-1">The report can be copied or downloaded to share for troubleshooting</p>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  status,
  isDark,
}: {
  icon: string;
  label: string;
  value: string;
  status: 'success' | 'error' | 'warning' | 'info';
  isDark: boolean;
}) {
  const statusColors = {
    success: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
    error: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700',
    warning: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    info: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700',
  };

  return (
    <div className={`p-3 rounded-lg text-center ${statusColors[status]}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
