/**
 * Central Ollama Availability Service (Single Responsibility)
 *
 * Single source of truth for Ollama reachability status.
 * All UI consumers (StatusBar, ConnectionStatus, ModelManagerPanel,
 * ObservabilityContext, etc.) should use this instead of making
 * independent health checks.
 *
 * Uses ollamaDiscovery.quickCheck() as the canonical connectivity test
 * (same code path that the chat system uses).
 */

import { ollamaDiscovery } from './ollamaDiscovery';

export type OllamaStatus =
  | 'unknown'
  | 'checking'
  | 'unreachable'
  | 'running'
  | 'running-no-models';

export interface OllamaAvailabilityResult {
  status: OllamaStatus;
  endpoint?: string;
  version?: string;
  models: { name: string; size?: number }[];
  error?: string;
  lastChecked: number;
}

type Listener = (result: OllamaAvailabilityResult) => void;

const CACHE_TTL = 30_000; // 30 seconds

class OllamaAvailabilityService {
  private cached: OllamaAvailabilityResult | null = null;
  private listeners = new Set<Listener>();
  private checkInProgress: Promise<OllamaAvailabilityResult> | null = null;

  /** Subscribe to status changes. Returns unsubscribe function. */
  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(result: OllamaAvailabilityResult) {
    this.listeners.forEach(cb => {
      try { cb(result); } catch { /* listener errors are silenced */ }
    });
  }

  private isCacheValid(): boolean {
    return !!this.cached && Date.now() - this.cached.lastChecked < CACHE_TTL;
  }

  /** Get current status. Uses cache if valid, otherwise performs a check. */
  async getStatus(): Promise<OllamaAvailabilityResult> {
    if (this.isCacheValid()) return this.cached!;
    return this.refresh();
  }

  /** Return the last cached result without performing a network check. */
  getLastResult(): OllamaAvailabilityResult | null {
    return this.cached;
  }

  /** Force a fresh check, bypassing cache. Deduplicates concurrent calls. */
  async refresh(): Promise<OllamaAvailabilityResult> {
    if (this.checkInProgress) return this.checkInProgress;

    this.checkInProgress = this.performCheck();
    try {
      return await this.checkInProgress;
    } finally {
      this.checkInProgress = null;
    }
  }

  /** Clear cached data so the next getStatus() performs a fresh check. */
  invalidate(): void {
    this.cached = null;
  }

  private async performCheck(): Promise<OllamaAvailabilityResult> {
    const permission = localStorage.getItem('samvada-local-network-permission');

    // Only attempt network checks when permission is explicitly granted.
    // If null (never set) or 'denied', do not fetch.
    if (permission !== 'granted') {
      const result: OllamaAvailabilityResult = {
        status: 'unreachable',
        models: [],
        error: permission === 'denied'
          ? 'Local network access denied. Enable in Admin Settings → General.'
          : 'Local network permission not yet granted. Complete onboarding or grant in Admin Settings → General.',
        lastChecked: Date.now(),
      };
      this.cached = result;
      this.notify(result);
      return result;
    }

    try {
      const quickResult = await ollamaDiscovery.quickCheck();

      if (quickResult && quickResult.isHealthy) {
        const endpoint = `${quickResult.endpoint.protocol}://${quickResult.endpoint.host}:${quickResult.endpoint.port}`;

        let models: { name: string; size?: number }[] = [];
        try {
          models = await ollamaDiscovery.fetchModelsFromEndpoint(endpoint);
        } catch {
          // endpoint is healthy but model listing failed
        }

        const status: OllamaStatus = models.length > 0 ? 'running' : 'running-no-models';
        const result: OllamaAvailabilityResult = {
          status,
          endpoint,
          version: quickResult.version,
          models,
          lastChecked: Date.now(),
        };
        this.cached = result;
        this.notify(result);
        return result;
      }

      const result: OllamaAvailabilityResult = {
        status: 'unreachable',
        models: [],
        error: quickResult?.error || 'No healthy Ollama endpoint found',
        lastChecked: Date.now(),
      };
      this.cached = result;
      this.notify(result);
      return result;
    } catch (err: any) {
      const result: OllamaAvailabilityResult = {
        status: 'unreachable',
        models: [],
        error: err?.message || 'Ollama connectivity check failed',
        lastChecked: Date.now(),
      };
      this.cached = result;
      this.notify(result);
      return result;
    }
  }
}

export const ollamaAvailability = new OllamaAvailabilityService();

/**
 * Listen for events that indicate Ollama state changed externally
 * (model pulled, endpoint discovered, etc.) and invalidate + refresh.
 */
if (typeof window !== 'undefined') {
  const handleChange = () => {
    ollamaAvailability.invalidate();
    ollamaAvailability.refresh();
  };
  window.addEventListener('ollama-models-changed', handleChange);
  window.addEventListener('ollama-discovered', handleChange);
  window.addEventListener('local-storage-change', handleChange);
}
