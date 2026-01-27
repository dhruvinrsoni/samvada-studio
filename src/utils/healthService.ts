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
import { parseProviderError, type ProviderError, ErrorCategory } from './providerErrors';

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
   * Check Ollama connectivity and get models
   */
  static async checkOllamaConnectivity(
    customEndpoint?: string
  ): Promise<OllamaConnectivityResult> {
    const endpoint = customEndpoint || 'http://localhost:11434';

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
      // Different health check strategies per provider
      if (provider.type === 'ollama' && provider.apiEndpoint) {
        // Ollama: Extract base URL and check /api/tags endpoint
        let baseUrl = provider.apiEndpoint;

        // Remove /api/* suffix if present
        if (baseUrl.includes('/api/')) {
          baseUrl = baseUrl.substring(0, baseUrl.indexOf('/api/'));
        }

        healthCheckUrl = `${baseUrl}/api/tags`;

        // Use unified Ollama checking
        const ollamaResult = await this.checkOllamaConnectivity(baseUrl);
        responseTime = Date.now() - startTime;

        if (ollamaResult.available) {
          status = responseTime > 5000 ? 'slow' : 'online';

          // Find the current model size
          const currentModel = ollamaResult.models.find(m =>
            m.name === provider.model || m.name.startsWith(`${provider.model}:`)
          );
          if (currentModel?.size) {
            modelSize = currentModel.size;
          }
        } else {
          status = 'offline';
          // Parse Ollama-specific error
          errorDetails = parseProviderError(provider.type, ollamaResult.error || ollamaResult);
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
          try {
            const errorResponse = await httpResponse.json();
            errorDetails = parseProviderError(provider.type, errorResponse, httpResponse.status);
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
          try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              signal: AbortSignal.timeout(this.PROVIDER_TIMEOUT),
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': provider.apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: provider.model || 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'ping' }],
              }),
            });

            responseTime = Date.now() - startTime;

            if (response.ok) {
              status = responseTime > 5000 ? 'slow' : 'online';
            } else {
              status = 'offline';
              const errorResponse = await response.json();
              errorDetails = parseProviderError(provider.type, errorResponse, response.status);
              error = errorDetails.title;
            }
          } catch (err) {
            responseTime = Date.now() - startTime;
            errorDetails = parseProviderError(provider.type, err);
            error = errorDetails.title;
            status = 'offline';
          }
        }

      } else if (provider.type === 'google') {
        // Google: Check models endpoint
        if (!provider.apiKey) {
          status = 'offline';
          errorDetails = parseProviderError(provider.type, { error: { status: 'UNAUTHENTICATED', message: 'No API key configured' } }, 401);
          error = errorDetails.title;
        } else {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${provider.apiKey}`,
              {
                method: 'GET',
                signal: AbortSignal.timeout(this.PROVIDER_TIMEOUT),
              }
            );

            responseTime = Date.now() - startTime;

            if (response.ok) {
              status = responseTime > 5000 ? 'slow' : 'online';
            } else {
              status = 'offline';
              const errorResponse = await response.json();
              errorDetails = parseProviderError(provider.type, errorResponse, response.status);
              error = errorDetails.title;
            }
          } catch (err) {
            responseTime = Date.now() - startTime;
            errorDetails = parseProviderError(provider.type, err);
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
          try {
            const errorResponse = await httpResponse.json();
            errorDetails = parseProviderError(provider.type, errorResponse, httpResponse.status);
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