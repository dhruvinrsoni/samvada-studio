import { useState, useRef, useEffect } from 'react';
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
  // Pill corner position: 'br'|'bl'|'tr'|'tl'
  const [corner, setCorner] = useState<'br'|'bl'|'tr'|'tl'>(() => {
    try {
      const saved = localStorage.getItem('healthPillCorner');
      if (saved === 'br' || saved === 'bl' || saved === 'tr' || saved === 'tl') return saved;
    } catch {}
    return 'br';
  });
  const [isDragging, setIsDragging] = useState(false);
  
  const pillRef = useRef<HTMLButtonElement | null>(null);
  

  

  const copyThemeReport = async () => {
    const report = createLLMReport.themeIssue();
    createLLMReport.copyToClipboard(report);
  };

  if (!state.healthMonitoringEnabled) {
    return null;
  }

  // Compute style for corner placement; respect bottom overlay height for bottom corners
  const bottomOffset = `calc(var(--bottom-overlay-height, 0px) + 1rem)`;
  const cornerStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = { position: 'fixed', zIndex: 50 };
    switch (corner) {
      case 'br': return { ...base, right: '1rem', bottom: bottomOffset };
      case 'bl': return { ...base, left: '1rem', bottom: bottomOffset };
      case 'tr': return { ...base, right: '1rem', top: '1rem' };
      case 'tl': return { ...base, left: '1rem', top: '1rem' };
      default: return { ...base, right: '1rem', bottom: bottomOffset };
    }
  })();

  const saveCorner = (c: 'br'|'bl'|'tr'|'tl') => {
    setCorner(c);
    try { localStorage.setItem('healthPillCorner', c); } catch {}
  };

  // Pointer drag handlers + adaptive overlay avoidance
  useEffect(() => {
    const adjustForOverlay = () => {
      try {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--bottom-overlay-height') || '0px';
        const px = parseFloat(raw.replace('px','')) || 0;
        // If current corner is bottom and overlay consumes space, move to top counterpart
        if (px > 20 && (corner === 'br' || corner === 'bl')) {
          const newCorner = corner === 'br' ? 'tr' : 'tl';
          saveCorner(newCorner);
        }
      } catch {
        // ignore
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      // move pill to pointer during drag
      if (pillRef.current) {
        pillRef.current.style.left = `${e.clientX - 28}px`;
        pillRef.current.style.top = `${e.clientY - 20}px`;
        pillRef.current.style.right = 'auto';
        pillRef.current.style.bottom = 'auto';
        pillRef.current.style.position = 'fixed';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      const w = window.innerWidth; const h = window.innerHeight;
      const x = e.clientX; const y = e.clientY;
      // decide nearest corner
      const isLeft = x < w/2; const isTop = y < h/2;
      const newCorner = isLeft ? (isTop ? 'tl' : 'bl') : (isTop ? 'tr' : 'br');
      saveCorner(newCorner);
      // reset inline positioning
      if (pillRef.current) {
        pillRef.current.style.left = '';
        pillRef.current.style.top = '';
        pillRef.current.style.position = '';
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    // Run initial adjustment and observe style changes to react to --bottom-overlay-height updates
    adjustForOverlay();
    const mo = new MutationObserver(adjustForOverlay);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    window.addEventListener('resize', adjustForOverlay);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      mo.disconnect();
      window.removeEventListener('resize', adjustForOverlay);
    };
  }, [isDragging, corner]);

  // Listen for external open requests (e.g., StatusBar icon)
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('open-system-health', onOpen as EventListener);
    return () => window.removeEventListener('open-system-health', onOpen as EventListener);
  }, []);

  

  return (
    <div style={cornerStyle as any}>
      {open && (
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
      )}
    </div>
  );
}
