// Ollama Discovery Service - Production-Grade Auto-Detection
// Spring Boot-style auto-configuration with intelligent fallbacks

export interface OllamaEndpoint {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  basePath?: string;
  apiKey?: string;
  timeout?: number;
  priority: number; // Lower = higher priority
  label?: string; // User-friendly name
}

export interface OllamaDiscoveryResult {
  endpoint: OllamaEndpoint;
  responseTime: number;
  version?: string;
  models?: string[];
  isHealthy: boolean;
  lastChecked: Date;
  error?: string;
}

export interface OllamaConfiguration {
  autoDiscovery: boolean;
  endpoints: OllamaEndpoint[];
  fallbackBehavior: 'first-healthy' | 'fastest' | 'round-robin';
  cacheSuccessfulEndpoint: boolean;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  networkDetection: {
    enableLANScan: boolean;
    enablePortScan: boolean;
    scanTimeout: number;
  };
}

// Default configuration (Spring Boot-style defaults)
const DEFAULT_CONFIG: OllamaConfiguration = {
  autoDiscovery: true,
  endpoints: [],
  fallbackBehavior: 'first-healthy',
  cacheSuccessfulEndpoint: true,
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  },
  networkDetection: {
    enableLANScan: true,
    enablePortScan: true,
    scanTimeout: 2000,
  },
};

// Storage key for persisted configuration
const STORAGE_KEY = 'ollama-discovery-config';

class OllamaDiscoveryService {
  private config: OllamaConfiguration;
  private cachedEndpoint: OllamaEndpoint | null = null;
  private discoveryResults: Map<string, OllamaDiscoveryResult> = new Map();
  private lastDiscoveryTime = 0; // Timestamp for debouncing rapid calls

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration from localStorage (Spring-style external config)
   */
  private loadConfiguration(): OllamaConfiguration {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load Ollama configuration:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save configuration to localStorage
   */
  saveConfiguration(config: Partial<OllamaConfiguration>): void {
    this.config = { ...this.config, ...config };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save Ollama configuration:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): OllamaConfiguration {
    return { ...this.config };
  }

  /**
   * Add a custom endpoint (Spring-style manual configuration)
   */
  addEndpoint(endpoint: Omit<OllamaEndpoint, 'priority'>): void {
    const priority = this.config.endpoints.length;
    const newEndpoint: OllamaEndpoint = { ...endpoint, priority };
    this.config.endpoints.push(newEndpoint);
    this.saveConfiguration(this.config);
  }

  /**
   * Remove an endpoint
   */
  removeEndpoint(host: string, port: number): void {
    this.config.endpoints = this.config.endpoints.filter(
      ep => !(ep.host === host && ep.port === port)
    );
    this.saveConfiguration(this.config);
  }

  /**
   * Clear all custom endpoints
   */
  clearEndpoints(): void {
    this.config.endpoints = [];
    this.cachedEndpoint = null;
    this.discoveryResults.clear();
    this.saveConfiguration(this.config);
  }

  /**
   * Get the full URL for an endpoint
   */
  private getEndpointUrl(endpoint: OllamaEndpoint): string {
    const { protocol, host, port, basePath = '' } = endpoint;
    return `${protocol}://${host}:${port}${basePath}`;
  }

  /**
   * Test if an endpoint is healthy
   */
  private async testEndpoint(endpoint: OllamaEndpoint): Promise<OllamaDiscoveryResult> {
    const startTime = Date.now();
    const url = this.getEndpointUrl(endpoint);
    const timeout = endpoint.timeout || this.config.networkDetection.scanTimeout;

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (endpoint.apiKey) {
        headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
      }

      // Try to get Ollama version info
      const response = await fetch(`${url}/api/version`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          endpoint,
          responseTime,
          version: data.version,
          isHealthy: true,
          lastChecked: new Date(),
        };
      } else {
        return {
          endpoint,
          responseTime,
          isHealthy: false,
          lastChecked: new Date(),
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        endpoint,
        responseTime,
        isHealthy: false,
        lastChecked: new Date(),
        error: error.name === 'AbortError' ? 'Timeout' : error.message,
      };
    }
  }

  /**
   * Generate candidate endpoints for auto-discovery
   */
  private generateCandidateEndpoints(): OllamaEndpoint[] {
    const candidates: OllamaEndpoint[] = [];
    let priority = 0;

    // 1. Cached successful endpoint (highest priority)
    if (this.cachedEndpoint) {
      candidates.push({ ...this.cachedEndpoint, priority: priority++ });
    }

    // 2. User-configured endpoints
    this.config.endpoints.forEach(endpoint => {
      candidates.push({ ...endpoint, priority: priority++ });
    });

    // 3. Current hostname (smart detection for LAN access)
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        candidates.push({
          host: currentHost,
          port: 11434,
          protocol: 'http',
          priority: priority++,
          label: 'Current Host',
        });
      }
    }

    // 4. Standard localhost
    candidates.push({
      host: 'localhost',
      port: 11434,
      protocol: 'http',
      priority: priority++,
      label: 'Localhost Default',
    });

    candidates.push({
      host: '127.0.0.1',
      port: 11434,
      protocol: 'http',
      priority: priority++,
      label: 'Localhost IP',
    });

    // 5. Common LAN patterns (if enabled) - DHCP-aware
    if (this.config.networkDetection.enableLANScan && typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      
      // Extract network prefix from current host (DHCP-aware)
      const ipParts = currentHost.match(/^(\d+\.\d+\.\d+)\.\d+$/);
      if (ipParts) {
        const networkPrefix = ipParts[1];
        // Only scan a few common IPs to reduce resource usage
        // On DHCP networks, your PC's IP changes, so we detect from window.location
        [1, 100].forEach(lastOctet => {
          candidates.push({
            host: `${networkPrefix}.${lastOctet}`,
            port: 11434,
            protocol: 'http',
            priority: priority++,
            label: `LAN ${lastOctet}`,
          });
        });
      }
    }

    // 6. Common alternative ports (if enabled) - Limited for performance
    if (this.config.networkDetection.enablePortScan) {
      const commonPorts = [11435]; // Only scan one alternative port for performance
      const hosts = ['localhost'];
      
      if (typeof window !== 'undefined') {
        const currentHost = window.location.hostname;
        if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
          hosts.push(currentHost); // DHCP-aware: Use current hostname
        }
      }

      hosts.forEach(host => {
        commonPorts.forEach(port => {
          candidates.push({
            host,
            port,
            protocol: 'http',
            priority: priority++,
            label: `${host}:${port}`,
          });
        });
      });
    }

    // Remove duplicates
    const seen = new Set<string>();
    return candidates.filter(endpoint => {
      const key = `${endpoint.protocol}://${endpoint.host}:${endpoint.port}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Discover available Ollama endpoint (Spring Boot-style auto-configuration)
   * Performance: Debounced to prevent rapid re-discovery within 5 seconds
   */
  async discoverEndpoint(): Promise<OllamaDiscoveryResult | null> {
    // Performance optimization: Debounce rapid discovery calls
    const now = Date.now();
    if (this.lastDiscoveryTime > 0 && now - this.lastDiscoveryTime < 5000) {
      console.log('[Ollama Discovery] Using recent discovery result (debounced)');
      // Return cached endpoint if available
      if (this.cachedEndpoint) {
        const cachedResult = await this.testEndpoint(this.cachedEndpoint);
        if (cachedResult.isHealthy) {
          return cachedResult;
        }
      }
      return null;
    }
    this.lastDiscoveryTime = now;

    if (!this.config.autoDiscovery && this.config.endpoints.length === 0) {
      return null;
    }

    const candidates = this.generateCandidateEndpoints();
    console.log(`🔍 Ollama Discovery: Testing ${candidates.length} candidate endpoints`);

    // Sort by priority
    candidates.sort((a, b) => a.priority - b.priority);

    // Test endpoints based on fallback behavior
    if (this.config.fallbackBehavior === 'fastest') {
      // Race all candidates to find fastest
      return this.findFastestEndpoint(candidates);
    } else {
      // Test in priority order until first healthy
      return this.findFirstHealthyEndpoint(candidates);
    }
  }

  /**
   * Find the fastest responding healthy endpoint
   */
  private async findFastestEndpoint(
    candidates: OllamaEndpoint[]
  ): Promise<OllamaDiscoveryResult | null> {
    const results = await Promise.allSettled(
      candidates.map(endpoint => this.testEndpoint(endpoint))
    );

    const healthyResults = results
      .filter((result): result is PromiseFulfilledResult<OllamaDiscoveryResult> => 
        result.status === 'fulfilled' && result.value.isHealthy
      )
      .map(result => result.value)
      .sort((a, b) => a.responseTime - b.responseTime);

    if (healthyResults.length > 0) {
      const fastest = healthyResults[0];
      if (fastest) {
        this.cacheSuccessfulEndpoint(fastest.endpoint);
        this.discoveryResults.set(this.getEndpointUrl(fastest.endpoint), fastest);
        console.log(`✅ Fastest Ollama endpoint: ${this.getEndpointUrl(fastest.endpoint)} (${fastest.responseTime}ms)`);
        return fastest;
      }
    }

    console.warn('❌ No healthy Ollama endpoints found');
    return null;
  }

  /**
   * Find the first healthy endpoint in priority order
   */
  private async findFirstHealthyEndpoint(
    candidates: OllamaEndpoint[]
  ): Promise<OllamaDiscoveryResult | null> {
    for (const endpoint of candidates) {
      const result = await this.testEndpoint(endpoint);
      this.discoveryResults.set(this.getEndpointUrl(endpoint), result);

      if (result.isHealthy) {
        this.cacheSuccessfulEndpoint(endpoint);
        console.log(`✅ Found healthy Ollama endpoint: ${this.getEndpointUrl(endpoint)} (${result.responseTime}ms)`);
        return result;
      }
    }

    console.warn('❌ No healthy Ollama endpoints found');
    return null;
  }

  /**
   * Cache successful endpoint for faster future lookups
   */
  private cacheSuccessfulEndpoint(endpoint: OllamaEndpoint): void {
    if (this.config.cacheSuccessfulEndpoint) {
      this.cachedEndpoint = endpoint;
      try {
        localStorage.setItem('ollama-cached-endpoint', JSON.stringify(endpoint));
      } catch (error) {
        console.warn('Failed to cache endpoint:', error);
      }
    }
  }

  /**
   * Get all discovery results
   */
  getDiscoveryResults(): Map<string, OllamaDiscoveryResult> {
    return new Map(this.discoveryResults);
  }

  /**
   * Retry with exponential backoff
   */
  async testWithRetry(endpoint: OllamaEndpoint): Promise<OllamaDiscoveryResult> {
    const { maxRetries, retryDelay, exponentialBackoff } = this.config.retryPolicy;
    let lastResult: OllamaDiscoveryResult | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastResult = await this.testEndpoint(endpoint);
      
      if (lastResult.isHealthy) {
        return lastResult;
      }

      if (attempt < maxRetries) {
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return lastResult!;
  }

  /**
   * Reset discovery state
   */
  reset(): void {
    this.cachedEndpoint = null;
    this.discoveryResults.clear();
    try {
      localStorage.removeItem('ollama-cached-endpoint');
    } catch (error) {
      console.warn('Failed to clear cached endpoint:', error);
    }
  }

  /**
   * Export configuration for backup/sharing
   */
  exportConfiguration(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfiguration(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      this.saveConfiguration(config);
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }
}

// Singleton instance
export const ollamaDiscovery = new OllamaDiscoveryService();

// Helper function to get the best Ollama endpoint
export async function getOllamaEndpoint(): Promise<string | null> {
  const result = await ollamaDiscovery.discoverEndpoint();
  if (result && result.isHealthy) {
    return `${result.endpoint.protocol}://${result.endpoint.host}:${result.endpoint.port}`;
  }
  return null;
}
