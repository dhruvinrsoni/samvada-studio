import { useMemo, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useObservability } from '../../context/ObservabilityContext';
import { createLLMReport } from '../../utils/debug';

export default function SystemHealthCenter() {
  const { state, isDark, dispatch } = useChat();
  const {
    providerHealth,
    isProviderChecking,
    connectivity,
    isConnectivityChecking,
    diagnosticsReport,
    isDiagnosticsRunning,
    refreshAll,
    refreshDiagnostics,
    ollamaWarning,
  } = useObservability();

  const [open, setOpen] = useState(false);

  const issueCount = useMemo(() => {
    const providerIssues = providerHealth.filter(p => p.status === 'offline').length;
    const connectivityIssue = connectivity && (!connectivity.internet || !connectivity.ollama) ? 1 : 0;
    const diagnosticsIssues = diagnosticsReport?.summary.issues || 0;
    return providerIssues + connectivityIssue + diagnosticsIssues;
  }, [providerHealth, connectivity, diagnosticsReport]);

  const hasIssues = issueCount > 0 || ollamaWarning.hasWarning;

  const copyThemeReport = async () => {
    const report = createLLMReport.themeIssue();
    createLLMReport.copyToClipboard(report);
  };

  if (!state.healthMonitoringEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className={`w-[92vw] max-w-md rounded-xl border shadow-xl ${isDark ? 'bg-dark-200 border-dark-100' : 'bg-white border-light-400'}`}>
          <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
            <div>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>System Health Center</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Unified monitoring, CHM and diagnostics</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-dark-100 text-gray-300 hover:bg-dark-50' : 'bg-light-300 text-gray-700 hover:bg-light-400'}`}
            >
              Close
            </button>
          </div>

          <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2 rounded ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-light-200 text-gray-700'}`}>
                Internet: <span className={connectivity?.internet ? 'text-green-500' : 'text-red-500'}>{connectivity?.internet ? 'Online' : 'Offline'}</span>
              </div>
              <div className={`p-2 rounded ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-light-200 text-gray-700'}`}>
                Ollama: <span className={connectivity?.ollama ? 'text-green-500' : 'text-red-500'}>{connectivity?.ollama ? 'Reachable' : 'Unavailable'}</span>
              </div>
              <div className={`p-2 rounded ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-light-200 text-gray-700'}`}>
                Providers: <span className="text-theme-primary">{providerHealth.length}</span>
              </div>
              <div className={`p-2 rounded ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-light-200 text-gray-700'}`}>
                Diagnostics: <span className={(diagnosticsReport?.summary.issues || 0) > 0 ? 'text-yellow-500' : 'text-green-500'}>{diagnosticsReport?.summary.issues || 0} issue(s)</span>
              </div>
            </div>

            {ollamaWarning.hasWarning && (
              <div className={`p-2 rounded border text-xs ${isDark ? 'border-yellow-700 bg-yellow-900/20 text-yellow-200' : 'border-yellow-300 bg-yellow-50 text-yellow-800'}`}>
                <div className="font-semibold">CHM Alert</div>
                {!connectivity?.ollama
                  ? 'Ollama endpoint is not reachable.'
                  : `Configured model "${ollamaWarning.configuredModel}" is not installed.`}
              </div>
            )}

            <div>
              <h4 className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Provider Status</h4>
              <div className="space-y-1">
                {providerHealth.map(provider => (
                  <div
                    key={provider.providerId}
                    className={`text-xs p-2 rounded flex items-center justify-between ${isDark ? 'bg-dark-300' : 'bg-light-200'}`}
                  >
                    <span className="truncate mr-2">{provider.providerName} · {provider.model}</span>
                    <span className={provider.status === 'online' ? 'text-green-500' : provider.status === 'slow' ? 'text-yellow-500' : 'text-red-500'}>
                      {provider.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {import.meta.env.DEV && diagnosticsReport && (
              <div>
                <h4 className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Diagnostics</h4>
                <div className="space-y-1">
                  {diagnosticsReport.checks.map(check => (
                    <div key={check.checkId} className={`text-xs p-2 rounded flex items-center justify-between ${isDark ? 'bg-dark-300' : 'bg-light-200'}`}>
                      <span>{check.checkId}</span>
                      <span className={check.result.isHealthy ? 'text-green-500' : 'text-red-500'}>
                        {check.result.isHealthy ? 'ok' : 'issue'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={refreshAll}
                className="px-2 py-1 text-xs rounded bg-theme-primary text-white hover:bg-theme-primary-hover"
                disabled={isProviderChecking || isConnectivityChecking || isDiagnosticsRunning}
              >
                {isProviderChecking || isConnectivityChecking || isDiagnosticsRunning ? 'Refreshing…' : 'Refresh All'}
              </button>
              {import.meta.env.DEV && (
                <>
                  <button
                    onClick={refreshDiagnostics}
                    className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-dark-100 text-gray-300 hover:bg-dark-50' : 'bg-light-300 text-gray-700 hover:bg-light-400'}`}
                  >
                    Run Diagnostics
                  </button>
                  <button
                    onClick={copyThemeReport}
                    className={`px-2 py-1 text-xs rounded ${isDark ? 'bg-dark-100 text-gray-300 hover:bg-dark-50' : 'bg-light-300 text-gray-700 hover:bg-light-400'}`}
                  >
                    Copy Theme Report
                  </button>
                </>
              )}
              <button
                onClick={() => dispatch({ type: 'TOGGLE_HEALTH_MONITORING', payload: false })}
                className="px-2 py-1 text-xs rounded bg-red-600/20 text-red-500 hover:bg-red-600/30"
              >
                Disable Monitoring
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={`relative px-3 py-2 rounded-full shadow-lg text-xs font-semibold border ${
            hasIssues
              ? 'bg-yellow-500 text-white border-yellow-400'
              : isDark
                ? 'bg-dark-100 text-gray-200 border-dark-50'
                : 'bg-white text-gray-800 border-light-400'
          }`}
          title="Open System Health Center"
        >
          🩺 Health
          {hasIssues && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {issueCount > 9 ? '9+' : issueCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
