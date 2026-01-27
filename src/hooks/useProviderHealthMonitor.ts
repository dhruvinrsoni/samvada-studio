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

export type HealthStatus = 'online' | 'slow' | 'offline' | 'unknown' | 'disabled';

export interface ProviderHealth {
  providerId: string;
  providerName: string;
  model: string;
  status: HealthStatus;
  lastChecked: number;
  responseTime?: number; // in milliseconds
  error?: string;
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
  };
}

const CACHE_DURATION = 30000; // 30 seconds
const INITIAL_POLL_INTERVAL = 30000; // 30 seconds
const MAX_POLL_INTERVAL = 300000; // 5 minutes
const REQUEST_TIMEOUT = 30000; // 30 seconds (increased for slow networks/local services)
const SLOW_THRESHOLD = 5000; // 5 seconds = slow
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
   * Get cached health status if valid
   */
  const getCachedHealth = useCallback((providerId: string): HealthStatus | null => {
    if (isCacheValid(providerId)) {
      return cacheRef.current[providerId].status;
    }
    return null;
  }, [isCacheValid]);

  /**
   * Update cache
   */
  const updateCache = useCallback((providerId: string, status: HealthStatus, responseTime?: number) => {
    cacheRef.current[providerId] = {
      status,
      timestamp: Date.now(),
      responseTime,
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
      return {
        providerId: provider.id,
        providerName: provider.name,
        model: provider.model,
        status: cached,
        lastChecked: cacheRef.current[provider.id].timestamp,
        responseTime: cacheRef.current[provider.id].responseTime,
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

    const startTime = Date.now();
    let status: HealthStatus = 'unknown';
    let error: string | undefined;
    let responseTime: number | undefined;
    let healthCheckUrl: string | null = null;

    try {
      // Create abort controller for timeout
      const abortController = new AbortController();
      abortControllersRef.current.set(provider.id, abortController);

      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, REQUEST_TIMEOUT);

      try {
        // Different health check strategies per provider
        
        if (provider.type === 'ollama' && provider.apiEndpoint) {
          // Ollama: Extract base URL and check /api/tags endpoint
          // Example: http://localhost:11434/api/generate -> http://localhost:11434
          let baseUrl = provider.apiEndpoint;
          
          // Remove /api/* suffix if present
          if (baseUrl.includes('/api/')) {
            baseUrl = baseUrl.substring(0, baseUrl.indexOf('/api/'));
          }
          
          healthCheckUrl = `${baseUrl}/api/tags`;
          console.log('[Health Check] Ollama:', { 
            providerId: provider.id,
            providerName: provider.name,
            original: provider.apiEndpoint, 
            extracted: baseUrl,
            healthUrl: healthCheckUrl 
          });
        } else if (provider.type === 'openai' && provider.apiEndpoint) {
          // OpenAI: Check models endpoint with HEAD request
          healthCheckUrl = `${provider.apiEndpoint}/v1/models`;
        } else if (provider.type === 'anthropic') {
          // Anthropic: No public health endpoint, assume healthy if configured
          // We can't really check without making a billable request
          status = provider.apiKey ? 'online' : 'offline';
          responseTime = 0;
        } else if (provider.type === 'google') {
          // Google: Similar to Anthropic, assume healthy if configured
          status = provider.apiKey ? 'online' : 'offline';
          responseTime = 0;
        } else if (provider.type === 'azure' && provider.apiEndpoint) {
          // Azure: Check deployment endpoint
          healthCheckUrl = provider.apiEndpoint;
        }

        if (healthCheckUrl) {
          console.log('[Health Check] Fetching:', healthCheckUrl);
          const response = await fetch(healthCheckUrl, {
            method: 'GET',
            signal: abortController.signal,
            mode: 'cors', // Explicitly set CORS mode
            headers: provider.apiKey ? {
              'Authorization': `Bearer ${provider.apiKey}`,
            } : {},
          });

          responseTime = Date.now() - startTime;

          if (response.ok || response.status === 401 || response.status === 403) {
            // 401/403 means endpoint is live, just auth issue (expected for some checks)
            status = responseTime > SLOW_THRESHOLD ? 'slow' : 'online';
            console.log('[Health Check] Success:', { 
              providerId: provider.id,
              providerName: provider.name,
              status, 
              responseTime,
              statusCode: response.status 
            });
          } else {
            status = 'offline';
            error = `HTTP ${response.status}`;
            const errorText = await response.text().catch(() => 'Unable to read error');
            console.error('[Health Check] Failed:', { 
              providerId: provider.id,
              url: healthCheckUrl,
              status: response.status,
              statusText: response.statusText,
              error: errorText 
            });
          }
        }
      } finally {
        clearTimeout(timeoutId);
        abortControllersRef.current.delete(provider.id);
      }
    } catch (err: unknown) {
      responseTime = Date.now() - startTime;
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          status = 'offline';
          error = 'Request timeout';
          console.error('[Health Check] Timeout:', {
            providerId: provider.id,
            providerName: provider.name,
            url: healthCheckUrl,
            timeout: REQUEST_TIMEOUT
          });
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          // For localhost Ollama, CORS errors often show as "Failed to fetch"
          // If it's localhost and we get a network error, it might be CORS, not actual offline
          const isLocalhost = healthCheckUrl?.includes('localhost') || healthCheckUrl?.includes('127.0.0.1');
          const isOllama = provider.type === 'ollama';
          
          if (isLocalhost && isOllama) {
            // Assume online for localhost Ollama with CORS issues
            status = 'online';
            responseTime = 0;
            error = undefined;
            console.warn('[Health Check] CORS blocked for localhost Ollama - assuming online:', {
              providerId: provider.id,
              providerName: provider.name,
              url: healthCheckUrl,
              hint: 'Set OLLAMA_ORIGINS=* to enable health checks'
            });
          } else {
            status = 'offline';
            error = 'Network error';
            console.error('[Health Check] Network error:', {
              providerId: provider.id,
              providerName: provider.name,
              url: healthCheckUrl,
              message: err.message
            });
          }
        } else {
          status = 'offline';
          error = err.message;
          console.error('[Health Check] Error:', {
            providerId: provider.id,
            providerName: provider.name,
            url: healthCheckUrl,
            errorName: err.name,
            errorMessage: err.message
          });
        }
      } else {
        status = 'offline';
        error = 'Unknown error';
      }
    }

    // Update cache
    updateCache(provider.id, status, responseTime);

    return {
      providerId: provider.id,
      providerName: provider.name,
      model: provider.model,
      status,
      lastChecked: Date.now(),
      responseTime,
      error,
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
    await checkAllProviders();
  }, [checkAllProviders]);

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
  }, [enabled, providers.length, startMonitoring, stopMonitoring]);

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
  };
}

export default useProviderHealthMonitor;
