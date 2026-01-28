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
    this.setOllamaCache(testModels);
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
   * Check Ollama connectivity and get models (with caching)
   */
  static async checkOllamaConnectivity(
    customEndpoint?: string,
    forceRefresh: boolean = false
  ): Promise<OllamaConnectivityResult> {
    const endpoint = customEndpoint || 'http://localhost:11434';

    // Check cache first (unless forced refresh)
    if (!forceRefresh && this.isCacheValid()) {
      const cache = this.getOllamaCache();
      if (cache) {
        logDebug('HealthService', `Using cached Ollama models: ${cache.models.length} models`);
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
          logDebug('HealthService', 'Ollama ping failed, returning cached models but marking as unavailable');
          return {
            available: false,
            models: cache.models,
            error: 'Ollama server not responding',
          };
        }
      }
    }

    // Cache invalid or forced refresh - fetch fresh data
    logDebug('HealthService', `Fetching fresh Ollama models from ${endpoint}`);
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
        logDebug('HealthService', `Fetched and cached ${models.length} Ollama models: ${models.map((m: any) => `${m.name} (${m.size ? this.formatBytes(m.size) : 'no size'})`).join(', ')}`);

        return {
          available: true,
          models,
        };
      } else {
        logDebug('HealthService', `Ollama API returned status ${response.status}`);
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
            logDebug('HealthService', `Found model size for ${provider.model}: ${this.formatBytes(modelSize)} (${modelSize} bytes)`);
          } else {
            logDebug('HealthService', `No model size found for ${provider.model}. Available models: ${ollamaResult.models.map((m: any) => `${m.name} (${m.size ? this.formatBytes(m.size) : 'no size'})`).join(', ')}`);
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
        healthCheckUrl = `${provider.apiEndpoint}/v1/models`;

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

      } else if (provider.type === 'anthropic') {
        // Anthropic: Check messages endpoint with a minimal request
        // Note: This will consume a tiny amount of credits for a health check
        // Alternative: Just check if API key is present (less accurate)
        if (!provider.apiKey) {
          status = 'offline';
          errorDetails = parseProviderError(provider.type, { error: { type: 'authentication_error', message: 'No API key configured' } }, 401);
          error = errorDetails.title;
        } else {
          // Try a lightweight API call to validate credentials and billing
          let response: Response | null = null;
          const requestUrl = 'https://api.anthropic.com/v1/messages';
          const requestHeaders = {
            'Content-Type': 'application/json',
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
          };
          const requestBody = {
            model: provider.model || 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
          };
          
          try {
            response = await fetch(requestUrl, {
              method: 'POST',
              signal: AbortSignal.timeout(this.PROVIDER_TIMEOUT),
              headers: requestHeaders,
              body: JSON.stringify(requestBody),
            });

            responseTime = Date.now() - startTime;

            if (response.ok) {
              status = responseTime > 5000 ? 'slow' : 'online';
            } else {
              status = 'offline';
              // Try to parse error response body
              let errorResponse: any;
              let rawResponse: string = '';
              try {
                const responseText = await response.text();
                rawResponse = responseText;
                console.log('[HealthService] Anthropic error response:', {
                  status: response.status,
                  statusText: response.statusText,
                  body: responseText
                });
                try {
                  errorResponse = JSON.parse(responseText);
                } catch {
                  errorResponse = {
                    error: {
                      type: 'api_error',
                      message: responseText || `HTTP ${response.status}: ${response.statusText}`
                    }
                  };
                }
              } catch {
                // If reading response fails, create a generic error with status code
                errorResponse = {
                  error: {
                    type: 'api_error',
                    message: `HTTP ${response.status}: ${response.statusText}`
                  }
                };
              }
              errorDetails = parseProviderError(provider.type, errorResponse, response.status);
              // Add raw response as technical details
              if (rawResponse) {
                errorDetails.technicalDetails = rawResponse;
              }
              error = errorDetails.title;
            }
          } catch (err) {
            responseTime = Date.now() - startTime;
            status = 'offline';
            console.log('[HealthService] Anthropic fetch error:', err);
            
            // Build comprehensive technical details
            const technicalDetails = {
              errorType: err instanceof Error ? err.name : 'Unknown',
              errorMessage: err instanceof Error ? err.message : String(err),
              timestamp: new Date().toISOString(),
              request: {
                url: requestUrl,
                method: 'POST',
                headers: {
                  'Content-Type': requestHeaders['Content-Type'],
                  'anthropic-version': requestHeaders['anthropic-version'],
                  'x-api-key': provider.apiKey ? `${provider.apiKey.substring(0, 8)}...` : 'missing',
                },
                body: requestBody,
              },
              responseReceived: !!response,
              ...(response && {
                httpStatus: response.status,
                httpStatusText: response.statusText,
              }),
            };
            
            // Only treat as network error if we didn't get a response at all
            if (!response) {
              errorDetails = parseProviderError(provider.type, err);
              errorDetails.technicalDetails = JSON.stringify(technicalDetails, null, 2);
              error = errorDetails.title;
            } else {
              // We got a response but something else failed - shouldn't happen but handle it
              errorDetails = parseProviderError(provider.type, { error: { type: 'unknown_error', message: String(err) } });
              errorDetails.technicalDetails = JSON.stringify(technicalDetails, null, 2);
              error = errorDetails.title;
            }
          }
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