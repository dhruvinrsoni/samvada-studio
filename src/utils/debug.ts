// Debug helper for Samvada Studio
import { loadState, STORAGE_KEY } from './storage';
import BRAND from '../constants/brand';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Log entry structure
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

// In-memory log buffer (last 100 entries)
const LOG_BUFFER_SIZE = 100;
const logBuffer: LogEntry[] = [];

// Enable/disable debug logging (disabled by default in production)
let debugEnabled = import.meta.env.DEV || false;

// Log to console and buffer
const log = (level: LogLevel, category: string, message: string, data?: any, error?: Error) => {
  const entry: LogEntry = {
    timestamp: new Date(),
    level,
    category,
    message,
    data,
    stack: error?.stack,
  };

  // Add to buffer
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }

  // Console output (with colors and formatting)
  const isoString = entry.timestamp.toISOString();
  const timePart = isoString.split('T')[1];
  const timestamp = timePart ? timePart.slice(0, -1) : '00:00:00';
  const prefix = `[${timestamp}] [${category}]`;

  switch (level) {
    case 'debug':
      if (debugEnabled) {
        console.debug(prefix, message, data || '');
      }
      break;
    case 'info':
      console.info(prefix, message, data || '');
      break;
    case 'warn':
      console.warn(prefix, message, data || '');
      break;
    case 'error':
      console.error(prefix, message, data || '', error || '');
      break;
  }
};

// Public logging functions
export const logDebug = (category: string, data?: any) => {
  log('debug', category, '', data);
};

export const logInfo = (category: string, message: string, data?: any) => {
  log('info', category, message, data);
};

export const logWarning = (category: string, data?: any) => {
  log('warn', category, '', data);
};

export const logError = (category: string, error: Error | unknown, data?: any) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  log('error', category, errorObj.message, data, errorObj);
};

// Get recent logs
export const getRecentLogs = (count?: number): LogEntry[] => {
  return count ? logBuffer.slice(-count) : [...logBuffer];
};

// Clear log buffer
export const clearLogs = () => {
  logBuffer.length = 0;
};

// Export logs as JSON
export const exportLogs = (): string => {
  return JSON.stringify(logBuffer, null, 2);
};

// Download logs as file
export const downloadLogs = () => {
  const blob = new Blob([exportLogs()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `samvada-logs-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  logInfo('Debug', 'Logs exported', { entries: logBuffer.length });
};

// Filter logs by level or category
export const filterLogs = (filter: { level?: LogLevel; category?: string }): LogEntry[] => {
  return logBuffer.filter(entry => {
    if (filter.level && entry.level !== filter.level) return false;
    if (filter.category && entry.category !== filter.category) return false;
    return true;
  });
};

// Get error summary
export const getErrorSummary = (): { total: number; byCategory: Record<string, number> } => {
  const errors = filterLogs({ level: 'error' });
  const byCategory: Record<string, number> = {};
  errors.forEach(entry => {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  });
  return { total: errors.length, byCategory };
};

// Performance tracking
const performanceMarks: Record<string, number> = {};

export const startTiming = (label: string) => {
  performanceMarks[label] = performance.now();
};

export const endTiming = (label: string): number => {
  const start = performanceMarks[label];
  if (!start) {
    logWarning('Performance', { message: `No start mark for: ${label}` });
    return 0;
  }
  const duration = performance.now() - start;
  delete performanceMarks[label];
  logDebug('Performance', { label, duration: `${duration.toFixed(2)}ms` });
  return duration;
};

// System diagnostics
export const getSystemInfo = () => {
  return {
    // App information
    appVersion: (import.meta.env as any).APP_VERSION || 'unknown',
    gitCommit: (import.meta.env as any).GIT_COMMIT || 'unknown',
    buildTimestamp: (import.meta.env as any).BUILD_TIMESTAMP || 'unknown',
    // Browser information
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    cookiesEnabled: navigator.cookieEnabled,
    screenResolution: `${screen.width}x${screen.height}`,
    windowSize: `${window.innerWidth}x${window.innerHeight}`,
    deviceMemory: (navigator as any).deviceMemory || 'unknown',
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
    connection: (navigator as any).connection?.effectiveType || 'unknown',
  };
};

// Expose a debug accessor on window for manual inspection in browser console
// Usage in browser console: window.__SAMVADA_DEBUG__

export const installDebug = () => {
  (window as any).__SAMVADA_DEBUG__ = {
    brand: BRAND,
    // State inspection
    getSavedState: () => loadState(),
    rawLocalStorage: () => localStorage.getItem(STORAGE_KEY),
    clearSavedState: () => { localStorage.removeItem(STORAGE_KEY); return true; },
    // Logging
    enableDebug: () => { debugEnabled = true; logInfo('Debug', 'Debug logging enabled'); },
    disableDebug: () => { debugEnabled = false; console.log('Debug logging disabled'); },
    isDebugEnabled: () => debugEnabled,
    getLogs: getRecentLogs,
    clearLogs,
    exportLogs,
    downloadLogs,
    filterLogs,
    getErrorSummary,
    // Performance
    startTiming,
    endTiming,
    // System
    getSystemInfo,
    // Quick diagnostics
    diagnose: async () => {
      console.log('🔍 Running diagnostics...');
      console.log('System Info:', getSystemInfo());
      console.log('Error Summary:', getErrorSummary());
      console.log('Recent Logs:', getRecentLogs(10));
      console.log('Storage:', {
        state: localStorage.getItem(STORAGE_KEY)?.length || 0,
        sensitive: localStorage.getItem('samvada-studio-sensitive')?.length || 0,
      });
    },
  };

  logInfo('Debug', 'Debug utilities installed', {
    available: Object.keys((window as any).__SAMVADA_DEBUG__),
  });
};

// Auto-install if running in browser
if (typeof window !== 'undefined') {
  try {
    installDebug();
    // Log app initialization
    logInfo('App', 'Samvada Studio initialized', {
      version: '0.1.0',
      env: import.meta.env.MODE,
      debug: debugEnabled,
    });
  } catch (e) {
    console.error('Failed to install debug utilities:', e);
  }
}

// =====================================================================================
// SILENT FAILURE PREVENTION SYSTEM
// Catches silent failures before they ship and makes debugging LLM-friendly
// =====================================================================================

export const validateCSS = {
  isValidHsl: (hsl: string): boolean => {
    // Modern HSL format: "217 91% 67%" (space-separated)
    const hslRegex = /^\d{1,3} \d{1,3}% \d{1,3}%$/;
    return hslRegex.test(hsl);
  },

  isValidColor: (color: string): boolean => {
    if (typeof document === 'undefined') return true; // SSR safe
    const testEl = document.createElement('div');
    testEl.style.color = color;
    return testEl.style.color !== '';
  },

  getThemeStatus: (): { [key: string]: string } => {
    if (typeof document === 'undefined') return {};

    const root = document.documentElement;
    const properties = [
      '--theme-primary',
      '--theme-primary-hover',
      '--theme-primary-light',
      '--theme-primary-dark',
      '--theme-secondary',
      '--theme-accent'
    ];

    const status: { [key: string]: string } = {};
    properties.forEach(prop => {
      const value = getComputedStyle(root).getPropertyValue(prop).trim();
      status[prop] = value || 'NOT SET';
    });

    return status;
  },

  checkThemeHealth: (): { isHealthy: boolean; issues: string[] } => {
    const issues: string[] = [];
    const themeStatus = validateCSS.getThemeStatus();

    // Check if theme properties are set
    if (!themeStatus['--theme-primary']) {
      issues.push('Theme primary color not set');
    }

    // Check HSL format (should be space-separated, not comma-separated)
    Object.entries(themeStatus).forEach(([prop, value]) => {
      if (value && value.includes(',')) {
        issues.push(`${prop} uses old comma-separated HSL format: ${value}`);
      }
      if (value && !validateCSS.isValidHsl(value)) {
        issues.push(`${prop} has invalid HSL format: ${value}`);
      }
    });

    // Check if theme classes actually work
    if (typeof document !== 'undefined') {
      const testEl = document.createElement('div');
      testEl.className = 'bg-theme-primary';
      testEl.style.position = 'absolute';
      testEl.style.left = '-9999px';
      document.body.appendChild(testEl);

      const bgColor = getComputedStyle(testEl).backgroundColor;
      document.body.removeChild(testEl);

      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        issues.push('Theme classes not rendering colors (CSS may be invalid)');
      }
    }

    return {
      isHealthy: issues.length === 0,
      issues
    };
  }
};

export const createLLMReport = {
  themeIssue: (customIssues?: string[]) => {
    const health = validateCSS.checkThemeHealth();
    const themeStatus = validateCSS.getThemeStatus();

    return {
      timestamp: new Date().toISOString(),
      issue: 'Theme system silent failure',
      symptoms: [
        'Buttons appear white/invisible',
        'Text not showing theme colors',
        'Theme switching not working',
        'UI elements not colored',
        ...(customIssues || [])
      ],
      technical: {
        themeStatus,
        healthCheck: health,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'SSR',
        tailwindVersion: '3.x+ (requires space-separated HSL)',
        cssFormat: 'Must be: "217 91% 67%" not "217, 91%, 67%"'
      },
      files: [
        'src/utils/theme.ts - convertHsl() function (critical)',
        'src/index.css - CSS custom properties',
        'tailwind.config.js - hsl() syntax',
        'src/context/ChatContext.tsx - theme application'
      ],
      lastWorking: 'Before HSL format changes',
      attemptedFixes: [],
      prevention: 'Check validateCSS.checkThemeHealth() in dev mode'
    };
  },

  toMarkdown: (report: any) => {
    return `# 🎯 LLM-Ready Theme Bug Report

**Timestamp:** ${report.timestamp}
**Issue:** ${report.issue}

## 🚨 Symptoms
${report.symptoms.map((s: string) => `- ${s}`).join('\n')}

## 🔧 Technical Details
\`\`\`json
${JSON.stringify(report.technical, null, 2)}
\`\`\`

## 📁 Files to Check
${report.files.map((f: string) => `- ${f}`).join('\n')}

## 📋 Context
- **Last working:** ${report.lastWorking}
- **Attempted fixes:** ${report.attemptedFixes.join(', ') || 'None'}
- **Prevention:** ${report.prevention}

## 🛠️ Quick Debug Commands
\`\`\`javascript
// Check theme status
console.log(validateCSS.getThemeStatus());

// Check health
console.log(validateCSS.checkThemeHealth());

// Generate this report
console.log(createLLMReport.toMarkdown(createLLMReport.themeIssue()));
\`\`\`

## 🎯 Most Likely Fix
The \`convertHsl()\` function in \`theme.ts\` is probably outputting comma-separated HSL format instead of space-separated. Change:
\`\`\`typescript
// WRONG
return \`\${parts[0]}, \${parts[1]}%, \${parts[2]}%\`;

// CORRECT
return \`\${parts[0]} \${parts[1]}% \${parts[2]}%\`;
\`\`\`
`;
  },

  copyToClipboard: (report: any) => {
    const markdown = createLLMReport.toMarkdown(report);
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(markdown);
    }
    return markdown;
  }
};

// Global access for LLMs and debugging
if (typeof window !== 'undefined') {
  (window as any).validateCSS = validateCSS;
  (window as any).createLLMReport = createLLMReport;
  (window as any).llmDebug = {
    themeStatus: () => console.log('🎨 Theme Status:', validateCSS.getThemeStatus()),
    themeHealth: () => console.log('🏥 Theme Health:', validateCSS.checkThemeHealth()),
    bugReport: () => {
      const report = createLLMReport.themeIssue();
      const markdown = createLLMReport.toMarkdown(report);
      console.log('🐛 Bug Report Generated:');
      console.log(markdown);
      createLLMReport.copyToClipboard(report);
      console.log('📋 Copied to clipboard!');
    }
  };
}
