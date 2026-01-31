import React, { useEffect, useState, useCallback } from 'react';
import { healthMonitor } from '../../utils/healthMonitor.js';
import { createLLMReport } from '../../utils/debug.js';

interface ThemeHealthIndicatorProps {
  className?: string;
}

/**
 * Event-driven health indicator using the extensible health monitoring system
 * Much more performant and future-proof than polling
 */
export const ThemeHealthIndicator: React.FC<ThemeHealthIndicatorProps> = ({ className = '' }) => {
  const [isHealthy, setIsHealthy] = useState(true);
  const [issues, setIssues] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoized health check function using the health monitor
  const checkHealth = useCallback(async () => {
    const report = await healthMonitor.runCheck('theme-system');
    if (report) {
      setIsHealthy(report.isHealthy);
      setIssues(report.issues);
    }
  }, []);

  useEffect(() => {
    // Only show in dev mode
    if (!import.meta.env.DEV) return;

    // Initial check
    checkHealth();

    // Event-driven monitoring instead of polling
    const handleThemeChange = () => checkHealth();

    // Listen for theme-related events
    window.addEventListener('theme-settings-changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange); // For localStorage changes

    // Check on visibility change (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkHealth();
      }
    });

    // Check on focus (user interacts with app)
    window.addEventListener('focus', handleThemeChange);

    return () => {
      window.removeEventListener('theme-settings-changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
      document.removeEventListener('visibilitychange', handleThemeChange);
      window.removeEventListener('focus', handleThemeChange);
    };
  }, [checkHealth]);

  useEffect(() => {
    // Only show in dev mode
    if (!import.meta.env.DEV) return;

    // Initial check
    checkHealth();

    // Event-driven monitoring instead of polling
    const handleThemeChange = () => checkHealth();

    // Listen for theme-related events
    window.addEventListener('theme-settings-changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange); // For localStorage changes

    // Check on visibility change (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkHealth();
      }
    });

    // Check on focus (user interacts with app)
    window.addEventListener('focus', handleThemeChange);

    return () => {
      window.removeEventListener('theme-settings-changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
      document.removeEventListener('visibilitychange', handleThemeChange);
      window.removeEventListener('focus', handleThemeChange);
    };
  }, [checkHealth]);

  // Don't render if healthy or not in dev mode
  if (isHealthy || !import.meta.env.DEV) return null;

  const generateReport = async () => {
    // Get detailed health report from the health monitor
    const healthReport = await healthMonitor.runAllChecks();
    const themeCheck = healthReport.checks.find(c => c.checkId === 'theme-system');

    const report = createLLMReport.themeIssue(themeCheck?.result.issues || issues);
    const markdown = createLLMReport.toMarkdown(report);
    createLLMReport.copyToClipboard(report);
    console.log('🐛 Theme Bug Report Generated and Copied!');
    console.log(markdown);
  };

  return (
    <div className={`fixed bottom-4 right-4 bg-red-500 text-white rounded-lg shadow-lg z-50 max-w-sm ${className}`}>
      <div
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🚨</span>
          <div>
            <div className="font-bold text-sm">Theme System Issues</div>
            <div className="text-xs opacity-90">{issues.length} problem{issues.length !== 1 ? 's' : ''} detected</div>
          </div>
        </div>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-red-400 pt-2">
          <ul className="text-sm space-y-1 mb-3">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-200 mt-1">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <button
              onClick={generateReport}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs transition-colors"
            >
              📋 Copy Bug Report
            </button>
            <button
              onClick={() => {
                console.log('🔍 Full Debug Info:');
                // console.log('Theme Status:', validateCSS.getThemeStatus());
                // console.log('Theme Health:', validateCSS.checkThemeHealth());
                console.log('User Agent:', navigator.userAgent);
              }}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs transition-colors"
            >
              🔍 Log Debug
            </button>
          </div>

          <div className="text-xs opacity-75 mt-2">
            💡 Use <code className="bg-red-600 px-1 rounded">llmDebug.bugReport()</code> in console
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeHealthIndicator;