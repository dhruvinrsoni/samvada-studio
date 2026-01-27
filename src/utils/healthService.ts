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
    let responseTime: number | undefined;
    let modelSize: number | undefined;
    let healthCheckUrl: string | null = null;

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
          error = ollamaResult.error || 'Ollama service not available';
        }

      } else if (provider.type === 'openai' && provider.apiEndpoint) {
        // OpenAI: Check models endpoint
        healthCheckUrl = `${provider.apiEndpoint}/v1/models`;

        const response = await fetch(healthCheckUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(this.PROVIDER_TIMEOUT),
          headers: provider.apiKey ? {
            'Authorization': `Bearer ${provider.apiKey}`,
          } : {},
        });

        responseTime = Date.now() - startTime;

        if (response.ok) {
          status = responseTime > 5000 ? 'slow' : 'online';
        } else if (response.status === 401 || response.status === 403) {
          // Auth issues but service is reachable
          status = 'online';
          error = 'Authentication failed';
        } else {
          status = 'offline';
          error = `HTTP ${response.status}`;
        }

      } else if (provider.type === 'anthropic') {
        // Anthropic: No public health endpoint, assume healthy if configured
        status = provider.apiKey ? 'online' : 'offline';
        responseTime = 0;

      } else if (provider.type === 'google') {
        // Google: Similar to Anthropic
        status = provider.apiKey ? 'online' : 'offline';
        responseTime = 0;

      } else if (provider.type === 'azure' && provider.apiEndpoint) {
        // Azure: Check deployment endpoint
        healthCheckUrl = provider.apiEndpoint;

        const response = await fetch(healthCheckUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(this.PROVIDER_TIMEOUT),
          headers: provider.apiKey ? {
            'Authorization': `Bearer ${provider.apiKey}`,
          } : {},
        });

        responseTime = Date.now() - startTime;

        if (response.ok) {
          status = responseTime > 5000 ? 'slow' : 'online';
        } else if (response.status === 401 || response.status === 403) {
          status = 'online';
          error = 'Authentication failed';
        } else {
          status = 'offline';
          error = `HTTP ${response.status}`;
        }

      } else {
        // Custom or unknown provider
        status = 'unknown';
        error = 'Unsupported provider type';
      }

    } catch (err) {
      responseTime = Date.now() - startTime;

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          status = 'offline';
          error = 'Request timeout';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          status = 'offline';
          error = 'Network error - service may not be running';
        } else {
          status = 'offline';
          error = err.message;
        }
      } else {
        status = 'offline';
        error = 'Unknown error';
      }
    }

    const result: ProviderHealthResult = {
      status,
      responseTime,
      modelSize,
      error,
      lastChecked: Date.now(),
    };

    logDebug('HealthService', {
      providerId: provider.id,
      providerType: provider.type,
      status: result.status,
      responseTime: result.responseTime,
      error: result.error,
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