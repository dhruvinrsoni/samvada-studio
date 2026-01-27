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
  const timestamp = entry.timestamp.toISOString().split('T')[1].slice(0, -1);
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
