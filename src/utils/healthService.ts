/**
 * Unified Health Service
 *
 * Single source of truth for all connectivity and health checking
 * Follows SOLID principles with clear separation of concerns
 *
 * Features:
 * - Basic connectivity checks (internet, Ollama)
 * - Individual provider health monitoring
 * - Model discovery and size extraction
 * - Consistent error handling and timeouts
 * - Caching support
 */

import { LLMProviderConfig } from '../types';
import { logDebug } from './debug';
import { parseProviderError, type ProviderError } from './providerErrors';

export type HealthStatus = 'online' | 'slow' | 'offline' | 'unknown' | 'disabled';

export interface BasicConnectivityResult {
  internet: boolean;
  ollama: boolean;
  ollamaModels: string[];
}

export interface OllamaConnectivityResult {
  available: boolean;
  models: { name: string; size?: number }[];
  error?: string;
}

/**
 * Check if the app is running on localhost or hosted remotely
 * @returns true if running on localhost, false if hosted (GitHub Pages, Netlify, etc.)
 */
function isLocalhost(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === '[::1]' || 
         hostname.includes('local');
}

export interface ProviderHealthResult {
  status: HealthStatus;
  responseTime?: number;
  modelSize?: number;
  error?: string;
  errorDetails?: ProviderError; // Rich error information
  lastChecked: number;
}

export class HealthService {
  // Standard timeouts
  private static readonly OLLAMA_TIMEOUT = 2000; // 2 seconds for basic checks
  private static readonly PROVIDER_TIMEOUT = 30000; // 30 seconds for detailed checks
  private static readonly INTERNET_TIMEOUT = 2000; // 2 seconds for internet checks
  
  // Cache settings
  private static readonly OLLAMA_CACHE_KEY = 'ollama_model_cache';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Ollama model cache interface
   */
  private static getOllamaCache(): { models: { name: string; size: number }[]; timestamp: number } | null {
    try {
      const cached = localStorage.getItem(this.OLLAMA_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private static setOllamaCache(models: { name: string; size: number }[]): void {
    try {
      const cacheData = {
        models,
        timestamp: Date.now()
      };
      localStorage.setItem(this.OLLAMA_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache Ollama models:', error);
    }
  }

  private static isCacheValid(): boolean {
    const cache = this.getOllamaCache();
    if (!cache) return false;
    
    const now = Date.now();
    const cacheAge = now - cache.timestamp;
    return cacheAge < this.CACHE_DURATION;
  }

  /**
   * Force refresh Ollama model cache
   */
  static async refreshOllamaCache(customEndpoint?: string): Promise<void> {
    await this.checkOllamaConnectivity(customEndpoint, true);
  }

  /**
   * Debug: Populate cache with test data
   */
  static populateTestCache(): void {
    const testModels = [
      { name: 'llama2', size: 3791733504 },
      { name: 'llama2:7b', size: 3791733504 },
      { name: 'codellama', size: 5368709120 },
      { name: 'mistral', size: 4140000000 }
    ];
    logDebug('HealthService', `Populated cache with test data: ${testModels.map(m => `${m.name} (${this.formatBytes(m.size)})`).join(', ')}`);
  }

  /**
   * Clear Ollama model cache
   */
  static clearOllamaCache(): void {
    try {
      localStorage.removeItem(this.OLLAMA_CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear Ollama cache:', error);
    }
  }

  /**
   * Check basic connectivity (used by ConnectionStatus)
   */
  static async checkBasicConnectivity(): Promise<BasicConnectivityResult> {
    const result: BasicConnectivityResult = {
      internet: navigator.onLine,
      ollama: false,
      ollamaModels: [],
    };

    // Check internet connectivity
    try {
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(this.INTERNET_TIMEOUT),
      });
      result.internet = true;
    } catch {
      result.internet = false;
    }

    // Check Ollama connectivity
    const ollamaResult = await this.checkOllamaConnectivity();
    result.ollama = ollamaResult.available;
    result.ollamaModels = ollamaResult.models.map(m => m.name);

    logDebug('HealthService', {
      basicConnectivity: result,
      ollamaError: ollamaResult.error
    });

    return result;
  }

  /**
   * Check if local network access is permitted
   */
  private static checkLocalNetworkPermission(endpoint: string): boolean {
    // Check if endpoint is localhost/local network
    const isLocalEndpoint = endpoint.includes('localhost') || 
                            endpoint.includes('127.0.0.1') ||
                            endpoint.includes('192.168.') ||
                            endpoint.includes('10.') ||
                            endpoint.match(/172\.(1[6-9]|2[0-9]|3[01])\./);

    if (!isLocalEndpoint) {
      return true; // Not a local endpoint, no permission needed
    }

    // Check stored permission
    const permission = localStorage.getItem('samvada-local-network-permission');
    
    if (permission === 'denied') {
      return false; // Permission explicitly denied
    }

    // If not set or granted, allow (will prompt on first use via hook)
    return true;
  }

  /**
   * Check Ollama connectivity and get models (with caching)
   */
  static async checkOllamaConnectivity(
    customEndpoint?: string,
    forceRefresh: boolean = false
  ): Promise<OllamaConnectivityResult> {
    const endpoint = customEndpoint || 'http://localhost:11434';
    
    // Skip localhost checks when app is hosted remotely (GitHub Pages, etc.)
    // Browsers block access to localhost from remote origins for security
    if (!isLocalhost() && !customEndpoint) {
      return {
        available: false,
        models: [],
        error: 'Ollama requires local installation. Not available on hosted version.',
      };
    }

    // Check local network permission first
    if (!this.checkLocalNetworkPermission(endpoint)) {
      return {
        available: false,
        models: [],
        error: 'Local network access denied. Enable in Admin Settings → General.',
      };
    }

    // Check cache first (unless forced refresh)
    if (!forceRefresh && this.isCacheValid()) {
      const cache = this.getOllamaCache();
      if (cache) {
        // Verify Ollama is still running by doing a quick ping
        try {
          const pingResponse = await fetch(`${endpoint}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(1000), // Quick 1-second ping
          });
          
          if (pingResponse.ok) {
            // Ollama is running, return cached models
            return {
              available: true,
              models: cache.models,
            };
          }
        } catch {
          // Ollama not running, return cached data but mark as unavailable
          return {
            available: false,
            models: cache.models,
            error: 'Ollama server not responding',
          };
        }
      }
    }

    // Cache invalid or forced refresh - fetch fresh data
    try {
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.OLLAMA_TIMEOUT),
      });

      if (response.ok) {
        const data = await response.json();
        const models = (data.models || []).map((m: any) => ({
          name: m.name,
          size: m.size
        }));

        // Cache the fresh data
        this.setOllamaCache(models);

        return {
          available: true,
          models,
        };
      } else {
        return {
          available: false,
          models: [],
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        available: false,
        models: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Check individual provider health (used by StatusBar)
   */
  static async checkProviderHealth(
    provider: LLMProviderConfig
  ): Promise<ProviderHealthResult> {
    const startTime = Date.now();
    let status: HealthStatus = 'unknown';
    let error: string | undefined;
    let errorDetails: ProviderError | undefined;
    let responseTime: number | undefined;
    let modelSize: number | undefined;
    let healthCheckUrl: string | null = null;
    let httpResponse: Response | null = null;

    try {
      // Check local network permission for local endpoints
      if (provider.apiEndpoint && !this.checkLocalNetworkPermission(provider.apiEndpoint)) {
        return {
          status: 'disabled',
          error: 'Local network access denied',
          lastChecked: Date.now(),
        };
      }

      // Different health check strategies per provider
      if (provider.type === 'ollama' && provider.apiEndpoint) {
        // Ollama: Extract base URL and check /api/tags endpoint
        let baseUrl = provider.apiEndpoint;

        // Remove /api/* suffix if present
        if (baseUrl.includes('/api/')) {
          baseUrl = baseUrl.substring(0, baseUrl.indexOf('/api/'));
        }

        healthCheckUrl = `${baseUrl}/api/tags`;

        // Check Ollama connectivity (will use cache if available)
        const ollamaResult = await this.checkOllamaConnectivity(baseUrl);
        responseTime = Date.now() - startTime;

        if (ollamaResult.available) {
          status = responseTime > 5000 ? 'slow' : 'online';

          // Find the current model size from cached/available models
          // More robust matching: exact match, starts with, or contains
          const currentModel = ollamaResult.models.find(m => {
            const providerModel = provider.model.toLowerCase();
            const cachedModel = m.name.toLowerCase();
            return cachedModel === providerModel ||
                   cachedModel.startsWith(`${providerModel}:`) ||
                   providerModel.startsWith(`${cachedModel}:`) ||
                   cachedModel.includes(providerModel) ||
                   providerModel.includes(cachedModel);
          });
          if (currentModel?.size) {
            modelSize = currentModel.size;
          }
        } else {
          status = 'offline';
          // Parse Ollama-specific error and add comprehensive details
          errorDetails = parseProviderError(provider.type, ollamaResult.error || ollamaResult);
          // Add technical details with full context
          const technicalDetails = {
            errorType: 'OllamaConnectionError',
            errorMessage: ollamaResult.error || 'Unknown error',
            timestamp: new Date().toISOString(),
            request: {
              url: `${baseUrl}/api/tags`,
              method: 'GET',
            },
            ollamaEndpoint: baseUrl,
            configuredModel: provider.model,
            availableModels: ollamaResult.models?.map(m => m.name) || [],
          };
          errorDetails.technicalDetails = JSON.stringify(technicalDetails, null, 2);
          error = errorDetails.title;
        }

      } else if (provider.type === 'openai' && provider.apiEndpoint) {
        // OpenAI: Check models endpoint
        // Extract base URL and construct models endpoint
        let baseUrl = provider.apiEndpoint;
        
        // If endpoint contains /chat/completions, replace it with /models
        if (baseUrl.includes('/chat/completions')) {
          baseUrl = baseUrl.replace('/chat/completions', '/models');
        } else if (baseUrl.endsWith('/v1')) {
          // If it ends with /v1, append /models
          baseUrl = `${baseUrl}/models`;
        } else {
          // Otherwise append /v1/models
          baseUrl = `${baseUrl}/v1/models`;
        }
        
        healthCheckUrl = baseUrl;

        // Skip health check for custom OpenAI domains (may have CORS issues)
        const isCustomDomain = !provider.apiEndpoint.includes('api.openai.com');
        if (isCustomDomain) {
          // Just verify API key is configured
          if (!provider.apiKey) {
            status = 'offline';
            errorDetails = parseProviderError(provider.type, { error: { type: 'invalid_api_key', message: 'No API key configured' } }, 401);
            error = errorDetails.title;
          } else {
            status = 'online';
            responseTime = 0;
            // Custom endpoint - health check skipped to avoid CORS
          }
        } else {
          httpResponse = await fetch(healthCheckUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(this.PROVIDER_TIMEOUT),
            headers: provider.apiKey ? {
              'Authorization': `Bearer ${provider.apiKey}`,
            } : {},
          });

          responseTime = Date.now() - startTime;

          if (httpResponse.ok) {
            status = responseTime > 5000 ? 'slow' : 'online';
          } else {
            status = 'offline';
            // Parse error response
            let rawResponse: string = '';
            try {
              const responseText = await httpResponse.text();
              rawResponse = responseText;
              const errorResponse = JSON.parse(responseText);
              errorDetails = parseProviderError(provider.type, errorResponse, httpResponse.status);
              if (rawResponse) {
                errorDetails.technicalDetails = rawResponse;
              }
              error = errorDetails.title;
            } catch {
              error = `HTTP ${httpResponse.status}`;
            }
          }
        }

      } else if (provider.type === 'anthropic') {
        // Anthropic: No actual API call - CORS will always block browser requests
        // Just verify API key is configured (same approach as Google Gemini)
        if (!provider.apiKey) {
          status = 'offline';
          errorDetails = parseProviderError(provider.type, { error: { type: 'authentication_error', message: 'No API key configured' } }, 401);
          error = errorDetails.title;
        } else {
          // API key is configured - mark as online
          // Anthropic API doesn't support direct browser calls due to CORS policy
          // Users must use the actual chat to verify functionality
          status = 'online';
          responseTime = 0;
          error = undefined;
          errorDetails = undefined;
          
          logDebug('HealthService', 'Anthropic: API key configured, marked as online (no API call - CORS restriction)');
        }

      } else if (provider.type === 'google') {
        // Google: Check models endpoint
        if (!provider.apiKey) {
          status = 'offline';
          errorDetails = parseProviderError(provider.type, { error: { status: 'UNAUTHENTICATED', message: 'No API key configured' } }, 401);
          error = errorDetails.title;
        } else {
          const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${provider.apiKey}`;
          try {
            const response = await fetch(requestUrl, {
              method: 'GET',
              signal: AbortSignal.timeout(this.PROVIDER_TIMEOUT),
            });

            responseTime = Date.now() - startTime;

            if (response.ok) {
              status = responseTime > 5000 ? 'slow' : 'online';
            } else {
              status = 'offline';
              let rawResponse: string = '';
              try {
                const responseText = await response.text();
                rawResponse = responseText;
                const errorResponse = JSON.parse(responseText);
                errorDetails = parseProviderError(provider.type, errorResponse, response.status);
                if (rawResponse) {
                  errorDetails.technicalDetails = rawResponse;
                }
                error = errorDetails.title;
              } catch {
                error = `HTTP ${response.status}`;
              }
            }
          } catch (err) {
            responseTime = Date.now() - startTime;
            const technicalDetails = {
              errorType: err instanceof Error ? err.name : 'Unknown',
              errorMessage: err instanceof Error ? err.message : String(err),
              timestamp: new Date().toISOString(),
              request: {
                url: requestUrl.replace(provider.apiKey || '', '***'),
                method: 'GET',
              },
            };
            errorDetails = parseProviderError(provider.type, err);
            errorDetails.technicalDetails = JSON.stringify(technicalDetails, null, 2);
            error = errorDetails.title;
            status = 'offline';
          }
        }

      } else if (provider.type === 'azure' && provider.apiEndpoint) {
        // Azure: Check deployment endpoint
        httpResponse = await fetch(provider.apiEndpoint, {
          method: 'GET',
          signal: AbortSignal.timeout(this.PROVIDER_TIMEOUT),
          headers: provider.apiKey ? {
            'Authorization': `Bearer ${provider.apiKey}`,
            'api-key': provider.apiKey, // Azure uses this header too
          } : {},
        });

        responseTime = Date.now() - startTime;

        if (httpResponse.ok) {
          status = responseTime > 5000 ? 'slow' : 'online';
        } else {
          status = 'offline';
          let rawResponse: string = '';
          try {
            const responseText = await httpResponse.text();
            rawResponse = responseText;
            const errorResponse = JSON.parse(responseText);
            errorDetails = parseProviderError(provider.type, errorResponse, httpResponse.status);
            if (rawResponse) {
              errorDetails.technicalDetails = rawResponse;
            }
            error = errorDetails.title;
          } catch {
            error = `HTTP ${httpResponse.status}`;
          }
        }

      } else {
        // Custom or unknown provider
        status = 'unknown';
        error = 'Unsupported provider type';
      }

    } catch (err) {
      responseTime = Date.now() - startTime;
      errorDetails = parseProviderError(provider.type, err);
      if (err instanceof Error) {
        errorDetails.technicalDetails = err.message;
      }
      error = errorDetails.title;
      status = 'offline';
    }

    const result: ProviderHealthResult = {
      status,
      responseTime,
      modelSize,
      error,
      errorDetails,
      lastChecked: Date.now(),
    };

    logDebug('HealthService', {
      providerId: provider.id,
      providerType: provider.type,
      status: result.status,
      responseTime: result.responseTime,
      error: result.error,
      errorCategory: result.errorDetails?.category,
    });

    return result;
  }

  /**
   * Utility: Format bytes to human readable
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}