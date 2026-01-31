import React, { useEffect, useState, useCallback } from 'react';
import { healthMonitor } from '../../utils/healthMonitor.js';
import { createLLMReport } from '../../utils/debug.js';

interface DebugModeProps {
  className?: string;
}

/**
 * Debug mode overlay using the extensible health monitoring system
 * Provides advanced debugging tools with plugin architecture
 */
export const DebugMode: React.FC<DebugModeProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [healthReport, setHealthReport] = useState<any>(null);

  // Refresh health data
  const refreshData = useCallback(async () => {
    const report = await healthMonitor.runAllChecks();
    setHealthReport(report);
  }, []);

  useEffect(() => {
    // Only enable in dev mode
    if (!import.meta.env.DEV) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(!isVisible);

        if (!isVisible) {
          // Refresh data when opening
          refreshData();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, refreshData]);

  // Don't render if not visible or not in dev mode
  if (!isVisible || !import.meta.env.DEV) return null;

  const generateBugReport = async () => {
    const report = await healthMonitor.runAllChecks();
    const themeCheck = report.checks.find((c: any) => c.checkId === 'theme-system');

    const llmReport = createLLMReport.themeIssue(themeCheck?.result.issues || []);
    const markdown = createLLMReport.toMarkdown(llmReport);
    createLLMReport.copyToClipboard(llmReport);
    console.log('🐛 Bug Report Generated and Copied!');
    console.log(markdown);
  };

  return (
    <div className={`fixed top-4 left-4 bg-black/90 text-green-400 p-4 rounded-lg font-mono text-sm z-50 max-w-2xl max-h-96 overflow-auto ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-lg">🔍 Debug Mode (Ctrl+Shift+D to toggle)</div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-red-400 hover:text-red-300 text-xl"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Quick Actions */}
        <div>
          <div className="font-semibold mb-2">⚡ Quick Actions</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs"
            >
              🔄 Refresh
            </button>
            <button
              onClick={generateBugReport}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
            >
              🐛 Bug Report
            </button>
            <button
              onClick={() => console.log('Full debug:', healthReport)}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs"
            >
              📊 Log All
            </button>
          </div>
        </div>

        {/* Overall Health */}
        {healthReport && (
          <div>
            <div className="font-semibold mb-2">🏥 Overall Health</div>
            <div className={`p-2 rounded text-xs ${healthReport.overallHealth ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
              Status: {healthReport.overallHealth ? '✅ All Systems Healthy' : '❌ Issues Detected'}
              <div className="mt-1">
                Total Checks: {healthReport.summary.total} |
                Healthy: {healthReport.summary.healthy} |
                Issues: {healthReport.summary.issues}
              </div>
            </div>
          </div>
        )}

        {/* Individual Checks */}
        {healthReport && (
          <div>
            <div className="font-semibold mb-2">🔍 Check Details</div>
            <div className="bg-gray-900/50 p-2 rounded text-xs max-h-32 overflow-auto space-y-2">
              {healthReport.checks.map((check: any) => (
                <div key={check.checkId} className="border-b border-gray-700 pb-1">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-300">{check.checkId}:</span>
                    <span className={check.result.isHealthy ? 'text-green-400' : 'text-red-400'}>
                      {check.result.isHealthy ? '✅' : '❌'} ({check.duration.toFixed(1)}ms)
                    </span>
                  </div>
                  {check.result.issues?.length > 0 && (
                    <ul className="ml-4 mt-1">
                      {check.result.issues.map((issue: string, i: number) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Console Commands */}
        <div>
          <div className="font-semibold mb-2">💻 Console Commands</div>
          <div className="bg-gray-900/50 p-2 rounded text-xs space-y-1">
            <div><span className="text-yellow-300">healthMonitor.runAllChecks()</span> - Run all health checks</div>
            <div><span className="text-yellow-300">healthMonitor.runCheck('theme-system')</span> - Check theme only</div>
            <div><span className="text-yellow-300">llmDebug.bugReport()</span> - Generate bug report</div>
            <div><span className="text-yellow-300">healthMonitor.getChecks()</span> - List all checks</div>
          </div>
        </div>

        {/* System Info */}
        <div>
          <div className="font-semibold mb-2">🖥️ System Info</div>
          <div className="bg-gray-900/50 p-2 rounded text-xs">
            <div>User Agent: {navigator.userAgent.slice(0, 50)}...</div>
            <div>Viewport: {window.innerWidth}x{window.innerHeight}</div>
            <div>Timestamp: {new Date().toISOString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugMode;