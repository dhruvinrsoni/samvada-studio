import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  name?: string; // Component/section name for better error tracking
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

/**
 * ErrorBoundary - Prevents component errors from crashing the entire app
 * 
 * Wraps components that might fail (modals, dynamic content, core sections)
 * Shows detailed fallback UI with recovery options instead of blank screen
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Store full error info in state
    this.setState({ errorInfo });

    // Create detailed error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      section: this.props.name || 'Unknown Component',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console for debugging
    console.group('🚨 ErrorBoundary Caught Error');
    console.error('Section:', errorReport.section);
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // Save to localStorage for persistence (helps debug after refresh)
    try {
      const existingErrors = JSON.parse(localStorage.getItem('app_error_log') || '[]');
      existingErrors.push(errorReport);
      // Keep only last 10 errors
      if (existingErrors.length > 10) existingErrors.shift();
      localStorage.setItem('app_error_log', JSON.stringify(existingErrors));
    } catch (e) {
      console.warn('Could not save error to localStorage:', e);
    }
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  copyErrorToClipboard = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorText = `
=== ERROR REPORT ===
Section: ${this.props.name || 'Unknown'}
Time: ${new Date().toLocaleString()}

Error Message:
${error.message}

Stack Trace:
${error.stack || 'Not available'}

Component Stack:
${errorInfo?.componentStack || 'Not available'}

User Agent:
${navigator.userAgent}

URL:
${window.location.href}
===================
`;

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
  };

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false,
      copied: false
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails, copied } = this.state;
      const sectionName = this.props.name || 'Component';

      // Default fallback UI with enhanced features
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-red-50 dark:bg-red-900/20 p-6 border-b border-red-200 dark:border-red-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {sectionName} Error
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Something went wrong in this section
                  </p>
                </div>
              </div>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Error Message */}
              {error && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Error Message:
                  </h4>
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <code className="text-sm text-red-700 dark:text-red-300 break-all">
                      {error.message}
                    </code>
                  </div>
                </div>
              )}

              {/* Recovery Suggestions */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  💡 What you can try:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1.5 list-disc list-inside">
                  <li>Try another section - this error is isolated</li>
                  <li>Reload the application to reset state</li>
                  <li>Clear browser cache (Ctrl+Shift+Delete)</li>
                  <li>Check browser console for more details (F12)</li>
                  <li>Copy error details and report the issue</li>
                </ul>
              </div>

              {/* Stack Trace Toggle */}
              {(error?.stack || errorInfo?.componentStack) && (
                <div>
                  <button
                    onClick={() => this.setState({ showDetails: !showDetails })}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {showDetails ? '▼' : '▶'} {showDetails ? 'Hide' : 'Show'} Technical Details
                  </button>
                  
                  {showDetails && (
                    <div className="mt-2 space-y-3">
                      {error?.stack && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Stack Trace:</p>
                          <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 overflow-x-auto">
                            <pre className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap break-all">
                              {error.stack}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      {errorInfo?.componentStack && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Component Stack:</p>
                          <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 overflow-x-auto">
                            <pre className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap break-all">
                              {errorInfo.componentStack}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer - Action Buttons */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.resetError}
                  className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={this.copyErrorToClipboard}
                  className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Error
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reload App
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
