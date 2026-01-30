/**
 * Status Bar Component
 * 
 * Displays provider health status at the bottom of the screen
 * - Geeky/techie vibe with blinking status lights
 * - Shows connection status for each configured provider
 * - Click to expand for details
 * - Auto-hides when all healthy, shows when issues detected
 */

import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import useProviderHealthMonitor from '../../hooks/useProviderHealthMonitor';
import { HealthService, type HealthStatus } from '../../utils/healthService';

interface StatusBarProps {
  minimizedOllamaWarnings?: boolean;
  onShowOllamaWarnings?: () => void;
}

export default function StatusBar({ minimizedOllamaWarnings = false, onShowOllamaWarnings }: StatusBarProps) {
  const { state, dispatch } = useChat();
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedTechnicalDetails, setExpandedTechnicalDetails] = useState<string | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [nextCheckIn, setNextCheckIn] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastCheckTimeRef = useRef<number>(Date.now());

  const { healthStatus, isChecking, refresh, showDisableWarning, currentPollInterval } = useProviderHealthMonitor({
    providers: state.providers,
    enabled: state.healthMonitoringEnabled ?? true,
  });

  // Check if warning was dismissed and if enough time has passed to show it again
  useEffect(() => {
    const dismissedTimestamp = localStorage.getItem('healthWarningDismissed');
    if (dismissedTimestamp) {
      const timePassed = Date.now() - parseInt(dismissedTimestamp, 10);
      const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      if (timePassed < fourHours) {
        setWarningDismissed(true);
      } else {
        // Enough time has passed, clear the dismissal
        localStorage.removeItem('healthWarningDismissed');
      }
    }
  }, []);

  // Reset dismissal when warning resolves
  useEffect(() => {
    if (!showDisableWarning) {
      setWarningDismissed(false);
      localStorage.removeItem('healthWarningDismissed');
    }
  }, [showDisableWarning]);

  const dismissWarning = () => {
    setWarningDismissed(true);
    localStorage.setItem('healthWarningDismissed', Date.now().toString());
  };

  // Show message if no providers configured
  const hasProviders = state.providers.length > 0;

  /**
   * Get status icon and color
   */
  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'online':
        return { icon: '●', color: 'text-green-500', bgColor: 'bg-green-500', label: 'Online' };
      case 'slow':
        return { icon: '●', color: 'text-yellow-500', bgColor: 'bg-yellow-500', label: 'Slow' };
      case 'offline':
        return { icon: '●', color: 'text-red-500', bgColor: 'bg-red-500', label: 'Offline' };
      case 'disabled':
        return { icon: '●', color: 'text-blue-500', bgColor: 'bg-blue-500', label: 'Disabled' };
      default:
        return { icon: '●', color: 'text-gray-500', bgColor: 'bg-gray-500', label: 'Unknown' };
    }
  };

  /**
   * Format bytes to human readable format
   */
  const formatBytes = (bytes: number): string => {
    return HealthService.formatBytes(bytes);
  };

  /**
   * Get overall system health
   */
  const getOverallHealth = () => {
    if (healthStatus.length === 0) return 'unknown';
    
    const hasOffline = healthStatus.some(h => h.status === 'offline');
    const hasSlow = healthStatus.some(h => h.status === 'slow');
    const allOnline = healthStatus.every(h => h.status === 'online');

    if (hasOffline) return 'degraded';
    if (hasSlow) return 'slow';
    if (allOnline) return 'healthy';
    return 'unknown';
  };

  const overallHealth = getOverallHealth();

  /**
   * Format response time
   */
  const formatResponseTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * Format last checked time
   */
  const formatLastChecked = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  /**
   * Format JSON with color syntax highlighting
   */
  const formatJsonWithColors = (jsonString: string, _theme: 'light' | 'dark') => {
    try {
      // Try to parse and pretty-print if it's valid JSON
      let parsed;
      try {
        parsed = JSON.parse(jsonString);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If not valid JSON, return as-is
        return jsonString;
      }
    } catch {
      return jsonString;
    }
  };

  /**
   * Handle showing Ollama warnings
   */
  const showOllamaWarnings = () => {
    onShowOllamaWarnings?.();
  };

  // Track when checks happen to calculate countdown
  useEffect(() => {
    if (!isChecking) {
      lastCheckTimeRef.current = Date.now();
    }
  }, [isChecking]);

  // Countdown timer for next check (only when expanded)
  useEffect(() => {
    if (!isExpanded) return;

    const updateCountdown = () => {
      const elapsed = Date.now() - lastCheckTimeRef.current;
      const remaining = Math.max(0, Math.ceil((currentPollInterval - elapsed) / 1000));
      setNextCheckIn(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isExpanded, currentPollInterval, isChecking]);

  // Refresh immediately when expanded
  useEffect(() => {
    if (isExpanded && !isChecking) {
      refresh();
    }
  }, [isExpanded]);

  // Check if scrolling is needed
  useEffect(() => {
    const checkScrollNeeded = () => {
      if (scrollContainerRef.current && contentRef.current) {
        const containerWidth = scrollContainerRef.current.offsetWidth;
        const contentWidth = contentRef.current.scrollWidth;
        setShouldScroll(contentWidth > containerWidth && healthStatus.length > 3);
      }
    };

    // Check immediately and after a short delay to ensure DOM is rendered
    checkScrollNeeded();
    const timeoutId = setTimeout(checkScrollNeeded, 100);

    return () => clearTimeout(timeoutId);
  }, [healthStatus]);

  // Don't render if monitoring is disabled or no providers configured
  if (!state.healthMonitoringEnabled || !hasProviders) {
    return null;
  }

  return (
    <>
      {/* Disable Warning Banner */}
      {showDisableWarning && !warningDismissed && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-3 border-t-2 border-yellow-500 ${
            state.theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <div className={`text-sm font-semibold ${
                  state.theme === 'dark' ? 'text-yellow-200' : 'text-yellow-900'
                }`}>
                  Health Monitoring Issues Detected
                </div>
                <div className={`text-xs ${
                  state.theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  Multiple consecutive failures detected. This won't affect chat functionality.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={dismissWarning}
                className={`p-1.5 rounded-lg transition-colors ${
                  state.theme === 'dark'
                    ? 'hover:bg-yellow-800/50 text-yellow-300 hover:text-yellow-200'
                    : 'hover:bg-yellow-200 text-yellow-700 hover:text-yellow-900'
                }`}
                title="Dismiss for 4 hours"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'TOGGLE_HEALTH_MONITORING', payload: false });
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  state.theme === 'dark'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                Disable Monitoring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div 
        className={`fixed left-0 right-0 z-40 transition-all duration-300 ${
          showDisableWarning && !warningDismissed ? 'bottom-[68px]' : 'bottom-0'
        } ${
          state.theme === 'dark' ? 'bg-dark-100 border-dark-300' : 'bg-light-100 border-light-400'
        } border-t`}
      >
      {/* No Providers Message */}
      {!hasProviders && (
        <div className={`px-4 py-2 text-center text-xs font-mono ${
          state.theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
        }`}>
          No providers configured. Add providers in Settings ⚙️ to enable health monitoring.
        </div>
      )}

      {/* Compact Bar */}
      {hasProviders && state.healthMonitoringEnabled && (
      <div 
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left: Overall Status */}
        <div
          className={`flex items-center gap-2 text-xs font-mono transition-colors ${
            state.theme === 'dark' 
              ? 'text-gray-400 hover:text-gray-300' 
              : 'text-gray-600 hover:text-gray-700'
          }`}
        >
          {/* Overall Health Indicator */}
          <span className={`relative flex h-2 w-2 ${
            overallHealth === 'healthy' ? '' : overallHealth === 'degraded' ? 'opacity-75' : ''
          }`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              overallHealth === 'healthy' ? 'bg-green-500' :
              overallHealth === 'slow' ? 'bg-yellow-500' :
              overallHealth === 'degraded' ? 'bg-red-500' : 'bg-gray-500'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              overallHealth === 'healthy' ? 'bg-green-500' :
              overallHealth === 'slow' ? 'bg-yellow-500' :
              overallHealth === 'degraded' ? 'bg-red-500' : 'bg-gray-500'
            }`}></span>
          </span>

          {/* Status Text */}
          <span className="uppercase tracking-wider">
            {overallHealth === 'healthy' ? 'System Healthy' :
             overallHealth === 'slow' ? 'System Slow' :
             overallHealth === 'degraded' ? 'System Degraded' : 'Checking...'}
          </span>

          {/* Expand/Collapse Icon */}
          <svg 
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Center: Provider Status Dots */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 min-w-0 overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div 
            ref={contentRef}
            className={`flex items-center gap-4 ${shouldScroll ? 'animate-scroll' : 'justify-center'} ${isHovered ? 'animation-paused' : ''}`}
            style={{
              animationDuration: `${healthStatus.length * 3}s`,
              animationDelay: shouldScroll ? '2s' : '0s'
            }}
          >
            {healthStatus.map((health) => {
              const statusInfo = getStatusIcon(health.status);
              // Find the provider to get its type
              const provider = state.providers?.find(p => p.id === health.providerId);
              const isOllama = provider?.type === 'ollama';
              
              return (
                <div
                  key={health.providerId}
                  className="flex items-center gap-1.5 flex-shrink-0"
                  title={`${health.model}: ${statusInfo.label}${health.responseTime ? ` (${formatResponseTime(health.responseTime)})` : ''}${health.modelSize ? ` (${formatBytes(health.modelSize)})` : ''}`}
                >
                  {/* Blinking Status Light */}
                  <span className={`relative flex h-2 w-2`}>
                    {health.status === 'online' && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusInfo.bgColor} opacity-75`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.bgColor}`}></span>
                  </span>

                  {/* Model Name */}
                  <span className={`text-xs font-mono ${statusInfo.color}`}>
                    {health.model}
                    {isOllama && health.modelSize ? (
                      <span className="ml-1 opacity-75">
                        ({formatBytes(health.modelSize)})
                      </span>
                    ) : isOllama ? (
                      <span className="ml-1 opacity-50 text-gray-600">
                        (size unknown)
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
            {/* Duplicate content for seamless loop */}
            {shouldScroll && healthStatus.map((health) => {
              const statusInfo = getStatusIcon(health.status);
              // Find the provider to get its type
              const provider = state.providers?.find(p => p.id === health.providerId);
              const isOllama = provider?.type === 'ollama';
              
              return (
                <div
                  key={`${health.providerId}-duplicate`}
                  className="flex items-center gap-1.5 flex-shrink-0"
                  title={`${health.model}: ${statusInfo.label}${health.responseTime ? ` (${formatResponseTime(health.responseTime)})` : ''}${health.modelSize ? ` (${formatBytes(health.modelSize)})` : ''}`}
                >
                  {/* Blinking Status Light */}
                  <span className={`relative flex h-2 w-2`}>
                    {health.status === 'online' && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusInfo.bgColor} opacity-75`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.bgColor}`}></span>
                  </span>

                  {/* Model Name */}
                  <span className={`text-xs font-mono ${statusInfo.color}`}>
                    {health.model}
                    {isOllama && health.modelSize ? (
                      <span className="ml-1 opacity-75">
                        ({formatBytes(health.modelSize)})
                      </span>
                    ) : isOllama ? (
                      <span className="ml-1 opacity-50 text-gray-600">
                        (size unknown)
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Minimized Ollama Warning Icon */}
        {minimizedOllamaWarnings && (
          <div className="flex items-center gap-1">
            <button
              onClick={showOllamaWarnings}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${
                state.theme === 'dark'
                  ? 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
              title="Ollama warnings minimized - Click to show"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Ollama
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Checking Indicator */}
          {isChecking && (
            <svg 
              className={`w-3 h-3 animate-spin ${
                state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}

          {/* Refresh Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              refresh();
            }}
            disabled={isChecking}
            className={`p-1 rounded transition-colors ${
              state.theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300 hover:bg-dark-200'
                : 'text-gray-600 hover:text-gray-700 hover:bg-light-200'
            } ${isChecking ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Refresh health status now"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      )}

      {/* Expanded Details */}
      {hasProviders && isExpanded && (
        <div className={`border-t max-h-[60vh] overflow-y-auto overflow-x-hidden ${
          state.theme === 'dark' ? 'border-dark-300' : 'border-light-400'
        }`}>
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {healthStatus.map((health) => {
              const statusInfo = getStatusIcon(health.status);
              return (
                <div
                  key={health.providerId}
                  className={`p-3 rounded-lg border ${
                    state.theme === 'dark'
                      ? 'bg-dark-200 border-dark-300'
                      : 'bg-light-200 border-light-400'
                  }`}
                >
                  {/* Provider Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`relative flex h-2 w-2 flex-shrink-0`}>
                        {health.status === 'online' && (
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusInfo.bgColor} opacity-75`}></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.bgColor}`}></span>
                      </span>
                      <div className="min-w-0 flex-1">
                        {/* Find the provider to get its type */}
                        {(() => {
                          const provider = state.providers?.find(p => p.id === health.providerId);
                          const isOllama = provider?.type === 'ollama';
                          
                          if (isOllama) {
                            // For Ollama: Show model name prominently, then provider type, then size
                            return (
                              <div className="flex flex-col gap-0.5">
                                <div className={`text-sm font-semibold truncate ${state.theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                                  {health.model}
                                </div>
                                <div className={`text-xs truncate ${state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Ollama (Local)
                                  {health.modelSize ? (
                                    <span className="ml-1 opacity-75">
                                      • {formatBytes(health.modelSize)}
                                    </span>
                                  ) : (
                                    <span className="ml-1 opacity-50 text-gray-600">
                                      • size unknown
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            // For other providers: Show provider name
                            return (
                              <span className={`text-sm font-semibold truncate ${state.theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                                {health.providerName}
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded flex-shrink-0 ${statusInfo.color} ${
                      state.theme === 'dark' ? 'bg-dark-300' : 'bg-light-300'
                    }`}>
                      {statusInfo.label.toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className={`space-y-1.5 text-xs ${
                    state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {health.responseTime !== undefined && (
                      <div className="flex justify-between font-mono">
                        <span>Response Time:</span>
                        <span className={
                          !health.responseTime ? 'text-gray-500' :
                          health.responseTime > 3000 ? 'text-yellow-500' : 'text-green-500'
                        }>
                          {formatResponseTime(health.responseTime)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-mono">
                      <span>Last Checked:</span>
                      <span>{formatLastChecked(health.lastChecked)}</span>
                    </div>
                    
                    {/* Rich Error Display */}
                    {health.errorDetails && (
                      <div className="mt-2 pt-2 border-t border-opacity-20 space-y-1.5" style={{
                        borderColor: 'currentColor'
                      }}>
                        {/* Compact error header: title and message on same line */}
                        <div className="text-xs">
                          <span className={`font-semibold ${state.theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                            {health.errorDetails.title}:
                          </span>
                          {' '}
                          <span>{health.errorDetails.message}</span>
                        </div>
                        
                        {health.errorDetails.userAction && (
                          <div className={`text-xs ${state.theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            💡 {health.errorDetails.userAction}
                          </div>
                        )}
                        
                        {health.errorDetails.documentationUrl && (
                          <a
                            href={health.errorDetails.documentationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs underline hover:no-underline ${
                              state.theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            📚 View Documentation
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                        
                        {/* Technical Details Toggle */}
                        {health.errorDetails.technicalDetails && (
                          <div className="mt-2">
                            <button
                              onClick={(e) => { 
                                e.stopPropagation();
                                setExpandedTechnicalDetails(
                                  expandedTechnicalDetails === health.providerId ? null : health.providerId
                                );
                              }}
                              className={`flex items-center gap-1 text-xs ${
                                state.theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
                              }`}
                            >
                              <svg 
                                className={`w-3 h-3 transition-transform ${
                                  expandedTechnicalDetails === health.providerId ? 'rotate-90' : ''
                                }`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-mono">Show Technical Details</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Fallback for simple errors */}
                    {health.error && !health.errorDetails && (
                      <div className="flex justify-between">
                        <span>Error:</span>
                        <span className="text-red-500 truncate max-w-[150px]" title={health.error}>
                          {health.error}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Expanded Technical Details - Full Width Below Card */}
                  {health.errorDetails?.technicalDetails && expandedTechnicalDetails === health.providerId && (
                    <div 
                      className={`mt-3 -mx-3 -mb-3 p-3 rounded-b-lg overflow-auto ${
                        state.theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mb-2 text-xs font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Raw API Response
                      </div>
                      <pre className={`text-xs font-mono overflow-x-auto p-2 rounded max-w-full whitespace-pre-wrap break-words ${
                        state.theme === 'dark' ? 'bg-black text-green-400' : 'bg-white text-gray-800'
                      }`}>
                        <code>{formatJsonWithColors(health.errorDetails.technicalDetails, state.theme)}</code>
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className={`px-4 py-2 border-t text-xs font-mono ${
            state.theme === 'dark'
              ? 'text-gray-500 border-dark-300'
              : 'text-gray-500 border-light-400'
          }`}>
            <div className="flex items-center justify-between">
              <span>
                Monitoring: {healthStatus.length} provider{healthStatus.length !== 1 ? 's' : ''} • 
                Check interval: {currentPollInterval / 1000}s • 
                Cache: 30s
                {!isChecking && (
                  <span className="ml-1">
                    • Next check: {nextCheckIn}s
                  </span>
                )}
              </span>
              <span className={state.theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>
                Smart polling with exponential backoff
              </span>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
