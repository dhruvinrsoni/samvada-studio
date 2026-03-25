import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useChat } from './ChatContext';
import useProviderHealthMonitor, { type ProviderHealth } from '../hooks/useProviderHealthMonitor';
import { HealthService } from '../utils/healthService';
import { healthMonitor, type HealthReport } from '../utils/healthMonitor';

interface ConnectivityState {
  online: boolean;
  internet: boolean;
  ollama: boolean;
  ollamaModels: string[];
  ollamaEndpoint?: string;
}

interface OllamaWarningState {
  hasWarning: boolean;
  configuredModel?: string;
  modelInstalled?: boolean;
  hasOllamaProvider: boolean;
  ollamaIsDefault: boolean;
}

interface ObservabilityContextValue {
  providerHealth: ProviderHealth[];
  isProviderChecking: boolean;
  refreshProviders: () => Promise<void>;
  showDisableWarning: boolean;
  currentPollInterval: number;
  connectivity: ConnectivityState | null;
  isConnectivityChecking: boolean;
  refreshConnectivity: () => Promise<void>;
  diagnosticsReport: HealthReport | null;
  isDiagnosticsRunning: boolean;
  refreshDiagnostics: () => Promise<void>;
  refreshAll: () => Promise<void>;
  overallHealth: 'healthy' | 'slow' | 'degraded' | 'unknown';
  ollamaWarning: OllamaWarningState;
}

const ObservabilityContext = createContext<ObservabilityContextValue | null>(null);

export function ObservabilityProvider({ children }: { children: React.ReactNode }) {
  const { state } = useChat();

  const enabledProviders = useMemo(
    () => state.providers.filter(p => p.isEnabled),
    [state.providers]
  );

  const {
    healthStatus,
    isChecking,
    refresh,
    showDisableWarning,
    currentPollInterval,
  } = useProviderHealthMonitor({
    providers: enabledProviders,
    enabled: state.healthMonitoringEnabled ?? true,
  });

  const [connectivity, setConnectivity] = useState<ConnectivityState | null>(null);
  const [isConnectivityChecking, setIsConnectivityChecking] = useState(false);
  const [diagnosticsReport, setDiagnosticsReport] = useState<HealthReport | null>(null);
  const [isDiagnosticsRunning, setIsDiagnosticsRunning] = useState(false);

  const refreshConnectivity = useCallback(async () => {
    setIsConnectivityChecking(true);
    try {
      const status = await HealthService.checkBasicConnectivity();
      let ollamaEndpoint: string | undefined;

      if (status.ollama) {
        try {
          const { ollamaDiscovery } = await import('../services/ollamaDiscovery');
          const quickResult = await ollamaDiscovery.quickCheck();
          if (quickResult?.isHealthy) {
            ollamaEndpoint = `${quickResult.endpoint.host}:${quickResult.endpoint.port}`;
          }
        } catch {
          ollamaEndpoint = undefined;
        }
      }

      setConnectivity({
        online: navigator.onLine,
        internet: status.internet,
        ollama: status.ollama,
        ollamaModels: status.ollamaModels,
        ollamaEndpoint,
      });
    } finally {
      setIsConnectivityChecking(false);
    }
  }, []);

  const refreshDiagnostics = useCallback(async () => {
    setIsDiagnosticsRunning(true);
    try {
      const report = await healthMonitor.runAllChecks();
      setDiagnosticsReport(report);
    } finally {
      setIsDiagnosticsRunning(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), refreshConnectivity(), refreshDiagnostics()]);
  }, [refresh, refreshConnectivity, refreshDiagnostics]);

  useEffect(() => {
    refreshConnectivity();
  }, [refreshConnectivity]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshConnectivity();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [refreshConnectivity]);

  // Immediately refresh when Ollama state changes externally
  useEffect(() => {
    const handleOllamaChange = () => { refreshConnectivity(); };
    window.addEventListener('ollama-models-changed', handleOllamaChange);
    window.addEventListener('ollama-discovered', handleOllamaChange);
    return () => {
      window.removeEventListener('ollama-models-changed', handleOllamaChange);
      window.removeEventListener('ollama-discovered', handleOllamaChange);
    };
  }, [refreshConnectivity]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    refreshDiagnostics();
  }, [refreshDiagnostics]);

  const overallHealth = useMemo<'healthy' | 'slow' | 'degraded' | 'unknown'>(() => {
    if (healthStatus.length === 0) return 'unknown';
    const hasOffline = healthStatus.some(h => h.status === 'offline');
    const hasSlow = healthStatus.some(h => h.status === 'slow');
    const allOnline = healthStatus.every(h => h.status === 'online');

    if (hasOffline) return 'degraded';
    if (hasSlow) return 'slow';
    if (allOnline) return 'healthy';
    return 'unknown';
  }, [healthStatus]);

  const ollamaWarning = useMemo<OllamaWarningState>(() => {
    const ollamaProvider = enabledProviders.find(p => p.type === 'ollama');
    const hasOllamaProvider = Boolean(ollamaProvider);
    const configuredModel = ollamaProvider?.model;
    const modelInstalled = configuredModel
      ? (connectivity?.ollamaModels || []).some(m => m === configuredModel || m.startsWith(`${configuredModel}:`))
      : true;
    const hasWarning = hasOllamaProvider && (connectivity ? (!connectivity.ollama || !modelInstalled) : false);

    return {
      hasWarning,
      configuredModel,
      modelInstalled,
      hasOllamaProvider,
      ollamaIsDefault: enabledProviders.some(p => p.type === 'ollama' && p.isDefault),
    };
  }, [enabledProviders, connectivity]);

  const value: ObservabilityContextValue = {
    providerHealth: healthStatus,
    isProviderChecking: isChecking,
    refreshProviders: refresh,
    showDisableWarning,
    currentPollInterval,
    connectivity,
    isConnectivityChecking,
    refreshConnectivity,
    diagnosticsReport,
    isDiagnosticsRunning,
    refreshDiagnostics,
    refreshAll,
    overallHealth,
    ollamaWarning,
  };

  return (
    <ObservabilityContext.Provider value={value}>
      {children}
    </ObservabilityContext.Provider>
  );
}

export function useObservability() {
  const context = useContext(ObservabilityContext);
  if (!context) {
    throw new Error('useObservability must be used inside ObservabilityProvider');
  }
  return context;
}
