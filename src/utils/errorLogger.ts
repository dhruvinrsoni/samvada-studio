/**
 * Error Logging Utility
 * 
 * Provides centralized error logging with localStorage persistence
 * Users can view error history even after refresh
 */

export interface ErrorLog {
  id: string;
  timestamp: string;
  type: 'component_error' | 'global_error' | 'unhandled_promise';
  section?: string;
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  additionalData?: any;
}

const ERROR_LOG_KEY = 'app_error_log';
const MAX_ERRORS = 50; // Keep last 50 errors

/**
 * Log an error to localStorage
 */
export function logError(error: Partial<ErrorLog>): void {
  try {
    const errorLog: ErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: error.type || 'component_error',
      section: error.section,
      message: error.message || 'Unknown error',
      stack: error.stack,
      componentStack: error.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData: error.additionalData
    };

    const existingErrors = getErrorLogs();
    existingErrors.push(errorLog);

    // Keep only last MAX_ERRORS
    const trimmedErrors = existingErrors.slice(-MAX_ERRORS);
    
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmedErrors));
    
    console.log('✅ Error logged:', errorLog.id);
  } catch (e) {
    console.error('❌ Failed to log error:', e);
  }
}

/**
 * Get all error logs from localStorage
 */
export function getErrorLogs(): ErrorLog[] {
  try {
    const logs = localStorage.getItem(ERROR_LOG_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (e) {
    console.error('Failed to parse error logs:', e);
    return [];
  }
}

/**
 * Get recent errors (last N)
 */
export function getRecentErrors(count: number = 10): ErrorLog[] {
  const allErrors = getErrorLogs();
  return allErrors.slice(-count).reverse(); // Most recent first
}

/**
 * Clear all error logs
 */
export function clearErrorLogs(): void {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
    console.log('✅ Error logs cleared');
  } catch (e) {
    console.error('Failed to clear error logs:', e);
  }
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
  total: number;
  byType: Record<string, number>;
  bySection: Record<string, number>;
  lastError: ErrorLog | null;
  last24Hours: number;
} {
  const errors = getErrorLogs();
  const now = Date.now();
  const last24h = now - (24 * 60 * 60 * 1000);

  const stats = {
    total: errors.length,
    byType: {} as Record<string, number>,
    bySection: {} as Record<string, number>,
    lastError: errors[errors.length - 1] || null,
    last24Hours: 0
  };

  errors.forEach(error => {
    // Count by type
    stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

    // Count by section
    if (error.section) {
      stats.bySection[error.section] = (stats.bySection[error.section] || 0) + 1;
    }

    // Count last 24 hours
    if (new Date(error.timestamp).getTime() > last24h) {
      stats.last24Hours++;
    }
  });

  return stats;
}

/**
 * Export errors as text report
 */
export function exportErrorReport(): string {
  const errors = getErrorLogs();
  const stats = getErrorStats();

  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push('ERROR LOG REPORT');
  lines.push('='.repeat(60));
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Total Errors: ${stats.total}`);
  lines.push(`Last 24 Hours: ${stats.last24Hours}`);
  lines.push('');

  lines.push('ERRORS BY TYPE:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    lines.push(`  ${type}: ${count}`);
  });
  lines.push('');

  lines.push('ERRORS BY SECTION:');
  Object.entries(stats.bySection).forEach(([section, count]) => {
    lines.push(`  ${section}: ${count}`);
  });
  lines.push('');

  lines.push('='.repeat(60));
  lines.push('DETAILED ERRORS (Most Recent First)');
  lines.push('='.repeat(60));
  lines.push('');

  const recentErrors = errors.slice().reverse(); // Most recent first
  recentErrors.forEach((error, index) => {
    lines.push(`[${index + 1}] ${new Date(error.timestamp).toLocaleString()}`);
    lines.push(`ID: ${error.id}`);
    lines.push(`Type: ${error.type}`);
    if (error.section) lines.push(`Section: ${error.section}`);
    lines.push(`Message: ${error.message}`);
    lines.push(`URL: ${error.url}`);
    
    if (error.stack) {
      lines.push('Stack Trace:');
      lines.push(error.stack);
    }
    
    if (error.componentStack) {
      lines.push('Component Stack:');
      lines.push(error.componentStack);
    }
    
    lines.push('-'.repeat(60));
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Console API - Make available in browser console
 */
if (typeof window !== 'undefined') {
  (window as any).errorLogger = {
    getLogs: getErrorLogs,
    getRecent: getRecentErrors,
    getStats: getErrorStats,
    clear: clearErrorLogs,
    export: exportErrorReport,
    
    // Utility to display in console
    show: () => {
      const stats = getErrorStats();
      console.group('📊 Error Log Statistics');
      console.log('Total Errors:', stats.total);
      console.log('Last 24 Hours:', stats.last24Hours);
      console.log('By Type:', stats.byType);
      console.log('By Section:', stats.bySection);
      if (stats.lastError) {
        console.log('Last Error:', {
          time: new Date(stats.lastError.timestamp).toLocaleString(),
          section: stats.lastError.section,
          message: stats.lastError.message
        });
      }
      console.groupEnd();
      
      console.group('📋 Recent Errors');
      getRecentErrors(5).forEach((error, i) => {
        console.log(`${i + 1}.`, {
          time: new Date(error.timestamp).toLocaleString(),
          section: error.section,
          message: error.message
        });
      });
      console.groupEnd();
      
      console.log('💡 Use errorLogger.export() to get full report');
    }
  };
  
  console.log('💡 Error Logger available: Use errorLogger.show() in console');
}
