import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { healthMonitor } from '../../utils/healthMonitor.js';
import { createLLMReport } from '../../utils/debug.js';

interface DebugModeProps {
  className?: string;
}

/**
 * Debug mode overlay using the extensible health monitoring system
 * Provides advanced debugging tools with plugin architecture
 * Features: Draggable, Expandable/Collapsible, Theme-compliant, Mobile-friendly
 */
export const DebugMode: React.FC<DebugModeProps> = ({ className = '' }) => {
  const { state, isDark } = useChat();
  const isMobile = useIsMobile();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [position, setPosition] = useState({ x: isMobile ? 8 : 16, y: isMobile ? 8 : 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Refresh health data
  const refreshData = useCallback(async () => {
    const report = await healthMonitor.runAllChecks();
    setHealthReport(report);
  }, []);

  // Dragging logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
      return; // Don't start drag if clicking buttons
    }
    
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (panelRef.current && e.touches[0]) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      });
      setIsDragging(true);
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        const newX = Math.max(0, Math.min(window.innerWidth - 300, e.touches[0].clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, e.touches[0].clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

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

  // Don't render debug panel if not visible or not in dev mode
  // But still show mobile trigger button when appropriate
  if (!import.meta.env.DEV) return null;

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
    <>
      {/* Debug Panel - Minimized Corner View */}
      {isVisible && isMinimized && (
        <div
          className={`fixed z-[100] ${
            isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
          } border-2 rounded-lg shadow-2xl cursor-pointer`}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '48px',
            height: '48px'
          }}
          onClick={() => setIsMinimized(false)}
          title="Click to restore"
        >
          <div className="flex items-center justify-center h-full text-2xl">
            🔍
          </div>
        </div>
      )}

      {/* Debug Panel - Full View */}
      {isVisible && !isMinimized && (
    <div
      ref={panelRef}
      className={`fixed z-[100] ${isMobile ? 'max-w-[calc(100vw-16px)]' : 'max-w-2xl'} ${
        isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
      } border-2 rounded-lg shadow-2xl font-mono text-xs sm:text-sm ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMobile ? 'calc(100vw - 16px)' : '32rem',
        maxHeight: isExpanded ? (isMobile ? 'calc(100vh - 16px)' : '32rem') : 'auto'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Header - Draggable */}
      <div className={`flex items-center justify-between p-2 sm:p-3 border-b ${
        isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'
      } rounded-t-lg`}>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-base sm:text-lg">🔍</span>
          <span className="font-bold text-xs sm:text-sm truncate">
            Debug Mode
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Minimize Button (Width Collapse) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className={`p-1 sm:p-1.5 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
            }`}
            title="Minimize to corner"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          {/* Expand/Collapse Button (Height) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`p-1 sm:p-1.5 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
            }`}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              )}
            </svg>
          </button>
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className={`p-1 sm:p-1.5 rounded transition-colors ${
              isDark ? 'hover:bg-red-900 text-red-400' : 'hover:bg-red-100 text-red-600'
            }`}
            title="Close (Ctrl+Shift+D)"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 overflow-auto" style={{ maxHeight: isMobile ? 'calc(100vh - 80px)' : '27rem' }}>
          {/* Quick Actions */}
          <div>
            <div className={`font-semibold mb-2 text-xs sm:text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              ⚡ Quick Actions
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  refreshData();
                }}
                className="bg-blue-600 hover:bg-blue-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs text-white transition-colors"
              >
                🔄 Refresh
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  generateBugReport();
                }}
                className="bg-red-600 hover:bg-red-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs text-white transition-colors"
              >
                🐛 Bug Report
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Full debug:', healthReport);
                }}
                className="bg-green-600 hover:bg-green-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs text-white transition-colors"
              >
                📊 Log All
              </button>
            </div>
          </div>

          {/* Overall Health */}
          {healthReport && (
            <div>
              <div className={`font-semibold mb-2 text-xs sm:text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                🏥 Overall Health
              </div>
              <div className={`p-2 rounded text-[10px] sm:text-xs ${
                healthReport.overallHealth 
                  ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                  : isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
              }`}>
                <div className="font-semibold">
                  Status: {healthReport.overallHealth ? '✅ All Systems Healthy' : '❌ Issues Detected'}
                </div>
                <div className="mt-1 opacity-90">
                  Total: {healthReport.summary.total} | 
                  Healthy: {healthReport.summary.healthy} | 
                  Issues: {healthReport.summary.issues}
                </div>
              </div>
            </div>
          )}

          {/* Individual Checks */}
          {healthReport && (
            <div>
              <div className={`font-semibold mb-2 text-xs sm:text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                🔍 Check Details
              </div>
              <div className={`p-2 rounded text-[10px] sm:text-xs max-h-32 overflow-auto space-y-2 ${
                isDark ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                {healthReport.checks.map((check: any) => (
                  <div key={check.checkId} className={`border-b pb-1 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                    <div className="flex justify-between items-center">
                      <span className={isDark ? 'text-blue-300' : 'text-blue-600'}>{check.checkId}:</span>
                      <span className={check.result.isHealthy 
                        ? isDark ? 'text-green-400' : 'text-green-600'
                        : isDark ? 'text-red-400' : 'text-red-600'
                      }>
                        {check.result.isHealthy ? '✅' : '❌'} ({check.duration.toFixed(1)}ms)
                      </span>
                    </div>
                    {check.result.issues?.length > 0 && (
                      <ul className="ml-4 mt-1 space-y-0.5">
                        {check.result.issues.map((issue: string, i: number) => (
                          <li key={i} className="opacity-80">• {issue}</li>
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
            <div className={`font-semibold mb-2 text-xs sm:text-sm ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
              💻 Console Commands
            </div>
            <div className={`p-2 rounded text-[10px] sm:text-xs space-y-1 ${
              isDark ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <div><span className={isDark ? 'text-yellow-300' : 'text-yellow-600'}>healthMonitor.runAllChecks()</span> - Run all health checks</div>
              <div><span className={isDark ? 'text-yellow-300' : 'text-yellow-600'}>healthMonitor.runCheck('theme-system')</span> - Check theme only</div>
              <div><span className={isDark ? 'text-yellow-300' : 'text-yellow-600'}>llmDebug.bugReport()</span> - Generate bug report</div>
              <div><span className={isDark ? 'text-yellow-300' : 'text-yellow-600'}>healthMonitor.getChecks()</span> - List all checks</div>
            </div>
          </div>

          {/* System Info */}
          <div>
            <div className={`font-semibold mb-2 text-xs sm:text-sm ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
              🖥️ System Info
            </div>
            <div className={`p-2 rounded text-[10px] sm:text-xs space-y-1 ${
              isDark ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <div><span className="font-semibold">Theme:</span> {state.theme}</div>
              <div><span className="font-semibold">Device:</span> {isMobile ? 'Mobile' : 'Desktop'}</div>
              <div><span className="font-semibold">Viewport:</span> {window.innerWidth}×{window.innerHeight}</div>
              <div><span className="font-semibold">User Agent:</span> {navigator.userAgent.slice(0, isMobile ? 30 : 50)}...</div>
              <div><span className="font-semibold">Timestamp:</span> {new Date().toLocaleString()}</div>
            </div>
          </div>

          {/* Help Text */}
          <div className={`text-[10px] sm:text-xs text-center py-2 border-t ${
            isDark ? 'border-gray-700 text-gray-500' : 'border-gray-300 text-gray-500'
          }`}>
            <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>Ctrl+Shift+D</kbd> to toggle • 
            {isMobile ? 'Settings → Developer → Debug Mode • ' : ''}
            Drag header to move • − Minimize • ↕ Collapse
          </div>
        </div>
      )}
    </div>
      )}
    </>
  );
};

export default DebugMode;