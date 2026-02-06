/**
 * Provider Health Monitoring Hook
 * 
 * Features:
 * - Smart polling with exponential backoff
 * - Caching to avoid overloading providers
 * - Disaster management (offline, timeouts, failures)
 * - Respects rate limits
 * - Siloed - can be completely disabled
 * 
 * Architecture:
 * - Initial check: Immediate on mount
 * - Success: Check every 30 seconds
 * - Failure: Exponential backoff (30s → 60s → 120s → 300s max)
 * - Cache: Results cached for 30 seconds
 * - Network: Checks navigator.onLine first
 * - Timeout: 10 seconds per provider
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LLMProviderConfig } from '../types';
import { HealthService, type HealthStatus } from '../utils/healthService';
import type { ProviderError } from '../utils/providerErrors';

export interface ProviderHealth {
  providerId: string;
  providerName: string;
  model: string;
  status: HealthStatus;
  lastChecked: number;
  responseTime?: number; // in milliseconds
  error?: string;
  errorDetails?: ProviderError; // Rich error information
  modelSize?: number; // in bytes, for Ollama models
}

interface UseProviderHealthMonitorProps {
  providers: LLMProviderConfig[];
  enabled: boolean;
  onHealthChange?: (health: ProviderHealth[]) => void;
}

interface HealthCache {
  [providerId: string]: {
    status: HealthStatus;
    timestamp: number;
    responseTime?: number;
    modelSize?: number;
  };
}

const CACHE_DURATION = 30000; // 30 seconds
const INITIAL_POLL_INTERVAL = 30000; // 30 seconds
const MAX_POLL_INTERVAL = 300000; // 5 minutes
const MAX_CONSECUTIVE_FAILURES = 3; // Show disable warning after 3 failures

export function useProviderHealthMonitor({
  providers,
  enabled,
  onHealthChange,
}: UseProviderHealthMonitorProps) {
  const [healthStatus, setHealthStatus] = useState<Map<string, ProviderHealth>>(new Map());
  const [isChecking, setIsChecking] = useState(false);
  const [showDisableWarning, setShowDisableWarning] = useState(false);
  const consecutiveFailuresRef = useRef<Map<string, number>>(new Map());
  
  // Polling state
  const pollIntervalRef = useRef<number>(INITIAL_POLL_INTERVAL);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  
  // Cache to avoid excessive API calls
  const cacheRef = useRef<HealthCache>({});

  /**
   * Check if cache is still valid for a provider
   */
  const isCacheValid = useCallback((providerId: string): boolean => {
    const cached = cacheRef.current[providerId];
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_DURATION;
  }, []);

  /**
  /**
   * Get cached health status if valid
   */
  const getCachedHealth = useCallback((providerId: string): HealthStatus | null => {
    if (isCacheValid(providerId)) {
      return cacheRef.current[providerId]?.status || null;
    }
    return null;
  }, [isCacheValid]);

  /**
   * Update cache
   */
  const updateCache = useCallback((providerId: string, status: HealthStatus, responseTime?: number, modelSize?: number) => {
    cacheRef.current[providerId] = {
      status,
      timestamp: Date.now(),
      responseTime,
      modelSize,
    };
  }, []);

  /**
   * Check health of a single provider
   */
  const checkProviderHealth = useCallback(async (
    provider: LLMProviderConfig
  ): Promise<ProviderHealth> => {
    // Check cache first
    const cached = getCachedHealth(provider.id);
    if (cached) {
      const cache = cacheRef.current[provider.id];
      return {
        providerId: provider.id,
        providerName: provider.name,
        model: provider.model,
        status: cached,
        lastChecked: cache?.timestamp || Date.now(),
        responseTime: cache?.responseTime || 0,
        modelSize: cache?.modelSize,
      };
    }

    // Check if browser is offline
    if (!navigator.onLine) {
      const health: ProviderHealth = {
        providerId: provider.id,
        providerName: provider.name,
        model: provider.model,
        status: 'offline',
        lastChecked: Date.now(),
        error: 'No internet connection',
      };
      updateCache(provider.id, 'offline');
      return health;
    }

    // Use unified HealthService
    const result = await HealthService.checkProviderHealth(provider);

    // Update cache
    updateCache(provider.id, result.status, result.responseTime, result.modelSize);

    return {
      providerId: provider.id,
      providerName: provider.name,
      model: provider.model,
      status: result.status,
      lastChecked: result.lastChecked,
      responseTime: result.responseTime,
      error: result.error,
      errorDetails: result.errorDetails,
      modelSize: result.modelSize,
    };
  }, [getCachedHealth, updateCache]);

  /**
   * Check health of all enabled providers
   */
  const checkAllProviders = useCallback(async () => {
    if (!enabled || providers.length === 0) {
      return;
    }

    setIsChecking(true);

    try {
      // Check all providers in parallel (but with individual timeouts)
      const healthChecks = providers.map(provider => checkProviderHealth(provider));
      const results = await Promise.all(healthChecks);

      // Update state
      const newHealthMap = new Map<string, ProviderHealth>();
      results.forEach(health => {
        newHealthMap.set(health.providerId, health);
      });

      setHealthStatus(newHealthMap);

      // Callback
      if (onHealthChange) {
        onHealthChange(Array.from(newHealthMap.values()));
      }

      // Track consecutive failures
      results.forEach(result => {
        const failures = consecutiveFailuresRef.current.get(result.providerId) || 0;
        if (result.status === 'offline') {
          consecutiveFailuresRef.current.set(result.providerId, failures + 1);
        } else {
          consecutiveFailuresRef.current.set(result.providerId, 0);
        }
      });

      // Show warning if all providers have 3+ consecutive failures
      const allProvidersFailingPersistently = results.length > 0 && results.every(r => {
        const failures = consecutiveFailuresRef.current.get(r.providerId) || 0;
        return failures >= MAX_CONSECUTIVE_FAILURES;
      });
      setShowDisableWarning(allProvidersFailingPersistently);

      // Adjust polling interval based on results
      const hasFailures = results.some(r => r.status === 'offline');
      if (hasFailures) {
        // Exponential backoff on failures
        pollIntervalRef.current = Math.min(
          pollIntervalRef.current * 2,
          MAX_POLL_INTERVAL
        );
      } else {
        // Reset to initial interval on success
        pollIntervalRef.current = INITIAL_POLL_INTERVAL;
      }
    } catch (error) {
      console.error('[HealthMonitor] Error checking providers:', error);
    } finally {
      setIsChecking(false);
    }
  }, [enabled, providers, checkProviderHealth, onHealthChange]);

  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Immediate check
    checkAllProviders();

    // Schedule next check
    const scheduleNext = () => {
      timeoutRef.current = setTimeout(() => {
        checkAllProviders().then(() => {
          if (enabled) {
            scheduleNext();
          }
        });
      }, pollIntervalRef.current);
    };

    scheduleNext();
  }, [checkAllProviders, enabled]);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Abort pending requests
    abortControllersRef.current.forEach(controller => {
      controller.abort();
    });
    abortControllersRef.current.clear();

    // Clear cache
    cacheRef.current = {};

    // Reset state
    setHealthStatus(new Map());
    setIsChecking(false);

    // Reset polling interval
    pollIntervalRef.current = INITIAL_POLL_INTERVAL;
  }, []);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    // Clear cache to force fresh check
    cacheRef.current = {};
    
    // Also refresh Ollama model cache
    const ollamaProviders = providers.filter(p => p.type === 'ollama');
    for (const provider of ollamaProviders) {
      if (provider.apiEndpoint) {
        let baseUrl = provider.apiEndpoint;
        if (baseUrl.includes('/api/')) {
          baseUrl = baseUrl.substring(0, baseUrl.indexOf('/api/'));
        }
        await HealthService.refreshOllamaCache(baseUrl);
      }
    }
    
    await checkAllProviders();
  }, [checkAllProviders, providers]);

  /**
   * Effect: Start/stop monitoring based on enabled state
   */
  useEffect(() => {
    if (enabled && providers.length > 0) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, providers.length]);

  /**
   * Effect: Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      if (enabled) {
        console.log('[HealthMonitor] Network back online, refreshing...');
        cacheRef.current = {}; // Clear cache
        checkAllProviders();
      }
    };

    const handleOffline = () => {
      console.log('[HealthMonitor] Network offline');
      // Mark all as offline
      const offlineHealth = new Map<string, ProviderHealth>();
      providers.forEach(provider => {
        offlineHealth.set(provider.id, {
          providerId: provider.id,
          providerName: provider.name,
          model: provider.model,
          status: 'offline',
          lastChecked: Date.now(),
          error: 'No internet connection',
        });
      });
      setHealthStatus(offlineHealth);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, providers, checkAllProviders]);

  return {
    healthStatus: Array.from(healthStatus.values()),
    isChecking,
    refresh,
    showDisableWarning,
    currentPollInterval: pollIntervalRef.current,
  };
}

export default useProviderHealthMonitor;
